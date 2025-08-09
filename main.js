// Arquivo: main.js (VERSÃO FINAL, LIMPA E CORRIGIDA)

import * as ui from './ui.js';
import * as db from './firestore.js';
import * as utils from './utils.js';
import * as core from './core.js';
import * as calculator from './calculator.js';

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

    const periodRange = utils.getPayPeriodRange(state.currentYear, state.currentMonth, state.settings.payPeriodStartDay);
    const periodData = await db.loadPeriodData(firestoreDB, state.currentUser, periodRange.startDate, periodRange.endDate);
    
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
    state.timeEntries = periodData.timeEntries;

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
    let collectionName;
    switch (type) {
        case 'timeEntry': collectionName = 'timeEntries'; break;
        case 'recurringIncome': collectionName = 'recurringIncomes'; break;
        case 'recurringExpense': collectionName = 'recurringExpenses'; break;
        default: collectionName = `${type}s`;
    }
    const item = state[collectionName]?.find(i => i.id === id);
    ui.showEditModal(type, item, state);
}

async function handleDeleteItem(type, id) {
    // Encontra o item em qualquer uma das listas de estado relevantes
    let item = state[`${type}s`]?.find(i => i.id === id);
    let collectionName = `${type}s`; // Coleção padrão (ex: 'incomes', 'goals')
    
    // CORREÇÃO: Lógica para identificar se o item é um item fixo gerado
    if (type === 'income' || type === 'expense') {
        const potentialItem = state[type === 'income' ? 'incomes' : 'expenses'].find(i => i.id === id);
        if (potentialItem?.isRecurring) {
            // Se for um item recorrente, o alvo da exclusão é o *modelo* original.
            type = type === 'income' ? 'recurringIncome' : 'recurringExpense';
            collectionName = `${type}s`;
            item = state[collectionName].find(i => i.id === id);
        }
    } else if (type === 'timeEntry') {
        collectionName = 'timeEntries';
    }

    if (!item) {
        return console.error("ERRO CRÍTICO: Item para exclusão não encontrado no estado:", type, id);
    }

    // Lógica de confirmação para diferentes tipos de item
    let confirmed = false;
    let deleteOption = 'all'; // Padrão para itens normais e recorrentes

    if (type === 'expense' && item.installmentGroupId) {
        const choice = await ui.showAdvancedConfirmation({
            title: 'Excluir Despesa Parcelada',
            message: 'Esta despesa é uma parcela. Como você deseja excluí-la?',
            confirmText: 'Apagar Todas as Futuras',
            secondaryText: 'Apagar Só Esta',
        });
        if (choice === 'cancel') return;
        confirmed = true;
        deleteOption = choice === 'confirm' ? 'all' : 'one';
    } else {
        confirmed = await ui.showConfirmation('Confirmar Exclusão', 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.');
    }

    if (!confirmed) return;

    // Deleta do banco de dados usando o tipo e item corretos
    const wasDeleted = await db.handleDelete(firestoreDB, state.currentUser, type, item, deleteOption);

    if (wasDeleted) {
        // Força uma recarga completa dos dados do zero para garantir consistência total.
        // Isso é mais seguro do que manipular o estado localmente e resolve o bug.
        await updateDashboard(); 
    }
}

async function handleSaveItem(type) {
    // Determina o tipo base do modal para encontrar os elementos corretos no HTML.
    // Ex: tanto 'income' quanto 'recurringIncome' usarão o 'income-modal'.
    const baseType = type.replace('recurring', '').toLowerCase();
    const modalId = `${baseType}-modal`;
    
    const formContainer = document.getElementById(modalId)?.querySelector('div > div');
    if (!formContainer) {
        console.error(`Formulário não encontrado para o modal: ${modalId}`);
        return;
    }

    // Encontra o botão de salvar pelo seu ID ATUAL, que corresponde ao 'type' da operação.
    // Ex: Se o tipo for 'recurringIncome', o ID do botão será 'save-recurringIncome'.
    const saveBtn = document.getElementById(`save-${type}`);
    const id = saveBtn ? saveBtn.dataset.id : null;
    
    const itemData = {};
    
    // Coleta dados de todos os inputs do formulário.
    const inputs = formContainer.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (!input.id || !input.id.includes(baseType)) return;
        
        const key = input.id.replace(`${baseType}-`, '');
        
        // Lógica especial para o select de metas no formulário de investimento.
         if (input.type === 'checkbox') {
            itemData[key] = input.checked;
        } else if (input.type === 'number' || ['amount', 'target', 'yield', 'current', 'dayOfMonth'].some(k => input.id.includes(k))) {
            itemData[key] = utils.parseBrazilianNumber(input.value) || parseInt(input.value, 10) || 0;
        } else {
            itemData[key] = input.value.trim();
        }
    });

    let saved = false;

    // Se for um item recorrente novo, adiciona a data de criação.
    if ((type === 'recurringIncome' || type === 'recurringExpense') && !id) {
        itemData.createdAt = new Date().toISOString().split('T')[0];
    }
    
    // Direciona para a função de salvamento correta com base no tipo.
    if (type === 'expense') {
        const installments = parseInt(document.getElementById('expense-installments').value) || 1;
        saved = await db.saveExpense(firestoreDB, state.currentUser, itemData, id, installments, false);
    } else {
        saved = await db.saveItem(firestoreDB, state.currentUser, type, itemData, id);
    }

    // Se o item foi salvo, fecha o modal e atualiza o dashboard.
    if (saved) {
        ui.closeModal(modalId);
        await updateDashboard();
    }
}

async function handleSaveTimeEntry() {
    const addBtn = document.getElementById('add-hour-entry-btn');
    const id = addBtn.dataset.editingId;
    const itemData = {
        date: document.getElementById('hour-date').value,
        entry: document.getElementById('hour-entry').value,
        breakStart: document.getElementById('hour-break-start').value,
        breakEnd: document.getElementById('hour-break-end').value,
        exit: document.getElementById('hour-exit').value,
        isHoliday: document.getElementById('hour-is-holiday').checked
    };
    if (!itemData.date || !itemData.entry || !itemData.exit) {
        return ui.showToast('Data, Entrada e Saída são obrigatórios.', 'error');
    }
    const saved = await db.saveItem(firestoreDB, state.currentUser, 'timeEntry', itemData, id);
    if (saved) {
        document.getElementById('hour-date').value = '';
        document.getElementById('hour-entry').value = '';
        document.getElementById('hour-break-start').value = '';
        document.getElementById('hour-break-end').value = '';
        document.getElementById('hour-exit').value = '';
        document.getElementById('hour-is-holiday').checked = false;
        addBtn.innerHTML = '<i class="fas fa-plus mr-2"></i>Adicionar';
        delete addBtn.dataset.editingId;
        document.getElementById('cancel-hour-edit-btn').classList.add('hidden');
        await updateDashboard();
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

// --- SETUP DOS EVENT LISTENERS ---
function setupEventListeners() {
    // --- Listeners do Cabeçalho e Ações Gerais ---
    document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
    document.getElementById('month-select').addEventListener('change', (e) => { state.currentMonth = parseInt(e.target.value); updateDashboard(); });
    document.getElementById('year-select').addEventListener('change', (e) => { state.currentYear = parseInt(e.target.value); updateDashboard(); });
    document.getElementById('privacy-toggle-btn').addEventListener('click', () => { utils.togglePrivacyMode(); ui.updatePrivacyButton(utils.initPrivacyMode()); rerenderUI(); });
    document.getElementById('theme-toggle-btn').addEventListener('click', () => { ui.toggleTheme(); rerenderUI(); });
    document.getElementById('reset-btn').addEventListener('click', handleResetMonth);
    document.getElementById('clear-all-btn').addEventListener('click', handleClearAll);
    document.getElementById('hamburger-btn').addEventListener('click', ui.toggleMobileMenu);
    document.getElementById('mobile-menu-overlay').addEventListener('click', ui.closeMobileMenu);
    document.getElementById('save-contribution').addEventListener('click', handleSaveContribution);
    document.getElementById('cancel-contribution').addEventListener('click', () => ui.closeModal('contribution-modal'));
    document.getElementById('close-contribution-modal').addEventListener('click', () => ui.closeModal('contribution-modal'));

    // --- Listeners dos Botões de Adicionar ---
    document.getElementById('add-income-btn').addEventListener('click', () => ui.showEditModal('income', null, state));
    document.getElementById('add-expense-btn').addEventListener('click', () => ui.showEditModal('expense', null, state));
    document.getElementById('add-goal-btn').addEventListener('click', () => ui.showEditModal('goal', null, state));
    document.getElementById('add-investment-btn').addEventListener('click', () => ui.showEditModal('investment', null, state));
    document.getElementById('add-hour-entry-btn').addEventListener('click', handleSaveTimeEntry);
    
    // --- Listeners para Itens Fixos (Recorrentes) ---
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

    // --- LÓGICA DE LISTENERS DE MODAL (ROBUSTA E SEM CONFLITOS) ---
    const modalTypesForSetup = ['income', 'expense', 'goal', 'investment'];
    
    modalTypesForSetup.forEach(baseType => {
        // Adiciona um listener para o botão de SALVAR de cada modal.
        const saveBtn = document.getElementById(`save-${baseType}`);
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                // No momento do clique, verifica qual é o ID ATUAL do botão.
                // A função ui.showEditModal pode ter mudado o ID (ex: para 'save-recurringIncome').
                const currentTypeToSave = saveBtn.id.replace('save-', '');
                handleSaveItem(currentTypeToSave);
            });
        }
        
        // Listeners para os botões de FECHAR e CANCELAR
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
            const nonMonthTabs = ['reports', 'calculator', 'account', 'investments', 'goals', 'recurring'];
            document.querySelectorAll('#month-select, #year-select').forEach(sel => sel.classList.toggle('hidden', nonMonthTabs.includes(this.dataset.tab)));
            ui.closeMobileMenu();
            handleTabChange(this.dataset.tab);
        });
    });
}

// --- PONTO DE ENTRADA DA APLICAÇÃO ---
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
            const isPrivate = utils.initPrivacyMode();
            ui.updatePrivacyButton(isPrivate);
            
            setupEventListeners();
            document.querySelector('.tab-btn[data-tab="income"]').click();
        } else {
            window.location.href = 'login.html';
        }
    });
});