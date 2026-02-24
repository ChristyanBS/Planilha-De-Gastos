const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
auth.useDeviceLanguage();

// Elementos da página
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const toggleLink = document.getElementById('toggle-view-link');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const googleLoginBtn = document.getElementById('google-login-btn');

function setErrorMessage(message) {
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    if (loginError) loginError.textContent = message || '';
    if (signupError) signupError.textContent = message || '';
}

function parseGoogleAuthError(error) {
    if (!error || !error.code) return 'Não foi possível entrar com Google. Tente novamente.';

    const map = {
        'auth/popup-blocked': 'O navegador bloqueou o popup. Vamos tentar abrir por redirecionamento.',
        'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir o login.',
        'auth/network-request-failed': 'Sem conexão com a internet. Verifique sua rede e tente novamente.',
        'auth/operation-not-allowed': 'Login com Google não está habilitado no Firebase deste projeto.',
        'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase Authentication.',
        'auth/cancelled-popup-request': 'Uma tentativa de login já está em andamento. Aguarde alguns segundos.',
        'auth/account-exists-with-different-credential': 'Este email já existe com outro método de acesso.'
    };

    return map[error.code] || 'Erro ao conectar com Google. Tente novamente.';
}

function setGoogleButtonLoading(isLoading) {
    if (!googleLoginBtn) return;
    googleLoginBtn.disabled = isLoading;
    googleLoginBtn.style.opacity = isLoading ? '0.7' : '1';
    googleLoginBtn.style.cursor = isLoading ? 'wait' : 'pointer';
    googleLoginBtn.innerHTML = isLoading
        ? '<i class="fas fa-spinner fa-spin"></i> Conectando...'
        : '<i class="fab fa-google google-icon"></i> Entrar com Google';
}

// Checa se o usuário já está logado ao carregar a página de login
if (auth) {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Se o usuário está logado, redireciona para a página principal
            // Suporta hook de animação de transição na login.html
            if (typeof window.onLoginSuccess === 'function') {
                window.onLoginSuccess();
            } else {
                window.location.href = 'index.html';
            }
        }
    });
}

// Alternar entre tela de login e cadastro
if (toggleLink) {
    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.toggle('hidden');
        signupView.classList.toggle('hidden');
        
        if (signupView.classList.contains('hidden')) {
            toggleLink.textContent = 'Não tem uma conta? Cadastre-se';
        } else {
            toggleLink.textContent = 'Já tem uma conta? Faça o login';
        }
    });
}

// Listeners dos botões de login/cadastro
if(loginBtn) {
    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorP = document.getElementById('login-error');
        setErrorMessage('');

        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                 // O onAuthStateChanged vai cuidar do redirecionamento
            })
            .catch(error => {
                errorP.textContent = "Email ou senha inválidos.";
                console.error('Erro de login:', error);
            });
    });
}

if(signupBtn) {
    signupBtn.addEventListener('click', () => {
        const name = document.getElementById('signup-name').value.trim(); // Pega o nome
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorP = document.getElementById('signup-error');
        setErrorMessage('');

        // Validação simples para o nome
        if (!name) {
            errorP.textContent = 'Por favor, insira seu nome.';
            return;
        }
        
        auth.createUserWithEmailAndPassword(email, password)
             .then(userCredential => {
                 // Após criar o usuário, atualiza o perfil com o nome
                 return userCredential.user.updateProfile({
                     displayName: name
                 });
            })
            .then(() => {
                // O onAuthStateChanged vai cuidar do redirecionamento
            })
            .catch(error => {
                if (error.code === 'auth/weak-password') {
                    errorP.textContent = 'A senha deve ter no mínimo 6 caracteres.';
                } else {
                    errorP.textContent = 'Não foi possível criar a conta. Verifique o email.';
                }
                console.error('Erro de cadastro:', error);
            });
    });
}

if(googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        setErrorMessage('');
        setGoogleButtonLoading(true);

        if (!navigator.onLine) {
            setErrorMessage('Sem internet no momento. Conecte-se e tente novamente.');
            setGoogleButtonLoading(false);
            return;
        }

        // Tenta popup primeiro; se falhar, usa redirect como fallback
        try {
            await auth.signInWithPopup(googleProvider);
            // O onAuthStateChanged vai cuidar do redirecionamento
        } catch (error) {
            console.error('Erro no login com Google:', error);
            const isPopupIssue = error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user';

            if (isPopupIssue) {
                setErrorMessage(parseGoogleAuthError(error));
                auth.signInWithRedirect(googleProvider);
                return;
            }

            setErrorMessage(parseGoogleAuthError(error));
        } finally {
            setGoogleButtonLoading(false);
        }
    });
}

// Captura resultado de signInWithRedirect (caso tenha sido usado)
auth.getRedirectResult().then(result => {
    // Se veio de redirect, onAuthStateChanged redireciona
    setGoogleButtonLoading(false);
}).catch(error => {
    setGoogleButtonLoading(false);
    if (error && error.code) {
        console.error('Erro no redirect Google:', error);
        setErrorMessage(parseGoogleAuthError(error));
    }
});