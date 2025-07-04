   var incomes = [], expenses = [], goals = [], investments = [], reportChartInstance;
    var currentYear = new Date().getFullYear();
    var currentMonth = new Date().getMonth() + 1;
    
    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('year-select').value = currentYear;
        loadData();
        document.getElementById('month-select').value = currentMonth;
        if (localStorage.getItem('theme') === 'dark') {
            document.documentElement.classList.add('dark');
        }
        updateThemeButton(localStorage.getItem('theme') || 'light');
        updateDashboard();
        setupEventListeners();
        document.querySelector('.tab-btn[data-tab="income"]').click();
    });

    function loadData() {
        const savedData = localStorage.getItem('financialData');
        if (savedData) {
            const data = JSON.parse(savedData);
            incomes = data.incomes || [];
            expenses = data.expenses || [];
            goals = data.goals || [];
            investments = data.investments || [];
        }
        if (!goals.find(g => g.name === "Reserva de Emergência")) goals.push({ id: generateId(), name: "Reserva de Emergência", target: 10000, current: 0, deadline: '' });
        if (!goals.find(g => g.name === "Economia Mensal")) goals.push({ id: generateId(), name: "Economia Mensal", target: 1000, current: 0, deadline: '' });
    }

    function saveData() {
        localStorage.setItem('financialData', JSON.stringify({ incomes, expenses, goals, investments }));
    }

    function generateId() { return Date.now().toString(36) + Math.random().toString(36).substring(2); }
    function formatCurrency(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0); }

    function parseBrazilianNumber(stringValue) {
        if (!stringValue || typeof stringValue !== 'string') return NaN;
        return parseFloat(stringValue.replace(/\./g, '').replace(',', '.'));
    }

    function updateThemeButton(theme) {
        const btn = document.getElementById('theme-toggle-btn');
        if (!btn) return;
        const text = document.getElementById('theme-toggle-text');
        const icon = btn.querySelector('i');
        if (theme === 'dark') {
            text.textContent = 'Modo Claro';
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            text.textContent = 'Modo Escuro';
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    function toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        const theme = isDark ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        updateThemeButton(theme);
        if (document.querySelector('.tab-btn[data-tab="reports"]').classList.contains('active-tab')) {
            generateReport();
        }
    }

    function calculateTotals() {
        const predicate = item => new Date(item.date + 'T00:00:00').getMonth() + 1 === currentMonth && new Date(item.date + 'T00:00:00').getFullYear() === currentYear;
        const currentIncomes = incomes.filter(predicate);
        const currentExpenses = expenses.filter(predicate);
        const currentInvestmentsInMonth = investments.filter(predicate);
        const totalIncome = currentIncomes.reduce((sum, item) => sum + item.amount, 0);
        const fixedIncome = currentIncomes.filter(i => i.type === 'fixed').reduce((s, i) => s + i.amount, 0);
        const variableIncome = currentIncomes.filter(i => i.type === 'variable').reduce((s, i) => s + i.amount, 0);
        const extraIncome = currentIncomes.filter(i => i.type === 'extra').reduce((s, i) => s + i.amount, 0);
        const totalExpenses = currentExpenses.reduce((sum, item) => sum + item.amount, 0);
        const homeExpenses = currentExpenses.filter(e => e.category === 'housing').reduce((s, e) => s + e.amount, 0);
        const foodExpenses = currentExpenses.filter(e => e.category === 'food').reduce((s, e) => s + e.amount, 0);
        const transportExpenses = currentExpenses.filter(e => e.category === 'transport').reduce((s, e) => s + e.amount, 0);
        const healthExpenses = currentExpenses.filter(e => e.category === 'health').reduce((s, e) => s + e.amount, 0);
        const educationExpenses = currentExpenses.filter(e => e.category === 'education').reduce((s, e) => s + e.amount, 0);
        const entertainmentExpenses = currentExpenses.filter(e => e.category === 'entertainment').reduce((s, e) => s + e.amount, 0);
        const otherExpenses = currentExpenses.filter(e => e.category === 'other').reduce((s, e) => s + e.amount, 0);
        const totalInvestedThisMonth = currentInvestmentsInMonth.reduce((sum, item) => sum + item.amount, 0);
        const totalInvestedOverall = investments.reduce((sum, item) => sum + item.amount, 0);
        const expectedReturn = investments.reduce((sum, item) => sum + (item.amount * (item.yield || 0) / 100), 0);
        const availableBalance = totalIncome - totalExpenses;
        const monthSavings = totalIncome - totalExpenses;
        return {
            totalIncome, fixedIncome, variableIncome, extraIncome, totalExpenses, homeExpenses, foodExpenses, transportExpenses, healthExpenses, educationExpenses, entertainmentExpenses, otherExpenses,
            totalInvestedThisMonth, totalInvested: totalInvestedOverall, expectedReturn, monthlyReturn: expectedReturn / 12, availableBalance, monthSavings: monthSavings > 0 ? monthSavings : 0
        };
    }

    function updateDashboard() {
        const totals = calculateTotals();
        document.getElementById('total-income').textContent = formatCurrency(totals.totalIncome);
        document.getElementById('total-expenses').textContent = formatCurrency(totals.totalExpenses);
        document.getElementById('available-balance').textContent = formatCurrency(totals.availableBalance);
        document.getElementById('month-savings').textContent = formatCurrency(totals.monthSavings);
        document.getElementById('total-invested').textContent = formatCurrency(totals.totalInvestedThisMonth);
        document.getElementById('fixed-income').textContent = formatCurrency(totals.fixedIncome);
        document.getElementById('variable-income').textContent = formatCurrency(totals.variableIncome);
        document.getElementById('extra-income').textContent = formatCurrency(totals.extraIncome);
        document.getElementById('home-expenses').textContent = formatCurrency(totals.homeExpenses);
        document.getElementById('food-expenses').textContent = formatCurrency(totals.foodExpenses);
        document.getElementById('transport-expenses').textContent = formatCurrency(totals.transportExpenses);
        document.getElementById('health-expenses').textContent = formatCurrency(totals.healthExpenses);
        document.getElementById('education-expenses').textContent = formatCurrency(totals.educationExpenses);
        document.getElementById('entertainment-expenses').textContent = formatCurrency(totals.entertainmentExpenses);
        document.getElementById('other-expenses').textContent = formatCurrency(totals.otherExpenses);
        document.getElementById('total-investment').textContent = formatCurrency(totals.totalInvested);
        document.getElementById('expected-return').textContent = formatCurrency(totals.expectedReturn);
        document.getElementById('monthly-return').textContent = formatCurrency(totals.monthlyReturn);
        updateIncomeTable();
        updateExpensesTable();
        updateGoalsTable(totals.monthSavings, totals.totalInvested);
        updateInvestmentsTable();
        saveData();
    }

    function getPaymentMethodBadge(payment) {
        const labels = { credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro', transfer: 'Transferência' };
        return `<span class="badge badge-${payment}">${labels[payment] || payment}</span>`;
    }

    function updateTable(type, data, renderRowFn) {
        const tableBody = document.getElementById(`${type}s-table`);
        tableBody.innerHTML = '';
        if (data.length === 0) {
            const colSpan = tableBody.closest('table').querySelector('thead tr').cells.length;
            tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-4 text-gray-500">Nenhum item registrado.</td></tr>`;
            return;
        }
        data.forEach(item => tableBody.appendChild(renderRowFn(item)));
        document.querySelectorAll(`.edit-${type}`).forEach(btn => btn.addEventListener('click', (e) => handleEdit(type, e.currentTarget.dataset.id)));
        document.querySelectorAll(`.delete-${type}`).forEach(btn => btn.addEventListener('click', (e) => handleDelete(type, e.currentTarget.dataset.id)));
    }

    function updateIncomeTable() {
        const predicate = item => new Date(item.date + 'T00:00:00').getMonth() + 1 === currentMonth && new Date(item.date + 'T00:00:00').getFullYear() === currentYear;
        const currentData = incomes.filter(predicate).sort((a, b) => new Date(b.date) - new Date(a.date));
        updateTable('income', currentData, item => {
            const row = document.createElement('tr');
            if (item.type === 'fixed') row.classList.add('income-fixed-row'); else if (item.type === 'variable') row.classList.add('income-variable-row'); else if (item.type === 'extra') row.classList.add('income-extra-row');
            row.innerHTML = `<td class="px-6 py-4 whitespace-nowrap">${item.source}</td><td class="px-6 py-4 whitespace-nowrap">${formatCurrency(item.amount)}</td><td class="px-6 py-4 whitespace-nowrap">${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</td><td class="px-6 py-4 whitespace-nowrap">${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td class="px-6 py-4 whitespace-nowrap text-right no-print"><button class="edit-income text-indigo-600 hover:text-indigo-400" data-id="${item.id}"><i class="fas fa-edit"></i></button><button class="delete-income ml-4 text-red-600 hover:text-red-400" data-id="${item.id}"><i class="fas fa-trash"></i></button></td>`;
            return row;
        });
    }

    function updateExpensesTable() {
        const predicate = item => new Date(item.date + 'T00:00:00').getMonth() + 1 === currentMonth && new Date(item.date + 'T00:00:00').getFullYear() === currentYear;
        const currentData = expenses.filter(predicate).sort((a, b) => new Date(b.date) - new Date(a.date));
        const categoryLabels = { housing: 'Moradia', food: 'Alimentação', transport: 'Transporte', health: 'Saúde', education: 'Educação', entertainment: 'Lazer', other: 'Outros' };
        updateTable('expense', currentData, item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="px-6 py-4 whitespace-nowrap">${categoryLabels[item.category] || item.category}</td><td class="px-6 py-4 whitespace-nowrap">${item.description}</td><td class="px-6 py-4 whitespace-nowrap">${formatCurrency(item.amount)}</td><td class="px-6 py-4 whitespace-nowrap">${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td class="px-6 py-4 whitespace-nowrap">${getPaymentMethodBadge(item.payment)}</td><td class="px-6 py-4 whitespace-nowrap text-right no-print"><button class="edit-expense text-indigo-600 hover:text-indigo-400" data-id="${item.id}"><i class="fas fa-edit"></i></button><button class="delete-expense ml-4 text-red-600 hover:text-red-400" data-id="${item.id}"><i class="fas fa-trash"></i></button></td>`;
            return row;
        });
    }

    function updateGoalsTable(monthSavings, totalInvested) {
        const savingsGoal = goals.find(g => g.name === "Economia Mensal");
        if (savingsGoal) savingsGoal.current = monthSavings;
        const emergencyGoal = goals.find(g => g.name === "Reserva de Emergência");
        if (emergencyGoal) emergencyGoal.current = totalInvested;
        [savingsGoal, emergencyGoal].forEach(goal => {
            if (!goal) return;
            const type = goal.name === "Economia Mensal" ? 'monthly-savings' : 'emergency-fund';
            const percent = goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0;
            document.getElementById(`${type}-target`).textContent = `Meta: ${formatCurrency(goal.target)}`;
            document.getElementById(`${type}-amount`).textContent = `Atual: ${formatCurrency(goal.current)} (${percent}%)`;
            document.getElementById(`${type}-percent`).textContent = `${percent}%`;
            document.getElementById(`${type}-progress`).style.width = `${percent}%`;
        });
        const personalGoals = goals.filter(g => g.name !== "Economia Mensal" && g.name !== "Reserva de Emergência");
        updateTable('goal', personalGoals, item => {
            const row = document.createElement('tr');
            const percent = item.target > 0 ? Math.min(Math.round((item.current / item.target) * 100), 100) : 0;
            row.innerHTML = `<td class="px-6 py-4 whitespace-nowrap">${item.name}</td><td class="px-6 py-4 whitespace-nowrap">${formatCurrency(item.target)}</td><td class="px-6 py-4 whitespace-nowrap">${formatCurrency(item.current)}</td><td class="px-6 py-4 whitespace-nowrap">${item.deadline ? new Date(item.deadline + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</td><td class="px-6 py-4 whitespace-nowrap"><div class="progress-bar"><div class="progress-fill bg-blue-600" style="width: ${percent}%"></div></div></td><td class="px-6 py-4 whitespace-nowrap text-right no-print"><button class="edit-goal text-indigo-600 hover:text-indigo-400" data-id="${item.id}"><i class="fas fa-edit"></i></button><button class="delete-goal ml-4 text-red-600 hover:text-red-400" data-id="${item.id}"><i class="fas fa-trash"></i></button></td>`;
            return row;
        });
    }

    function updateInvestmentsTable() {
        const allInvestments = [...investments].sort((a,b) => new Date(b.date) - new Date(a.date));
        const typeLabels = { savings: 'Poupança', cdb: 'CDB', 'lci-lca': 'LCI/LCA', funds: 'Fundos', stocks: 'Ações', fiis: 'FIIs', treasury: 'Tesouro' };
        updateTable('investment', allInvestments, item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="px-6 py-4 whitespace-nowrap">${typeLabels[item.type] || item.type}</td><td class="px-6 py-4 whitespace-nowrap">${item.description}</td><td class="px-6 py-4 whitespace-nowrap">${formatCurrency(item.amount)}</td><td class="px-6 py-4 whitespace-nowrap">${item.yield || 0}% a.a.</td><td class="px-6 py-4 whitespace-nowrap">${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td class="px-6 py-4 whitespace-nowrap text-right no-print"><button class="edit-investment text-indigo-600 hover:text-indigo-400" data-id="${item.id}"><i class="fas fa-edit"></i></button><button class="delete-investment ml-4 text-red-600 hover:text-red-400" data-id="${item.id}"><i class="fas fa-trash"></i></button></td>`;
            return row;
        });
    }

    function generateReport() {
        const ctx = document.getElementById('report-chart').getContext('2d');
        if (reportChartInstance) reportChartInstance.destroy();
        const totals = calculateTotals();
        const reportType = document.getElementById('report-type').value;
        const isDarkMode = document.documentElement.classList.contains('dark');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#d1d5db' : '#374151';
        let chartConfig = {};

        switch (reportType) {
            case 'expenses-by-category':
                chartConfig = { type: 'pie', data: { labels: ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Outros'], datasets: [{ label: 'Despesas', data: [totals.homeExpenses, totals.foodExpenses, totals.transportExpenses, totals.entertainmentExpenses, totals.healthExpenses, totals.educationExpenses, totals.otherExpenses], backgroundColor: ['#ef4444', '#f97316', '#eab308', '#f59e0b', '#22c55e', '#3b82f6', '#6b7280'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } } } };
                break;
            case 'income-breakdown':
                chartConfig = { type: 'doughnut', data: { labels: ['Renda Fixa', 'Variável', 'Extra'], datasets: [{ label: 'Renda', data: [totals.fixedIncome, totals.variableIncome, totals.extraIncome], backgroundColor: ['#22c55e', '#3b82f6', '#8b5cf6'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } } } };
                break;
            default:
                chartConfig = { type: 'bar', data: { labels: ['Resumo do Mês'], datasets: [{ label: 'Renda', data: [totals.totalIncome], backgroundColor: 'rgba(75, 192, 192, 0.7)' }, { label: 'Despesas', data: [totals.totalExpenses], backgroundColor: 'rgba(255, 99, 132, 0.7)' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } }, scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } }, x: { grid: { color: gridColor }, ticks: { color: textColor } } } } };
                break;
        }
        reportChartInstance = new Chart(ctx, chartConfig);
    }

    function setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(button => button.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));
            this.classList.add('active-tab');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            document.getElementById(`${this.dataset.tab}-content`).classList.remove('hidden');
            if (this.dataset.tab === 'reports') generateReport();
        }));
        document.getElementById('print-btn').addEventListener('click', () => window.print());
        document.getElementById('reset-btn').addEventListener('click', () => {
            if (confirm('Tem certeza? Isso vai apagar os dados deste mês.')) {
                const predicate = item => !(new Date(item.date + 'T00:00:00').getMonth() + 1 === currentMonth && new Date(item.date + 'T00:00:00').getFullYear() === currentYear);
                incomes = incomes.filter(predicate);
                expenses = expenses.filter(predicate);
                investments = investments.filter(predicate);
                updateDashboard();
            }
        });
        document.getElementById('clear-all-btn').addEventListener('click', () => {
            if (confirm('ATENÇÃO! Isso apagará TODOS os dados. Deseja continuar?')) {
                localStorage.clear(); location.reload();
            }
        });
        document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
        document.getElementById('month-select').addEventListener('change', (e) => { currentMonth = parseInt(e.target.value); updateDashboard(); });
        document.getElementById('year-select').addEventListener('change', (e) => { currentYear = parseInt(e.target.value); updateDashboard(); });
        ['income', 'expense', 'goal', 'investment'].forEach(type => {
            document.getElementById(`add-${type}-btn`).addEventListener('click', () => handleEdit(type, null));
            document.getElementById(`save-${type}`).addEventListener('click', function() { addOrUpdateItem(type, this.dataset.id); });
            document.getElementById(`close-${type}-modal`).addEventListener('click', () => closeModal(`${type}-modal`));
            document.getElementById(`cancel-${type}`).addEventListener('click', () => closeModal(`${type}-modal`));
        });
        document.getElementById('generate-report-btn').addEventListener('click', generateReport);
    }

    function openModal(modalId) { document.getElementById(modalId).classList.remove('hidden'); }
    function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }

    function addOrUpdateItem(type, id) {
        const itemData = {};
        let isValid = false;
        
        const getNumericValue = (elementId) => parseBrazilianNumber(document.getElementById(elementId).value);

        if (type === 'income') {
            itemData.source = document.getElementById('income-source').value.trim();
            itemData.amount = getNumericValue('income-amount');
            itemData.type = document.getElementById('income-type').value;
            itemData.date = document.getElementById('income-date').value;
            if (itemData.source && !isNaN(itemData.amount) && itemData.amount > 0 && itemData.date) isValid = true;
        } else if (type === 'expense') {
            itemData.description = document.getElementById('expense-description').value.trim();
            itemData.amount = getNumericValue('expense-amount');
            itemData.category = document.getElementById('expense-category').value;
            itemData.payment = document.getElementById('expense-payment').value;
            itemData.date = document.getElementById('expense-date').value;
            if (itemData.description && !isNaN(itemData.amount) && itemData.amount > 0 && itemData.date) isValid = true;
        } else if (type === 'goal') {
            itemData.name = document.getElementById('goal-name').value.trim();
            itemData.target = getNumericValue('goal-target');
            itemData.current = getNumericValue('goal-current') || 0;
            itemData.deadline = document.getElementById('goal-deadline').value;
            if (itemData.name && !isNaN(itemData.target) && itemData.target > 0) isValid = true;
        } else if (type === 'investment') {
            itemData.description = document.getElementById('investment-description').value.trim();
            itemData.amount = getNumericValue('investment-amount');
            itemData.type = document.getElementById('investment-type').value;
            itemData.yield = getNumericValue('investment-yield') || 0;
            itemData.date = document.getElementById('investment-date').value;
            if (itemData.description && !isNaN(itemData.amount) && itemData.amount > 0 && itemData.date) isValid = true;
        }

        if (!isValid) {
            alert('Por favor, preencha todos os campos obrigatórios corretamente.\nVerifique se o valor numérico é maior que zero.');
            return;
        }
        
        const dataArray = window[`${type}s`];
        if (id) {
            const index = dataArray.findIndex(item => item.id === id);
            if (index > -1) dataArray[index] = { ...dataArray[index], ...itemData };
        } else {
            itemData.id = generateId();
            dataArray.push(itemData);
        }
        updateDashboard();
        closeModal(`${type}-modal`);
    }

    function handleEdit(type, id) {
        const modalId = `${type}-modal`;
        const saveBtn = document.getElementById(`save-${type}`);
        const modalTitle = document.getElementById(modalId).querySelector('h3');
        const ptTerms = { income: 'Renda', expense: 'Despesa', goal: 'Meta', investment: 'Investimento' };
        
        const form = document.getElementById(modalId).querySelector('.p-4');
        form.querySelectorAll('input, select').forEach(el => {
            if (el.type === 'text' || el.type === 'date') el.value = '';
            else if (el.tagName === 'SELECT') el.selectedIndex = 0;
        });

        if (id) {
            saveBtn.setAttribute('data-id', id);
            saveBtn.textContent = 'Atualizar';
            modalTitle.textContent = `Editar ${ptTerms[type]}`;
            const item = window[`${type}s`].find(i => i.id === id);
            if (item) {
                const formatForInput = (num) => String(num).replace('.',',');
                if (type === 'income') {
                    document.getElementById('income-source').value = item.source;
                    document.getElementById('income-amount').value = formatForInput(item.amount);
                    document.getElementById('income-type').value = item.type;
                    document.getElementById('income-date').value = item.date;
                } else if (type === 'expense') {
                    document.getElementById('expense-description').value = item.description;
                    document.getElementById('expense-amount').value = formatForInput(item.amount);
                    document.getElementById('expense-category').value = item.category;
                    document.getElementById('expense-payment').value = item.payment;
                    document.getElementById('expense-date').value = item.date;
                } else if (type === 'goal') {
                    document.getElementById('goal-name').value = item.name;
                    document.getElementById('goal-target').value = formatForInput(item.target);
                    document.getElementById('goal-current').value = formatForInput(item.current);
                    document.getElementById('goal-deadline').value = item.deadline;
                } else if (type === 'investment') {
                    document.getElementById('investment-description').value = item.description;
                    document.getElementById('investment-amount').value = formatForInput(item.amount);
                    document.getElementById('investment-type').value = item.type;
                    document.getElementById('investment-yield').value = formatForInput(item.yield);
                    document.getElementById('investment-date').value = item.date;
                }
            }
        } else {
            saveBtn.removeAttribute('data-id');
            saveBtn.textContent = 'Salvar';
            modalTitle.textContent = `Adicionar ${ptTerms[type]}`;
            const dateField = document.getElementById(`${type}-date`);
            if (dateField) dateField.value = new Date().toISOString().split('T')[0];
        }
        openModal(modalId);
    }

    function handleDelete(type, id) {
        if (!confirm('Tem certeza que deseja excluir este item?')) return;
        const goal = (type === 'goal') ? goals.find(g => g.id === id) : null;
        if (goal && (goal.name === "Economia Mensal" || goal.name === "Reserva de Emergência")) {
            alert('Metas padrão não podem ser excluídas.');
            return;
        }
        window[`${type}s`] = window[`${type}s`].filter(i => i.id !== id);
        updateDashboard();
    }