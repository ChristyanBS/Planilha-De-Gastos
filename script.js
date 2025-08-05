// INICIALIZAÇÃO E VARIÁVEIS GLOBAIS
// =======================================================
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser;
let deferredPrompt;

var incomes = [], expenses = [], goals = [], investments = [], timeEntries = [], reportChartInstance;
var expenseCategories = {};
var customDiscounts = [];
var customProventos = [];
var payPeriodStartDay = 1;

var currentYear = new Date().getFullYear();
var currentMonth = new Date().getMonth() + 1;

// =======================================================
// NOVAS FUNÇÕES DE NOTIFICAÇÃO (TOAST E CONFIRMAÇÃO)
// =======================================================

/**
 * Mostra uma notificação toast no canto da tela.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de toast ('success', 'error', 'info').
 * @param {number} duration - Duração em milissegundos para o toast desaparecer.
 */
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const typeClasses = {
        success: 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/80 dark:text-green-200 dark:border-green-600',
        error: 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/80 dark:text-red-200 dark:border-red-600',
        info: 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/80 dark:text-blue-200 dark:border-blue-600'
    };
    const iconClasses = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        info: 'fa-info-circle'
    }

    toast.className = `flex items-center p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 transform translate-x-full opacity-0 ${typeClasses[type] || typeClasses['info']}`;
    toast.innerHTML = `
        <i class="fas ${iconClasses[type] || iconClasses['info']} mr-3 text-xl"></i>
        <span>${message}</span>
        <button class="ml-auto text-lg opacity-70 hover:opacity-100">&times;</button>
    `;

    container.appendChild(toast);

    // Animação de entrada
    setTimeout(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    }, 10);

    const closeToast = () => {
        toast.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => toast.remove(), 300);
    };
    
    toast.querySelector('button').addEventListener('click', closeToast);
    setTimeout(closeToast, duration);
}

/**
 * Exibe um modal de confirmação e retorna uma Promise que resolve para true ou false.
 * @param {string} title - O título do modal.
 * @param {string} message - A mensagem de confirmação.
 * @param {string} confirmButtonClass - (Opcional) Classe de cor do botão de confirmação. Ex: 'bg-red-600'
 * @returns {Promise<boolean>} - Resolve para `true` se confirmado, `false` se cancelado.
 */
function showConfirmation(title, message, confirmButtonClass = 'bg-red-600 hover:bg-red-700') {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmation-modal');
        const titleEl = document.getElementById('confirmation-title');
        const messageEl = document.getElementById('confirmation-message');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        titleEl.textContent = title;
        messageEl.textContent = message;

        // Reseta e aplica a classe de cor do botão
        okBtn.className = 'font-bold py-2 px-5 rounded-lg text-white';
        okBtn.classList.add(...confirmButtonClass.split(' '));

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        const handleOk = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            resolve(false);
        };
        
        // Usamos { once: true } para que os listeners sejam removidos automaticamente após o primeiro clique
        okBtn.addEventListener('click', handleOk, { once: true });
        cancelBtn.addEventListener('click', handleCancel, { once: true });
    });
}


// PONTO DE ENTRADA PRINCIPAL
// =======================================================
document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(async user => {
        populateYearDropdown();
        if (user) {
            currentUser = user;
            document.getElementById('main-container').style.display = 'block';

            const userEmailDisplay = document.getElementById('user-email-display');
            if (userEmailDisplay) {
                userEmailDisplay.textContent = currentUser.email;
            }

            await loadDataFromFirestore();
            
            document.getElementById('year-select').value = currentYear;
            document.getElementById('month-select').value = currentMonth;
            if (localStorage.getItem('theme') === 'dark') {
                document.documentElement.classList.add('dark');
            }
            updateThemeButton(localStorage.getItem('theme') || 'light');
            
            updateDashboard();
            setupEventListeners();
            document.querySelector('.tab-btn[data-tab="income"]').click();
        } else {
            window.location.href = 'login.html';
        }
    });
});


// FUNÇÃO PARA ADICIONAR/ATUALIZAR SENHA
// =======================================================
async function adicionarSenhaNaConta(novaSenha) {
  const user = firebase.auth().currentUser;
  const feedbackEl = document.getElementById('password-feedback');

  if (!user) {
    feedbackEl.textContent = "Nenhum usuário logado.";
    feedbackEl.className = 'text-sm mt-2 text-center text-red-500';
    return;
  }

  const temProvedorSenha = user.providerData.some(
    (provider) => provider.providerId === 'password'
  );

  try {
    if (temProvedorSenha) {
      await user.updatePassword(novaSenha);
      feedbackEl.textContent = "Senha atualizada com sucesso!";
      feedbackEl.className = 'text-sm mt-2 text-center text-green-500';
    } else {
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, novaSenha);
      await user.linkWithCredential(credential);
      feedbackEl.textContent = "Login com senha adicionado! Agora você pode usar ambos os métodos.";
      feedbackEl.className = 'text-sm mt-2 text-center text-green-500';
    }
    document.getElementById('new-password').value = '';
  } catch (error) {
    console.error("Erro ao processar senha:", error);
    let userMessage = "Ocorreu um erro. Tente novamente.";
    if (error.code === 'auth/weak-password') {
        userMessage = "A senha é muito fraca. Use pelo menos 6 caracteres.";
    } else if (error.code === 'auth/requires-recent-login') {
        userMessage = "Esta é uma operação sensível. Por favor, faça logout e login novamente antes de alterar a senha.";
    }
    feedbackEl.textContent = userMessage;
    feedbackEl.className = 'text-sm mt-2 text-center text-red-500';
  }
}


// FUNÇÕES DE BANCO DE DADOS (FIRESTORE)
// =======================================================
async function loadDataFromFirestore() {
    if (!currentUser) return;
    const userDocRef = db.collection('users').doc(currentUser.uid);
    const loadCollection = async (collectionName) => {
        const snapshot = await userDocRef.collection(collectionName).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };
    [incomes, expenses, goals, investments, timeEntries] = await Promise.all([
        loadCollection('incomes'),
        loadCollection('expenses'),
        loadCollection('goals'),
        loadCollection('investments'),
        loadCollection('timeEntries')
    ]);
    const userSettingsDoc = await userDocRef.get();
    if (userSettingsDoc.exists) {
        const settings = userSettingsDoc.data();
        document.getElementById('header-subtitle').textContent = settings.headerSubtitle || `${currentUser.displayName || currentUser.email}`;
        customDiscounts = settings.customDiscounts || [];
        customProventos = settings.customProventos || [];
        payPeriodStartDay = settings.payPeriodStartDay || 1; // Carrega a configuração ou usa 1 como padrão
        document.getElementById('setting-start-day').value = payPeriodStartDay;
        expenseCategories = settings.expenseCategories || {
            housing: 'Moradia', food: 'Alimentação', transport: 'Transporte',
            health: 'Saúde', education: 'Educação', entertainment: 'Lazer',
            other: 'Outros'
        };
    } else {
        document.getElementById('header-subtitle').textContent = `${currentUser.displayName || currentUser.email}`;
        expenseCategories = {
            housing: 'Moradia', food: 'Alimentação', transport: 'Transporte',
            health: 'Saúde', education: 'Educação', entertainment: 'Lazer',
            other: 'Outros'
        };
    }
    if (!goals.find(g => g.name === "Reserva de Emergência")) {
        const newGoal = { name: "Reserva de Emergência", target: 10000, current: 0, deadline: '' };
        const docRef = await db.collection('users').doc(currentUser.uid).collection('goals').add(newGoal);
        goals.push({id: docRef.id, ...newGoal});
    }
    if (!goals.find(g => g.name === "Economia Mensal")) {
        const newGoal = { name: "Economia Mensal", target: 1000, current: 0, deadline: '' };
        const docRef = await db.collection('users').doc(currentUser.uid).collection('goals').add(newGoal);
        goals.push({id: docRef.id, ...newGoal});
    }
    renderCustomDiscounts();
    renderCustomProventos();
}

// SUBSTITUA TODA a sua função addOrUpdateItem por esta:
// SUBSTITUA NOVAMENTE a função addOrUpdateItem por esta versão final
async function addOrUpdateItem(type, id) {
    const itemData = {};
    let isValid = false;
    const getNumericValue = (elementId) => parseBrazilianNumber(document.getElementById(elementId).value);

    // Lógica para Renda, Metas e Investimentos (inalterada)
    if (type === 'income') {
        itemData.source = document.getElementById('income-source').value.trim();
        itemData.amount = getNumericValue('income-amount');
        itemData.type = document.getElementById('income-type').value;
        itemData.date = document.getElementById('income-date').value;
        if (itemData.source && !isNaN(itemData.amount) && itemData.amount > 0 && itemData.date) isValid = true;
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
    
    // LÓGICA CORRIGIDA PARA DESPESAS
    else if (type === 'expense') {
        itemData.description = document.getElementById('expense-description').value.trim();
        itemData.amount = getNumericValue('expense-amount');
        itemData.category = document.getElementById('expense-category').value;
        itemData.payment = document.getElementById('expense-payment').value;
        itemData.date = document.getElementById('expense-date').value;
        itemData.isPaid = document.getElementById('expense-paid-checkbox').checked;
        const installments = parseInt(document.getElementById('expense-installments').value) || 1;

        if (!itemData.description || isNaN(itemData.amount) || itemData.amount <= 0 || !itemData.date) {
            showToast('Por favor, preencha todos os campos corretamente.', 'error');
            return;
        }

        try {
            if (id) { // Editando uma despesa existente
                const originalItem = expenses.find(item => item.id === id);

                if (originalItem.installmentGroupId && originalItem.category !== itemData.category) {
                    const confirmed = await showConfirmation(
                        'Atualizar Parcelas',
                        'Você alterou a categoria de uma despesa parcelada. Deseja aplicar esta nova categoria para todas as parcelas futuras desta compra?',
                        'bg-indigo-600 hover:bg-indigo-700'
                    );

                    if (confirmed) {
                        const batch = db.batch();
                        const userDocRef = db.collection('users').doc(currentUser.uid);
                        const futureInstallmentsQuery = await userDocRef.collection('expenses')
                            .where('installmentGroupId', '==', originalItem.installmentGroupId)
                            .where('date', '>=', originalItem.date)
                            .get();
                        
                        futureInstallmentsQuery.docs.forEach(doc => {
                            // CORREÇÃO: Verificamos qual item é o atual para atualizar todos os dados,
                            // e nos outros, atualizamos apenas a categoria.
                            if (doc.id === id) {
                                batch.update(doc.ref, itemData);
                            } else {
                                batch.update(doc.ref, { category: itemData.category });
                            }
                        });
                        
                        await batch.commit();

                        expenses.forEach(exp => {
                            if (exp.installmentGroupId === originalItem.installmentGroupId && new Date(exp.date) >= new Date(originalItem.date)) {
                                exp.category = itemData.category;
                            }
                        });
                        const index = expenses.findIndex(item => item.id === id);
                        if (index > -1) expenses[index] = { ...expenses[index], ...itemData };
                        showToast('Todas as parcelas futuras foram atualizadas!', 'success');
                    } else {
                        await db.collection('users').doc(currentUser.uid).collection('expenses').doc(id).update(itemData);
                        const index = expenses.findIndex(item => item.id === id);
                        if (index > -1) expenses[index] = { ...expenses[index], ...itemData };
                    }
                } else {
                    await db.collection('users').doc(currentUser.uid).collection('expenses').doc(id).update(itemData);
                    const index = expenses.findIndex(item => item.id === id);
                    if (index > -1) expenses[index] = { ...expenses[index], ...itemData };
                }
            } else { // Criando uma nova despesa
                const groupId = (installments > 1) ? Date.now().toString(36) + Math.random().toString(36).substr(2) : null;
                const originalDate = new Date(itemData.date + 'T00:00:00');
                const batch = db.batch(); // Usar batch para criar também é mais eficiente
                const userDocRef = db.collection('users').doc(currentUser.uid);

                for (let i = 1; i <= installments; i++) {
                    const newExpense = { ...itemData };
                    newExpense.description = installments > 1 ? `${itemData.description} (${i}/${installments})` : itemData.description;
                    if (groupId) newExpense.installmentGroupId = groupId;
                    const installmentDate = new Date(originalDate);
                    installmentDate.setMonth(originalDate.getMonth() + (i - 1));
                    newExpense.date = installmentDate.toISOString().split('T')[0];
                    
                    const newDocRef = userDocRef.collection('expenses').doc(); // Cria uma referência com ID novo
                    batch.set(newDocRef, newExpense);
                }
                await batch.commit();
            }
            
            await updateDashboard();
            closeModal('expense-modal');
            showToast('Despesa salva com sucesso!', 'success');
        } catch(e) { 
            console.error("Erro ao salvar despesa: ", e); 
            showToast("Falha ao salvar despesa.", 'error'); 
        }
        return;
    }

    // Lógica genérica para outros tipos (inalterada)
    if (!isValid) {
        showToast('Por favor, preencha os campos obrigatórios e verifique se o valor é maior que zero.', 'error');
        return;
    }
    const collectionName = `${type}s`;
    const dataArray = window[collectionName];
    try {
        if (id) {
            await db.collection('users').doc(currentUser.uid).collection(collectionName).doc(id).update(itemData);
            const index = dataArray.findIndex(item => item.id === id);
            if(index > -1) dataArray[index] = { ...dataArray[index], ...itemData };
        } else {
            const docRef = await db.collection('users').doc(currentUser.uid).collection(collectionName).add(itemData);
            dataArray.push({ id: docRef.id, ...itemData });
        }
        await updateDashboard();
        closeModal(`${type}-modal`);
        showToast(`Item salvo com sucesso!`, 'success');
    } catch(e) {
        console.error(`Erro ao salvar ${type}: `, e);
        showToast(`Falha ao salvar ${type}.`, 'error');
    }
}

async function handleDelete(type, id) {
    const collectionName = type === 'timeEntrie' ? 'timeEntries' : `${type}s`;
    const dataArray = window[collectionName];
    const item = dataArray.find(i => i.id === id);
    if (!item) return;

    try {
        if (type === 'expense' && item.installmentGroupId) {
            const confirmed = await showConfirmation(
                'Apagar Parcelas',
                'Este item é uma parcela. Deseja apagar TODAS as parcelas futuras relacionadas a esta compra?'
            );
            if (confirmed) {
                const batch = db.batch();
                const relatedExpenses = expenses.filter(exp => exp.installmentGroupId === item.installmentGroupId);
                relatedExpenses.forEach(exp => {
                    const docRef = db.collection('users').doc(currentUser.uid).collection(collectionName).doc(exp.id);
                    batch.delete(docRef);
                });
                await batch.commit();
                expenses = expenses.filter(exp => exp.installmentGroupId !== item.installmentGroupId);
                showToast('Todas as parcelas foram apagadas.', 'success');
            } else {
                return;
            }
        } else if (type === 'goal' && (item.name === "Economia Mensal" || item.name === "Reserva de Emergência")) {
            showToast('Metas padrão não podem ser excluídas.', 'info');
            return;
        } else {
            const confirmed = await showConfirmation('Confirmar Exclusão', 'Tem certeza que deseja excluir este item? A ação não pode ser desfeita.');
            if (confirmed) {
                await db.collection('users').doc(currentUser.uid).collection(collectionName).doc(id).delete();
                window[collectionName] = dataArray.filter(i => i.id !== id);
                showToast('Item excluído com sucesso!', 'success');
            }
        }
        updateDashboard();
    } catch(e) {
        console.error(`Erro ao apagar ${type}: `, e);
        showToast(`Falha ao apagar ${type}.`, 'error');
    }
}

async function saveUserSettings() {
    if(!currentUser) return;

    const newStartDay = parseInt(document.getElementById('setting-start-day').value);
    const feedbackEl = document.getElementById('settings-feedback');

    if(isNaN(newStartDay) || newStartDay < 1 || newStartDay > 28) {
        feedbackEl.textContent = "Por favor, insira um dia válido entre 1 e 28.";
        feedbackEl.className = 'text-sm mt-2 text-center text-red-500';
        return;
    }

    payPeriodStartDay = newStartDay; 

    const settings = {
        headerSubtitle: document.getElementById('header-subtitle').textContent,
        expenseCategories,
        customDiscounts,
        customProventos,
        payPeriodStartDay: payPeriodStartDay
    };

    try {
        await db.collection('users').doc(currentUser.uid).set(settings, { merge: true });
        feedbackEl.textContent = "Configurações salvas com sucesso!";
        feedbackEl.className = 'text-sm mt-2 text-center text-green-500';
        updateDashboard();
    } catch (error) {
        console.error("Erro ao salvar configurações:", error);
        feedbackEl.textContent = "Erro ao salvar. Tente novamente.";
        feedbackEl.className = 'text-sm mt-2 text-center text-red-500';
    }
}

async function clearAllUserData() {
    if (!currentUser) return;
    try {
        const userDocRef = db.collection('users').doc(currentUser.uid);
        const collections = ['incomes', 'expenses', 'goals', 'investments', 'timeEntries'];
        const batch = db.batch();

        for (const collectionName of collections) {
            const snapshot = await userDocRef.collection(collectionName).get();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }

        await batch.commit();

        incomes = [];
        expenses = [];
        goals = [];
        investments = [];
        timeEntries = [];
        await loadDataFromFirestore(); 
        updateDashboard();
        showToast('Todos os seus dados foram apagados com sucesso.', 'success');

    } catch (error) {
        console.error("Erro ao apagar todos os dados:", error);
        showToast("Ocorreu um erro ao tentar apagar os dados.", 'error');
    }
}


// FUNÇÕES DA INTERFACE E EVENT LISTENERS
// =======================================================
function setupEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.signOut();
    });

    document.getElementById('save-password-btn').addEventListener('click', () => {
        const newPassword = document.getElementById('new-password').value;
        const feedbackEl = document.getElementById('password-feedback');
        if (newPassword.length < 6) {
            feedbackEl.textContent = 'A senha precisa ter no mínimo 6 caracteres.';
            feedbackEl.className = 'text-sm mt-2 text-center text-red-500';
            return;
        }
        adicionarSenhaNaConta(newPassword);
    });

    document.getElementById('header-subtitle').addEventListener('click', editHeaderSubtitle);
    document.querySelectorAll('.tab-btn').forEach(button => button.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));
        this.classList.add('active-tab');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(`${this.dataset.tab}-content`).classList.remove('hidden');

        const monthYearSelectors = ['month-select', 'year-select'];
        const nonMonthTabs = ['reports', 'calculator', 'account', 'investments', 'goals'];
        
        if (nonMonthTabs.includes(this.dataset.tab)) {
             monthYearSelectors.forEach(id => document.getElementById(id).classList.add('hidden'));
        } else {
             monthYearSelectors.forEach(id => document.getElementById(id).classList.remove('hidden'));
        }

        if (this.dataset.tab === 'reports') generateReport();
        if (this.dataset.tab === 'calculator') updateCalculatorWithOvertime();
    }));
    document.getElementById('print-btn').addEventListener('click', () => window.print());
    
    document.getElementById('reset-btn').addEventListener('click', async () => {
        const confirmed = await showConfirmation(
            'Reiniciar Mês', 
            'Isso vai apagar os dados de renda, despesas, horas e investimentos DO PERÍODO ATUAL. Tem certeza?',
            'bg-orange-500 hover:bg-orange-600'
        );
        if (confirmed) {
            const batch = db.batch();
            const { startDate, endDate } = getPayPeriodRange(currentYear, currentMonth);
            const predicate = item => {
                const itemDate = new Date(item.date + 'T00:00:00');
                return itemDate >= startDate && itemDate <= endDate;
            };
            
            incomes.filter(predicate).forEach(item => batch.delete(db.collection('users').doc(currentUser.uid).collection('incomes').doc(item.id)));
            expenses.filter(predicate).forEach(item => batch.delete(db.collection('users').doc(currentUser.uid).collection('expenses').doc(item.id)));
            investments.filter(predicate).forEach(item => batch.delete(db.collection('users').doc(currentUser.uid).collection('investments').doc(item.id)));
            timeEntries.filter(predicate).forEach(item => batch.delete(db.collection('users').doc(currentUser.uid).collection('timeEntries').doc(item.id)));
            
            await batch.commit();
            
            const inversePredicate = item => !predicate(item);
            incomes = incomes.filter(inversePredicate);
            expenses = expenses.filter(inversePredicate);
            investments = investments.filter(inversePredicate);
            timeEntries = timeEntries.filter(inversePredicate);
            updateDashboard();
            showToast('Dados do mês reiniciados!', 'success');
        }
    });
    
    document.getElementById('clear-all-btn').addEventListener('click', async () => {
        const confirmed1 = await showConfirmation(
            'ATENÇÃO MÁXIMA!', 
            'Isso apagará TODOS os seus dados permanentemente, de TODOS os meses. Deseja continuar?'
        );
        if (confirmed1) {
            const confirmed2 = await showConfirmation(
                'ÚLTIMO AVISO', 
                'Esta é a sua última chance. Tem certeza absoluta que deseja apagar tudo?'
            );
            if (confirmed2) {
                await clearAllUserData();
            }
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
    document.getElementById('expense-payment').addEventListener('change', function() {
        document.getElementById('installments-group').classList.toggle('hidden', this.value !== 'credit');
        if (this.value !== 'credit') document.getElementById('expense-installments').value = 1;
    });
    document.getElementById('new-category-btn').addEventListener('click', () => document.getElementById('new-category-input-group').classList.toggle('hidden'));
    document.getElementById('save-new-category-btn').addEventListener('click', async () => {
        const newCategoryName = document.getElementById('new-category-name').value.trim();
        if (newCategoryName) {
            const newCategoryKey = newCategoryName.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
            if (expenseCategories[newCategoryKey]) {
                showToast('Uma categoria com um nome similar já existe.', 'error');
                return;
            }
            expenseCategories[newCategoryKey] = newCategoryName;
            await saveUserSettings();
            populateCategoryDropdown();
            document.getElementById('expense-category').value = newCategoryKey;
            document.getElementById('new-category-name').value = '';
            document.getElementById('new-category-input-group').classList.add('hidden');
            showToast('Nova categoria adicionada!', 'success');
        }
    });
    document.getElementById('add-discount-btn').addEventListener('click', addCustomDiscount);
    document.getElementById('add-provento-btn').addEventListener('click', addCustomProvento);
    document.getElementById('calculate-salary-btn').addEventListener('click', calculateNetSalary);
    document.getElementById('add-hour-entry-btn').addEventListener('click', addHourEntry);
    document.getElementById('cancel-hour-edit-btn').addEventListener('click', resetHourForm);
    document.getElementById('install-pwa-btn').addEventListener('click', handleInstallClick);
    document.getElementById('save-settings-btn').addEventListener('click', saveUserSettings);
}


// FUNÇÕES DE UTILIDADE E FORMATAÇÃO
// =======================================================
function getPayPeriodRange(year, month) {
    const startDay = payPeriodStartDay;

    if (startDay === 1) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        return { startDate, endDate };
    } else {
        const endDate = new Date(year, month - 1, startDay - 1);
        const startDate = new Date(year, month - 2, startDay);
        return { startDate, endDate };
    }
}

async function editHeaderSubtitle() {
    const h2 = document.getElementById('header-subtitle');
    const currentText = h2.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'text-xl md:text-2xl bg-transparent border-b-2 border-indigo-400 focus:outline-none text-center';
    h2.replaceWith(input);
    input.focus();
    input.addEventListener('blur', () => saveHeaderSubtitle(input));
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') saveHeaderSubtitle(input);
    });
}

async function saveHeaderSubtitle(inputElement) {
    const newText = inputElement.value.trim();
    const newH2 = document.createElement('h2');
    newH2.id = 'header-subtitle';
    newH2.className = 'text-xl md:text-2xl text-indigo-600 dark:text-indigo-500 cursor-pointer hover:opacity-75 transition-opacity';
    newH2.title = 'Clique para editar';
    newH2.textContent = newText || `${currentUser.displayName || currentUser.email}`;
    inputElement.replaceWith(newH2);
    newH2.addEventListener('click', editHeaderSubtitle);
    await saveUserSettings();
}

// Substitua a versão anterior por esta no seu script.js
function populateYearDropdown() {
    const yearSelect = document.getElementById('year-select');
    const currentYearDate = new Date().getFullYear();

    // ALTERAÇÃO AQUI: Definimos o ano de início como 2025
    const startYear = 2025; 
    const endYear = currentYearDate + 10; // Continua indo 10 anos para o futuro

    // Limpa qualquer opção que possa existir
    yearSelect.innerHTML = ''; 

    // Cria as opções de 2025 até o ano final
    for (let year = startYear; year <= endYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // Garante que o ano selecionado por padrão seja o ano atual (2025)
    yearSelect.value = currentYearDate;
}

function formatCurrency(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0); }
function parseBrazilianNumber(stringValue) {
    if (!stringValue || typeof stringValue !== 'string') return NaN;
    return parseFloat(stringValue.replace(/\./g, '').replace(',', '.'));
}
function formatMinutesToHours(minutes) {
    if (isNaN(minutes) || minutes === 0) return '0h 0m';
    const sign = minutes < 0 ? "-" : "";
    const absMinutes = Math.abs(minutes);
    const h = Math.floor(absMinutes / 60);
    const m = Math.round(absMinutes % 60);
    return `${sign}${h}h ${m}m`;
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


// FUNÇÕES DE ATUALIZAÇÃO DE DADOS E UI
// =======================================================
function updateDashboard() {
    const { startDate, endDate } = getPayPeriodRange(currentYear, currentMonth);

    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    document.getElementById('date-range-display').textContent = 
        `Exibindo período: ${startDate.toLocaleDateString('pt-BR', options)} a ${endDate.toLocaleDateString('pt-BR', options)}`;

    const totals = calculateTotals();
    
    document.getElementById('total-income').textContent = formatCurrency(totals.totalIncome);
    document.getElementById('total-expenses').textContent = formatCurrency(totals.totalExpenses);
    document.getElementById('available-balance').textContent = formatCurrency(totals.availableBalance);
    document.getElementById('month-savings').textContent = formatCurrency(totals.monthSavings);
    document.getElementById('pending-expenses').textContent = formatCurrency(totals.pendingExpenses);
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
    document.getElementById('total-worked-hours').textContent = formatMinutesToHours(totals.totalWorkedMinutes);
    document.getElementById('total-overtime-50').textContent = formatMinutesToHours(totals.totalOvertime50);
    document.getElementById('total-overtime-100').textContent = formatMinutesToHours(totals.totalOvertime100);

    updateIncomeTable();
    updateExpensesTable();
    updateGoalsTable(totals.monthSavings, totals.totalInvested);
    updateInvestmentsTable();
    updateHoursTable();
}

function calculateTotals() {
    const { startDate, endDate } = getPayPeriodRange(currentYear, currentMonth);
    const predicate = item => {
        const itemDate = new Date(item.date + 'T00:00:00');
        return itemDate >= startDate && itemDate <= endDate;
    };

    const currentIncomes = incomes.filter(predicate);
    const currentExpenses = expenses.filter(predicate);
    const currentInvestmentsInMonth = investments.filter(predicate);
    const currentTimeEntries = timeEntries.filter(predicate);

    const totalIncome = currentIncomes.reduce((sum, item) => sum + item.amount, 0);
    const fixedIncome = currentIncomes.filter(i => i.type === 'fixed').reduce((s, i) => s + i.amount, 0);
    const variableIncome = currentIncomes.filter(i => i.type === 'variable').reduce((s, i) => s + i.amount, 0);
    const extraIncome = currentIncomes.filter(i => i.type === 'extra').reduce((s, i) => s + i.amount, 0);
    const totalExpenses = currentExpenses.reduce((sum, item) => sum + item.amount, 0);
    const pendingExpenses = currentExpenses.filter(e => !e.isPaid).reduce((sum, item) => sum + item.amount, 0);
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
    
    let totalWorkedMinutes = 0, totalOvertime50 = 0, totalOvertime100 = 0;
    currentTimeEntries.forEach(entry => {
        const { workedMinutes, overtimeMinutes, is100Percent } = calculateWorkHours(entry);
        totalWorkedMinutes += workedMinutes;
        if (is100Percent) {
            totalOvertime100 += overtimeMinutes;
        } else {
            totalOvertime50 += overtimeMinutes;
        }
    });

    return {
        totalIncome, fixedIncome, variableIncome, extraIncome, totalExpenses, homeExpenses, foodExpenses, transportExpenses, healthExpenses, educationExpenses, entertainmentExpenses, otherExpenses,
        totalInvestedThisMonth, totalInvested: totalInvestedOverall, expectedReturn, monthlyReturn: expectedReturn / 12, availableBalance, monthSavings: monthSavings > 0 ? monthSavings : 0,
        pendingExpenses, totalWorkedMinutes, totalOvertime50, totalOvertime100
    };
}
function getPaymentMethodBadge(payment) {
    const labels = { credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro', transfer: 'Transferência' };
    return `<span class="badge badge-${payment}">${labels[payment] || payment}</span>`;
}
function updateTable(type, data, renderRowFn) {
    const tableBody = document.getElementById(`${type}s-table`);
    if(!tableBody) return;
    tableBody.innerHTML = '';
    if (data.length === 0) {
        const colSpan = tableBody.closest('table').querySelector('thead tr').cells.length;
        tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-4 text-gray-500">Nenhum item registrado.</td></tr>`;
        return;
    }
    data.forEach(item => tableBody.appendChild(renderRowFn(item)));
    document.querySelectorAll(`.edit-${type}`).forEach(btn => btn.addEventListener('click', (e) => handleEdit(type, e.currentTarget.dataset.id)));
    document.querySelectorAll(`.delete-${type}`).forEach(btn => btn.addEventListener('click', (e) => handleDelete(type, e.currentTarget.dataset.id)));
    
    if (type === 'income') {
        document.querySelectorAll('.calc-income-btn').forEach(btn => btn.addEventListener('click', (e) => sendIncomeToCalculator(e.currentTarget.dataset.id)));
    }
    if(type === 'expense') {
        document.querySelectorAll('.status-toggle').forEach(btn => btn.addEventListener('click', (e) => toggleExpenseStatus(e.currentTarget.dataset.id)));
    }
}
function updateIncomeTable() {
    const incomeTypeLabels = { fixed: 'Fixo', variable: 'Variável', extra: 'Extra' };
    const { startDate, endDate } = getPayPeriodRange(currentYear, currentMonth);
    const predicate = item => {
        const itemDate = new Date(item.date + 'T00:00:00');
        return itemDate >= startDate && itemDate <= endDate;
    };
    const currentData = incomes.filter(predicate).sort((a, b) => new Date(b.date) - new Date(a.date));
    updateTable('income', currentData, item => {
        const row = document.createElement('tr');
        if (item.type === 'fixed') row.classList.add('income-fixed-row'); else if (item.type === 'variable') row.classList.add('income-variable-row'); else if (item.type === 'extra') row.classList.add('income-extra-row');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${item.source}</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatCurrency(item.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${incomeTypeLabels[item.type] || item.type}</td>
            <td class="px-6 py-4 whitespace-nowrap">${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right no-print">
                <button class="calc-income-btn text-blue-600 hover:text-blue-400" data-id="${item.id}" title="Calcular Salário Líquido"><i class="fas fa-calculator"></i></button>
                <button class="edit-income ml-4 text-indigo-600 hover:text-indigo-400" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-income ml-4 text-red-600 hover:text-red-400" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            </td>`;
        return row;
    });
}
function updateExpensesTable() {
    const { startDate, endDate } = getPayPeriodRange(currentYear, currentMonth);
    const predicate = item => {
        const itemDate = new Date(item.date + 'T00:00:00');
        return itemDate >= startDate && itemDate <= endDate;
    };
    const currentData = expenses.filter(predicate).sort((a, b) => new Date(b.date) - new Date(a.date));
    updateTable('expense', currentData, item => {
        const row = document.createElement('tr');
        if (item.isPaid) row.classList.add('expense-paid');
        const toggleIcon = item.isPaid ? 'fa-toggle-on' : 'fa-toggle-off';
        row.innerHTML = `
            <td class="px-2 py-4 whitespace-nowrap text-center no-print">
                <i class="fas ${toggleIcon} status-toggle" data-id="${item.id}" title="${item.isPaid ? 'Paga' : 'Pendente'}"></i>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">${expenseCategories[item.category] || item.category}</td>
            <td class="px-6 py-4 whitespace-nowrap">${item.description}</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatCurrency(item.amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap">${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
            <td class="px-6 py-4 whitespace-nowrap">${getPaymentMethodBadge(item.payment)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right no-print">
                <button class="edit-expense text-indigo-600 hover:text-indigo-400" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-expense ml-4 text-red-600 hover:text-red-400" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            </td>`;
        return row;
    });
}
async function toggleExpenseStatus(id) {
    const expense = expenses.find(e => e.id === id);
    if (expense) {
        expense.isPaid = !expense.isPaid;
        try {
            await db.collection('users').doc(currentUser.uid).collection('expenses').doc(id).update({ isPaid: expense.isPaid });
            updateDashboard();
        } catch(e) {
            console.error("Erro ao atualizar status da despesa:", e);
            expense.isPaid = !expense.isPaid; // Revert on error
        }
    }
}
function updateGoalsTable(monthSavings, totalInvested) {
    const savingsGoal = goals.find(g => g.name === "Economia Mensal");
    if (savingsGoal) savingsGoal.current = monthSavings;
    const emergencyGoal = goals.find(g => g.name === "Reserva de Emergência");
    if (emergencyGoal) emergencyGoal.current = investments.reduce((sum, item) => sum + item.amount, 0);
    
    [savingsGoal, emergencyGoal].forEach(goal => {
        if (!goal) return;
        const type = goal.name === "Economia Mensal" ? 'monthly-savings' : 'emergency-fund';
        const percent = goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0;
        
        const targetEl = document.getElementById(`${type}-target`);
        const amountEl = document.getElementById(`${type}-amount`);
        const percentEl = document.getElementById(`${type}-percent`);
        const progressEl = document.getElementById(`${type}-progress`);

        if(targetEl) targetEl.textContent = `${formatCurrency(goal.target)}`;
        if(amountEl) amountEl.innerHTML = `${formatCurrency(goal.current)} de`;
        if(percentEl) percentEl.textContent = `${percent}%`;
        if(progressEl) progressEl.style.width = `${percent}%`;
    });
    const personalGoals = goals.filter(g => g.name !== "Economia Mensal" && g.name !== "Reserva de Emergência").sort((a,b) => (a.name > b.name) ? 1 : -1);
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
function updateHoursTable() {
    const { startDate, endDate } = getPayPeriodRange(currentYear, currentMonth);
    const predicate = item => {
        const itemDate = new Date(item.date + 'T00:00:00');
        return itemDate >= startDate && itemDate <= endDate;
    };
    const currentData = timeEntries.filter(predicate).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const tableBody = document.getElementById('hours-table');
    if(!tableBody) return;
    tableBody.innerHTML = '';

    if (currentData.length === 0) {
        const colSpan = tableBody.closest('table').querySelector('thead tr').cells.length;
        tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-4 text-gray-500">Nenhum item registrado.</td></tr>`;
        return;
    }

    currentData.forEach(item => {
        const row = document.createElement('tr');
        const { workedMinutes, overtimeMinutes, isHoliday } = calculateWorkHours(item);
        const holidayIcon = isHoliday ? '<i class="fas fa-star text-yellow-500 ml-2" title="Feriado"></i>' : '';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">${new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR', {weekday: 'short', day: '2-digit', month: '2-digit'})} ${holidayIcon}</td>
            <td class="px-6 py-4 whitespace-nowrap">${item.entry} - ${item.exit}</td>
            <td class="px-6 py-4 whitespace-nowrap">${item.breakStart} - ${item.breakEnd}</td>
            <td class="px-6 py-4 whitespace-nowrap font-bold">${formatMinutesToHours(workedMinutes)}</td>
            <td class="px-6 py-4 whitespace-nowrap font-bold text-green-600 dark:text-green-400">${formatMinutesToHours(overtimeMinutes)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right no-print">
                <button class="edit-hour text-indigo-600 hover:text-indigo-400" data-id="${item.id}" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="delete-hour ml-4 text-red-600 hover:text-red-400" data-id="${item.id}" title="Apagar"><i class="fas fa-trash"></i></button>
            </td>`;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.edit-hour').forEach(btn => btn.addEventListener('click', (e) => handleEditHour(e.currentTarget.dataset.id)));
    document.querySelectorAll('.delete-hour').forEach(btn => btn.addEventListener('click', (e) => handleDelete('timeEntrie', e.currentTarget.dataset.id)));
}
function populateCategoryDropdown() {
    const select = document.getElementById('expense-category');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '';
    for (const key in expenseCategories) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = expenseCategories[key];
        select.appendChild(option);
    }
    select.value = currentVal;
}
function generateReport() {
    const ctx = document.getElementById('report-chart').getContext('2d');
    if (reportChartInstance) reportChartInstance.destroy();
    
    const { startDate, endDate } = getPayPeriodRange(currentYear, currentMonth);
    const predicate = item => {
        const itemDate = new Date(item.date + 'T00:00:00');
        return itemDate >= startDate && itemDate <= endDate;
    };
    const currentExpenses = expenses.filter(predicate);
    const currentIncomes = incomes.filter(predicate);
    const totals = calculateTotals();

    const reportType = document.getElementById('report-type').value;
    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#d1d5db' : '#374151';
    let chartConfig = {};
    switch (reportType) {
        case 'expenses-by-category':
            const categoryData = Object.keys(expenseCategories).map(catKey => 
                currentExpenses.filter(e => e.category === catKey).reduce((sum, e) => sum + e.amount, 0)
            );
            chartConfig = { type: 'pie', data: { labels: Object.values(expenseCategories), datasets: [{ label: 'Despesas', data: categoryData, backgroundColor: ['#ef4444', '#f97316', '#eab308', '#f59e0b', '#22c55e', '#3b82f6', '#6b7280', '#ec4899', '#84cc16'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } } } };
            break;
        case 'income-breakdown':
            chartConfig = { type: 'doughnut', data: { labels: ['Renda Fixa', 'Variável', 'Extra'], datasets: [{ label: 'Renda', data: [totals.fixedIncome, totals.variableIncome, totals.extraIncome], backgroundColor: ['#22c55e', '#3b82f6', '#8b5cf6'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } } } };
            break;
        case 'paid-vs-pending':
            const paidAmount = currentExpenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
            const pendingAmount = currentExpenses.filter(e => !e.isPaid).reduce((sum, e) => sum + e.amount, 0);
            chartConfig = { type: 'pie', data: { labels: ['Pagas', 'Pendentes'], datasets: [{ label: 'Status Despesas', data: [paidAmount, pendingAmount], backgroundColor: ['#22c55e', '#ef4444'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } } } };
            break;
        default:
            chartConfig = { type: 'bar', data: { labels: ['Resumo do Período'], datasets: [{ label: 'Renda', data: [totals.totalIncome], backgroundColor: 'rgba(75, 192, 192, 0.7)' }, { label: 'Despesas', data: [totals.totalExpenses], backgroundColor: 'rgba(255, 99, 132, 0.7)' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } }, scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } }, x: { grid: { color: gridColor }, ticks: { color: textColor } } } } };
            break;
    }
    reportChartInstance = new Chart(ctx, chartConfig);
}


// FUNÇÕES DE EDIÇÃO E MODAIS
// =======================================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function handleEdit(type, id) {
    const modalId = `${type}-modal`;
    const saveBtn = document.getElementById(`save-${type}`);
    const modalTitle = document.getElementById(modalId).querySelector('h3');
    const ptTerms = { income: 'Renda', expense: 'Despesa', goal: 'Meta', investment: 'Investimento' };
    const form = document.getElementById(modalId).querySelector('div > div');
    form.querySelectorAll('input, select').forEach(el => {
        if (el.type === 'text' || el.type === 'date' || el.type === 'number') el.value = '';
        else if(el.type === 'checkbox') el.checked = false;
        else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    });
    if (type === 'expense') {
        populateCategoryDropdown();
        document.getElementById('installments-group').classList.add('hidden');
        document.getElementById('expense-installments').value = 1;
        document.getElementById('expense-paid-checkbox').checked = false;
    }
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
                const desc = item.description.replace(/\s\(\d+\/\d+\)$/, '');
                document.getElementById('expense-description').value = desc;
                document.getElementById('expense-amount').value = formatForInput(item.amount);
                document.getElementById('expense-category').value = item.category;
                document.getElementById('expense-payment').value = item.payment;
                document.getElementById('expense-date').value = item.date;
                document.getElementById('expense-paid-checkbox').checked = item.isPaid;
                document.getElementById('installments-group').classList.add('hidden');
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
function sendIncomeToCalculator(id) {
    const incomeItem = incomes.find(item => item.id === id);
    if (!incomeItem) return;
    const formattedAmount = String(incomeItem.amount).replace('.', ',');
    document.getElementById('calc-base-salary').value = formattedAmount;
    document.querySelector('button[data-tab="calculator"]').click();
    calculateNetSalary();
    document.getElementById('calculator-content').scrollIntoView({ behavior: 'smooth' });
}
function renderCustomList(listName, listArray, listElementId, deleteCallback) {
    const list = document.getElementById(listElementId);
    if (!list) return;
    list.innerHTML = '';
    listArray.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded';
        div.innerHTML = `<span class="text-sm">${item.name} - ${formatCurrency(item.value)}</span><button class="delete-${listName}-btn text-red-500 hover:text-red-700" data-index="${index}"><i class="fas fa-times-circle"></i></button>`;
        list.appendChild(div);
    });
    document.querySelectorAll(`.delete-${listName}-btn`).forEach(btn => btn.addEventListener('click', deleteCallback));
}
function renderCustomProventos() { renderCustomList('provento', customProventos, 'custom-proventos-list', deleteCustomProvento); }
function renderCustomDiscounts() { renderCustomList('discount', customDiscounts, 'custom-discounts-list', deleteCustomDiscount); }
async function addCustomItem(itemName, valueName, listArray) {
    const nameInput = document.getElementById(`new-${itemName}-name`);
    const valueInput = document.getElementById(`new-${itemName}-value`);
    const name = nameInput.value.trim();
    const value = parseBrazilianNumber(valueInput.value);
    if (name && !isNaN(value) && value > 0) {
        listArray.push({ name, value });
        await saveUserSettings();
        if (itemName === 'provento') renderCustomProventos(); else renderCustomDiscounts();
        nameInput.value = '';
        valueInput.value = '';
    } else {
        showToast(`Por favor, preencha o nome e um valor válido para o ${valueName}.`, 'error');
    }
}
async function deleteCustomItem(event, listArray) {
    const index = event.currentTarget.dataset.index;
    listArray.splice(index, 1);
    await saveUserSettings();
    if (listArray === customProventos) renderCustomProventos(); else renderCustomDiscounts();
}
function addCustomProvento() { addCustomItem('provento', 'provento', customProventos); }
function addCustomDiscount() { addCustomItem('discount', 'desconto', customDiscounts); }
function deleteCustomProvento(event) { deleteCustomItem(event, customProventos); }
function deleteCustomDiscount(event) { deleteCustomItem(event, customDiscounts); }


// LÓGICA DE HORAS E CÁLCULO DE SALÁRIO
// =======================================================
function handleEditHour(id) {
    const entryToEdit = timeEntries.find(e => e.id === id);
    if (!entryToEdit) return;

    document.getElementById('hour-date').value = entryToEdit.date;
    document.getElementById('hour-entry').value = entryToEdit.entry;
    document.getElementById('hour-break-start').value = entryToEdit.breakStart;
    document.getElementById('hour-break-end').value = entryToEdit.breakEnd;
    document.getElementById('hour-exit').value = entryToEdit.exit;
    document.getElementById('hour-is-holiday').checked = entryToEdit.isHoliday || false;

    const addBtn = document.getElementById('add-hour-entry-btn');
    addBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Atualizar';
    addBtn.dataset.editingId = id; 

    document.getElementById('cancel-hour-edit-btn').classList.remove('hidden');
    document.getElementById('hours-content').scrollIntoView({ behavior: 'smooth' });
}

function resetHourForm() {
    document.getElementById('hour-date').value = '';
    document.getElementById('hour-entry').value = '';
    document.getElementById('hour-break-start').value = '';
    document.getElementById('hour-break-end').value = '';
    document.getElementById('hour-exit').value = '';
    document.getElementById('hour-is-holiday').checked = false;

    const addBtn = document.getElementById('add-hour-entry-btn');
    addBtn.innerHTML = '<i class="fas fa-plus mr-2"></i>Adicionar';
    delete addBtn.dataset.editingId;

    document.getElementById('cancel-hour-edit-btn').classList.add('hidden');
}

async function addHourEntry() {
    const addBtn = document.getElementById('add-hour-entry-btn');
    const editingId = addBtn.dataset.editingId;

    const entryData = {
        date: document.getElementById('hour-date').value,
        entry: document.getElementById('hour-entry').value,
        breakStart: document.getElementById('hour-break-start').value,
        breakEnd: document.getElementById('hour-break-end').value,
        exit: document.getElementById('hour-exit').value,
        isHoliday: document.getElementById('hour-is-holiday').checked
    };

    if (!entryData.date || !entryData.entry || !entryData.exit) {
        showToast('Data, Entrada e Saída são obrigatórios.', 'error');
        return;
    }

    try {
        if (editingId) {
            await db.collection('users').doc(currentUser.uid).collection('timeEntries').doc(editingId).update(entryData);
            const index = timeEntries.findIndex(e => e.id === editingId);
            if (index > -1) {
                timeEntries[index] = { id: editingId, ...entryData };
            }
        } else {
            const docRef = await db.collection('users').doc(currentUser.uid).collection('timeEntries').add(entryData);
            timeEntries.push({ id: docRef.id, ...entryData });
        }
        
        resetHourForm();
        updateDashboard();
        showToast('Registro de hora salvo!', 'success');

    } catch(e) {
        console.error("Erro ao salvar registro de hora:", e);
        showToast("Falha ao salvar o registro.", 'error');
    }
}

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function calculateWorkHours(entry) {
    const standardWorkdayMinutes = 8 * 60;
    const entryMinutes = timeToMinutes(entry.entry);
    const exitMinutes = timeToMinutes(entry.exit);
    const breakStartMinutes = timeToMinutes(entry.breakStart);
    const breakEndMinutes = timeToMinutes(entry.breakEnd);

    const breakMinutes = (breakEndMinutes > breakStartMinutes) ? (breakEndMinutes - breakStartMinutes) : 0;
    const workedMinutes = (exitMinutes > entryMinutes) ? (exitMinutes - entryMinutes - breakMinutes) : 0;
    const overtimeMinutes = Math.max(0, workedMinutes - standardWorkdayMinutes);
    
    const isHoliday = entry.isHoliday || false; 
    const is100Percent = isHoliday;

    return { workedMinutes, overtimeMinutes, is100Percent, isHoliday };
}

function updateCalculatorWithOvertime() {
    const totals = calculateTotals();
    document.getElementById('calc-ot-50-display').textContent = formatMinutesToHours(totals.totalOvertime50);
    document.getElementById('calc-ot-100-display').textContent = formatMinutesToHours(totals.totalOvertime100);
}

function calculateINSS(grossSalary) {
    const TETO_SALARIAL_INSS = 8157.41;
    const TETO_CONTRIBUICAO_INSS = 951.63; 
    if (grossSalary > TETO_SALARIAL_INSS) { return TETO_CONTRIBUICAO_INSS; }
    let contribution = 0;
    if (grossSalary <= 1518.00) { contribution = grossSalary * 0.075; } 
    else if (grossSalary <= 2793.88) { contribution = (1518.00 * 0.075) + ((grossSalary - 1518.00) * 0.09); } 
    else if (grossSalary <= 4190.83) { contribution = (1518.00 * 0.075) + ((2793.88 - 1518.00) * 0.09) + ((grossSalary - 2793.88) * 0.12); } 
    else { contribution = (1518.00 * 0.075) + ((2793.88 - 1518.00) * 0.09) + ((4190.83 - 2793.88) * 0.12) + ((grossSalary - 4190.83) * 0.14); }
    return parseFloat(contribution.toFixed(2));
}

function calculateIRRF(baseSalary, inss, dependents) {
    const DEDUCAO_DEPENDENTE = 189.59;
    const baseIRRF = baseSalary - inss - (dependents * DEDUCAO_DEPENDENTE);
    let tax = 0;
    if (baseIRRF <= 2259.20) { tax = 0; }
    else if (baseIRRF <= 2826.65) { tax = (baseIRRF * 0.075) - 169.44; }
    else if (baseIRRF <= 3751.05) { tax = (baseIRRF * 0.15) - 381.44; }
    else if (baseIRRF <= 4664.68) { tax = (baseIRRF * 0.225) - 662.77; }
    else { tax = (baseIRRF * 0.275) - 896.00; }
    return tax > 0 ? parseFloat(tax.toFixed(2)) : 0;
}

function calculateNetSalary() {
    const baseSalary = parseBrazilianNumber(document.getElementById('calc-base-salary').value) || 0;
    const workload = parseFloat(document.getElementById('calc-workload').value) || 220;
    const dependents = parseInt(document.getElementById('calc-dependents').value) || 0;
    
    const totals = calculateTotals();
    const ot50hours = totals.totalOvertime50 / 60;
    const ot100hours = totals.totalOvertime100 / 60;
    
    const totalCustomDiscounts = customDiscounts.reduce((sum, d) => sum + d.value, 0);
    const totalCustomProventos = customProventos.reduce((sum, p) => sum + p.value, 0);
    const normalHourValue = baseSalary > 0 && workload > 0 ? baseSalary / workload : 0;
    
    const totalOt50 = ot50hours * (normalHourValue * 1.5);
    const totalOt100 = ot100hours * (normalHourValue * 2.0);
    const dsr = (totalOt50 + totalOt100) / 6; 
    const totalGross = baseSalary + totalOt50 + totalOt100 + dsr + totalCustomProventos;
    const inss = calculateINSS(totalGross);
    const irrf = calculateIRRF(totalGross, inss, dependents);
    const totalDiscounts = inss + irrf + totalCustomDiscounts;
    const netSalary = totalGross - totalDiscounts;
    const fgts = totalGross * 0.08;
    const totalHours = workload + ot50hours + ot100hours;

    document.getElementById('res-base-salary').textContent = formatCurrency(baseSalary);
    document.getElementById('res-ot-50').textContent = formatCurrency(totalOt50);
    document.getElementById('res-ot-100').textContent = formatCurrency(totalOt100);
    document.getElementById('res-dsr').textContent = formatCurrency(dsr);
    const customProventosResultList = document.getElementById('res-custom-proventos-list');
    customProventosResultList.innerHTML = '';
    customProventos.forEach(p => {
        const div = document.createElement('div');
        div.className = 'flex justify-between text-sm';
        div.innerHTML = `<p>${p.name}</p><p>${formatCurrency(p.value)}</p>`;
        customProventosResultList.appendChild(div);
    });
    document.getElementById('res-total-gross').textContent = formatCurrency(totalGross);
    document.getElementById('res-inss').textContent = formatCurrency(inss > 0 ? -inss : 0);
    document.getElementById('res-irrf').textContent = formatCurrency(irrf > 0 ? -irrf : 0);
    const customDiscountsResultList = document.getElementById('res-custom-discounts-list');
    customDiscountsResultList.innerHTML = '';
    customDiscounts.forEach(d => {
        const div = document.createElement('div');
        div.className = 'flex justify-between text-sm';
        div.innerHTML = `<p>${d.name}</p><p class="text-red-600 dark:text-red-400">${formatCurrency(-d.value)}</p>`;
        customDiscountsResultList.appendChild(div);
    });
    document.getElementById('res-total-discounts').textContent = formatCurrency(totalDiscounts > 0 ? -totalDiscounts : 0);
    document.getElementById('res-net-salary').textContent = formatCurrency(netSalary);
    document.getElementById('res-fgts').textContent = formatCurrency(fgts);
    document.getElementById('res-total-hours').textContent = `${Math.round(totalHours)}h`;
}

// LÓGICA DE INSTALAÇÃO DO PWA
// =======================================================
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) {
        installBtn.classList.remove('hidden');
    }
});

async function handleInstallClick() {
    const installBtn = document.getElementById('install-pwa-btn');
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Resposta do usuário ao prompt de instalação: ${outcome}`);
        deferredPrompt = null;
        if (installBtn) {
            installBtn.classList.add('hidden');
        }
    }
}

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    console.log('PWA foi instalado com sucesso!');
});