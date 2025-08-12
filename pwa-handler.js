let deferredPrompt; // Variável para guardar o evento de instalação

// Função para iniciar todos os manipuladores de PWA
export function initPwaHandlers() {
    const installButton = document.getElementById('install-pwa-btn');
    const iosInstallBanner = document.getElementById('ios-install-banner');

    // Listener para o evento que o navegador dispara quando o app pode ser instalado
    window.addEventListener('beforeinstallprompt', (e) => {
        // Previne o comportamento padrão do Chrome
        e.preventDefault();
        // Guarda o evento para acioná-lo mais tarde
        deferredPrompt = e;
        // Mostra nosso botão de instalação customizado
        if (installButton) {
            installButton.classList.remove('hidden');
        }
    });

    // O que fazer quando o nosso botão de instalação é clicado
    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                deferredPrompt = null;
                installButton.classList.add('hidden');
            }
        });
    }

    // Lógica específica para detectar e instruir usuários de iOS
    const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

    if (isIos() && !isInStandaloneMode() && iosInstallBanner) {
        // Se for iOS e não estiver instalado, mostra o banner de instruções
        iosInstallBanner.classList.remove('hidden');
    }
}