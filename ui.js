// Arquivo: ui.js (VERSÃO FINAL E CORRIGIDA)

import { formatCurrency, formatMinutesToHours, parseBrazilianNumber } from './utils.js';

let reportChartInstance;

// --- Funções de Notificação ---

/**
 * Mostra um pop-up de confirmação com até 3 opções customizáveis.
 * @returns {Promise<string>} Retorna uma string identificando o botão clicado ('confirm', 'secondary', 'cancel').
 */
export function showAdvancedConfirmation({ title, message, confirmText = 'Confirmar', confirmClass = 'bg-red-600 hover:bg-red-700', secondaryText = null, secondaryClass = 'bg-gray-500 hover:bg-gray-600' }) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmation-modal');
        const titleEl = document.getElementById('confirmation-title');
        const messageEl = document.getElementById('confirmation-message');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        // Remove o botão secundário antigo se ele existir
        const oldSecondaryBtn = document.getElementById('confirm-secondary-btn');
        if (oldSecondaryBtn) oldSecondaryBtn.remove();

        titleEl.textContent = title;
        messageEl.textContent = message;

        // Configura o botão principal (OK)
        okBtn.textContent = confirmText;
        okBtn.className = `font-bold py-2 px-5 rounded-lg text-white ${confirmClass}`;

        // Se um botão secundário for necessário, cria e configura
        if (secondaryText) {
            const secondaryBtn = document.createElement('button');
            secondaryBtn.id = 'confirm-secondary-btn';
            secondaryBtn.textContent = secondaryText;
            secondaryBtn.className = `font-bold py-2 px-5 rounded-lg text-white ${secondaryClass}`;
            // Insere o botão secundário antes do botão de cancelar
            cancelBtn.parentNode.insertBefore(secondaryBtn, cancelBtn);
            
            const handleSecondary = () => { closeModal('confirmation-modal'); resolve('secondary'); };
            secondaryBtn.addEventListener('click', handleSecondary, { once: true });
        }

        openModal('confirmation-modal');

        const handleOk = () => { closeModal('confirmation-modal'); resolve('confirm'); };
        const handleCancel = () => { closeModal('confirmation-modal'); resolve('cancel'); };
        
        okBtn.addEventListener('click', handleOk, { once: true });
        cancelBtn.addEventListener('click', handleCancel, { once: true });
    });
}

export function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const typeClasses = {
        success: 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/80 dark:text-green-200 dark:border-green-600',
        error: 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/80 dark:text-red-200 dark:border-red-600',
        info: 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/80 dark:text-blue-200 dark:border-blue-600'
    };
    const iconClasses = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    toast.className = `flex items-center p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 transform translate-x-full opacity-0 ${typeClasses[type] || typeClasses['info']}`;
    toast.innerHTML = `<i class="fas ${iconClasses[type] || iconClasses['info']} mr-3 text-xl"></i><span>${message}</span><button class="ml-auto text-lg opacity-70 hover:opacity-100">&times;</button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.remove('translate-x-full', 'opacity-0'); }, 10);
    const closeToast = () => {
        toast.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => toast.remove(), 300);
    };
    toast.querySelector('button').addEventListener('click', closeToast);
    setTimeout(closeToast, duration);
}

export function showConfirmation(title, message, confirmButtonClass = 'bg-red-600 hover:bg-red-700') {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmation-modal');
        const titleEl = document.getElementById('confirmation-title');
        const messageEl = document.getElementById('confirmation-message');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        titleEl.textContent = title;
        messageEl.textContent = message;
        okBtn.className = 'font-bold py-2 px-5 rounded-lg text-white';
        okBtn.classList.add(...confirmButtonClass.split(' '));
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        const handleOk = () => { closeModal('confirmation-modal'); resolve(true); };
        const handleCancel = () => { closeModal('confirmation-modal'); resolve(false); };
        okBtn.addEventListener('click', handleOk, { once: true });
        cancelBtn.addEventListener('click', handleCancel, { once: true });
    });
}

// --- Funções de Modal ---

export function showContributionModal(goalId, goalName) {
    document.getElementById('contribution-modal-title').textContent = `Contribuir para: ${goalName}`;
    document.getElementById('contribution-goalId').value = goalId;
    document.getElementById('contribution-amount').value = '';
    document.getElementById('contribution-date').value = new Date().toISOString().split('T')[0];
    openModal('contribution-modal');
}

export function openModal(modalId) {
    document.getElementById(modalId)?.classList.remove('hidden');
    document.getElementById(modalId)?.classList.add('flex');
}

export function closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
    document.getElementById(modalId)?.classList.remove('flex');
}

export function showEditModal(type, item, state) {
    // --- LÓGICA CORRIGIDA E ADICIONADA ---
    // Adiciona um tratamento especial para o modal de horas, que possui campos diferentes.
    if (type === 'timeEntry') {
        const modalId = 'hours-modal'; // Presume-se que o ID do seu modal de horas seja 'hours-modal'
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Erro Crítico: O modal com ID '${modalId}' não foi encontrado no HTML.`);
            showToast("O formulário de horas não pôde ser aberto.", "error");
            return;
        }
        
        const saveBtn = document.getElementById('save-hours'); // Presume-se que o botão de salvar tenha o ID 'save-hours'
        const modalTitle = modal.querySelector('h3');

        // Limpa todos os campos do formulário de horas
        modal.querySelectorAll('input').forEach(el => {
            if (el.type === 'checkbox') el.checked = false;
            else el.value = '';
        });

        if (item) {
            // Se estiver editando um item existente
            saveBtn.dataset.id = item.id;
            saveBtn.textContent = 'Atualizar';
            modalTitle.textContent = 'Editar Registro de Horas';
            // Preenche os campos com os dados do item
            for (const key in item) {
                const input = document.getElementById(`hours-${key}`); // Ex: hours-date, hours-entry
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = item[key];
                    } else {
                        input.value = item[key];
                    }
                }
            }
        } else {
            // Se estiver adicionando um novo item
            saveBtn.removeAttribute('data-id');
            saveBtn.textContent = 'Salvar';
            modalTitle.textContent = 'Adicionar Registro de Horas';
            // Define a data atual como padrão
            const dateField = document.getElementById('hours-date');
            if (dateField) {
               dateField.value = new Date().toISOString().split('T')[0];
            }
        }
        openModal(modalId); // Abre o modal de horas
        return; // Impede que o resto da função (lógica antiga) seja executado
    }
    
    // --- LÓGICA ORIGINAL (Mantida para os outros tipos de item) ---
    const modalType = type.replace('recurring', '').toLowerCase();
    const modalId = `${modalType}-modal`;
    
    const formContainer = document.getElementById(modalId)?.querySelector('div > div');
    if (!formContainer) return;

    formContainer.querySelectorAll('input, select').forEach(el => {
        if (el.type === 'checkbox') el.checked = false; else el.value = '';
    });

    const saveBtn = document.getElementById(`save-${modalType}`);
    const modalTitle = document.getElementById(modalId).querySelector('h3');
    const ptTerms = { income: 'Renda', expense: 'Despesa', goal: 'Meta', investment: 'Investimento', recurringIncome: 'Renda Fixa', recurringExpense: 'Despesa Fixa' };
    
    const dateField = document.getElementById(`${modalType}-date`);
    const existingDayField = document.getElementById(`${modalType}-dayOfMonth-group`);
    if (existingDayField) existingDayField.remove();

    if (type.startsWith('recurring')) {
        if (dateField) {
            dateField.style.display = 'none';
            const dayOfMonthFieldHTML = `...`; // (código do campo de dia do mês)
            dateField.insertAdjacentHTML('beforebegin', dayOfMonthFieldHTML);
        }
    } else {
        if (dateField) {
            dateField.style.display = 'block';
        }
    }

    if (modalType === 'expense') {
        populateCategoryDropdown(state.settings.expenseCategories);
        document.getElementById('installments-group').style.display = type.startsWith('recurring') ? 'none' : 'block';
    }

    if (item) {
        saveBtn.dataset.id = item.id;
        saveBtn.textContent = 'Atualizar';
        modalTitle.textContent = `Editar ${ptTerms[type]}`;
        for (const key in item) {
            const input = document.getElementById(`${modalType}-${key}`);
            if (input) input.value = item[key];
        }
    } else {
        saveBtn.removeAttribute('data-id');
        saveBtn.textContent = 'Salvar';
        modalTitle.textContent = `Adicionar ${ptTerms[type]}`;
        if (dateField && dateField.style.display !== 'none') {
            dateField.value = new Date().toISOString().split('T')[0];
        }
    }
    
    saveBtn.id = `save-${type}`;
    openModal(modalId);
}

// --- Funções de UI Geral ---

export function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('open');
    document.getElementById('mobile-menu-overlay').classList.toggle('hidden');
}

export function closeMobileMenu() {
    document.getElementById('mobile-menu').classList.remove('open');
    document.getElementById('mobile-menu-overlay').classList.add('hidden');
}

export function updatePrivacyButton(isPrivate) {
    const btn = document.getElementById('privacy-toggle-btn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (isPrivate) {
        icon.className = 'fas fa-eye-slash';
        btn.title = 'Mostrar Valores';
    } else {
        icon.className = 'fas fa-eye';
        btn.title = 'Ocultar Valores';
    }
}

export function updateThemeButton(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const text = document.getElementById('theme-toggle-text');
    const icon = btn.querySelector('i');
    if (theme === 'dark') {
        text.textContent = 'Modo Claro';
        icon.className = 'fas fa-sun mr-2';
    } else {
        text.textContent = 'Modo Escuro';
        icon.className = 'fas fa-moon mr-2';
    }
}

export function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    updateThemeButton(theme);
    return theme;
}

export function populateYearDropdown() {
    const yearSelect = document.getElementById('year-select');
    const currentYearDate = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let year = 2024; year <= currentYearDate + 10; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

export function populateCategoryDropdown(expenseCategories) {
    const select = document.getElementById('expense-category');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">Selecione a Categoria</option>';
    for (const key in expenseCategories) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = expenseCategories[key];
        select.appendChild(option);
    }
    select.value = currentVal;
}

// --- Funções de Atualização de Conteúdo ---

export function updateDashboardCards(totals) {
    const fields = {
        'total-income': totals.totalIncome, 'total-expenses': totals.totalExpenses, 'available-balance': totals.availableBalance,
        'month-savings': totals.monthSavings, 'pending-expenses': totals.pendingExpenses, 'total-invested': totals.totalInvestedThisMonth,
        'fixed-income': totals.fixedIncome, 'variable-income': totals.variableIncome, 'extra-income': totals.extraIncome,
        'home-expenses': totals.homeExpenses, 'food-expenses': totals.foodExpenses, 'transport-expenses': totals.transportExpenses,
        'health-expenses': totals.healthExpenses, 'education-expenses': totals.educationExpenses, 'entertainment-expenses': totals.entertainmentExpenses,
        'other-expenses': totals.otherExpenses, 'total-investment': totals.totalInvested, 'expected-return': totals.expectedReturn,
        'monthly-return': totals.monthlyReturn
    };
    for(const id in fields) {
        const el = document.getElementById(id);
        if(el) el.textContent = formatCurrency(fields[id]);
    }
    
    document.getElementById('total-worked-hours').textContent = formatMinutesToHours(totals.totalWorkedMinutes);
    document.getElementById('total-overtime-50').textContent = formatMinutesToHours(totals.totalOvertime50);
    document.getElementById('total-overtime-100').textContent = formatMinutesToHours(totals.totalOvertime100);
}

export function updatePeriodDisplay(periodRange, overtimeRange) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    document.getElementById('date-range-display').textContent = `Exibindo período: ${periodRange.startDate.toLocaleDateString('pt-BR', options)} a ${periodRange.endDate.toLocaleDateString('pt-BR', options)}`;
    document.getElementById('hours-period-display').textContent = `Período de apuração para horas: ${overtimeRange.startDate.toLocaleDateString('pt-BR')} a ${overtimeRange.endDate.toLocaleDateString('pt-BR')}`;
}

function renderCustomListResults(listArray, listElementId, currencyColorClass = '') {
    const listElement = document.getElementById(listElementId);
    if (!listElement) return;
    listElement.innerHTML = '';
    listArray.forEach(item => {
        const div = document.createElement('div');
        div.className = 'flex justify-between text-sm';
        const value = listElementId === 'res-custom-discounts-list' ? -item.value : item.value;
        div.innerHTML = `<p>${item.name}</p><p class="${currencyColorClass}">${formatCurrency(value)}</p>`;
        listElement.appendChild(div);
    });
}

export function updateCalculatorDisplay(totals, settings, callbacks) {
    document.getElementById('calc-ot-50-display').textContent = formatMinutesToHours(totals.totalOvertime50);
    document.getElementById('calc-ot-100-display').textContent = formatMinutesToHours(totals.totalOvertime100);
    
    const renderEditableCustomList = (listName, listArray, listElementId, deleteCallback) => {
        const list = document.getElementById(listElementId);
        if (!list) return;
        list.innerHTML = '';
        listArray.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded';
            div.innerHTML = `<span class="text-sm">${item.name} - ${formatCurrency(item.value)}</span><button class="delete-${listName}-btn text-red-500 hover:text-red-700" data-index="${index}"><i class="fas fa-times-circle"></i></button>`;
            list.appendChild(div);
        });
        document.querySelectorAll(`.delete-${listName}-btn`).forEach(btn => btn.addEventListener('click', () => deleteCallback(btn.dataset.index)));
    };

    renderEditableCustomList('provento', settings.customProventos, 'custom-proventos-list', callbacks.onDeleteProvento);
    renderEditableCustomList('discount', settings.customDiscounts, 'custom-discounts-list', callbacks.onDeleteDiscount);
}

export function displaySalaryResults(results, settings) {
    const fields = {
        'res-base-salary': results.baseSalary, 'res-ot-50': results.totalOt50, 'res-ot-100': results.totalOt100,
        'res-dsr': results.dsr, 'res-total-gross': results.totalGross, 'res-net-salary': results.netSalary, 'res-fgts': results.fgts
    };
    for(const id in fields) document.getElementById(id).textContent = formatCurrency(fields[id]);

    document.getElementById('res-inss').textContent = formatCurrency(results.inss > 0 ? -results.inss : 0);
    document.getElementById('res-irrf').textContent = formatCurrency(results.irrf > 0 ? -results.irrf : 0);
    document.getElementById('res-total-discounts').textContent = formatCurrency(results.totalDiscounts > 0 ? -results.totalDiscounts : 0);

    renderCustomListResults(settings.customProventos, 'res-custom-proventos-list');
    renderCustomListResults(settings.customDiscounts, 'res-custom-discounts-list', 'text-red-600 dark:text-red-400');
}

// --- Funções de Tabela ---

export function updateRecurringItemsTable(recurringIncomes, recurringExpenses, categories, callbacks) {
    // Tabela de Rendas Fixas
    createTable('recurring-incomes-table', recurringIncomes, item => {
        const row = document.createElement('tr');
        const incomeTypeLabels = { fixed: 'Fixo', variable: 'Variável', extra: 'Extra' };
        row.innerHTML = `
            <td class="px-6 py-4">${item.source}</td>
            <td class="px-6 py-4">${formatCurrency(item.amount)}</td>
            <td class="px-6 py-4">${incomeTypeLabels[item.type] || ''}</td>
            <td class="px-6 py-4">Todo dia ${item.dayOfMonth}</td>
            <td class="px-6 py-4 text-right no-print">
                <button class="delete-btn" data-id="${item.id}" data-type="recurringIncome"><i class="fas fa-trash text-red-600"></i></button>
            </td>`;
        return row;
    });
    document.querySelectorAll('#recurring-incomes-table .delete-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onDelete(btn.dataset.type, btn.dataset.id)));

    // Tabela de Despesas Fixas
    createTable('recurring-expenses-table', recurringExpenses, item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4">${item.description}</td>
            <td class="px-6 py-4">${formatCurrency(item.amount)}</td>
            <td class="px-6 py-4">${categories[item.category] || item.category}</td>
            <td class="px-6 py-4">Todo dia ${item.dayOfMonth}</td>
            <td class="px-6 py-4 text-right no-print">
                <button class="delete-btn" data-id="${item.id}" data-type="recurringExpense"><i class="fas fa-trash text-red-600"></i></button>
            </td>`;
        return row;
    });
    document.querySelectorAll('#recurring-expenses-table .delete-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onDelete(btn.dataset.type, btn.dataset.id)));
}

function getPaymentMethodBadge(payment) {
    const labels = { credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro', transfer: 'Transferência' };
    const classes = {
        credit: 'badge-credit', debit: 'badge-debit', pix: 'badge-pix',
        cash: 'badge-cash', transfer: 'badge-transfer'
    };
    return `<span class="badge ${classes[payment] || ''}">${labels[payment] || payment}</span>`;
}

function createTable(containerId, data, renderRowFn) {
    const tableBody = document.getElementById(containerId);
    if (!tableBody) return;

    tableBody.innerHTML = '';
    if (data.length === 0) {
        const colSpan = tableBody.closest('table')?.querySelector('thead tr')?.cells.length || 5;
        tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-4 text-gray-500">Nenhum item registrado.</td></tr>`;
        return;
    }
    data.forEach(item => tableBody.appendChild(renderRowFn(item)));
}

export function updateIncomeTable(incomes, callbacks) {
    const incomeTypeLabels = { fixed: 'Fixo', variable: 'Variável', extra: 'Extra' };
    createTable('incomes-table', incomes, item => {
        const row = document.createElement('tr');
        // Adiciona um ícone se o item for fixo (recorrente)
        const recurringIcon = item.isRecurring ? '<i class="fas fa-sync-alt text-blue-500 ml-2" title="Item Fixo"></i>' : '';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${item.source}${recurringIcon}</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatCurrency(item.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${incomeTypeLabels[item.type] || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap">${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right no-print">
                <button class="calc-income-btn" data-id="${item.id}" title="Calcular Salário Líquido"><i class="fas fa-calculator text-blue-600"></i></button>
                <button class="edit-btn ml-4" data-id="${item.id}" data-type="income"><i class="fas fa-edit text-indigo-600"></i></button>
                <button class="delete-btn ml-4" data-id="${item.id}" data-type="income"><i class="fas fa-trash text-red-600"></i></button>
            </td>`;
        return row;
    });
    
    document.querySelectorAll('#incomes-table .calc-income-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onCalc(btn.dataset.id)));
    document.querySelectorAll('#incomes-table .edit-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onEdit(btn.dataset.type, btn.dataset.id)));
    document.querySelectorAll('#incomes-table .delete-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onDelete(btn.dataset.type, btn.dataset.id)));
}

// SUBSTITUA A FUNÇÃO updateExpensesTable EM ui.js PELA VERSÃO ABAIXO

export function updateExpensesTable(expenses, categories, callbacks) {
    createTable('expenses-table', expenses, item => {
        const row = document.createElement('tr');
        if (item.isPaid) row.classList.add('expense-paid');
        // Adiciona um ícone se o item for fixo (recorrente)
        const recurringIcon = item.isRecurring ? '<i class="fas fa-sync-alt text-blue-500 ml-2" title="Item Fixo"></i>' : '';

        row.innerHTML = `
            <td class="px-2 py-4 whitespace-nowrap text-center no-print">
                <i class="fas ${item.isPaid ? 'fa-toggle-on text-green-500' : 'fa-toggle-off text-red-500'} status-toggle" data-id="${item.id}" title="${item.isPaid ? 'Paga' : 'Pendente'}"></i>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">${categories[item.category] || item.category}</td>
            <td class="px-6 py-4 whitespace-nowrap">${item.description}${recurringIcon}</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatCurrency(item.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td class="px-6 py-4 whitespace-nowrap">${getPaymentMethodBadge(item.payment)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right no-print">
                <button class="edit-btn" data-id="${item.id}" data-type="expense"><i class="fas fa-edit text-indigo-600"></i></button>
                <button class="delete-btn ml-4" data-id="${item.id}" data-type="expense"><i class="fas fa-trash text-red-600"></i></button>
            </td>`;
        return row;
    });
    
    document.querySelectorAll('#expenses-table .status-toggle').forEach(btn => btn.addEventListener('click', () => callbacks.onStatusToggle(btn.dataset.id)));
    document.querySelectorAll('#expenses-table .edit-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onEdit(btn.dataset.type, btn.dataset.id)));
    document.querySelectorAll('#expenses-table .delete-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onDelete(btn.dataset.type, btn.dataset.id)));
}

export function updateGoalsTable(goals, callbacks) {
    const savingsGoal = goals.find(g => g.name === "Economia Mensal");
    const emergencyGoal = goals.find(g => g.name === "Reserva de Emergência");

    if (savingsGoal) {
        const percent = savingsGoal.target > 0 ? Math.min(Math.round((savingsGoal.current / savingsGoal.target) * 100), 100) : 0;
        document.getElementById('monthly-savings-amount').innerHTML = `${formatCurrency(savingsGoal.current)} de <span id="monthly-savings-target">${formatCurrency(savingsGoal.target)}</span>`;
        document.getElementById('monthly-savings-percent').textContent = `${percent}%`;
        document.getElementById('monthly-savings-progress').style.width = `${percent}%`;
    }

    if (emergencyGoal) {
        const percent = emergencyGoal.target > 0 ? Math.min(Math.round((emergencyGoal.current / emergencyGoal.target) * 100), 100) : 0;
        document.getElementById('emergency-fund-amount').innerHTML = `${formatCurrency(emergencyGoal.current)} de <span id="emergency-fund-target">${formatCurrency(emergencyGoal.target)}</span>`;
        document.getElementById('emergency-fund-percent').textContent = `${percent}%`;
        document.getElementById('emergency-fund-progress').style.width = `${percent}%`;
    }

    const personalGoals = goals.filter(g => g.name !== "Economia Mensal" && g.name !== "Reserva de Emergência").sort((a, b) => a.name.localeCompare(b.name));

    createTable('goals-table', personalGoals, item => {
        const row = document.createElement('tr');
        const percent = item.target > 0 ? Math.min(Math.round((item.current / item.target) * 100), 100) : 0;
        row.innerHTML = `
            <td class="px-6 py-4">${item.name}</td>
            <td class="px-6 py-4">${formatCurrency(item.target)}</td>
            <td class="px-6 py-4">${formatCurrency(item.current)}</td>
            <td class="px-6 py-4">${item.deadline ? new Date(item.deadline + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</td>
            <td class="px-6 py-4"><div class="progress-bar"><div class="progress-fill bg-blue-600" style="width: ${percent}%"></div></div></td>
            <td class="px-6 py-4 text-right no-print">
                <button class="contribute-btn text-xl text-green-500 hover:text-green-400" data-id="${item.id}" data-name="${item.name}" title="Adicionar Contribuição"><i class="fas fa-plus-circle"></i></button>
                <button class="edit-btn ml-4" data-id="${item.id}" data-type="goal"><i class="fas fa-edit text-indigo-600"></i></button>
                <button class="delete-btn ml-4" data-id="${item.id}" data-type="goal"><i class="fas fa-trash text-red-600"></i></button>
            </td>`;
        return row;
    });

    document.querySelectorAll('#goals-table .contribute-btn').forEach(btn => btn.addEventListener('click', () => showContributionModal(btn.dataset.id, btn.dataset.name)));
    document.querySelectorAll('#goals-table .edit-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onEdit(btn.dataset.type, btn.dataset.id)));
    document.querySelectorAll('#goals-table .delete-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onDelete(btn.dataset.type, btn.dataset.id)));
}

export function updateInvestmentsTable(investments, callbacks) {
    const typeLabels = { savings: 'Poupança', cdb: 'CDB', 'lci-lca': 'LCI/LCA', funds: 'Fundos', stocks: 'Ações', fiis: 'FIIs', treasury: 'Tesouro' };
    const sortedInvestments = [...investments].sort((a, b) => new Date(b.date) - new Date(a.date));

    createTable('investments-table', sortedInvestments, item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${typeLabels[item.type] || item.type}</td>
            <td class="px-6 py-4 whitespace-nowrap">${item.description}</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatCurrency(item.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${item.yield || 0}% a.a.</td>
            <td class="px-6 py-4 whitespace-nowrap">${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right no-print">
                <button class="edit-btn" data-id="${item.id}" data-type="investment"><i class="fas fa-edit text-indigo-600"></i></button>
                <button class="delete-btn ml-4" data-id="${item.id}" data-type="investment"><i class="fas fa-trash text-red-600"></i></button>
            </td>`;
        return row;
    });

    document.querySelectorAll('#investments-table .edit-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onEdit(btn.dataset.type, btn.dataset.id)));
    document.querySelectorAll('#investments-table .delete-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onDelete(btn.dataset.type, btn.dataset.id)));
}

export function updateHoursTable(timeEntries, callbacks) {
    const sortedEntries = [...timeEntries].sort((a, b) => new Date(b.date) - new Date(a.date));

    const calculateWorkHours = (entry) => {
        const timeToMinutes = (timeStr) => {
            if (!timeStr) return 0;
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };
        const standardWorkdayMinutes = 8 * 60;
        const entryMinutes = timeToMinutes(entry.entry);
        const exitMinutes = timeToMinutes(entry.exit);
        const breakStartMinutes = timeToMinutes(entry.breakStart);
        const breakEndMinutes = timeToMinutes(entry.breakEnd);
        const breakMinutes = (breakEndMinutes > breakStartMinutes) ? (breakEndMinutes - breakStartMinutes) : 0;
        const workedMinutes = (exitMinutes > entryMinutes) ? (exitMinutes - entryMinutes - breakMinutes) : 0;
        const overtimeMinutes = Math.max(0, workedMinutes - standardWorkdayMinutes);
        return { workedMinutes, overtimeMinutes, isHoliday: entry.isHoliday };
    };

    createTable('hours-table', sortedEntries, item => {
        const row = document.createElement('tr');
        const { workedMinutes, overtimeMinutes, isHoliday } = calculateWorkHours(item);
        const holidayIcon = isHoliday ? '<i class="fas fa-star text-yellow-500 ml-2" title="Feriado"></i>' : '';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR', {weekday: 'short', day: '2-digit', month: '2-digit'})} ${holidayIcon}</td>
            <td class="px-6 py-4 whitespace-nowrap">${item.entry || ''} - ${item.exit || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap">${item.breakStart || ''} - ${item.breakEnd || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap font-bold">${formatMinutesToHours(workedMinutes)}</td>
            <td class="px-6 py-4 whitespace-nowrap font-bold text-green-600 dark:text-green-400">${formatMinutesToHours(overtimeMinutes)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right no-print">
                <button class="edit-btn" data-id="${item.id}" data-type="timeEntry"><i class="fas fa-edit text-indigo-600"></i></button>
                <button class="delete-btn ml-4" data-id="${item.id}" data-type="timeEntry"><i class="fas fa-trash text-red-600"></i></button>
            </td>`;
        return row;
    });

    document.querySelectorAll('#hours-table .edit-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onEdit(btn.dataset.type, btn.dataset.id)));
    document.querySelectorAll('#hours-table .delete-btn').forEach(btn => btn.addEventListener('click', () => callbacks.onDelete(btn.dataset.type, btn.dataset.id)));
}

// --- Relatórios e Gráficos ---

export function generateReport(state, totals) {
    const { expenses } = state;
    const { expenseCategories } = state.settings;

    const ctx = document.getElementById('report-chart')?.getContext('2d');
    if (!ctx) return;

    if (reportChartInstance) {
        reportChartInstance.destroy();
    }

    const reportType = document.getElementById('report-type').value;
    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#d1d5db' : '#374151';
    let chartConfig = {};

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: textColor
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: { color: textColor }
            },
            x: {
                grid: { color: gridColor },
                ticks: { color: textColor }
            }
        }
    };

    switch (reportType) {
        case 'expenses-by-category':
            const categoryData = Object.keys(expenseCategories).map(catKey =>
                expenses.filter(e => e.category === catKey).reduce((sum, e) => sum + e.amount, 0)
            );
            const categoryLabels = Object.values(expenseCategories);
            chartConfig = {
                type: 'pie',
                data: {
                    labels: categoryLabels,
                    datasets: [{
                        label: 'Despesas por Categoria',
                        data: categoryData,
                        backgroundColor: ['#ef4444', '#f97316', '#eab308', '#f59e0b', '#22c55e', '#3b82f6', '#6b7280', '#ec4899', '#84cc16']
                    }]
                },
                options: chartOptions
            };
            break;

        case 'income-breakdown':
            chartConfig = {
                type: 'doughnut',
                data: {
                    labels: ['Renda Fixa', 'Renda Variável', 'Renda Extra'],
                    datasets: [{
                        label: 'Detalhamento da Renda',
                        data: [totals.fixedIncome, totals.variableIncome, totals.extraIncome],
                        backgroundColor: ['#22c55e', '#3b82f6', '#8b5cf6']
                    }]
                },
                options: chartOptions
            };
            break;

        case 'paid-vs-pending':
            const paidAmount = expenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
            const pendingAmount = totals.totalExpenses - paidAmount;
            chartConfig = {
                type: 'pie',
                data: {
                    labels: ['Despesas Pagas', 'Despesas Pendentes'],
                    datasets: [{
                        label: 'Status das Despesas',
                        data: [paidAmount, pendingAmount],
                        backgroundColor: ['#22c55e', '#ef4444']
                    }]
                },
                options: chartOptions
            };
            break;
            
        case 'income-vs-expenses':
        default:
            chartConfig = {
                type: 'bar',
                data: {
                    labels: ['Resumo do Período'],
                    datasets: [
                        { label: 'Renda', data: [totals.totalIncome], backgroundColor: 'rgba(75, 192, 192, 0.7)' },
                        { label: 'Despesas', data: [totals.totalExpenses], backgroundColor: 'rgba(255, 99, 132, 0.7)' }
                    ]
                },
                options: chartOptions
            };
            break;
    }
    reportChartInstance = new Chart(ctx, chartConfig);
}