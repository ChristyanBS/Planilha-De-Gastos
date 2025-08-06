// Arquivo: calculator.js
// Contém toda a lógica de negócio para o cálculo de salário líquido.

import { parseBrazilianNumber } from './utils.js';

/**
 * Calcula a contribuição do INSS de forma progressiva, com base no salário bruto.
 * @param {number} grossSalary - O salário bruto total.
 * @returns {number} O valor da contribuição do INSS.
 */
function calculateINSS(grossSalary) {
    // Tabela INSS (valores de exemplo, podem variar anualmente)
    const TETO_INSS = 951.63; // Valor máximo de contribuição
    
    if (grossSalary <= 1518.00) {
        return grossSalary * 0.075;
    }
    if (grossSalary <= 2793.88) {
        // Faixa 1 (7.5%) + o que exceder na Faixa 2 (9%)
        const faixa1 = 1518.00 * 0.075;
        const faixa2 = (grossSalary - 1518.00) * 0.09;
        return faixa1 + faixa2;
    }
    if (grossSalary <= 4190.83) {
        // Faixas 1 e 2 completas + o que exceder na Faixa 3 (12%)
        const faixa1 = 1518.00 * 0.075;
        const faixa2 = (2793.88 - 1518.00) * 0.09;
        const faixa3 = (grossSalary - 2793.88) * 0.12;
        return faixa1 + faixa2 + faixa3;
    }
    if (grossSalary <= 8157.41) {
         // Faixas 1, 2 e 3 completas + o que exceder na Faixa 4 (14%)
        const faixa1 = 1518.00 * 0.075;
        const faixa2 = (2793.88 - 1518.00) * 0.09;
        const faixa3 = (4190.83 - 2793.88) * 0.12;
        const faixa4 = (grossSalary - 4190.83) * 0.14;
        return faixa1 + faixa2 + faixa3 + faixa4;
    }
    
    // Se o salário for maior que o teto, a contribuição é o valor máximo.
    return TETO_INSS;
}

/**
 * Calcula o Imposto de Renda Retido na Fonte (IRRF).
 * @param {number} baseSalary - Salário bruto.
 * @param {number} inss - Valor já calculado da contribuição do INSS.
 * @param {number} dependents - Número de dependentes.
 * @returns {number} O valor do imposto de renda.
 */
function calculateIRRF(baseSalary, inss, dependents) {
    const DEDUCAO_DEPENDENTE = 189.59;
    const baseIRRF = baseSalary - inss - (dependents * DEDUCAO_DEPENDENTE);
    let tax = 0;

    if (baseIRRF <= 2259.20) {
        tax = 0;
    } else if (baseIRRF <= 2826.65) {
        tax = (baseIRRF * 0.075) - 169.44;
    } else if (baseIRRF <= 3751.05) {
        tax = (baseIRRF * 0.15) - 381.44;
    } else if (baseIRRF <= 4664.68) {
        tax = (baseIRRF * 0.225) - 662.77;
    } else {
        tax = (baseIRRF * 0.275) - 896.00;
    }

    return tax > 0 ? parseFloat(tax.toFixed(2)) : 0;
}

/**
 * Função principal que calcula todos os componentes do salário líquido.
 * @param {object} totals - Objeto contendo os totais de horas extras.
 * @param {object} settings - Objeto contendo descontos e proventos customizados.
 * @returns {object} Um objeto com todos os resultados do cálculo.
 */
export function calculateNetSalary(totals, settings) {
    // Lê os valores dos inputs da calculadora
    const baseSalary = parseBrazilianNumber(document.getElementById('calc-base-salary').value) || 0;
    const workload = parseFloat(document.getElementById('calc-workload').value) || 220;
    const dependents = parseInt(document.getElementById('calc-dependents').value) || 0;
    
    // Usa os totais de horas extras que foram passados como parâmetro
    const ot50hours = totals.totalOvertime50 / 60;
    const ot100hours = totals.totalOvertime100 / 60;
    
    // Usa os descontos e proventos customizados que foram passados como parâmetro
    const totalCustomDiscounts = settings.customDiscounts.reduce((sum, d) => sum + d.value, 0);
    const totalCustomProventos = settings.customProventos.reduce((sum, p) => sum + p.value, 0);
    
    // Calcula os valores das horas
    const normalHourValue = baseSalary > 0 && workload > 0 ? baseSalary / workload : 0;
    const totalOt50 = ot50hours * (normalHourValue * 1.5);
    const totalOt100 = ot100hours * (normalHourValue * 2.0);
    const dsr = (totalOt50 + totalOt100) / 6; // DSR sobre Horas Extras
    
    // Calcula o salário bruto total
    const totalGross = baseSalary + totalOt50 + totalOt100 + dsr + totalCustomProventos;
    
    // Calcula os descontos
    const inss = parseFloat(calculateINSS(totalGross).toFixed(2));
    const irrf = calculateIRRF(totalGross, inss, dependents);
    
    const totalDiscounts = inss + irrf + totalCustomDiscounts;
    
    // Calcula o salário líquido e FGTS
    const netSalary = totalGross - totalDiscounts;
    const fgts = totalGross * 0.08;

    // Retorna um objeto com todos os resultados, em vez de mexer no HTML
    return {
        baseSalary,
        totalOt50,
        totalOt100,
        dsr,
        totalGross,
        inss,
        irrf,
        totalDiscounts,
        netSalary,
        fgts
    };
}