// Arquivo: core.js
// Contém a lógica de negócio principal, como o cálculo de totais para o dashboard.

import { timeToMinutes } from './utils.js';

/**
 * Helper interno para calcular as horas trabalhadas e extras de um único registro.
 * @param {object} entry - Um objeto de registro de ponto (timeEntry).
 * @returns {object} - Um objeto com { workedMinutes, overtimeMinutes, is100Percent }.
 */
function calculateWorkHours(entry) {
    const standardWorkdayMinutes = 8 * 60; // 8 horas
    const entryMinutes = timeToMinutes(entry.entry);
    const exitMinutes = timeToMinutes(entry.exit);
    const breakStartMinutes = timeToMinutes(entry.breakStart);
    const breakEndMinutes = timeToMinutes(entry.breakEnd);

    const breakMinutes = (breakEndMinutes > breakStartMinutes) ? (breakEndMinutes - breakStartMinutes) : 0;
    const workedMinutes = (exitMinutes > entryMinutes) ? (exitMinutes - entryMinutes - breakMinutes) : 0;
    const overtimeMinutes = Math.max(0, workedMinutes - standardWorkdayMinutes);
    
    // Considera que qualquer hora extra em um feriado é 100%.
    const is100Percent = entry.isHoliday || false;

    return { workedMinutes, overtimeMinutes, is100Percent };
}

/**
 * Calcula todos os totais resumidos para o dashboard com base no estado atual.
 * @param {object} state - O objeto de estado principal da aplicação.
 * @param {object} periodRange - O objeto { startDate, endDate } para o período financeiro.
 * @param {object} overtimeRange - O objeto { startDate, endDate } para o período de horas extras.
 * @returns {object} - Um objeto contendo todos os totais calculados.
 */
export function calculateTotals(state, periodRange, overtimeRange) {
    const { incomes, expenses, investments, timeEntries } = state;
    const { expenseCategories } = state.settings;

    // --- Cálculos Financeiros (baseado no periodRange) ---
    
    // Filtra investimentos que ocorreram apenas no período selecionado
    const investmentsInMonth = investments.filter(item => {
        const itemDate = new Date(item.date + 'T00:00:00');
        return itemDate >= periodRange.startDate && itemDate <= periodRange.endDate;
    });

    const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
    const fixedIncome = incomes.filter(i => i.type === 'fixed').reduce((s, i) => s + i.amount, 0);
    const variableIncome = incomes.filter(i => i.type === 'variable').reduce((s, i) => s + i.amount, 0);
    const extraIncome = incomes.filter(i => i.type === 'extra').reduce((s, i) => s + i.amount, 0);
    
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const pendingExpenses = expenses.filter(e => !e.isPaid).reduce((sum, item) => sum + item.amount, 0);
    
    // Calcula totais de despesas por categoria dinamicamente
    const expenseTotalsByCategory = {};
    for (const categoryKey in expenseCategories) {
        expenseTotalsByCategory[categoryKey] = expenses
            .filter(e => e.category === categoryKey)
            .reduce((sum, e) => sum + e.amount, 0);
    }
    
    const totalInvestedThisMonth = investmentsInMonth.reduce((sum, item) => sum + item.amount, 0);
    const totalInvestedOverall = investments.reduce((sum, item) => sum + item.amount, 0);
    const expectedReturn = investments.reduce((sum, item) => sum + (item.amount * (item.yield || 0) / 100), 0);
    
    const availableBalance = totalIncome - totalExpenses;
    const monthSavings = Math.max(0, availableBalance);

    // --- Cálculos de Horas (baseado no overtimeRange) ---

    // Filtra os registros de ponto que pertencem ao período de apuração de horas
    const overtimeEntries = timeEntries.filter(item => {
        const itemDate = new Date(item.date + 'T00:00:00');
        return itemDate >= overtimeRange.startDate && itemDate <= overtimeRange.endDate;
    });
    
    let totalWorkedMinutes = 0, totalOvertime50 = 0, totalOvertime100 = 0;
    overtimeEntries.forEach(entry => {
        const { workedMinutes, overtimeMinutes, is100Percent } = calculateWorkHours(entry);
        totalWorkedMinutes += workedMinutes;
        if (is100Percent) {
            totalOvertime100 += overtimeMinutes;
        } else {
            totalOvertime50 += overtimeMinutes;
        }
    });

    // Retorna um único objeto com todos os resultados
    return {
        totalIncome,
        fixedIncome,
        variableIncome,
        extraIncome,
        totalExpenses,
        homeExpenses: expenseTotalsByCategory.housing || 0,
        foodExpenses: expenseTotalsByCategory.food || 0,
        transportExpenses: expenseTotalsByCategory.transport || 0,
        healthExpenses: expenseTotalsByCategory.health || 0,
        educationExpenses: expenseTotalsByCategory.education || 0,
        entertainmentExpenses: expenseTotalsByCategory.entertainment || 0,
        otherExpenses: expenseTotalsByCategory.other || 0,
        totalInvestedThisMonth,
        totalInvested: totalInvestedOverall,
        expectedReturn,
        monthlyReturn: expectedReturn / 12,
        availableBalance,
        monthSavings,
        pendingExpenses,
        totalWorkedMinutes,
        totalOvertime50,
        totalOvertime100
    };
}