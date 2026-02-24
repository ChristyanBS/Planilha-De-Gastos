// Arquivo: main.js (VERSÃO FINAL, LIMPA E CORRIGIDA)

import * as ui from './ui.js';
import * as db from './firebaseService.js';
import * as utils from './utils.js';
import * as core from './core.js';
import * as calculator from './calculator.js';
import * as csvImporter from './csvImporter.js';
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

// --- FUNÇÕES AUXILIARES DO PERÍODO ---
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function updatePeriodLabel() {
    const label = document.getElementById('period-display-label');
    if (label) label.textContent = `${MONTH_NAMES[state.currentMonth - 1]} ${state.currentYear}`;
}

function syncPeriodSelects() {
    document.getElementById('month-select').value = state.currentMonth;
    document.getElementById('year-select').value = state.currentYear;
}

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

    const generatedIncomes = state.recurringIncomes.map(t => core.generateRecurringItem(t, state.currentYear, state.currentMonth, periodRange)).filter(Boolean);
    const generatedExpenses = state.recurringExpenses.map(t => core.generateRecurringItem(t, state.currentYear, state.currentMonth, periodRange)).filter(Boolean);

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
    ui.renderTransactionsFeed(state.incomes, state.expenses, state.settings.expenseCategories);
    
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
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const saveBtn = modal.querySelector('.save-modal-btn');
    const id = saveBtn ? saveBtn.dataset.id : null;
    
    const itemData = {};
    const inputs = modal.querySelectorAll('input[name], select[name]');
    inputs.forEach(input => {
        const key = input.name;
        if (!key) return;
        if (input.type === 'checkbox') {
            itemData[key] = input.checked;
        } else if (['amount', 'target', 'yield', 'current', 'dayOfMonth'].includes(key)) {
            itemData[key] = utils.parseBrazilianNumber(input.value) || 0;
        } else {
            itemData[key] = input.value.trim();
        }
    });

    // Validação para Rendas
    if (type === 'income' || type === 'recurringIncome') {
        if (!itemData.source) {
            return ui.showToast('Por favor, preencha a fonte da renda.', 'error');
        }
        if (itemData.amount <= 0) {
            return ui.showToast('O valor da renda deve ser maior que zero.', 'error');
        }
    }

    // --- NOVO CÓDIGO: VALIDAÇÃO PARA DESPESAS ---
    if (type === 'expense' || type === 'recurringExpense') {
        // Verifica se a descrição está vazia
        if (!itemData.description) {
            return ui.showToast('Por favor, preencha a descrição da despesa.', 'error');
        }
        // Verifica se o valor é maior que zero
        if (itemData.amount <= 0) {
            return ui.showToast('O valor da despesa deve ser maior que zero.', 'error');
        }
        // Verifica se uma categoria foi selecionada
        if (!itemData.category) {
            return ui.showToast('Por favor, selecione uma categoria.', 'error');
        }
    }
    // --- FIM DA VALIDAÇÃO PARA DESPESAS ---

    let saved = false;
    if (type === 'expense' && !id) {
        const installments = parseInt(document.getElementById('expense-installments').value) || 1;
        saved = await db.saveExpense(firestoreDB, state.currentUser, itemData, null, installments);
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
        // CORREÇÃO: Lê o valor da nova caixa de seleção
        isHoliday: document.getElementById('hour-is-holiday').checked
    };

    if (!itemData.date || !itemData.entry || !itemData.exit) {
        return ui.showToast('Data, Entrada e Saída são obrigatórios.', 'error');
    }

    const saved = await db.saveItem(firestoreDB, state.currentUser, 'timeEntry', itemData, id);
    
    if (saved) {
        // Limpa o formulário e o modo de edição
        document.getElementById('add-hour-entry-btn').removeAttribute('data-id');
        document.getElementById('add-hour-entry-btn').innerHTML = '<i class="fas fa-plus" style="margin-right:0.5rem;"></i>Adicionar';
        document.getElementById('cancel-hour-edit-btn').classList.add('hidden');
        
        // Limpa os campos do formulário de horas
        document.getElementById('hour-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('hour-entry').value = '';
        document.getElementById('hour-break-start').value = '';
        document.getElementById('hour-break-end').value = '';
        document.getElementById('hour-exit').value = '';
        document.getElementById('hour-is-holiday').checked = false; // Limpa a caixinha também

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
        workEntry: document.getElementById('setting-work-entry').value || '08:00',
        workBreakStart: document.getElementById('setting-work-break-start').value || '12:00',
        workBreakEnd: document.getElementById('setting-work-break-end').value || '13:00',
        workExit: document.getElementById('setting-work-exit').value || '17:00',
    };
    const success = await db.saveUserSettings(firestoreDB, state.currentUser, newSettings);
    if (success) {
        state.settings = { ...state.settings, ...newSettings };
        updateQuickFillHint();
        const fb = document.getElementById('settings-feedback');
        fb.textContent = 'Configurações salvas com sucesso!';
        fb.className = 'text-sm mt-2 text-center text-green-500';
        setTimeout(() => fb.textContent = '', 3000);
        await updateDashboard();
    }
}

function updateQuickFillHint() {
    const entry = state.settings.workEntry || '08:00';
    const exit = state.settings.workExit || '17:00';
    const hintEl = document.getElementById('qf-standard-hint');
    if (hintEl) {
        hintEl.textContent = `${entry.replace(':','h')} – ${exit.replace(':','h')}`;
    }
}

function loadSettingsToUI() {
    document.getElementById('setting-start-day').value = state.settings.payPeriodStartDay || 1;
    document.getElementById('setting-overtime-start-day').value = state.settings.overtimeStartDay || 24;
    document.getElementById('setting-overtime-end-day').value = state.settings.overtimeEndDay || 23;
    document.getElementById('setting-work-entry').value = state.settings.workEntry || '08:00';
    document.getElementById('setting-work-break-start').value = state.settings.workBreakStart || '12:00';
    document.getElementById('setting-work-break-end').value = state.settings.workBreakEnd || '13:00';
    document.getElementById('setting-work-exit').value = state.settings.workExit || '17:00';
    updateQuickFillHint();
}

// --- Theme Color Engine ---
function applyThemeColor(color) {
    const root = document.documentElement;
    root.style.setProperty('--accent', color);
    // Generate lighter variant for hover
    root.style.setProperty('--accent-hover', color);
    // Light accent background
    const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
    root.style.setProperty('--accent-light', `rgba(${r},${g},${b},0.08)`);
    root.style.setProperty('--accent-text', color);
    // Dark mode variants
    const lighter = `rgba(${Math.min(r+60,255)},${Math.min(g+60,255)},${Math.min(b+60,255)},1)`;
    root.style.setProperty('--sidebar-active-text', lighter);
    root.style.setProperty('--sidebar-active-bg', `rgba(${r},${g},${b},0.12)`);
    // Mark active swatch
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    const match = document.querySelector(`.color-swatch[data-color="${color}"]`);
    if (match) match.classList.add('active');
    localStorage.setItem('themeColor', color);
}

function initThemeColor() {
    const saved = localStorage.getItem('themeColor');
    if (saved) applyThemeColor(saved);
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
    if (tabId !== 'dashboard' && window.DashboardAnimations?.cleanup) {
        window.DashboardAnimations.cleanup();
    }

    if (tabId === 'dashboard') {
        const periodRange = utils.getPayPeriodRange(state.currentYear, state.currentMonth, state.settings.payPeriodStartDay);
        const overtimeRange = utils.getOvertimePeriodRange(state.currentYear, state.currentMonth, state.settings.overtimeStartDay, state.settings.overtimeEndDay);
        const totals = core.calculateTotals(state, periodRange, overtimeRange);
        ui.renderDashboardCharts(state, totals);

        if (window.gsap && window.DashboardAnimations?.play) {
            requestAnimationFrame(() => window.DashboardAnimations.play());
        }
    } else if (tabId === 'reports') {
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
    document.getElementById('month-select').addEventListener('change', (e) => { state.currentMonth = parseInt(e.target.value); updatePeriodLabel(); updateDashboard(); });
    document.getElementById('year-select').addEventListener('change', (e) => { state.currentYear = parseInt(e.target.value); updatePeriodLabel(); updateDashboard(); });

    // Period navigator arrows with carousel animation
    function navigateMonth(direction) {
        const contentArea = document.getElementById('content-area');
        const outClass = direction === 'next' ? 'carousel-slide-out-left' : 'carousel-slide-out-right';
        const inClass  = direction === 'next' ? 'carousel-slide-in-left' : 'carousel-slide-in-right';

        // Slide out
        contentArea.classList.add(outClass);

        contentArea.addEventListener('animationend', function handler() {
            contentArea.removeEventListener('animationend', handler);
            contentArea.classList.remove(outClass);

            // Update month
            if (direction === 'next') {
                state.currentMonth++;
                if (state.currentMonth > 12) { state.currentMonth = 1; state.currentYear++; }
            } else {
                state.currentMonth--;
                if (state.currentMonth < 1) { state.currentMonth = 12; state.currentYear--; }
            }
            syncPeriodSelects();
            updatePeriodLabel();
            updateDashboard();

            // Slide in
            contentArea.classList.add(inClass);
            contentArea.addEventListener('animationend', function handler2() {
                contentArea.removeEventListener('animationend', handler2);
                contentArea.classList.remove(inClass);
            });
        });
    }

    document.getElementById('period-prev-btn').addEventListener('click', () => navigateMonth('prev'));
    document.getElementById('period-next-btn').addEventListener('click', () => navigateMonth('next'));

    document.getElementById('privacy-toggle-btn').addEventListener('click', () => { utils.togglePrivacyMode(); ui.updatePrivacyButton(utils.initPrivacyMode()); rerenderUI(); });
    document.getElementById('theme-toggle-btn').addEventListener('click', () => { ui.toggleTheme(); rerenderUI(); });
    document.getElementById('reset-btn').addEventListener('click', handleResetMonth);
    document.getElementById('clear-all-btn').addEventListener('click', handleClearAll);
    document.getElementById('print-btn').addEventListener('click', () => window.print());
    document.getElementById('mobile-menu-overlay').addEventListener('click', ui.closeMobileMenu);
    document.getElementById('more-menu-btn').addEventListener('click', ui.toggleMobileMenu);
    document.getElementById('mobile-sidebar-toggle').addEventListener('click', ui.toggleMobileMenu);

    // --- Listeners dos Botões de Adicionar ---
    document.getElementById('add-income-btn').addEventListener('click', () => ui.showEditModal('income', null, state));
    document.getElementById('add-expense-btn').addEventListener('click', () => ui.showEditModal('expense', null, state));
    document.getElementById('add-goal-btn').addEventListener('click', () => ui.showEditModal('goal', null, state));
    document.getElementById('add-investment-btn').addEventListener('click', () => ui.showEditModal('investment', null, state));
    document.getElementById('add-hour-entry-btn').addEventListener('click', handleSaveTimeEntry);

    // --- Listeners dos Quick Fill Pills (Horas Extras) ---
    function applyQuickFill(preset) {
        const entry      = document.getElementById('hour-entry');
        const breakStart = document.getElementById('hour-break-start');
        const breakEnd   = document.getElementById('hour-break-end');
        const exit       = document.getElementById('hour-exit');

        const presets = {
            standard: {
                entry: state.settings.workEntry || '08:00',
                breakStart: state.settings.workBreakStart || '12:00',
                breakEnd: state.settings.workBreakEnd || '13:00',
                exit: state.settings.workExit || '17:00'
            },
            nobreak:  { entry: entry.value || '08:00', breakStart: '', breakEnd: '', exit: exit.value || '17:00' },
            night:    { entry: '22:00', breakStart: '02:00', breakEnd: '03:00', exit: '05:00' }
        };

        const p = presets[preset];
        if (!p) return;
        entry.value      = p.entry;
        breakStart.value = p.breakStart;
        breakEnd.value   = p.breakEnd;
        exit.value       = p.exit;

        // Feedback visual: destaca o pill ativo
        document.querySelectorAll('.quickfill-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.quickfill-btn[data-preset="${preset}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            // Remove o estado ativo após 2s
            setTimeout(() => activeBtn.classList.remove('active'), 2000);
        }
    }

    document.querySelectorAll('.quickfill-btn').forEach(btn => {
        btn.addEventListener('click', () => applyQuickFill(btn.dataset.preset));
    });

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

    // --- Theme Color Picker ---
    document.querySelectorAll('.color-swatch[data-color]').forEach(swatch => {
        swatch.addEventListener('click', () => applyThemeColor(swatch.dataset.color));
    });
    document.getElementById('custom-theme-color').addEventListener('input', (e) => applyThemeColor(e.target.value));

    // --- App Guide Modal ---
    document.getElementById('app-guide-btn').addEventListener('click', () => ui.openModal('app-guide-modal'));
    document.getElementById('close-guide-modal').addEventListener('click', () => ui.closeModal('app-guide-modal'));

    // --- Transaction Filter Pills ---
    document.querySelectorAll('.tx-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.tx-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const filter = pill.dataset.filter;
            document.querySelectorAll('#tx-feed .tx-row').forEach(row => {
                if (filter === 'all') {
                    row.style.display = '';
                } else {
                    row.style.display = row.dataset.txType === filter ? '' : 'none';
                }
            });
        });
    });

    // --- Cancel Hour Edit ---
    document.getElementById('cancel-hour-edit-btn').addEventListener('click', () => {
        const addBtn = document.getElementById('add-hour-entry-btn');
        addBtn.removeAttribute('data-id');
        addBtn.innerHTML = '<i class="fas fa-plus" style="margin-right:0.5rem;"></i>Adicionar';
        document.getElementById('cancel-hour-edit-btn').classList.add('hidden');
        document.getElementById('hour-entry').value = '';
        document.getElementById('hour-break-start').value = '';
        document.getElementById('hour-break-end').value = '';
        document.getElementById('hour-exit').value = '';
        document.getElementById('hour-is-holiday').checked = false;
    });

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

    // --- Date Pills lógica (modal de Despesa) ---
    (function setupExpenseDatePills() {
        const pills      = document.querySelectorAll('#expense-modal .em-date-pill');
        const dateInput  = document.getElementById('expense-date');
        if (!pills.length || !dateInput) return;

        function todayStr(offsetDays = 0) {
            const d = new Date();
            d.setDate(d.getDate() - offsetDays);
            return d.toISOString().split('T')[0];
        }

        function setActivePill(clickedPill) {
            pills.forEach(p => p.classList.remove('active'));
            clickedPill.classList.add('active');
        }

        // Set today's date on load
        dateInput.value = todayStr(0);

        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                const days = parseInt(pill.dataset.days, 10);

                if (days === -1) {
                    // "Outros..." — reveal native date picker
                    setActivePill(pill);
                    dateInput.classList.add('visible');
                    dateInput.showPicker?.();
                } else {
                    // Hoje (0) or Ontem (1)
                    setActivePill(pill);
                    dateInput.value = todayStr(days);
                    dateInput.classList.remove('visible');
                }
            });
        });

        // When user picks a custom date, keep "Outros..." highlighted
        dateInput.addEventListener('change', () => {
            // ensure "Outros..." pill stays active when a date is manually picked
            const outrosPill = document.querySelector('#expense-modal .em-date-outros');
            if (outrosPill) setActivePill(outrosPill);
        });

        // Reset pills whenever the expense modal opens
        document.getElementById('close-expense-modal')?.addEventListener('click', resetDatePills);
        document.getElementById('cancel-expense')?.addEventListener('click', resetDatePills);

        function resetDatePills() {
            pills.forEach(p => p.classList.remove('active'));
            const todayPill = document.querySelector('#expense-modal .em-date-pill[data-days="0"]');
            if (todayPill) todayPill.classList.add('active');
            dateInput.value = todayStr(0);
            dateInput.classList.remove('visible');
        }
    })();

    // --- Flip Cards: mobile tap toggle ---
    document.querySelectorAll('.flip-card').forEach(card => {
        card.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                card.classList.toggle('flipped');
            }
        });
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

    // --- Inicialização do importador CSV ---
    csvImporter.initCSVImportUI({
        onConfirmImport: async (parsedData) => {
            const result = await csvImporter.processImport(parsedData, db.saveExpense, db.saveItem, firestoreDB, state.currentUser);
            if (result && (result.expenses > 0 || result.incomes > 0)) {
                await updateDashboard();
            }
            return result;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            state.currentUser = user;
            document.getElementById('main-container').style.display = 'flex';
            
            await updateDashboard();
            initThemeColor();
            loadSettingsToUI();
            
            const userName = user.displayName || user.email || 'Usuário';
            document.getElementById('header-subtitle').textContent = state.settings.headerSubtitle || userName;
            document.getElementById('welcome-message').innerHTML = `Bem-vindo(a), <strong>${userName}</strong>`;
            document.getElementById('user-email-display').textContent = user.email;
            
            ui.populateYearDropdown();
            document.getElementById('year-select').value = state.currentYear;
            document.getElementById('month-select').value = state.currentMonth;
            updatePeriodLabel();
            if (localStorage.getItem('theme') === 'dark') {
                document.documentElement.classList.add('dark');
            }
            ui.updateThemeButton(localStorage.getItem('theme') || 'light');
            
            setupEventListeners();
            document.querySelector('.tab-btn[data-tab="dashboard"]').click();
             initPwaHandlers();
             checkAndShowInstallBanner();
        } else {
            window.location.href = 'login.html';
        }
    });
});