// Arquivo: main.js (VERSÃO FINAL, LIMPA E CORRIGIDA)

import * as ui from './ui.js';
import * as db from './firestore.js';
import * as utils from './utils.js';
import * as core from './core.js';
import * as calculator from './calculator.js';
import { initPwaHandlers, checkAndShowInstallBanner } from './pwa-handler.js';

// --- INICIALIZAÇÃO E ESTADO GLOBAL ---
const firebaseConfig = {
    apiKey: "AIzaSyBaU9Ug3T8JQVX5wspA5ng6KXBpB5HgGJ8",
    authDomain: "planilha-de-gastos-10a46.firebaseapp.com",
    projectId: "planilha-de-gastos-10a46",
    storageBucket: "planilha-de-gastos-10a46.firebasestorage.app",
    messagingSenderId: "515745025757",
    appId: "1:515745025757:web:3ca2c314da8cbee8549534"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const firestoreDB = firebase.firestore();

const state = {
    currentUser: null,
    incomes: [], expenses: [], goals: [], investments: [], timeEntries: [], contributions: [],
    recurringIncomes: [], recurringExpenses: [],
    settings: {
        headerSubtitle: '', payPeriodStartDay: 1, overtimeStartDay: 24, overtimeEndDay: 23,
        expenseCategories: { housing: 'Moradia', food: 'Alimentação', transport: 'Transporte', health: 'Saúde', education: 'Educação', entertainment: 'Lazer', other: 'Outros' },
        customDiscounts: [], customProventos: []
    },
    currentYear: new Date().getFullYear(), currentMonth: new Date().getMonth() + 1
};

// --- LÓGICA PRINCIPAL ---
async function updateDashboard() {
    if (!state.currentUser) return;

    // Carrega dados que não dependem do período (metas, investimentos, etc.)
    const [initialData, recurringData] = await Promise.all([
        db.loadInitialData(firestoreDB, state.currentUser),
        db.loadRecurringData(firestoreDB, state.currentUser)
    ]);

    state.goals = initialData.goals;
    state.investments = initialData.investments;
    state.contributions = initialData.contributions;
    state.settings = { ...state.settings, ...initialData.settings };
    state.recurringIncomes = recurringData.recurringIncomes;
    state.recurringExpenses = recurringData.recurringExpenses;

    // CORREÇÃO: Calcula os dois períodos (financeiro e de horas) separadamente
    const periodRange = utils.getPayPeriodRange(state.currentYear, state.currentMonth, state.settings.payPeriodStartDay);
    const overtimeRange = utils.getOvertimePeriodRange(state.currentYear, state.currentMonth, state.settings.overtimeStartDay, state.settings.overtimeEndDay);

    // CORREÇÃO: Busca os dados de cada período com sua respectiva função
    const periodData = await db.loadPeriodData(firestoreDB, state.currentUser, periodRange.startDate, periodRange.endDate);
    const timeEntriesData = await db.loadTimeEntriesForPeriod(firestoreDB, state.currentUser, overtimeRange.startDate, overtimeRange.endDate);

    const generateRecurring = (template) => {
        const date = new Date(state.currentYear, state.currentMonth - 1, template.dayOfMonth);
        if (template.createdAt) {
            const creationDate = new Date(template.createdAt);
            const firstDayOfVisibleMonth = new Date(state.currentYear, state.currentMonth - 1, 1);
            if (firstDayOfVisibleMonth < new Date(creationDate.getFullYear(), creationDate.getMonth(), 1)) {
                return null;
            }
        }
        if (date >= periodRange.startDate && date <= periodRange.endDate) {
            return { ...template, date: date.toISOString().split('T')[0], isRecurring: true };
        }
        return null;
    };

    const generatedIncomes = state.recurringIncomes.map(generateRecurring).filter(Boolean);
    const generatedExpenses = state.recurringExpenses.map(generateRecurring).filter(Boolean);

    state.incomes = [...periodData.incomes, ...generatedIncomes];
    state.expenses = [...periodData.expenses, ...generatedExpenses];
    state.timeEntries = timeEntriesData; // CORREÇÃO: Usa os dados de horas carregados com o período correto

    rerenderUI();
}

function rerenderUI() {
    if (!state.currentUser) return;

    const periodRange = utils.getPayPeriodRange(state.currentYear, state.currentMonth, state.settings.payPeriodStartDay);
    const overtimeRange = utils.getOvertimePeriodRange(state.currentYear, state.currentMonth, state.settings.overtimeStartDay, state.settings.overtimeEndDay);
    const totals = core.calculateTotals(state, periodRange, overtimeRange);

    state.goals.forEach(goal => {
        if (goal.name === 'Economia Mensal') {
            goal.current = totals.monthSavings;
        } else {
            const linkedContributions = state.contributions.filter(c => c.goalId === goal.id);
            const totalContributed = linkedContributions.reduce((sum, c) => sum + c.amount, 0);
            goal.current = totalContributed;
        }
    });

    ui.updatePeriodDisplay(periodRange, overtimeRange);
    ui.updateDashboardCards(totals);
    const tableCallbacks = { onEdit: handleEditItem, onDelete: handleDeleteItem };
    ui.updateIncomeTable(state.incomes, { ...tableCallbacks, onCalc: sendIncomeToCalculator });
    ui.updateExpensesTable(state.expenses, state.settings.expenseCategories, { ...tableCallbacks, onStatusToggle: handleExpenseStatusToggle });
    ui.updateGoalsTable(state.goals, tableCallbacks);
    ui.updateInvestmentsTable(state.investments, tableCallbacks);
    ui.updateHoursTable(state.timeEntries.filter(t => new Date(t.date + 'T00:00:00') >= overtimeRange.startDate && new Date(t.date + 'T00:00:00') <= overtimeRange.endDate), tableCallbacks);
    ui.updateRecurringItemsTable(state.recurringIncomes, state.recurringExpenses, state.settings.expenseCategories, tableCallbacks);
    
    if (document.querySelector('.tab-btn[data-tab="reports"]')?.classList.contains('active-tab')) {
        handleGenerateReport();
    }
}

// --- HANDLERS DE EVENTOS ---
function handleEditItem(type, id) {
    // CORREÇÃO: Lógica específica para editar um 'timeEntry' no formulário da página
    if (type === 'timeEntry') {
        const item = state.timeEntries.find(t => t.id === id);
        if (item) {
            // Preenche o formulário com os dados do item
            document.getElementById('hour-date').value = item.date;
            document.getElementById('hour-entry').value = item.entry || '';
            document.getElementById('hour-break-start').value = item.breakStart || '';
            document.getElementById('hour-break-end').value = item.breakEnd || '';
            document.getElementById('hour-exit').value = item.exit || '';

            // Configura os botões para o "modo de edição"
            const addBtn = document.getElementById('add-hour-entry-btn');
            addBtn.textContent = 'Atualizar';
            addBtn.dataset.id = id; // Armazena o ID no botão para que o 'handleSaveTimeEntry' saiba que é uma atualização

            document.getElementById('cancel-hour-edit-btn').classList.remove('hidden');
            window.scrollTo({ top: document.getElementById('hours-content').offsetTop, behavior: 'smooth' });
            return; // Impede a execução do resto da função
        }
    }

    // Lógica original para os outros itens (que usam modal)
    let collectionName;
    switch (type) {
        case 'recurringIncome': collectionName = 'recurringIncomes'; break;
        case 'recurringExpense': collectionName = 'recurringExpenses'; break;
        default: collectionName = `${type}s`;
    }
    const item = state[collectionName]?.find(i => i.id === id);
    ui.showEditModal(type, item, state);
}

async function handleDeleteItem(type, id) {
    let item;
    let collectionName = `${type}s`;
    
    if (type === 'income' || type === 'expense') {
        item = state[collectionName].find(i => i.id === id);
        if (item?.isRecurring) {
            type = type === 'income' ? 'recurringIncome' : 'recurringExpense';
            collectionName = `${type}s`;
            item = state[collectionName].find(i => i.id === id);
        }
    } else if (type === 'timeEntry') {
        collectionName = 'timeEntries';
        item = state[collectionName].find(i => i.id === id);
    } else {
        item = state[collectionName]?.find(i => i.id === id);
    }

    if (!item) {
        return console.error("Item para exclusão não encontrado:", type, id);
    }
    
    const confirmed = await ui.showConfirmation('Confirmar Exclusão', 'Tem certeza que deseja excluir este item?');
    if (!confirmed) return;

    const wasDeleted = await db.handleDelete(firestoreDB, state.currentUser, type, item);
    if (wasDeleted) {
        await updateDashboard();
    }
}

async function handleSaveItem(type) {
    const baseType = type.replace('recurring', '').toLowerCase();
    const modalId = `${baseType}-modal`;
    
    const formContainer = document.getElementById(modalId)?.querySelector('div > div');
    if (!formContainer) return;

    const saveBtn = document.getElementById(`save-${type}`);
    const id = saveBtn ? saveBtn.dataset.id : null;
    
    const itemData = {};
    const inputs = formContainer.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (!input.id || !input.id.includes(baseType)) return;
        const key = input.id.replace(`${baseType}-`, '');
        if (input.type === 'checkbox') {
            itemData[key] = input.checked;
        } else if (input.type === 'number' || ['amount', 'target', 'yield', 'current', 'dayOfMonth'].some(k => input.id.includes(k))) {
            itemData[key] = utils.parseBrazilianNumber(input.value) || parseInt(input.value, 10) || 0;
        } else {
            itemData[key] = input.value.trim();
        }
    });

    if ((type === 'recurringIncome' || type === 'recurringExpense') && !id) {
        itemData.createdAt = new Date().toISOString().split('T')[0];
    }
    
    let saved = false;
    if (type === 'expense') {
        const installments = parseInt(document.getElementById('expense-installments').value) || 1;
        saved = await db.saveExpense(firestoreDB, state.currentUser, itemData, id, installments);
    } else {
        saved = await db.saveItem(firestoreDB, state.currentUser, type, itemData, id);
    }

    if (saved) {
        ui.closeModal(modalId);
        await updateDashboard();
    }
}

async function handleSaveContribution() {
    const itemData = {
        goalId: document.getElementById('contribution-goalId').value,
        amount: utils.parseBrazilianNumber(document.getElementById('contribution-amount').value),
        date: document.getElementById('contribution-date').value,
    };
    if (!itemData.goalId || !itemData.amount || !itemData.date) {
        return ui.showToast('Todos os campos são obrigatórios.', 'error');
    }
    const saved = await db.saveItem(firestoreDB, state.currentUser, 'contribution', itemData);
    if (saved) {
        ui.closeModal('contribution-modal');
        await updateDashboard();
    }
}

async function handleSaveTimeEntry() {
    const addBtn = document.getElementById('add-hour-entry-btn');
    const id = addBtn.dataset.id; // Verifica se estamos editando (se há um 'data-id')

    const itemData = {
        date: document.getElementById('hour-date').value,
        entry: document.getElementById('hour-entry').value,
        breakStart: document.getElementById('hour-break-start').value,
        breakEnd: document.getElementById('hour-break-end').value,
        exit: document.getElementById('hour-exit').value,
        isHoliday: false // BUG CORRIGIDO: Removida a busca por 'hour-is-holiday' que não existe
    };

    if (!itemData.date || !itemData.entry || !itemData.exit) {
        return ui.showToast('Data, Entrada e Saída são obrigatórios.', 'error');
    }

    const saved = await db.saveItem(firestoreDB, state.currentUser, 'timeEntry', itemData, id);
    
    if (saved) {
        // Limpa o formulário e o modo de edição
        document.getElementById('add-hour-entry-btn').removeAttribute('data-id');
        document.getElementById('add-hour-entry-btn').textContent = 'Adicionar';
        document.getElementById('cancel-hour-edit-btn').classList.add('hidden');
        document.querySelector('#hours-content form').reset(); // Maneira mais simples de limpar
        document.getElementById('hour-date').value = new Date().toISOString().split('T')[0];

        await updateDashboard(); // Atualiza a UI
    }
}

async function handleExpenseStatusToggle(id) {
    const expense = state.expenses.find(e => e.id === id);
    if (expense) {
        const success = await db.toggleExpenseStatus(firestoreDB, state.currentUser, expense);
        if (success) await updateDashboard();
    }
}

function sendIncomeToCalculator(id) {
    const income = state.incomes.find(i => i.id === id);
    if (income) {
        document.getElementById('calc-base-salary').value = String(income.amount).replace('.', ',');
        document.querySelector('.tab-btn[data-tab="calculator"]').click();
    }
}

function handleCalculateSalary() {
    const totals = core.calculateTotals(state, 
        utils.getPayPeriodRange(state.currentYear, state.currentMonth, state.settings.payPeriodStartDay),
        utils.getOvertimePeriodRange(state.currentYear, state.currentMonth, state.settings.overtimeStartDay, state.settings.overtimeEndDay)
    );
    const results = calculator.calculateNetSalary(totals, state.settings);
    ui.displaySalaryResults(results, state.settings);
}

async function handleResetMonth() {
    const confirmed = await ui.showConfirmation('Reiniciar Mês', 'Isso vai apagar as transações não-fixas deste período. Tem certeza?', 'bg-orange-500 hover:bg-orange-600');
    if (!confirmed) return;
    const itemsToDelete = state.incomes.concat(state.expenses, state.timeEntries).filter(item => !item.isRecurring);
    if (itemsToDelete.length === 0) return ui.showToast('Nenhum item para reiniciar neste mês.', 'info');
    const batch = firestoreDB.batch();
    itemsToDelete.forEach(item => {
        let collectionName = '';
        if (state.incomes.includes(item)) collectionName = 'incomes';
        else if (state.expenses.includes(item)) collectionName = 'expenses';
        else if (state.timeEntries.includes(item)) collectionName = 'timeEntries';
        if (collectionName && item.id) {
            batch.delete(firestoreDB.collection('users').doc(state.currentUser.uid).collection(collectionName).doc(item.id));
        }
    });
    await batch.commit();
    ui.showToast('Dados do mês reiniciados!', 'success');
    await updateDashboard();
}

async function handleClearAll() {
    const confirmed1 = await ui.showConfirmation('ATENÇÃO MÁXIMA!', 'Isso apagará TODOS os seus dados permanentemente. Deseja continuar?');
    if (!confirmed1) return;
    const confirmed2 = await ui.showConfirmation('ÚLTIMO AVISO', 'Tem certeza absoluta que deseja apagar tudo?');
    if (!confirmed2) return;
    const success = await db.clearAllUserData(firestoreDB, state.currentUser);
    if (success) {
        window.location.reload();
    }
}

async function handleSaveSettings() {
    const newSettings = {
        payPeriodStartDay: parseInt(document.getElementById('setting-start-day').value) || 1,
        overtimeStartDay: parseInt(document.getElementById('setting-overtime-start-day').value) || 24,
        overtimeEndDay: parseInt(document.getElementById('setting-overtime-end-day').value) || 23,
    };
    const success = await db.saveUserSettings(firestoreDB, state.currentUser, newSettings);
    if (success) {
        state.settings = { ...state.settings, ...newSettings };
        await updateDashboard();
    }
}

async function handlePasswordChange() {
    const newPassword = document.getElementById('new-password').value;
    const feedbackEl = document.getElementById('password-feedback');
    if (newPassword.length < 6) {
        feedbackEl.textContent = 'A senha precisa ter no mínimo 6 caracteres.';
        feedbackEl.className = 'text-sm mt-2 text-center text-red-500';
        return;
    }
    const result = await db.updateUserPassword(auth, newPassword);
    feedbackEl.textContent = result.message;
    feedbackEl.className = `text-sm mt-2 text-center ${result.success ? 'text-green-500' : 'text-red-500'}`;
    if(result.success) document.getElementById('new-password').value = '';
}

async function handleAddCustomItem(type) {
    const list = type === 'provento' ? state.settings.customProventos : state.settings.customDiscounts;
    const nameInput = document.getElementById(`new-${type}-name`);
    const valueInput = document.getElementById(`new-${type}-value`);
    const name = nameInput.value.trim();
    const value = utils.parseBrazilianNumber(valueInput.value);
    if (name && !isNaN(value) && value > 0) {
        list.push({ name, value });
        const success = await db.saveUserSettings(firestoreDB, state.currentUser, { 
            customProventos: state.settings.customProventos,
            customDiscounts: state.settings.customDiscounts 
        });
        if (success) {
            nameInput.value = ''; valueInput.value = '';
            handleTabChange('calculator');
        }
    } else {
        ui.showToast('Por favor, preencha o nome e um valor válido.', 'error');
    }
}

async function handleDeleteCustomItem(type, index) {
    const list = type === 'provento' ? state.settings.customProventos : state.settings.customDiscounts;
    list.splice(index, 1);
    const success = await db.saveUserSettings(firestoreDB, state.currentUser, { 
        customProventos: state.settings.customProventos,
        customDiscounts: state.settings.customDiscounts 
    });
    if (success) {
        handleTabChange('calculator');
    }
}

function handleTabChange(tabId) {
    if (tabId === 'reports') {
        handleGenerateReport();
    } else if (tabId === 'calculator') {
        const totals = core.calculateTotals(state, 
            utils.getPayPeriodRange(state.currentYear, state.currentMonth, state.settings.payPeriodStartDay),
            utils.getOvertimePeriodRange(state.currentYear, state.currentMonth, state.settings.overtimeStartDay, state.settings.overtimeEndDay)
        );
        ui.updateCalculatorDisplay(totals, state.settings, {
            onDeleteProvento: (index) => handleDeleteCustomItem('provento', index),
            onDeleteDiscount: (index) => handleDeleteCustomItem('discount', index)
        });
    }
}

function handleGenerateReport() {
    const periodRange = utils.getPayPeriodRange(state.currentYear, state.currentMonth, state.settings.payPeriodStartDay);
    const overtimeRange = utils.getOvertimePeriodRange(state.currentYear, state.currentMonth, state.settings.overtimeStartDay, state.settings.overtimeEndDay);
    const totals = core.calculateTotals(state, periodRange, overtimeRange);
    ui.generateReport(state, totals);
}

// --- SETUP DOS EVENT LISTENERS ---
function setupEventListeners() {
    const dropdownButtons = document.querySelectorAll('.dropdown .nav-main-btn');
 

dropdownButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        event.stopPropagation(); // Impede que o clique feche o menu imediatamente
        const parentDropdown = button.parentElement;
        const menu = parentDropdown.querySelector('.dropdown-menu');

        // Fecha todos os outros menus antes de abrir o novo
        document.querySelectorAll('.dropdown-menu').forEach(m => {
            if (m !== menu) {
                m.classList.remove('open');
            }
        });

        // Abre ou fecha o menu atual
        menu.classList.toggle('open');
    });
});

// Fecha os menus se o usuário clicar em qualquer outro lugar da tela
window.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('open');
    });
});
    initPwaHandlers();

    // --- Listeners do Cabeçalho e Ações Gerais ---
    document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
    document.getElementById('month-select').addEventListener('change', (e) => { state.currentMonth = parseInt(e.target.value); updateDashboard(); });
    document.getElementById('year-select').addEventListener('change', (e) => { state.currentYear = parseInt(e.target.value); updateDashboard(); });
    document.getElementById('privacy-toggle-btn').addEventListener('click', () => { utils.togglePrivacyMode(); ui.updatePrivacyButton(utils.initPrivacyMode()); rerenderUI(); });
    document.getElementById('theme-toggle-btn').addEventListener('click', () => { ui.toggleTheme(); rerenderUI(); });
    document.getElementById('reset-btn').addEventListener('click', handleResetMonth);
    document.getElementById('clear-all-btn').addEventListener('click', handleClearAll);
    document.getElementById('print-btn').addEventListener('click', () => window.print());
    document.getElementById('mobile-menu-overlay').addEventListener('click', ui.closeMobileMenu);
    document.getElementById('more-menu-btn').addEventListener('click', ui.toggleMobileMenu);

    // --- Listeners dos Botões de Adicionar ---
    document.getElementById('add-income-btn').addEventListener('click', () => ui.showEditModal('income', null, state));
    document.getElementById('add-expense-btn').addEventListener('click', () => ui.showEditModal('expense', null, state));
    document.getElementById('add-goal-btn').addEventListener('click', () => ui.showEditModal('goal', null, state));
    document.getElementById('add-investment-btn').addEventListener('click', () => ui.showEditModal('investment', null, state));
    document.getElementById('add-hour-entry-btn').addEventListener('click', handleSaveTimeEntry);
    
    // --- Listeners para Itens Fixos ---
    document.getElementById('add-recurring-income-btn').addEventListener('click', () => ui.showEditModal('recurringIncome', null, state));
    document.getElementById('add-recurring-expense-btn').addEventListener('click', () => ui.showEditModal('recurringExpense', null, state));
    
    // --- Listeners da Calculadora ---
    document.getElementById('calculate-salary-btn').addEventListener('click', handleCalculateSalary);
    document.getElementById('add-provento-btn').addEventListener('click', () => handleAddCustomItem('provento'));
    document.getElementById('add-discount-btn').addEventListener('click', () => handleAddCustomItem('discount'));

    // --- Listeners da Conta e Relatórios ---
    document.getElementById('save-settings-btn').addEventListener('click', handleSaveSettings);
    document.getElementById('save-password-btn').addEventListener('click', handlePasswordChange);
    document.getElementById('generate-report-btn').addEventListener('click', handleGenerateReport);

    // --- Listeners do Modal de Contribuição ---
    document.getElementById('save-contribution').addEventListener('click', handleSaveContribution);
    document.getElementById('cancel-contribution').addEventListener('click', () => ui.closeModal('contribution-modal'));
    document.getElementById('close-contribution-modal').addEventListener('click', () => ui.closeModal('contribution-modal'));

    // --- Listeners Dinâmicos para os Modais de Salvar ---
    const modalTypesForSetup = ['income', 'expense', 'goal', 'investment'];
    modalTypesForSetup.forEach(baseType => {
        const saveBtn = document.getElementById(`save-${baseType}`);
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const currentTypeToSave = saveBtn.id.replace('save-', '');
                handleSaveItem(currentTypeToSave);
            });
        }
        
        const closeBtn = document.getElementById(`close-${baseType}-modal`);
        if (closeBtn) closeBtn.addEventListener('click', () => ui.closeModal(`${baseType}-modal`));
        
        const cancelBtn = document.getElementById(`cancel-${baseType}`);
        if (cancelBtn) cancelBtn.addEventListener('click', () => ui.closeModal(`${baseType}-modal`));
    });
    
    // --- Listener de Navegação por Abas ---
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));
            this.classList.add('active-tab');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            document.getElementById(`${this.dataset.tab}-content`)?.classList.remove('hidden');
            ui.closeMobileMenu();
            handleTabChange(this.dataset.tab);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            state.currentUser = user;
            document.getElementById('main-container').style.display = 'block';
            
            await updateDashboard();
            
            const userName = user.displayName || user.email || 'Usuário';
            document.getElementById('header-subtitle').textContent = state.settings.headerSubtitle || userName;
            document.getElementById('welcome-message').textContent = `Bem-vindo(a) à sua planilha, ${userName}!`;
            document.getElementById('user-email-display').textContent = user.email;
            
            ui.populateYearDropdown();
            document.getElementById('year-select').value = state.currentYear;
            document.getElementById('month-select').value = state.currentMonth;
            if (localStorage.getItem('theme') === 'dark') {
                document.documentElement.classList.add('dark');
            }
            ui.updateThemeButton(localStorage.getItem('theme') || 'light');
            
            setupEventListeners();
            document.querySelector('.tab-btn[data-tab="income"]').click();
             initPwaHandlers();
             checkAndShowInstallBanner();
        } else {
            window.location.href = 'login.html';
        }
    });
});