/**
 * dashboard-animations.js
 * Animações GSAP para o Dashboard futurista da Planilha de Gastos.
 * Utiliza gsap.timeline() para orquestrar entrada coreografada dos elementos.
 */

const DashboardAnimations = (() => {

    let masterTL = null;
    let hoverAnimations = [];

    // =========================================================
    // MASTER TIMELINE — Sequência de carregamento orquestrada
    // =========================================================
    function playEntrance() {
        // Limpa timeline anterior
        if (masterTL) {
            masterTL.kill();
        }
        cleanupHoverListeners();

        const dashboard = document.getElementById('dashboard-content');
        if (!dashboard || dashboard.classList.contains('hidden')) return;

        // Marca para esconder elementos antes da animação
        dashboard.classList.add('dash-gsap-init');

        const flipCards = dashboard.querySelectorAll('.flip-card');
        const chartWrappers = dashboard.querySelectorAll('.chart-wrapper');
        const secondaryCards = dashboard.querySelectorAll('.secondary-card');
        const periodText = dashboard.querySelector('#date-range-display');

        masterTL = gsap.timeline({
            defaults: { ease: 'power4.out' },
            onComplete: () => {
                dashboard.classList.remove('dash-gsap-init');
                setupHoverEffects();
            }
        });

        // 1) Summary cards — staggered cascade from bottom
        masterTL.fromTo(flipCards,
            { opacity: 0, y: 40, scale: 0.96 },
            { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.12 },
            0.1
        );

        // 2) Animate number counters after cards appear
        masterTL.add(() => animateCounters(), 0.4);

        // 3) Chart wrappers — staggered from below
        masterTL.fromTo(chartWrappers,
            { opacity: 0, y: 35 },
            { opacity: 1, y: 0, duration: 0.7, stagger: 0.15 },
            0.5
        );

        // 4) Secondary cards — staggered cascade
        masterTL.fromTo(secondaryCards,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 },
            0.8
        );

        // 5) Period range text — fade in
        if (periodText) {
            masterTL.fromTo(periodText,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.5 },
                1.0
            );
        }
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
            // Extrai valor numérico de "R$ 1.234,56" ou "-R$ 500,00"
            const isNegative = rawText.includes('-');
            const numericStr = rawText
                .replace(/[^\d,.-]/g, '')  // mantém dígitos, vírgula, ponto, hífen
                .replace(/\./g, '')         // remove separador de milhar
                .replace(',', '.');         // vírgula decimal → ponto
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
    // HOVER MICRO-INTERACTIONS (Glow + Scale/Tilt)
    // =========================================================
    function setupHoverEffects() {
        const cards = document.querySelectorAll(
            '#dashboard-content .summary-card, #dashboard-content .secondary-card'
        );

        cards.forEach(card => {
            const enterHandler = () => {
                gsap.to(card, {
                    scale: 1.025,
                    duration: 0.3,
                    ease: 'power2.out',
                    overwrite: 'auto'
                });
            };

            const leaveHandler = () => {
                gsap.to(card, {
                    scale: 1,
                    duration: 0.4,
                    ease: 'power2.out',
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
    // PUBLIC API
    // =========================================================
    return {
        /**
         * Executa a animação completa de entrada do dashboard.
         * Deve ser chamada após os dados serem renderizados na UI.
         */
        play: playEntrance,

        /**
         * Limpa timelines e listeners (para quando troca de aba).
         */
        cleanup: () => {
            if (masterTL) masterTL.kill();
            cleanupHoverListeners();
        }
    };

})();

// Exporta para uso global (script não-module)
window.DashboardAnimations = DashboardAnimations;
