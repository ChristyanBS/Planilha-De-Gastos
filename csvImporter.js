// Arquivo: csvImporter.js
// Motor de importação inteligente para extratos bancários em CSV.

import { showToast } from './ui.js';

/**
 * Mapa de palavras-chave para auto-categorização de despesas.
 * As chaves são as categorias do sistema, os valores são arrays de termos de busca.
 */
const CATEGORY_KEYWORDS = {
    transport: [
        'uber', '99', '99app', 'cabify', 'combustivel', 'combustível', 'gasolina',
        'estacionamento', 'parking', 'pedagio', 'pedágio', 'onibus', 'ônibus',
        'metro', 'metrô', 'trem', 'bilhete unico', 'bilhete único', 'sem parar',
        'shell', 'ipiranga', 'br distribuidora', 'auto posto', 'posto'
    ],
    food: [
        'ifood', 'rappi', 'mercado', 'supermercado', 'restaurante', 'padaria',
        'lanchonete', 'burger', 'pizza', 'sushi', 'açougue', 'acougue',
        'hortifruti', 'carrefour', 'pao de acucar', 'pão de açúcar', 'extra',
        'atacadao', 'atacadão', 'assai', 'assaí', 'zaffari', 'big', 'sams club',
        'mcdonald', 'mcdonalds', 'subway', 'starbucks', 'cafe', 'café',
        'bar ', 'bebida', 'food', 'alimenta'
    ],
    health: [
        'farmacia', 'farmácia', 'drogaria', 'drogaraia', 'hospital', 'clinica',
        'clínica', 'unimed', 'amil', 'sulamerica', 'bradesco saude', 'bradesco saúde',
        'dentista', 'odonto', 'laboratorio', 'laboratório', 'consulta', 'exame',
        'pague menos', 'droga raia', 'drogasil', 'panvel', 'venancio'
    ],
    housing: [
        'aluguel', 'condominio', 'condomínio', 'energia', 'eletric', 'enel',
        'cemig', 'cpfl', 'light', 'agua', 'água', 'sabesp', 'copasa', 'sanepar',
        'gas', 'gás', 'comgas', 'internet', 'net ', 'claro', 'vivo', 'tim',
        'oi ', 'telefone', 'telefonia', 'iptu', 'seguro resid'
    ],
    education: [
        'escola', 'faculdade', 'universidade', 'curso', 'livro', 'livraria',
        'udemy', 'alura', 'coursera', 'hotmart', 'educa', 'mensalidade escol',
        'material escol', 'papelaria', 'apostila'
    ],
    entertainment: [
        'netflix', 'spotify', 'disney', 'amazon prime', 'hbo', 'globoplay',
        'cinema', 'ingresso', 'teatro', 'show', 'parque', 'lazer', 'jogo',
        'game', 'steam', 'playstation', 'xbox', 'nintendo', 'youtube premium',
        'deezer', 'apple music', 'twitch'
    ]
};

/**
 * Detecta automaticamente o delimitador do CSV (vírgula, ponto-e-vírgula, ou tab).
 * @param {string} firstLine - A primeira linha do conteúdo CSV.
 * @returns {string} O delimitador detectado.
 */
function detectDelimiter(firstLine) {
    const delimiters = [';', ',', '\t'];
    let best = ',';
    let maxCount = 0;
    for (const d of delimiters) {
        const count = (firstLine.match(new RegExp(d === '\t' ? '\\t' : (d === '.' ? '\\.' : d), 'g')) || []).length;
        if (count > maxCount) {
            maxCount = count;
            best = d;
        }
    }
    return best;
}

/**
 * Faz o parse de um conteúdo CSV em um array de objetos, padronizando as colunas.
 * Suporta formatos de diferentes bancos (Nubank, Itaú, Bradesco, Inter, C6, etc.)
 * @param {string} content - O conteúdo bruto do arquivo CSV.
 * @returns {Array<object>} Array de objetos com { date, description, amount, type }.
 */
export function parseCSV(content) {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

    // Mapeamento inteligente de colunas (suporta diferentes bancos)
    const columnMap = {
        date: headers.findIndex(h =>
            /^(data|date|dt|data.transação|data.transacao|data.compra|data.lançamento|data.lancamento)$/i.test(h) ||
            h.includes('data')
        ),
        description: headers.findIndex(h =>
            /^(descrição|descricao|description|histórico|historico|estabelecimento|titulo|título|memo|lançamento|lancamento)$/i.test(h) ||
            h.includes('descri') || h.includes('histor')
        ),
        amount: headers.findIndex(h =>
            /^(valor|amount|value|quantia|montante)$/i.test(h) ||
            h.includes('valor')
        )
    };

    // Fallback: tenta inferir pelo índice se não encontrou
    if (columnMap.date === -1) columnMap.date = 0;
    if (columnMap.description === -1) columnMap.description = Math.min(1, headers.length - 1);
    if (columnMap.amount === -1) columnMap.amount = Math.min(2, headers.length - 1);

    const results = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));

        const rawDate = cols[columnMap.date] || '';
        const description = cols[columnMap.description] || '';
        const rawAmount = cols[columnMap.amount] || '0';

        // Parse da data (suporta DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY)
        let parsedDate = '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            parsedDate = rawDate;
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
            const [d, m, y] = rawDate.split('/');
            parsedDate = `${y}-${m}-${d}`;
        } else if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
            const [d, m, y] = rawDate.split('-');
            parsedDate = `${y}-${m}-${d}`;
        }

        if (!parsedDate || !description) continue;

        // Parse do valor (suporta "1.234,56" e "1234.56" e valores negativos)
        let amount = 0;
        const cleanedAmount = rawAmount.replace(/[^\d.,-]/g, '');
        if (cleanedAmount.includes(',')) {
            // Formato brasileiro: 1.234,56
            amount = parseFloat(cleanedAmount.replace(/\./g, '').replace(',', '.'));
        } else {
            amount = parseFloat(cleanedAmount);
        }

        if (isNaN(amount)) continue;

        // Determina se é entrada ou saída pelo sinal
        const type = amount < 0 ? 'expense' : 'income';
        amount = Math.abs(amount);

        if (amount === 0) continue;

        results.push({ date: parsedDate, description, amount, type });
    }

    return results;
}

/**
 * Auto-categoriza uma transação pela descrição usando palavras-chave.
 * @param {string} description - A descrição da transação.
 * @returns {string} A chave da categoria detectada (ex: 'food', 'transport', 'other').
 */
export function autoCategorize(description) {
    const normalized = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
            const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (normalized.includes(normalizedKeyword)) {
                return category;
            }
        }
    }
    return 'other';
}

/**
 * Faz o parse de um arquivo Excel (XLS/XLSX) usando a biblioteca SheetJS (global XLSX).
 * Converte a primeira planilha em um array padronizado de transações.
 * @param {Uint8Array} data - O conteúdo do arquivo como Uint8Array.
 * @returns {Array<object>} Array de objetos com { date, description, amount, type }.
 */
export function parseExcelFile(data) {
    if (typeof XLSX === 'undefined') {
        showToast('Biblioteca SheetJS não carregada. Recarregue a página.', 'error');
        return [];
    }

    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

    if (rows.length === 0) return [];

    // Detecta colunas pelo nome dos cabeçalhos
    const keys = Object.keys(rows[0]);
    const findKey = (patterns) => keys.find(k => patterns.some(p => p.test(k)));

    const dateKey = findKey([/data/i, /date/i, /^dt$/i, /lan[çc]amento/i, /compra/i]) || keys[0];
    const descKey = findKey([/descri/i, /histor/i, /t[ií]tulo/i, /memo/i, /lan[çc]amento/i, /estabelecimento/i]) || keys[Math.min(1, keys.length - 1)];
    const amountKey = findKey([/valor/i, /amount/i, /value/i, /quantia/i, /montante/i]) || keys[Math.min(2, keys.length - 1)];

    const results = [];

    for (const row of rows) {
        const rawDate = row[dateKey];
        const description = String(row[descKey] || '').trim();
        const rawAmount = row[amountKey];

        // Parse da data (Date object do SheetJS, ou strings em vários formatos)
        let parsedDate = '';
        if (rawDate instanceof Date && !isNaN(rawDate)) {
            parsedDate = rawDate.toISOString().split('T')[0];
        } else {
            const dateStr = String(rawDate || '');
            if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                parsedDate = dateStr.substring(0, 10);
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                const [d, m, y] = dateStr.split('/');
                parsedDate = `${y}-${m}-${d}`;
            } else if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
                const [d, m, y] = dateStr.split('-');
                parsedDate = `${y}-${m}-${d}`;
            }
        }

        if (!parsedDate || !description) continue;

        // Parse do valor (número direto do Excel, ou string formatada)
        let amount = 0;
        if (typeof rawAmount === 'number') {
            amount = rawAmount;
        } else {
            const cleaned = String(rawAmount).replace(/[^\d.,-]/g, '');
            if (cleaned.includes(',')) {
                amount = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
            } else {
                amount = parseFloat(cleaned);
            }
        }

        if (isNaN(amount)) continue;

        const type = amount < 0 ? 'expense' : 'income';
        amount = Math.abs(amount);
        if (amount === 0) continue;

        results.push({ date: parsedDate, description, amount, type });
    }

    return results;
}

/**
 * Processa os dados importados e os salva no Firestore usando as funções existentes.
 * @param {Array<object>} parsedData - Array de objetos parseados do CSV.
 * @param {Function} saveExpenseFn - Referência à função saveExpense do firebaseService.
 * @param {Function} saveItemFn - Referência à função saveItem do firebaseService.
 * @param {object} db - A instância do Firestore.
 * @param {object} currentUser - O usuário logado.
 * @returns {Promise<object>} Resultado com contadores { expenses, incomes, errors }.
 */
export async function processImport(parsedData, saveExpenseFn, saveItemFn, db, currentUser) {
    const result = { expenses: 0, incomes: 0, errors: 0 };

    for (const item of parsedData) {
        try {
            if (item.type === 'expense') {
                const expenseData = {
                    description: item.description,
                    amount: item.amount,
                    date: item.date,
                    category: item.category || autoCategorize(item.description),
                    isPaid: true,
                    status: 'paid',
                    payment: 'debit',
                    importedFromCSV: true
                };
                const saved = await saveExpenseFn(db, currentUser, expenseData, null, 1);
                if (saved) result.expenses++;
                else result.errors++;
            } else {
                const incomeData = {
                    source: item.description,
                    amount: item.amount,
                    date: item.date,
                    type: 'variable',
                    importedFromCSV: true
                };
                const saved = await saveItemFn(db, currentUser, 'income', incomeData, null);
                if (saved) result.incomes++;
                else result.errors++;
            }
        } catch (e) {
            console.error('Erro ao importar item:', e);
            result.errors++;
        }
    }

    return result;
}

/**
 * Inicializa a UI de importação CSV (drag & drop, preview, confirmação).
 * Deve ser chamada uma vez no setup dos event listeners.
 * @param {object} callbacks - Objeto com { onConfirmImport: async (parsedData) => {} }
 */
export function initCSVImportUI(callbacks) {
    const modal = document.getElementById('csv-import-modal');
    if (!modal) return;

    const dropZone = document.getElementById('csv-drop-zone');
    const fileInput = document.getElementById('csv-file-input');
    const previewContainer = document.getElementById('csv-preview');
    const previewBody = document.getElementById('csv-preview-body');
    const confirmBtn = document.getElementById('csv-confirm-import');
    const cancelBtn = document.getElementById('csv-cancel-import');
    const closeBtn = document.getElementById('close-csv-modal');
    const countDisplay = document.getElementById('csv-count-display');

    let currentParsedData = [];

    function openModal() {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        previewContainer.classList.add('hidden');
        if (previewBody) previewBody.innerHTML = '';
        currentParsedData = [];
        if (confirmBtn) confirmBtn.disabled = true;
        if (fileInput) fileInput.value = '';
    }

    function closeModal() {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    function handleFile(file) {
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['csv', 'xls', 'xlsx'];

        if (!validExtensions.includes(ext)) {
            showToast('Formato não suportado. Use arquivos .csv, .xls ou .xlsx.', 'error');
            return;
        }

        if (ext === 'xls' || ext === 'xlsx') {
            // Excel: lê como ArrayBuffer e converte com SheetJS
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                currentParsedData = parseExcelFile(data);
                finalizeFileParsing();
            };
            reader.readAsArrayBuffer(file);
        } else {
            // CSV: lê como texto e usa o parser manual
            const reader = new FileReader();
            reader.onload = (e) => {
                currentParsedData = parseCSV(e.target.result);
                finalizeFileParsing();
            };
            reader.readAsText(file, 'UTF-8');
        }
    }

    /** Categoriza os itens parseados e exibe a pré-visualização. */
    function finalizeFileParsing() {
        // Auto-categoriza cada item de despesa
        currentParsedData.forEach(item => {
            if (item.type === 'expense') {
                item.category = autoCategorize(item.description);
            }
        });

        if (currentParsedData.length === 0) {
            showToast('Nenhuma transação válida encontrada no arquivo.', 'error');
            if (confirmBtn) confirmBtn.disabled = true;
            return;
        }

        renderPreview(currentParsedData);
        // CORREÇÃO: Habilita o botão 'Importar Tudo' após dados serem carregados
        if (confirmBtn) confirmBtn.disabled = false;
    }

    function renderPreview(data) {
        previewContainer.classList.remove('hidden');
        previewBody.innerHTML = '';

        const expenseCount = data.filter(d => d.type === 'expense').length;
        const incomeCount = data.filter(d => d.type === 'income').length;
        countDisplay.textContent = `${data.length} transações encontradas (${incomeCount} entradas, ${expenseCount} saídas)`;

        const maxPreview = Math.min(data.length, 20);
        for (let i = 0; i < maxPreview; i++) {
            const item = data[i];
            const row = document.createElement('tr');
            const dateStr = new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR');
            const amountStr = item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const typeLabel = item.type === 'expense' ? '🔴 Saída' : '🟢 Entrada';
            const categoryLabel = item.category || '-';

            row.innerHTML = `
                <td class="px-3 py-2 text-sm">${dateStr}</td>
                <td class="px-3 py-2 text-sm">${item.description}</td>
                <td class="px-3 py-2 text-sm font-mono">${amountStr}</td>
                <td class="px-3 py-2 text-sm">${typeLabel}</td>
                <td class="px-3 py-2 text-sm capitalize">${categoryLabel}</td>
            `;
            previewBody.appendChild(row);
        }

        if (data.length > maxPreview) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="5" class="px-3 py-2 text-sm text-center text-gray-500">... e mais ${data.length - maxPreview} transações</td>`;
            previewBody.appendChild(row);
        }
    }

    // Event: Open modal
    const importBtn = document.getElementById('import-csv-btn');
    if (importBtn) importBtn.addEventListener('click', openModal);

    // Event: Close modal
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Event: Drag & Drop
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput?.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            handleFile(file);
        });
    }

    // Event: File input change
    if (fileInput) fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    // Event: Confirm import
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (currentParsedData.length === 0) return;
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Importando...';

            const result = await callbacks.onConfirmImport(currentParsedData);

            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Importar Tudo';

            if (result) {
                showToast(
                    `Importação concluída! ${result.incomes} entradas e ${result.expenses} despesas importadas.${result.errors > 0 ? ` (${result.errors} erros)` : ''}`,
                    result.errors > 0 ? 'info' : 'success'
                );
                closeModal();
            }
        });
    }
}