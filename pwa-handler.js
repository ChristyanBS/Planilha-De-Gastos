let deferredPrompt; // Guarda o evento para uso posterior
let promptEventWasCaptured = false; // "Memória" para saber se o evento já foi capturado

// Função que exibe o banner de instalação
function showInstallBanner() {
    const installBanner = document.getElementById('install-prompt-banner');
    if (installBanner) {
        installBanner.classList.remove('hidden');
        // Animação para deslizar para cima
        setTimeout(() => installBanner.classList.remove('translate-y-full'), 50);
    }
}

// Listener para o evento que o navegador dispara quando o app pode ser instalado
window.addEventListener('beforeinstallprompt', (e) => {
    // Previne o comportamento padrão (mini-infobar do Chrome)
    e.preventDefault();
    // Guarda o evento para acioná-lo mais tarde
    deferredPrompt = e;
    promptEventWasCaptured = true; // Marca que o evento foi capturado
    // Mostra o banner imediatamente
    showInstallBanner();
});

// Função para ser chamada pela aplicação principal (main.js)
// Ela verifica se o evento já passou e, em caso afirmativo, mostra o banner.
export function checkAndShowInstallBanner() {
    if (promptEventWasCaptured) {
        showInstallBanner();
    }
}

// Função para iniciar todos os manipuladores de PWA
export function initPwaHandlers() {
    const installBanner = document.getElementById('install-prompt-banner');
    const installButton = document.getElementById('install-app-btn');
    const closeInstallBannerButton = document.getElementById('close-install-banner-btn');
    const iosInstallBanner = document.getElementById('ios-install-banner');

    // O que fazer quando o botão de instalação do banner é clicado
    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                // Mostra o prompt de instalação nativo do navegador
                deferredPrompt.prompt();

                // Espera o usuário responder ao prompt
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);

                // O prompt só pode ser usado uma vez, limpamos a variável
                deferredPrompt = null;

                // Esconde o nosso banner
                if (installBanner) {
                    installBanner.classList.add('translate-y-full');
                    setTimeout(() => installBanner.classList.add('hidden'), 500);
                }
            }
        });
    }

    // O que fazer se o usuário fechar o nosso banner manualmente
    if (closeInstallBannerButton) {
        closeInstallBannerButton.addEventListener('click', () => {
            if (installBanner) {
                installBanner.classList.add('translate-y-full');
                setTimeout(() => installBanner.classList.add('hidden'), 500);
            }
        });
    }

    // Lógica específica para detectar e instruir usuários de iOS
    const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

    // Se for iOS e não estiver instalado, mostra o banner de instruções específico para iOS
    if (isIos() && !isInStandaloneMode() && iosInstallBanner) {
        iosInstallBanner.classList.remove('hidden');
    }
}