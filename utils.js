// Arquivo: utils.js (VERSÃO FINAL E CORRIGIDA)

// Controla o estado do modo de privacidade
let isPrivacyMode = false;

// Arquivo: utils.js
// Salva a preferência no localStorage e retorna o novo estado
export function togglePrivacyMode() {
    isPrivacyMode = !isPrivacyMode;
    localStorage.setItem('privacyMode', isPrivacyMode);
    return isPrivacyMode;
}

// Carrega a preferência do localStorage quando a página abre
export function initPrivacyMode() {
    isPrivacyMode = localStorage.getItem('privacyMode') === 'true';
    return isPrivacyMode;
}

export function formatCurrency(value) {
    if (isPrivacyMode) {
        return 'R$ ●●●,●●'; // O que será exibido no modo privado
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function parseBrazilianNumber(stringValue) {
    if (!stringValue || typeof stringValue !== 'string') return NaN;
    return parseFloat(stringValue.replace(/\./g, '').replace(',', '.'));
}

export function formatMinutesToHours(minutes) {
    if (isNaN(minutes) || minutes === 0) return '0h 0m';
    const sign = minutes < 0 ? "-" : "";
    const absMinutes = Math.abs(minutes);
    const h = Math.floor(absMinutes / 60);
    const m = Math.round(absMinutes % 60);
    return `${sign}${h}h ${m}m`;
}

export function getPayPeriodRange(year, month, payPeriodStartDay) {
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

export function getOvertimePeriodRange(year, month, overtimeStartDay, overtimeEndDay) {
    const startDate = new Date(year, month - 2, overtimeStartDay);
    const endDate = new Date(year, month - 1, overtimeEndDay);
    return { startDate, endDate };
}

export function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}