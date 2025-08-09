// Arquivo: firestore.js
// Isola toda a comunicação com o banco de dados Firebase Firestore.

import { showToast } from './ui.js';

// --- FUNÇÕES DE LEITURA (READ) ---

export async function loadRecurringData(db, currentUser) {
    const userDocRef = db.collection('users').doc(currentUser.uid);
    const loadCollection = async (collectionName) => {
        const snapshot = await userDocRef.collection(collectionName).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };
    try {
        const [recurringIncomes, recurringExpenses] = await Promise.all([
            loadCollection('recurringIncomes'),
            loadCollection('recurringExpenses')
        ]);
        return { recurringIncomes, recurringExpenses };
    } catch (error) {
        console.error("Erro ao carregar dados recorrentes:", error);
        showToast("Falha ao carregar dados recorrentes.", "error");
        return { recurringIncomes: [], recurringExpenses: [] };
    }
}

export async function loadInitialData(db, currentUser) {
    const userDocRef = db.collection('users').doc(currentUser.uid);

    const loadCollection = async (collectionName) => {
        try {
            const snapshot = await userDocRef.collection(collectionName).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error(`Falha ao carregar coleção ${collectionName}:`, e);
            // Retorna um array vazio para não quebrar o Promise.all
            return []; 
        }
    };

    try {
        const [goals, investments, contributions] = await Promise.all([
            loadCollection('goals'),
            loadCollection('investments'),
            loadCollection('contributions')
        ]);

        let settings = {};
        const userSettingsDoc = await userDocRef.get();
        if (userSettingsDoc.exists) {
            settings = userSettingsDoc.data();
        }

        return { goals, investments, contributions, settings };
    } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        showToast("Falha ao carregar dados iniciais.", "error");
        return { goals: [], investments: [], contributions: [], settings: {} };
    }
}

export async function loadPeriodData(db, currentUser, startDate, endDate) {
    const userDocRef = db.collection('users').doc(currentUser.uid);

    const loadFilteredCollection = async (collectionName) => {
        const query = userDocRef.collection(collectionName)
            .where('date', '>=', startDate.toISOString().split('T')[0])
            .where('date', '<=', endDate.toISOString().split('T')[0]);
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };

    try {
        const [incomes, expenses, timeEntries] = await Promise.all([
            loadFilteredCollection('incomes'),
            loadFilteredCollection('expenses'),
            loadFilteredCollection('timeEntries')
        ]);
        return { incomes, expenses, timeEntries };
    } catch (error) {
        console.error("Erro ao carregar dados do período:", error);
        showToast("Falha ao carregar os dados do período.", "error");
        return { incomes: [], expenses: [], timeEntries: [] };
    }
}


// --- FUNÇÕES DE ESCRITA (CREATE / UPDATE) ---

export async function saveItem(db, currentUser, type, itemData, id) {
    const collectionName = type.endsWith('y') ? type.slice(0, -1) + 'ies' : `${type}s`;
    
    const userFriendlyTypeNames = {
        income: 'Renda', expense: 'Despesa', goal: 'Meta',
        investment: 'Investimento', timeEntry: 'Registro de horas',
        recurringIncome: 'Renda fixa', recurringExpense: 'Despesa fixa',
        contribution: 'Contribuição'
    };
    const friendlyName = userFriendlyTypeNames[type] || type;

    try {
        if (id) {
            await db.collection('users').doc(currentUser.uid).collection(collectionName).doc(id).update(itemData);
        } else {
            await db.collection('users').doc(currentUser.uid).collection(collectionName).add(itemData);
        }
        showToast(`${friendlyName} salvo(a) com sucesso!`, 'success');
        return true;
    } catch (e) {
        console.error(`Erro ao salvar ${type}: `, e);
        showToast(`Falha ao salvar ${type}.`, 'error');
        return false;
    }
}

export async function saveExpense(db, currentUser, expenseData, id, installments) {
    try {
        if (id) {
             await db.collection('users').doc(currentUser.uid).collection('expenses').doc(id).update(expenseData);
        } else { 
            const batch = db.batch();
            const userDocRef = db.collection('users').doc(currentUser.uid);
            const groupId = (installments > 1) ? db.collection('users').doc().id : null;
            const originalDate = new Date(expenseData.date + 'T00:00:00');

            for (let i = 0; i < installments; i++) {
                const newExpense = { ...expenseData };
                if (installments > 1) {
                    newExpense.description = `${expenseData.description} (${i + 1}/${installments})`;
                    newExpense.installmentGroupId = groupId;
                }
                const installmentDate = new Date(originalDate.getFullYear(), originalDate.getMonth() + i, originalDate.getDate());
                newExpense.date = installmentDate.toISOString().split('T')[0];
                
                const newDocRef = userDocRef.collection('expenses').doc();
                batch.set(newDocRef, newExpense);
            }
            await batch.commit();
        }
        showToast('Despesa salva com sucesso!', 'success');
        return true;
    } catch (e) {
        console.error("Erro ao salvar despesa: ", e);
        showToast("Falha ao salvar despesa.", 'error');
        return false;
    }
}

export async function toggleExpenseStatus(db, currentUser, expense) {
    try {
        const newStatus = !expense.isPaid;
        await db.collection('users').doc(currentUser.uid).collection('expenses').doc(expense.id).update({ isPaid: newStatus });
        return true;
    } catch (e) {
        console.error("Erro ao atualizar status da despesa:", e);
        showToast("Falha ao alterar status.", "error");
        return false;
    }
}

export async function saveUserSettings(db, currentUser, settingsToSave) {
    try {
        await db.collection('users').doc(currentUser.uid).set(settingsToSave, { merge: true });
        showToast("Configurações salvas com sucesso!", 'success');
        return true;
    } catch (error) {
        console.error("Erro ao salvar configurações:", error);
        showToast("Erro ao salvar. Tente novamente.", 'error');
        return false;
    }
}

export async function updateUserPassword(auth, newPassword) {
    const user = auth.currentUser;
    if (!user) {
        showToast("Nenhum usuário logado.", "error");
        return { success: false, message: "Nenhum usuário logado." };
    }
    
    try {
        // Verifica se o usuário já tem um provedor de senha
        const hasPasswordProvider = user.providerData.some(provider => provider.providerId === 'password');
        
        if (hasPasswordProvider) {
            await user.updatePassword(newPassword);
            return { success: true, message: "Senha atualizada com sucesso!" };
        } else {
            // Se logou com Google, por exemplo, vincula a nova credencial de senha
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, newPassword);
            await user.linkWithCredential(credential);
            return { success: true, message: "Login com senha adicionado com sucesso!" };
        }
    } catch (error) {
        console.error("Erro ao processar senha:", error);
        let userMessage = "Ocorreu um erro. Tente novamente.";
        if (error.code === 'auth/weak-password') {
            userMessage = "A senha é muito fraca. Use pelo menos 6 caracteres.";
        } else if (error.code === 'auth/requires-recent-login') {
            userMessage = "Ação sensível. Faça logout e login novamente antes de alterar a senha.";
        }
        return { success: false, message: userMessage };
    }
}

// --- FUNÇÕES DE EXCLUSÃO (DELETE) ---

export async function handleDelete(db, currentUser, type, item, deleteOption = 'all') {
    let collectionName = type.endsWith('y') ? type.slice(0, -1) + 'ies' : `${type}s`;
    if (type === 'timeEntry') collectionName = 'timeEntries';
    if (type === 'recurringIncome') collectionName = 'recurringIncomes';
    if (type === 'recurringExpense') collectionName = 'recurringExpenses';

    try {
        // Lógica para despesas parceladas
        if (type === 'expense' && item.installmentGroupId) {
            if (deleteOption === 'one') {
                // APAGAR SÓ ESTA PARCELA
                await db.collection('users').doc(currentUser.uid).collection('expenses').doc(item.id).delete();
                showToast('Parcela removida com sucesso!', 'success');
            } else { // 'all' é o padrão
                // APAGAR TODAS AS PARCELAS FUTURAS
                const batch = db.batch();
                const futureInstallmentsQuery = db.collection('users').doc(currentUser.uid).collection('expenses')
                    .where('installmentGroupId', '==', item.installmentGroupId)
                    .where('date', '>=', item.date);
                const snapshot = await futureInstallmentsQuery.get();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                showToast('Parcelas futuras foram apagadas.', 'success');
            }
        } else {
            // Lógica para todos os outros itens
            await db.collection('users').doc(currentUser.uid).collection(collectionName).doc(item.id).delete();
            showToast('Item excluído com sucesso!', 'success');
        }
        return true;
    } catch (e) {
        console.error(`Erro ao apagar ${type}: `, e);
        showToast(`Falha ao apagar ${type}.`, 'error');
        return false;
    }
}

export async function clearAllUserData(db, currentUser) {
    try {
        const userDocRef = db.collection('users').doc(currentUser.uid);
        const collections = ['incomes', 'expenses', 'goals', 'investments', 'timeEntries'];
        const batch = db.batch();

        for (const collectionName of collections) {
            const snapshot = await userDocRef.collection(collectionName).get();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
        // Também apaga o documento de configurações do usuário
        batch.delete(userDocRef);

        await batch.commit();
        showToast('Todos os seus dados foram apagados com sucesso.', 'success');
        return true;
    } catch (error) {
        console.error("Erro ao apagar todos os dados:", error);
        showToast("Ocorreu um erro ao tentar apagar os dados.", 'error');
        return false;
    }
}