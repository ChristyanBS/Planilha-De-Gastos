/**
 * dashboard-animations.js
 * Animações GSAP para o Dashboard da Planilha de Gastos.
 * Design: Professional Dark — animações cinematográficas avançadas com GSAP.
 * Inclui: entrada cinematográfica, gráfico de categorias girando, parallax de fundo.
 */

const DashboardAnimations = (() => {

    let masterTL = null;
    let hoverAnimations = [];
    let sidebarAnimated = false;
    let parallaxCleanup = null;

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
        const prevMonthSection = dashboard.querySelector('.prev-months-section');
        const cardSpendingWrapper = dashboard.querySelector('#card-spending-wrapper');

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        masterTL = gsap.timeline({
            defaults: { ease: 'power3.out' },
            onComplete: () => {
                dashboard.classList.remove('dash-gsap-init');
                setupHoverEffects();
                initParallaxBackground();
            }
        });

        // 1) Summary cards — slide up lentamente com fade elegante
        masterTL.fromTo(flipCards,
            { opacity: 0, y: 60, scale: 0.92, rotateX: 6 },
            {
                opacity: 1, y: 0, scale: 1, rotateX: 0,
                duration: prefersReducedMotion ? 0.3 : 0.9,
                stagger: prefersReducedMotion ? 0.03 : 0.12,
                ease: 'power4.out',
                clearProps: 'transform'
            },
            0.05
        );

        // 2) Previous months section
        if (prevMonthSection) {
            masterTL.fromTo(prevMonthSection,
                { opacity: 0, y: 30 },
                {
                    opacity: 1, y: 0,
                    duration: prefersReducedMotion ? 0.25 : 0.7,
                    ease: 'power3.out',
                    clearProps: 'transform'
                },
                0.35
            );
        }

        // 3) Chart wrappers — resumo do mês sobe lentamente
        masterTL.fromTo(chartWrappers,
            { opacity: 0, y: 40, scale: 0.95 },
            {
                opacity: 1, y: 0, scale: 1,
                duration: prefersReducedMotion ? 0.28 : 0.8,
                stagger: prefersReducedMotion ? 0.03 : 0.1,
                ease: 'power3.out',
                clearProps: 'transform'
            },
            0.3
        );

        // 4) Card spending wrapper
        if (cardSpendingWrapper) {
            masterTL.fromTo(cardSpendingWrapper,
                { opacity: 0, y: 30, scale: 0.96 },
                {
                    opacity: 1, y: 0, scale: 1,
                    duration: prefersReducedMotion ? 0.25 : 0.7,
                    ease: 'power3.out',
                    clearProps: 'transform'
                },
                0.5
            );
        }

        // 5) Secondary cards — entrada escalonada
        masterTL.fromTo(secondaryCards,
            { opacity: 0, y: 24, scale: 0.97 },
            {
                opacity: 1, y: 0, scale: 1,
                duration: prefersReducedMotion ? 0.24 : 0.65,
                stagger: prefersReducedMotion ? 0.02 : 0.08,
                ease: 'power3.out',
                clearProps: 'transform'
            },
            0.45
        );

        // 6) Period text — fade suave
        if (periodText) {
            masterTL.fromTo(periodText,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: prefersReducedMotion ? 0.2 : 0.5, ease: 'power2.out', clearProps: 'all' },
                0.6
            );
        }

        // 7) Animação especial do gráfico de categorias (GIRA)
        masterTL.call(() => animateCategoryChart(), null, 0.45);

        // 8) Animação do gráfico de linhas
        masterTL.call(() => animateLineChart(), null, 0.4);

        // 9) Animação do gráfico de cartões
        masterTL.call(() => animateCardChart(), null, 0.55);

        // 10) Pulse suave nos valores dos cards
        masterTL.call(() => pulseCardValues(), null, 0.9);
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
    // CATEGORY CHART — Gira (spin) animado e depois mostra resultado
    // =========================================================
    function animateCategoryChart() {
        const pieCanvas = document.getElementById('dashboard-pie-chart');
        if (!pieCanvas) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            gsap.fromTo(pieCanvas,
                { opacity: 0, scale: 0.94 },
                { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out', clearProps: 'opacity,transform' }
            );
            return;
        }

        // Spin animation: starts rotated, spins while scaling in
        const tl = gsap.timeline();

        tl.fromTo(pieCanvas,
            { opacity: 0, scale: 0.5, rotation: -180, transformOrigin: '50% 50%' },
            {
                opacity: 0.7, scale: 0.85, rotation: 0,
                duration: 1.0,
                ease: 'power3.out'
            }
        );

        // Settle: final scale up with bounce
        tl.to(pieCanvas, {
            opacity: 1, scale: 1, rotation: 0,
            duration: 0.5,
            ease: 'back.out(1.3)',
            clearProps: 'opacity,transform'
        });
    }

    // =========================================================
    // LINE CHART — Reveal suave
    // =========================================================
    function animateLineChart() {
        const lineCanvas = document.getElementById('dashboard-line-chart');
        if (!lineCanvas) return;

        gsap.fromTo(lineCanvas,
            { opacity: 0, y: 20, scale: 0.96, transformOrigin: '50% 50%' },
            {
                opacity: 1, y: 0, scale: 1,
                duration: 0.8,
                ease: 'power3.out',
                clearProps: 'opacity,transform'
            }
        );
    }

    // =========================================================
    // CARD CHART — Spin similar ao pie
    // =========================================================
    function animateCardChart() {
        const cardCanvas = document.getElementById('dashboard-card-chart');
        if (!cardCanvas) return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            gsap.fromTo(cardCanvas,
                { opacity: 0, scale: 0.94 },
                { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out', clearProps: 'opacity,transform' }
            );
            return;
        }

        const tl = gsap.timeline();
        tl.fromTo(cardCanvas,
            { opacity: 0, scale: 0.5, rotation: -120, transformOrigin: '50% 50%' },
            { opacity: 0.7, scale: 0.85, rotation: 0, duration: 0.9, ease: 'power3.out' }
        );
        tl.to(cardCanvas, {
            opacity: 1, scale: 1, rotation: 0,
            duration: 0.45,
            ease: 'back.out(1.2)',
            clearProps: 'opacity,transform'
        });
    }

    // =========================================================
    // PULSE NOS VALORES — Destaque suave após entrada
    // =========================================================
    function pulseCardValues() {
        const values = document.querySelectorAll('#dashboard-content .card-value');
        values.forEach((el, i) => {
            gsap.fromTo(el,
                { scale: 0.96, opacity: 0.7 },
                {
                    scale: 1,
                    opacity: 1,
                    duration: 0.4,
                    delay: i * 0.04,
                    ease: 'power2.out',
                    clearProps: 'transform'
                }
            );
        });
    }

    // =========================================================
    // REPORT CHART ENTRANCE
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
            '#dashboard-content .summary-card, #dashboard-content .secondary-card, #dashboard-content .chart-wrapper, #dashboard-content .prev-month-card'
        );

        cards.forEach(card => {
            const enterHandler = () => {
                gsap.to(card, {
                    y: -4,
                    scale: 1.015,
                    duration: 0.25,
                    ease: 'power2.out',
                    overwrite: 'auto'
                });
            };

            const leaveHandler = () => {
                gsap.to(card, {
                    y: 0,
                    scale: 1,
                    duration: 0.28,
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
    // PARALLAX BACKGROUND — Partículas suaves que respondem ao mouse
    // =========================================================
    function initParallaxBackground() {
        if (parallaxCleanup) parallaxCleanup();

        const canvas = document.getElementById('dash-parallax-bg');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dashboard = document.getElementById('dashboard-content');
        if (!dashboard) return;

        let mouseX = 0.5, mouseY = 0.5;
        let animFrame = null;
        let particles = [];
        const isMobile = window.innerWidth < 768;
        const PARTICLE_COUNT = isMobile ? 16 : 32;

        function resize() {
            canvas.width = dashboard.offsetWidth;
            canvas.height = canvas.offsetHeight || (isMobile ? 120 : 220);
        }

        function createParticles() {
            particles = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    r: Math.random() * 2.5 + 0.8,
                    speedX: (Math.random() - 0.5) * 0.3,
                    speedY: (Math.random() - 0.5) * 0.15,
                    opacity: Math.random() * 0.25 + 0.05
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const isDarkMode = document.documentElement.classList.contains('dark');
            const baseColor = isDarkMode ? '140,180,255' : '80,100,180';

            particles.forEach(p => {
                // Respond to mouse
                const dx = (mouseX - 0.5) * 20;
                const dy = (mouseY - 0.5) * 10;

                p.x += p.speedX + dx * 0.01 * p.r;
                p.y += p.speedY + dy * 0.008 * p.r;

                // Wrap
                if (p.x < -10) p.x = canvas.width + 10;
                if (p.x > canvas.width + 10) p.x = -10;
                if (p.y < -10) p.y = canvas.height + 10;
                if (p.y > canvas.height + 10) p.y = -10;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${baseColor},${p.opacity})`;
                ctx.fill();
            });

            // Draw faint connections between nearby particles
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const pi = particles[i], pj = particles[j];
                    const dist = Math.hypot(pi.x - pj.x, pi.y - pj.y);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(pi.x, pi.y);
                        ctx.lineTo(pj.x, pj.y);
                        ctx.strokeStyle = `rgba(${baseColor},${0.04 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            animFrame = requestAnimationFrame(draw);
        }

        function onMouseMove(e) {
            const rect = dashboard.getBoundingClientRect();
            mouseX = (e.clientX - rect.left) / rect.width;
            mouseY = (e.clientY - rect.top) / rect.height;
        }

        function onTouchMove(e) {
            if (e.touches.length > 0) {
                const rect = dashboard.getBoundingClientRect();
                mouseX = (e.touches[0].clientX - rect.left) / rect.width;
                mouseY = (e.touches[0].clientY - rect.top) / rect.height;
            }
        }

        resize();
        createParticles();
        draw();

        window.addEventListener('resize', resize);
        dashboard.addEventListener('mousemove', onMouseMove);
        dashboard.addEventListener('touchmove', onTouchMove, { passive: true });

        // Fade in canvas
        gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.5, ease: 'power2.out' });

        parallaxCleanup = () => {
            if (animFrame) cancelAnimationFrame(animFrame);
            window.removeEventListener('resize', resize);
            dashboard.removeEventListener('mousemove', onMouseMove);
            dashboard.removeEventListener('touchmove', onTouchMove);
            parallaxCleanup = null;
        };
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
            if (parallaxCleanup) parallaxCleanup();
        }
    };

})();

window.DashboardAnimations = DashboardAnimations;
