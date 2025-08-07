const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Elementos da página
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const toggleLink = document.getElementById('toggle-view-link');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const googleLoginBtn = document.getElementById('google-login-btn');

// Checa se o usuário já está logado ao carregar a página de login
if (auth) {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Se o usuário está logado, redireciona para a página principal
            window.location.href = 'index.html';
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
    googleLoginBtn.addEventListener('click', () => {
        auth.signInWithPopup(googleProvider)
             .then(result => {
                 // O onAuthStateChanged vai cuidar do redirecionamento
            })
            .catch(error => {
                console.error('Erro no login com Google:', error);
            });
    });
}