// ================================================================
// calculator.js — Módulo puro de cálculo de salário líquido (CLT)
// Fórmulas validadas com holerites reais (Nov/Dez 2025 e Jan 2026)
// ================================================================

// ── Tabela INSS 2025 (progressiva) ──────────────────────────
const INSS_FAIXAS = [
    { limite: 1518.00, aliquota: 0.075 },
    { limite: 2793.88, aliquota: 0.09  },
    { limite: 4190.83, aliquota: 0.12  },
    { limite: 8157.41, aliquota: 0.14  },
];
const INSS_TETO = 951.63;

// ── Tabela IRRF 2025 ───────────────────────────────────────
const IRRF_FAIXAS = [
    { limite: 2259.20, aliquota: 0,     deducao: 0      },
    { limite: 2826.65, aliquota: 0.075, deducao: 169.44 },
    { limite: 3751.05, aliquota: 0.15,  deducao: 381.44 },
    { limite: 4664.68, aliquota: 0.225, deducao: 662.77 },
    { limite: Infinity, aliquota: 0.275, deducao: 896.00 },
];
const DEDUCAO_DEPENDENTE = 189.59;

// ── Cálculo INSS ────────────────────────────────────────────
function calcularINSS(salario) {
    if (salario <= 0) return 0;
    let total = 0;
    let anterior = 0;
    for (const faixa of INSS_FAIXAS) {
        if (salario <= anterior) break;
        const tributavel = Math.min(salario, faixa.limite) - anterior;
        total += tributavel * faixa.aliquota;
        anterior = faixa.limite;
    }
    return Math.min(parseFloat(total.toFixed(2)), INSS_TETO);
}

// ── Cálculo IRRF ────────────────────────────────────────────
function calcularIRRF(baseIRRF) {
    if (baseIRRF <= 0) return 0;
    for (const faixa of IRRF_FAIXAS) {
        if (baseIRRF <= faixa.limite) {
            const imposto = (baseIRRF * faixa.aliquota) - faixa.deducao;
            return Math.max(0, parseFloat(imposto.toFixed(2)));
        }
    }
    return 0;
}

// ── Estimativa de dias úteis / DSR para um mês ──────────────
export function estimarDiasMes(ano, mes) {
    // mes 1-based (1 = Janeiro)
    const diasNoMes = new Date(ano, mes, 0).getDate();
    let domingos = 0;
    for (let d = 1; d <= diasNoMes; d++) {
        if (new Date(ano, mes - 1, d).getDay() === 0) domingos++;
    }
    return {
        diasUteis: diasNoMes - domingos,   // Seg-Sáb (ajustar feriados manualmente)
        diasDSR: domingos                   // Domingos (adicionar feriados manualmente)
    };
}

// ── Cálculo principal ───────────────────────────────────────
/**
 * Calcula todos os componentes do demonstrativo de pagamento.
 * @param {object} p — Parâmetros de entrada
 * @returns {object} Resultados completos do holerite
 */
export function calculateNetSalary(p) {
    const salarioBase     = p.baseSalary      || 0;
    const cargaHoraria    = p.workload         || 220;
    const dependentes     = p.dependents       || 0;
    const horasHE50       = p.ot50Hours        || 0;
    const horasHE100      = p.ot100Hours       || 0;
    const horasNoturnas   = p.nightHours       || 0;
    const percNoturno     = p.nightRate        || 37.14;
    const diasUteis       = p.workingDays      || 22;
    const diasDSR         = p.dsrDays          || 4;
    const horasFalta      = p.absenceHours     || 0;
    const proventosCustom = p.customProventos  || [];
    const descontosCustom = p.customDiscounts   || [];

    // ── Valor hora ──
    const valorHora = salarioBase > 0 && cargaHoraria > 0
        ? salarioBase / cargaHoraria : 0;

    // ── Vencimentos ──
    const valorHE50   = parseFloat((valorHora * 1.5 * horasHE50).toFixed(2));
    const valorHE100  = parseFloat((valorHora * 2.0 * horasHE100).toFixed(2));
    const valorNoturno = parseFloat((valorHora * (percNoturno / 100) * horasNoturnas).toFixed(2));

    // DSR = (HE50 + HE100) × diasDSR / diasUteis
    // Nota: Adicional noturno NÃO entra na base do DSR (verificado em holerites reais)
    const baseDSR = valorHE50 + valorHE100;
    const valorDSR = diasUteis > 0
        ? parseFloat((baseDSR * diasDSR / diasUteis).toFixed(2)) : 0;

    const totalProventosCustom = proventosCustom.reduce((s, p) => s + (p.value || 0), 0);

    const totalVencimentos = parseFloat((
        salarioBase + valorHE50 + valorHE100 + valorNoturno + valorDSR + totalProventosCustom
    ).toFixed(2));

    // ── Descontos ──
    const descontoFaltas = parseFloat((valorHora * horasFalta).toFixed(2));
    const totalDescontosCustom = descontosCustom.reduce((s, d) => s + (d.value || 0), 0);

    // Base de cálculo do INSS = Vencimentos − Faltas
    const baseINSS = parseFloat((totalVencimentos - descontoFaltas).toFixed(2));
    const inss = calcularINSS(baseINSS);
    const aliquotaEfetivaINSS = baseINSS > 0
        ? parseFloat(((inss / baseINSS) * 100).toFixed(2)) : 0;

    // Base IRRF = Base INSS − INSS − (dependentes × dedução)
    const baseIRRF = parseFloat((baseINSS - inss - (dependentes * DEDUCAO_DEPENDENTE)).toFixed(2));
    const irrf = calcularIRRF(baseIRRF);

    const totalDescontos = parseFloat((
        descontoFaltas + totalDescontosCustom + inss + irrf
    ).toFixed(2));

    // ── Resultado ──
    const salarioLiquido = parseFloat((totalVencimentos - totalDescontos).toFixed(2));

    // FGTS (informativo, 8% sobre base INSS)
    const fgts = parseFloat((baseINSS * 0.08).toFixed(2));

    return {
        // Taxas
        valorHora,
        // Vencimentos
        baseSalary: salarioBase,
        totalOt50: valorHE50,
        totalOt100: valorHE100,
        nightValue: valorNoturno,
        dsr: valorDSR,
        totalCustomProventos: totalProventosCustom,
        totalGross: totalVencimentos,
        // Descontos
        absenceDeduction: descontoFaltas,
        inss,
        inssRate: aliquotaEfetivaINSS,
        inssBase: baseINSS,
        irrf,
        irrfBase: baseIRRF,
        totalCustomDiscounts: totalDescontosCustom,
        totalDiscounts: totalDescontos,
        // Resultado final
        netSalary: salarioLiquido,
        fgts,
        // Parâmetros de entrada (para referência nos resultados)
        _params: {
            workload: cargaHoraria,
            ot50Hours: horasHE50,
            ot100Hours: horasHE100,
            nightHours: horasNoturnas,
            nightRate: percNoturno,
            absenceHours: horasFalta,
            workingDays: diasUteis,
            dsrDays: diasDSR,
        }
    };
}