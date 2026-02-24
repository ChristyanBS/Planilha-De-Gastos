/**
 * dashboard-animations.js
 * Animações GSAP para o Dashboard da Planilha de Gastos.
 * Design: Professional Dark — animações cinematográficas avançadas com GSAP.
 */

const DashboardAnimations = (() => {

    let masterTL = null;
    let hoverAnimations = [];
    let sidebarAnimated = false;

    // =========================================================
    // MASTER TIMELINE — Sequência cinematográfica de entrada
    // =========================================================
    function playEntrance() {
        if (masterTL) masterTL.kill();
        cleanupHoverListeners();

        const dashboard = document.getElementById('dashboard-content');
        if (!dashboard || dashboard.classList.contains('hidden')) return;

        if (!sidebarAnimated) {
            sidebarAnimated = true;
            animateSidebarEntrance();
        }

        dashboard.classList.add('dash-gsap-init');

        const flipCards = dashboard.querySelectorAll('.flip-card');
        const chartWrappers = dashboard.querySelectorAll('.chart-wrapper');
        const secondaryCards = dashboard.querySelectorAll('.secondary-card');
        const periodText = dashboard.querySelector('#date-range-display');
        const miniCards = dashboard.querySelectorAll('.mini-card');

        masterTL = gsap.timeline({
            defaults: { ease: 'expo.out' },
            onComplete: () => {
                dashboard.classList.remove('dash-gsap-init');
                setupHoverEffects();
            }
        });

        // 1) Summary cards — cascata elástica com rotação sutil
        masterTL.fromTo(flipCards,
            { opacity: 0, y: 70, scale: 0.82, rotateX: 8 },
            { 
                opacity: 1, y: 0, scale: 1, rotateX: 0,
                duration: 1.0, stagger: 0.12,
                ease: 'back.out(1.2)',
                clearProps: 'transform'
            },
            0.05
        );

        // 2) Chart wrappers — deslize suave com scale
        masterTL.fromTo(chartWrappers,
            { opacity: 0, y: 50, scale: 0.92 },
            { 
                opacity: 1, y: 0, scale: 1,
                duration: 0.9, stagger: 0.15,
                ease: 'power3.out',
                clearProps: 'transform'
            },
            0.35
        );

        // 3) Secondary cards — entrada escalonada com efeito elástico
        masterTL.fromTo(secondaryCards,
            { opacity: 0, y: 35, scale: 0.9 },
            { 
                opacity: 1, y: 0, scale: 1,
                duration: 0.75, stagger: 0.08,
                ease: 'back.out(1.4)',
                clearProps: 'transform'
            },
            0.55
        );

        // 4) Period text — fade suave
        if (periodText) {
            masterTL.fromTo(periodText,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', clearProps: 'all' },
                0.8
            );
        }

        // 5) Animação especial do gráfico de categorias
        masterTL.call(() => animateCategoryChart(), null, 0.7);

        // 6) Animação do gráfico de linhas
        masterTL.call(() => animateLineChart(), null, 0.6);

        // 7) Pulse suave nos valores dos cards
        masterTL.call(() => pulseCardValues(), null, 1.0);
    }

    // =========================================================
    // SIDEBAR ENTRANCE
    // =========================================================
    function animateSidebarEntrance() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const profile = sidebar.querySelector('.sidebar-profile');

        gsap.fromTo(sidebar,
            { x: -20, opacity: 0.4 },
            { x: 0, opacity: 1, duration: 0.7, ease: 'expo.out', clearProps: 'x,opacity' }
        );

        if (profile) {
            gsap.fromTo(profile,
                { opacity: 0, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.2)', delay: 0.15, clearProps: 'opacity,transform' }
            );
        }
    }

    // =========================================================
    // CATEGORY CHART — Rotação + scale com easing premium
    // =========================================================
    function animateCategoryChart() {
        const pieCanvas = document.getElementById('dashboard-pie-chart');
        if (!pieCanvas) return;

        gsap.fromTo(pieCanvas,
            { opacity: 0.3, scale: 0.75, rotation: -12, transformOrigin: '50% 50%' },
            {
                opacity: 1, scale: 1, rotation: 0,
                duration: 1.0,
                ease: 'elastic.out(1, 0.6)',
                clearProps: 'opacity,transform'
            }
        );
    }

    // =========================================================
    // LINE CHART — Reveal com clip-path animado
    // =========================================================
    function animateLineChart() {
        const lineCanvas = document.getElementById('dashboard-line-chart');
        if (!lineCanvas) return;

        gsap.fromTo(lineCanvas,
            { opacity: 0, scaleX: 0.3, transformOrigin: '0% 50%' },
            {
                opacity: 1, scaleX: 1,
                duration: 1.0,
                ease: 'power3.out',
                clearProps: 'opacity,transform'
            }
        );
    }

    // =========================================================
    // PULSE NOS VALORES — Destaque suave após entrada
    // =========================================================
    function pulseCardValues() {
        const values = document.querySelectorAll('#dashboard-content .card-value');
        values.forEach((el, i) => {
            gsap.fromTo(el,
                { scale: 1 },
                {
                    scale: 1.06,
                    duration: 0.25,
                    delay: i * 0.06,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut',
                    clearProps: 'transform'
                }
            );
        });
    }

    // =========================================================
    // REPORT CHART ENTRANCE — Para quando troca de relatório
    // =========================================================
    function animateReportChart() {
        const reportCanvas = document.getElementById('report-chart');
        if (!reportCanvas) return;

        gsap.fromTo(reportCanvas,
            { opacity: 0, scale: 0.85, y: 20 },
            {
                opacity: 1, scale: 1, y: 0,
                duration: 0.7,
                ease: 'back.out(1.3)',
                clearProps: 'opacity,transform'
            }
        );
    }

    // =========================================================
    // NUMBER COUNTER EFFECT
    // =========================================================
    function animateCounters() {
        const valueElements = document.querySelectorAll(
            '#dashboard-content .card-value'
        );

        valueElements.forEach(el => {
            const rawText = el.textContent.trim();
            const isNegative = rawText.includes('-');
            const numericStr = rawText
                .replace(/[^\d,.-]/g, '')
                .replace(/\./g, '')
                .replace(',', '.');
            const targetValue = parseFloat(numericStr) || 0;

            if (targetValue === 0) return;

            const counter = { value: 0 };
            gsap.to(counter, {
                value: targetValue,
                duration: 1.2,
                ease: 'power2.out',
                onUpdate: () => {
                    const formatted = formatBRL(Math.abs(counter.value));
                    el.textContent = (isNegative ? '-' : '') + formatted;
                }
            });
        });
    }

    function formatBRL(value) {
        return 'R$ ' + value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // =========================================================
    // HOVER MICRO-INTERACTIONS (Scale + Glow suave)
    // =========================================================
    function setupHoverEffects() {
        const cards = document.querySelectorAll(
            '#dashboard-content .summary-card, #dashboard-content .secondary-card, #dashboard-content .chart-wrapper'
        );

        cards.forEach(card => {
            const enterHandler = () => {
                gsap.to(card, {
                    scale: 1.02,
                    duration: 0.35,
                    ease: 'power2.out',
                    overwrite: 'auto'
                });
            };

            const leaveHandler = () => {
                gsap.to(card, {
                    scale: 1,
                    duration: 0.45,
                    ease: 'elastic.out(1, 0.5)',
                    overwrite: 'auto'
                });
            };

            card.addEventListener('mouseenter', enterHandler);
            card.addEventListener('mouseleave', leaveHandler);
            hoverAnimations.push({ el: card, enter: enterHandler, leave: leaveHandler });
        });
    }

    function cleanupHoverListeners() {
        hoverAnimations.forEach(({ el, enter, leave }) => {
            el.removeEventListener('mouseenter', enter);
            el.removeEventListener('mouseleave', leave);
        });
        hoverAnimations = [];
    }

    // =========================================================
    // CSV IMPORT RESULT BANNER
    // =========================================================
    function showImportResult(result) {
        const banner = document.getElementById('csv-import-result');
        if (!banner) return;

        const incomeEl  = banner.querySelector('.csv-income-count');
        const expenseEl = banner.querySelector('.csv-expense-count');
        if (incomeEl)  incomeEl.textContent  = `${result.incomes} entrada${result.incomes !== 1 ? 's' : ''}`;
        if (expenseEl) expenseEl.textContent = `${result.expenses} saída${result.expenses !== 1 ? 's' : ''}`;

        banner.classList.add('visible');

        gsap.fromTo(banner,
            { opacity: 0, y: -16, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.4)' }
        );

        setTimeout(() => hideCsvBanner(), 8000);
    }

    function hideCsvBanner() {
        const banner = document.getElementById('csv-import-result');
        if (!banner || !banner.classList.contains('visible')) return;
        gsap.to(banner, {
            opacity: 0, y: -10, duration: 0.35, ease: 'power2.in',
            onComplete: () => banner.classList.remove('visible')
        });
    }

    // =========================================================
    // PUBLIC API
    // =========================================================
    return {
        play: playEntrance,
        showImportResult,
        animateCategoryChart,
        animateReportChart,
        cleanup: () => {
            if (masterTL) masterTL.kill();
            cleanupHoverListeners();
        }
    };

})();

window.DashboardAnimations = DashboardAnimations;
