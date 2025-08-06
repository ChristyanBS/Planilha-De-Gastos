// Arquivo: main.js (VERSÃO FINAL COMPLETA)

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
    incomes: [], expenses: [], goals: [], investments: [], timeEntries: [],
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

    const initialData = await db.loadInitialData(firestoreDB, state.currentUser);
    state.goals = initialData.goals;
    state.investments = initialData.investments;
    
    const periodRange = utils.getPayPeriodRange(state.currentYear, state.currentMonth, state.settings.payPeriodStartDay);
    const overtimeRange = utils.getOvertimePeriodRange(state.currentYear, state.currentMonth, state.settings.overtimeStartDay, state.settings.overtimeEndDay);

    const periodData = await db.loadPeriodData(firestoreDB, state.currentUser, periodRange.startDate, periodRange.endDate);
    state.incomes = periodData.incomes;
    state.expenses = periodData.expenses;
    state.timeEntries = periodData.timeEntries;

    const totals = core.calculateTotals(state, periodRange, overtimeRange);
    
    ui.updatePeriodDisplay(periodRange, overtimeRange);
    ui.updateDashboardCards(totals);
    
    const tableCallbacks = { onEdit: handleEditItem, onDelete: handleDeleteItem };
    ui.updateIncomeTable(state.incomes, { ...tableCallbacks, onCalc: sendIncomeToCalculator });
    ui.updateExpensesTable(state.expenses, state.settings.expenseCategories, { ...tableCallbacks, onStatusToggle: handleExpenseStatusToggle });
    ui.updateGoalsTable(state.goals, totals.monthSavings, totals.totalInvested, tableCallbacks);
    ui.updateInvestmentsTable(state.investments, tableCallbacks);
    ui.updateHoursTable(state.timeEntries.filter(t => {
        const itemDate = new Date(t.date + 'T00:00:00');
        return itemDate >= overtimeRange.startDate && itemDate <= overtimeRange.endDate;
    }), tableCallbacks);

    if (document.querySelector('.tab-btn[data-tab="reports"]')?.classList.contains('active-tab')) {
        ui.generateReport(state, totals);
    }
}

// --- HANDLERS DE EVENTOS (Ações do Usuário) ---

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
            nameInput.value = '';
            valueInput.value = '';
            handleTabChange('calculator'); // Re-renderiza a calculadora para mostrar a lista atualizada
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
        handleTabChange('calculator'); // Re-renderiza a calculadora
    }
}

// COLE ESTA FUNÇÃO NA SEÇÃO DE HANDLERS DO SEU main.js

function handleTabChange(tabId) {
    // Lógica para a aba de Relatórios
    if (tabId === 'reports') {
        // Reutiliza a função handler que já criamos para gerar o gráfico
        handleGenerateReport();
    } 
    // Lógica para a aba de Calculadora
    else if (tabId === 'calculator') {
        // Calcula os totais mais recentes para garantir que as horas extras estejam atualizadas
        const totals = core.calculateTotals(state, 
            utils.getPayPeriodRange(state.currentYear, state.currentMonth, state.settings.payPeriodStartDay),
            utils.getOvertimePeriodRange(state.currentYear, state.currentMonth, state.settings.overtimeStartDay, state.settings.overtimeEndDay)
        );
        
        // Pede para a UI atualizar a tela da calculadora, passando os totais, as configurações
        // e as funções de callback para os botões de exclusão.
        ui.updateCalculatorDisplay(totals, state.settings, {
            onDeleteProvento: (index) => handleDeleteCustomItem('provento', index),
            onDeleteDiscount: (index) => handleDeleteCustomItem('discount', index)
        });
    }
}

function handleGenerateReport() {
    // É crucial recalcular os totais para garantir que o gráfico use os dados mais recentes
    const periodRange = utils.getPayPeriodRange(state.currentYear, state.currentMonth, state.settings.payPeriodStartDay);
    const overtimeRange = utils.getOvertimePeriodRange(state.currentYear, state.currentMonth, state.settings.overtimeStartDay, state.settings.overtimeEndDay);
    const totals = core.calculateTotals(state, periodRange, overtimeRange);
    
    // Pede para a UI gerar o gráfico com os dados e totais atualizados
    ui.generateReport(state, totals);
}

// Em main.js (CORRIGIDO)
async function handleSaveTimeEntry() {
    const addBtn = document.getElementById('add-hour-entry-btn');
    const id = addBtn.dataset.editingId; // Pega o ID para saber se é uma edição
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

    // Passa o tipo correto 'timeEntry'
    const saved = await db.saveItem(firestoreDB, state.currentUser, 'timeEntry', itemData, id);

    if (saved) {
        // Limpa os campos manualmente, um por um, sem usar .reset()
        document.getElementById('hour-date').value = '';
        document.getElementById('hour-entry').value = '';
        document.getElementById('hour-break-start').value = '';
        document.getElementById('hour-break-end').value = '';
        document.getElementById('hour-exit').value = '';
        document.getElementById('hour-is-holiday').checked = false;

        // Reseta o botão para o estado "Adicionar"
        addBtn.innerHTML = '<i class="fas fa-plus mr-2"></i>Adicionar';
        delete addBtn.dataset.editingId;
        document.getElementById('cancel-hour-edit-btn').classList.add('hidden');
        
        await updateDashboard();
    }
}

function handleEditItem(type, id) {
    const collectionName = type === 'timeEntry' ? 'timeEntries' : `${type}s`;
    const item = state[collectionName].find(i => i.id === id);
    ui.showEditModal(type, item, state);
}

async function handleDeleteItem(type, id) {
    const collectionName = type === 'timeEntry' ? 'timeEntries' : `${type}s`;
    const item = state[collectionName].find(i => i.id === id);
    if (!item) return;

    if (type === 'goal' && (item.name === "Economia Mensal" || item.name === "Reserva de Emergência")) {
        return ui.showToast('Metas padrão não podem ser excluídas.', 'info');
    }

    const wasDeleted = await db.handleDelete(firestoreDB, state.currentUser, type, item);
    if (wasDeleted) await updateDashboard();
}

async function handleSaveItem(type) {
    const modalId = `${type}-modal`;
    const formContainer = document.getElementById(modalId)?.querySelector('div > div');
    if (!formContainer) return;
    
    const id = document.getElementById(`save-${type}`).dataset.id;
    const itemData = {};

    // Coleta dados de todos os inputs relevantes dentro do modal
    const inputs = formContainer.querySelectorAll(`[id^="${type}-"]`);
    inputs.forEach(input => {
        const key = input.id.replace(`${type}-`, '');
        if (input.type === 'checkbox') itemData[key] = input.checked;
        else if (input.type === 'number' || input.inputMode === 'decimal' || input.id.includes('amount') || input.id.includes('target')) {
            itemData[key] = utils.parseBrazilianNumber(input.value);
        } else {
            itemData[key] = input.value;
        }
    });

    let saved = false;
    if (type === 'expense') {
        const installments = parseInt(document.getElementById('expense-installments').value) || 1;
        saved = await db.saveExpense(firestoreDB, state.currentUser, itemData, id, installments, false);
    } else {
        saved = await db.saveItem(firestoreDB, state.currentUser, type, itemData, id);
    }

    if (saved) {
        ui.closeModal(modalId);
        await updateDashboard();
    }
}

async function handleExpenseStatusToggle(id) {
    const expense = state.expenses.find(e => e.id === id);
    if (!expense) return;
    const success = await db.toggleExpenseStatus(firestoreDB, state.currentUser, expense);
    if (success) await updateDashboard();
}

function sendIncomeToCalculator(id) {
    const income = state.incomes.find(i => i.id === id);
    if (income) {
        document.getElementById('calc-base-salary').value = String(income.amount).replace('.', ',');
        document.querySelector('.tab-btn[data-tab="calculator"]').click();
        handleCalculateSalary();
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
    const confirmed = await ui.showConfirmation('Reiniciar Mês', 'Isso vai apagar os dados de renda, despesas e horas DO PERÍODO ATUAL. Tem certeza?', 'bg-orange-500 hover:bg-orange-600');
    if (!confirmed) return;

    const itemsToDelete = [...state.incomes, ...state.expenses, ...state.timeEntries];
    const batch = firestoreDB.batch();
    itemsToDelete.forEach(item => {
        let collectionName = '';
        if (state.incomes.includes(item)) collectionName = 'incomes';
        else if (state.expenses.includes(item)) collectionName = 'expenses';
        else if (state.timeEntries.includes(item)) collectionName = 'timeEntries';
        if (collectionName) {
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
        // Recarrega os dados iniciais (metas padrão, etc.) e atualiza a tela
        const initialData = await db.loadInitialData(firestoreDB, state.currentUser);
        state.goals = initialData.goals;
        state.investments = initialData.investments;
        state.settings = initialData.settings;
        await updateDashboard();
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


// --- SETUP DOS EVENT LISTENERS ---
function setupEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
    document.getElementById('month-select').addEventListener('change', (e) => { state.currentMonth = parseInt(e.target.value); updateDashboard(); });
    document.getElementById('year-select').addEventListener('change', (e) => { state.currentYear = parseInt(e.target.value); updateDashboard(); });
    document.getElementById('calculate-salary-btn').addEventListener('click', handleCalculateSalary);
    document.getElementById('generate-report-btn').addEventListener('click', handleGenerateReport);
    document.getElementById('theme-toggle-btn').addEventListener('click', () => { ui.toggleTheme(); updateDashboard(); });
    
    
    // Botões de ação do header e da conta
    document.getElementById('reset-btn').addEventListener('click', handleResetMonth);
    document.getElementById('clear-all-btn').addEventListener('click', handleClearAll);
    document.getElementById('save-settings-btn').addEventListener('click', handleSaveSettings);
    document.getElementById('save-password-btn').addEventListener('click', handlePasswordChange);
    document.getElementById('add-provento-btn').addEventListener('click', () => handleAddCustomItem('provento'));
    document.getElementById('add-discount-btn').addEventListener('click', () => handleAddCustomItem('discount'));

    // Botões "Adicionar"
    document.getElementById('add-income-btn').addEventListener('click', () => ui.showEditModal('income', null, state));
    document.getElementById('add-expense-btn').addEventListener('click', () => ui.showEditModal('expense', null, state));
    document.getElementById('add-goal-btn').addEventListener('click', () => ui.showEditModal('goal', null, state));
    document.getElementById('add-investment-btn').addEventListener('click', () => ui.showEditModal('investment', null, state));
    document.getElementById('add-hour-entry-btn').addEventListener('click', handleSaveTimeEntry);

    // Botões "Salvar" e "Cancelar" dos modais
    ['income', 'expense', 'goal', 'investment'].forEach(type => {
        document.getElementById(`save-${type}`).addEventListener('click', () => handleSaveItem(type));
        document.getElementById(`close-${type}-modal`).addEventListener('click', () => ui.closeModal(`${type}-modal`));
        document.getElementById(`cancel-${type}`).addEventListener('click', () => ui.closeModal(`${type}-modal`));
    });

    // Lógica das Abas
    // CÓDIGO CORRIGIDO PARA O QUAL VOCÊ DEVE MUDAR
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));
        this.classList.add('active-tab');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(`${this.dataset.tab}-content`).classList.remove('hidden');

        const nonMonthTabs = ['reports', 'calculator', 'account', 'investments', 'goals'];
        document.querySelectorAll('#month-select, #year-select').forEach(sel => {
            sel.classList.toggle('hidden', nonMonthTabs.includes(this.dataset.tab))
        });

        // A única linha que você precisa para chamar a lógica correta
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
            document.getElementById('user-email-display').textContent = user.email;

            const initialData = await db.loadInitialData(firestoreDB, user);
            state.goals = initialData.goals;
            state.investments = initialData.investments;
            state.settings = { ...state.settings, ...initialData.settings };

            ui.populateYearDropdown();
            document.getElementById('year-select').value = state.currentYear;
            document.getElementById('month-select').value = state.currentMonth;
            if (localStorage.getItem('theme') === 'dark') {
                document.documentElement.classList.add('dark');
            }
            ui.updateThemeButton(localStorage.getItem('theme') || 'light');
            
            setupEventListeners();
            await updateDashboard();
            
            document.querySelector('.tab-btn[data-tab="income"]').click();
        } else {
            window.location.href = 'login.html';
        }
    });
});