/**
 * components.js
 * Unified component system: Drawer, Toast, Animations, Search, Export, Confirmation
 * Requires GSAP to be loaded
 */

const AppComponents = (() => {

    // =========================================================
    // 1. DRAWER MANAGER
    // =========================================================
    const DrawerManager = (() => {
        let currentDrawer = null;
        let overlay = null;

        function init() {
            overlay = document.getElementById('drawer-overlay');
            if (!overlay) return;
            overlay.addEventListener('click', closeAll);
            // ESC key closes drawer
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && currentDrawer) closeAll();
            });
        }

        function open(drawerId, options = {}) {
            const panel = document.getElementById(drawerId);
            if (!panel || !overlay) return;

            closeAll(true); // close any existing, instant

            currentDrawer = panel;
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';

            // GSAP entrance: clipPath reveal + slide
            if (window.gsap) {
                gsap.fromTo(panel, 
                    { x: '100%', opacity: 0.5 },
                    { 
                        x: '0%', opacity: 1, 
                        duration: 0.45, 
                        ease: 'power3.out',
                        onComplete: () => {
                            // Stagger animate form fields
                            const fields = panel.querySelectorAll('.drawer-field, .drawer-toggle-row, .drawer-hero-amount');
                            if (fields.length) {
                                gsap.fromTo(fields,
                                    { opacity: 0, y: 16, scale: 0.97 },
                                    { 
                                        opacity: 1, y: 0, scale: 1,
                                        duration: 0.35, 
                                        stagger: 0.06, 
                                        ease: 'back.out(1.2)',
                                        clearProps: 'transform'
                                    }
                                );
                            }
                            if (options.onOpen) options.onOpen();
                        }
                    }
                );
            } else {
                panel.style.transform = 'translateX(0)';
                if (options.onOpen) options.onOpen();
            }
        }

        function close(drawerId, callback) {
            const panel = drawerId ? document.getElementById(drawerId) : currentDrawer;
            if (!panel) return;

            if (window.gsap) {
                gsap.to(panel, {
                    x: '100%', opacity: 0.5,
                    duration: 0.3, ease: 'power2.in',
                    onComplete: () => {
                        finishClose();
                        if (callback) callback();
                    }
                });
            } else {
                panel.style.transform = 'translateX(100%)';
                finishClose();
                if (callback) callback();
            }
        }

        function closeAll(instant = false) {
            if (!currentDrawer) return;
            if (instant) {
                if (window.gsap) gsap.set(currentDrawer, { x: '100%' });
                else currentDrawer.style.transform = 'translateX(100%)';
                finishClose();
            } else {
                close();
            }
        }

        function finishClose() {
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
            currentDrawer = null;
        }

        function isOpen() {
            return currentDrawer !== null;
        }

        return { init, open, close, closeAll, isOpen };
    })();

    // =========================================================
    // 2. TOAST SYSTEM (GSAP animated)
    // =========================================================
    const Toast = (() => {
        let container = null;

        function init() {
            container = document.getElementById('toast-container-new');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container-new';
                container.className = 'toast-container';
                document.body.appendChild(container);
            }
        }

        const icons = {
            success: 'fa-check',
            error: 'fa-xmark',
            info: 'fa-info',
            warning: 'fa-exclamation'
        };

        const titles = {
            success: 'Sucesso',
            error: 'Erro',
            info: 'Informação',
            warning: 'Atenção'
        };

        function show(message, type = 'info', duration = 4000) {
            if (!container) init();

            const toast = document.createElement('div');
            toast.className = `toast-item toast-${type}`;
            toast.innerHTML = `
                <div class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
                <div class="toast-body">
                    <div class="toast-title">${titles[type] || titles.info}</div>
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close-btn"><i class="fas fa-times"></i></button>
                <div class="toast-progress"></div>
            `;

            container.appendChild(toast);

            // Close handler
            const closeBtn = toast.querySelector('.toast-close-btn');
            closeBtn.addEventListener('click', () => dismissToast(toast));

            // GSAP entrance
            if (window.gsap) {
                gsap.fromTo(toast,
                    { opacity: 0, x: 60, scale: 0.9 },
                    { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: 'back.out(1.4)' }
                );

                // Progress bar countdown
                const progress = toast.querySelector('.toast-progress');
                gsap.fromTo(progress,
                    { scaleX: 1 },
                    { scaleX: 0, duration: duration / 1000, ease: 'none' }
                );
            }

            // Auto dismiss
            setTimeout(() => dismissToast(toast), duration);

            return toast;
        }

        function dismissToast(toast) {
            if (!toast || !toast.parentNode) return;
            if (window.gsap) {
                gsap.to(toast, {
                    opacity: 0, x: 80, scale: 0.85,
                    duration: 0.3, ease: 'power2.in',
                    onComplete: () => toast.remove()
                });
            } else {
                toast.remove();
            }
        }

        return { init, show };
    })();

    // =========================================================
    // 3. ANIMATED CONFIRMATION MODAL
    // =========================================================
    const ConfirmModal = (() => {
        let overlayEl = null;
        let resolvePromise = null;

        function init() {
            overlayEl = document.getElementById('confirm-modal-animated');
        }

        function show({ title, message, confirmText = 'Excluir', cancelText = 'Cancelar', icon = 'fa-trash-alt', type = 'danger' }) {
            return new Promise((resolve) => {
                if (!overlayEl) init();
                if (!overlayEl) return resolve(false);

                resolvePromise = resolve;

                // Set content
                overlayEl.querySelector('.confirm-modal-title').textContent = title;
                overlayEl.querySelector('.confirm-modal-message').textContent = message;
                overlayEl.querySelector('.btn-confirm-delete').textContent = confirmText;
                overlayEl.querySelector('.btn-confirm-cancel').textContent = cancelText;
                
                const iconEl = overlayEl.querySelector('.confirm-modal-icon i');
                if (iconEl) iconEl.className = `fas ${icon}`;

                // Show
                overlayEl.classList.add('active');

                const card = overlayEl.querySelector('.confirm-modal-card');
                if (window.gsap && card) {
                    gsap.fromTo(card,
                        { opacity: 0, scale: 0.85, y: 20 },
                        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.6)' }
                    );
                    // Shake icon
                    const iconContainer = overlayEl.querySelector('.confirm-modal-icon');
                    if (iconContainer) {
                        gsap.fromTo(iconContainer,
                            { rotation: -10, scale: 0.5 },
                            { rotation: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)', delay: 0.15 }
                        );
                    }
                }

                // Button handlers
                const confirmBtn = overlayEl.querySelector('.btn-confirm-delete');
                const cancelBtn = overlayEl.querySelector('.btn-confirm-cancel');

                const handleConfirm = () => { cleanup(); dismiss(true); };
                const handleCancel = () => { cleanup(); dismiss(false); };
                const handleOverlayClick = (e) => { 
                    if (e.target === overlayEl) { cleanup(); dismiss(false); }
                };

                confirmBtn.addEventListener('click', handleConfirm, { once: true });
                cancelBtn.addEventListener('click', handleCancel, { once: true });
                overlayEl.addEventListener('click', handleOverlayClick, { once: true });

                function cleanup() {
                    confirmBtn.removeEventListener('click', handleConfirm);
                    cancelBtn.removeEventListener('click', handleCancel);
                    overlayEl.removeEventListener('click', handleOverlayClick);
                }
            });
        }

        function dismiss(result) {
            if (!overlayEl) return;
            const card = overlayEl.querySelector('.confirm-modal-card');
            
            if (window.gsap && card) {
                gsap.to(card, {
                    opacity: 0, scale: 0.9, y: -10,
                    duration: 0.2, ease: 'power2.in',
                    onComplete: () => {
                        overlayEl.classList.remove('active');
                        if (resolvePromise) resolvePromise(result);
                    }
                });
            } else {
                overlayEl.classList.remove('active');
                if (resolvePromise) resolvePromise(result);
            }
        }

        return { init, show };
    })();

    // =========================================================
    // 4. PAGE ANIMATIONS (extend to all tabs)
    // =========================================================
    const PageAnimations = (() => {

        function animateTabEntrance(tabId) {
            if (!window.gsap) return;

            const content = document.getElementById(`${tabId}-content`);
            if (!content || content.classList.contains('hidden')) return;

            // Animate section header 
            const headers = content.querySelectorAll('.panel-header, .section-header');
            if (headers.length) {
                gsap.fromTo(headers,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out', clearProps: 'all' }
                );
            }

            // Animate mini-cards
            const miniCards = content.querySelectorAll('.mini-card');
            if (miniCards.length) {
                gsap.fromTo(miniCards,
                    { opacity: 0, y: 24, scale: 0.92 },
                    { 
                        opacity: 1, y: 0, scale: 1, 
                        duration: 0.55, stagger: 0.06, 
                        ease: 'back.out(1.3)', 
                        delay: 0.1,
                        clearProps: 'transform' 
                    }
                );
            }

            // Animate table containers
            const tables = content.querySelectorAll('.table-container');
            if (tables.length) {
                gsap.fromTo(tables,
                    { opacity: 0, y: 30 },
                    { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.2, clearProps: 'all' }
                );
            }

            // Animate table rows with stagger
            setTimeout(() => {
                const rows = content.querySelectorAll('.table-container tbody tr');
                if (rows.length && rows.length < 50) { // Don't animate too many rows
                    gsap.fromTo(rows,
                        { opacity: 0, x: -12 },
                        { 
                            opacity: 1, x: 0, 
                            duration: 0.3, stagger: 0.03, 
                            ease: 'power2.out',
                            clearProps: 'all' 
                        }
                    );
                }
            }, 350);

            // Animate form containers (hours form)
            const forms = content.querySelectorAll('.hours-clean-form');
            if (forms.length) {
                gsap.fromTo(forms,
                    { opacity: 0, y: 20, scale: 0.98 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', delay: 0.15, clearProps: 'all' }
                );
            }

            // Animate filter chips
            const chips = content.querySelectorAll('.filter-chip, .tx-filter-pill');
            if (chips.length) {
                gsap.fromTo(chips,
                    { opacity: 0, scale: 0.8 },
                    { opacity: 1, scale: 1, duration: 0.3, stagger: 0.04, ease: 'back.out(1.5)', delay: 0.1, clearProps: 'all' }
                );
            }
        }

        // Animate a new table row (after adding item)
        function animateNewRow(row) {
            if (!window.gsap || !row) return;
            row.classList.add('row-added');
            gsap.fromTo(row,
                { opacity: 0, x: -40, backgroundColor: 'rgba(34, 197, 94, 0.2)' },
                { 
                    opacity: 1, x: 0, 
                    backgroundColor: 'transparent',
                    duration: 0.5, ease: 'power3.out',
                    clearProps: 'all'
                }
            );
        }

        // Animate row deletion
        function animateRowRemoval(row, callback) {
            if (!window.gsap || !row) {
                if (callback) callback();
                return;
            }
            gsap.to(row, {
                opacity: 0, x: 40, 
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                height: 0, padding: 0, margin: 0,
                duration: 0.35, ease: 'power2.in',
                onComplete: () => {
                    if (callback) callback();
                }
            });
        }

        return { animateTabEntrance, animateNewRow, animateRowRemoval };
    })();

    // =========================================================
    // 5. SEARCH (Global search across transactions)
    // =========================================================
    const Search = (() => {
        let inputEl = null;
        let dropdownEl = null;
        let searchData = { incomes: [], expenses: [], categories: {} };

        function init() {
            inputEl = document.getElementById('global-search-input');
            dropdownEl = document.getElementById('search-results-dropdown');
            if (!inputEl || !dropdownEl) return;

            inputEl.addEventListener('input', debounce(handleSearch, 250));
            inputEl.addEventListener('focus', () => {
                if (inputEl.value.trim().length >= 2) handleSearch();
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-bar-wrapper')) {
                    dropdownEl.classList.remove('visible');
                }
            });
        }

        function updateData(incomes, expenses, categories) {
            searchData = { incomes, expenses, categories };
        }

        function handleSearch() {
            const query = inputEl.value.trim().toLowerCase();
            if (query.length < 2) {
                dropdownEl.classList.remove('visible');
                return;
            }

            const results = [];

            // Search incomes
            searchData.incomes.forEach(item => {
                if ((item.source || '').toLowerCase().includes(query)) {
                    results.push({
                        type: 'income',
                        name: item.source,
                        amount: item.amount,
                        date: item.date,
                        meta: item.type === 'fixed' ? 'Fixo' : item.type === 'variable' ? 'Variável' : 'Extra'
                    });
                }
            });

            // Search expenses
            searchData.expenses.forEach(item => {
                const catName = searchData.categories[item.category] || item.category;
                if (
                    (item.description || '').toLowerCase().includes(query) ||
                    catName.toLowerCase().includes(query)
                ) {
                    results.push({
                        type: 'expense',
                        name: item.description,
                        amount: item.amount,
                        date: item.date,
                        meta: catName
                    });
                }
            });

            renderResults(results.slice(0, 10));
        }

        function renderResults(results) {
            if (results.length === 0) {
                dropdownEl.innerHTML = '<div class="search-no-results"><i class="fas fa-search" style="margin-right:0.4rem;opacity:0.5;"></i>Nenhum resultado encontrado</div>';
                dropdownEl.classList.add('visible');
                return;
            }

            let html = '';
            results.forEach(r => {
                const iconClass = r.type === 'income' ? 'income-icon' : 'expense-icon';
                const icon = r.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down';
                const sign = r.type === 'income' ? '+' : '-';
                const amountColor = r.type === 'income' ? 'color:#22c55e' : 'color:#ef4444';
                const dateStr = r.date ? new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR') : '';

                html += `
                    <div class="search-result-item" data-type="${r.type}">
                        <div class="search-result-icon ${iconClass}"><i class="fas ${icon}"></i></div>
                        <div class="search-result-info">
                            <div class="search-result-name">${r.name}</div>
                            <div class="search-result-meta">${r.meta} · ${dateStr}</div>
                        </div>
                        <div class="search-result-amount" style="${amountColor}">${sign} R$ ${r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                `;
            });

            dropdownEl.innerHTML = html;
            dropdownEl.classList.add('visible');

            // Click on result -> navigate to tab
            dropdownEl.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const type = item.dataset.type;
                    const tabBtn = document.querySelector(`.tab-btn[data-tab="${type === 'income' ? 'income' : 'expenses'}"]`);
                    if (tabBtn) tabBtn.click();
                    dropdownEl.classList.remove('visible');
                    inputEl.value = '';
                });
            });
        }

        function debounce(fn, delay) {
            let timer;
            return (...args) => {
                clearTimeout(timer);
                timer = setTimeout(() => fn(...args), delay);
            };
        }

        return { init, updateData };
    })();

    // =========================================================
    // 6. DATA EXPORT
    // =========================================================
    const DataExport = (() => {

        function exportJSON(state) {
            const data = {
                exportDate: new Date().toISOString(),
                incomes: state.incomes,
                expenses: state.expenses,
                goals: state.goals,
                investments: state.investments,
                timeEntries: state.timeEntries,
                recurringIncomes: state.recurringIncomes,
                recurringExpenses: state.recurringExpenses,
                settings: state.settings
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `financas-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            Toast.show('Backup exportado com sucesso!', 'success');
        }

        function importJSON(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        resolve(data);
                    } catch (err) {
                        reject(new Error('Arquivo JSON inválido'));
                    }
                };
                reader.readAsText(file);
            });
        }

        function exportCSV(items, filename, headers) {
            const csvRows = [headers.join(',')];
            items.forEach(item => {
                const row = headers.map(h => {
                    const val = item[h.toLowerCase()] || '';
                    return `"${String(val).replace(/"/g, '""')}"`;
                });
                csvRows.push(row.join(','));
            });

            const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            Toast.show('Arquivo CSV exportado!', 'success');
        }

        return { exportJSON, importJSON, exportCSV };
    })();

    // =========================================================
    // 7. FAB (Floating Action Button)
    // =========================================================
    const FAB = (() => {
        let fabEl = null;
        let currentAction = null;

        function init() {
            fabEl = document.getElementById('fab-main');
            if (!fabEl) return;

            fabEl.addEventListener('click', () => {
                if (currentAction) currentAction();
            });
        }

        function setAction(icon, callback) {
            if (!fabEl) return;
            currentAction = callback;
            fabEl.innerHTML = `<i class="fas ${icon}"></i>`;

            // Animate icon change
            if (window.gsap) {
                gsap.fromTo(fabEl,
                    { scale: 0.7, rotation: -90 },
                    { scale: 1, rotation: 0, duration: 0.35, ease: 'back.out(2)' }
                );
            }
        }

        function hide() {
            if (!fabEl) return;
            fabEl.style.display = 'none';
        }

        function show() {
            if (!fabEl) return;
            if (window.innerWidth <= 767) {
                fabEl.style.display = 'flex';
            }
        }

        return { init, setAction, hide, show };
    })();

    // =========================================================
    // 8. EMPTY STATES
    // =========================================================
    const EmptyStates = (() => {
        const illustrations = {
            income: `<svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="70" cy="70" r="60" stroke="currentColor" stroke-width="1" opacity="0.15"/>
                <circle cx="70" cy="70" r="40" stroke="currentColor" stroke-width="1" opacity="0.1"/>
                <path d="M70 40v60M50 60l20-20 20 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
                <circle cx="70" cy="100" r="4" fill="currentColor" opacity="0.2"/>
            </svg>`,
            expense: `<svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="30" y="35" width="80" height="70" rx="8" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
                <line x1="30" y1="55" x2="110" y2="55" stroke="currentColor" stroke-width="1" opacity="0.15"/>
                <circle cx="52" cy="80" r="8" stroke="currentColor" stroke-width="1.5" opacity="0.25"/>
                <line x1="68" y1="76" x2="98" y2="76" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.2"/>
                <line x1="68" y1="84" x2="88" y2="84" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.15"/>
            </svg>`,
            hours: `<svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="70" cy="70" r="50" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
                <line x1="70" y1="70" x2="70" y2="40" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
                <line x1="70" y1="70" x2="92" y2="78" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.25"/>
                <circle cx="70" cy="70" r="4" fill="currentColor" opacity="0.3"/>
            </svg>`,
            goals: `<svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="70" cy="70" r="50" stroke="currentColor" stroke-width="1.5" opacity="0.15"/>
                <circle cx="70" cy="70" r="35" stroke="currentColor" stroke-width="1" opacity="0.12"/>
                <circle cx="70" cy="70" r="18" stroke="currentColor" stroke-width="1" opacity="0.1"/>
                <circle cx="70" cy="70" r="5" fill="currentColor" opacity="0.35"/>
            </svg>`,
            investments: `<svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25 100 L50 75 L70 85 L95 50 L115 55" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
                <path d="M95 50 L115 55 L110 35" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.25"/>
                <line x1="25" y1="105" x2="115" y2="105" stroke="currentColor" stroke-width="1" opacity="0.15"/>
            </svg>`,
            generic: `<svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="35" y="30" width="70" height="80" rx="6" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
                <line x1="50" y1="55" x2="90" y2="55" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.15"/>
                <line x1="50" y1="70" x2="80" y2="70" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.12"/>
                <line x1="50" y1="85" x2="85" y2="85" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.1"/>
            </svg>`
        };

        const messages = {
            income: { title: 'Nenhuma renda registrada', desc: 'Comece registrando suas fontes de renda para ter uma visão completa.', cta: '+ Adicionar Renda' },
            expense: { title: 'Nenhuma despesa registrada', desc: 'Registre suas despesas para acompanhar seus gastos por categoria.', cta: '+ Adicionar Despesa' },
            hours: { title: 'Nenhuma hora registrada', desc: 'Registre suas horas trabalhadas para calcular horas extras.', cta: '+ Registrar Horas' },
            goals: { title: 'Nenhuma meta criada', desc: 'Defina metas financeiras e acompanhe seu progresso.', cta: '+ Criar Meta' },
            investments: { title: 'Nenhum investimento', desc: 'Adicione seus aportes para acompanhar sua carteira.', cta: '+ Adicionar Investimento' },
            recurringIncome: { title: 'Nenhuma renda fixa', desc: 'Cadastre rendas recorrentes que aparecem automaticamente todo mês.', cta: '+ Adicionar Renda Fixa' },
            recurringExpense: { title: 'Nenhuma despesa fixa', desc: 'Cadastre despesas recorrentes para controle automático.', cta: '+ Adicionar Despesa Fixa' }
        };

        function getHTML(type, ctaCallback) {
            const illus = illustrations[type] || illustrations.generic;
            const msg = messages[type] || { title: 'Nenhum item registrado', desc: 'Adicione itens para começar.', cta: '+ Adicionar' };

            return `
                <div class="empty-state" data-empty-type="${type}">
                    <div class="empty-state-illustration" style="color:var(--accent);">${illus}</div>
                    <div class="empty-state-title">${msg.title}</div>
                    <div class="empty-state-desc">${msg.desc}</div>
                    <button class="empty-state-cta" data-empty-cta="${type}">
                        <i class="fas fa-plus"></i> ${msg.cta}
                    </button>
                </div>
            `;
        }

        return { getHTML, illustrations, messages };
    })();

    // =========================================================
    // INIT ALL
    // =========================================================
    function initAll() {
        DrawerManager.init();
        Toast.init();
        ConfirmModal.init();
        Search.init();
        FAB.init();
    }

    // =========================================================
    // PUBLIC API
    // =========================================================
    return {
        init: initAll,
        Drawer: DrawerManager,
        Toast,
        Confirm: ConfirmModal,
        PageAnimations,
        Search,
        Export: DataExport,
        FAB,
        EmptyStates
    };
})();

// Expose globally 
window.AppComponents = AppComponents;
