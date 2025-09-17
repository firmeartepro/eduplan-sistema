// Sistema de Autenticação

// Elementos do DOM
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('Login realizado:', userCredential.user);
            
            // Redirecionar para dashboard
            window.location.href = 'dashboard.html';
            
        } catch (error) {
            console.error('Erro no login:', error);
            
            let errorMessage = 'Erro no login. Tente novamente.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Usuário não encontrado.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Senha incorreta.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
                    break;
            }
            
            alert(errorMessage);
        }
    });
}

// Cadastro
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const fullName = document.getElementById('fullName').value;
        const school = document.getElementById('school').value;
        
        // Validações básicas
        if (password.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        
        if (!fullName.trim()) {
            alert('Por favor, informe seu nome completo.');
            return;
        }
        
        try {
            // Criar usuário
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Atualizar perfil do usuário
            await user.updateProfile({
                displayName: fullName
            });
            
            // Salvar dados adicionais no Firestore
            await db.collection('users').doc(user.uid).set({
                name: fullName,
                email: email,
                school: school,
                role: 'professor',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                subscription: {
                    plan: 'trial',
                    status: 'active',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
                    startedAt: firebase.firestore.FieldValue.serverTimestamp()
                },
                preferences: {
                    subjects: [],
                    classes: [],
                    notifications: true
                }
            });
            
            console.log('Usuário cadastrado:', user);
            alert('Cadastro realizado com sucesso! Você tem 7 dias de teste grátis.');
            
            // Redirecionar para dashboard
            window.location.href = 'dashboard.html';
            
        } catch (error) {
            console.error('Erro no cadastro:', error);
            
            let errorMessage = 'Erro no cadastro. Tente novamente.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Este email já está em uso.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
                    break;
            }
            
            alert(errorMessage);
        }
    });
}

// Verificar se usuário está logado
auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuário logado
        console.log('Usuário logado:', user);
        
        // Se estiver na página de login, redirecionar
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            window.location.href = 'dashboard.html';
        }
        
        // Verificar status da assinatura
        checkSubscriptionStatus(user);
        
    } else {
        // Usuário não logado
        console.log('Usuário não logado');
        
        // Se estiver em página protegida, redirecionar para login
        if (window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'index.html';
        }
    }
});

// Verificar status da assinatura
async function checkSubscriptionStatus(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const subscription = userData.subscription;
            
            if (subscription && subscription.expiresAt) {
                const expirationDate = subscription.expiresAt.toDate ? subscription.expiresAt.toDate() : new Date(subscription.expiresAt);
                const now = new Date();
                
                if (now > expirationDate && subscription.status === 'active') {
                    // Assinatura expirada
                    await db.collection('users').doc(user.uid).update({
                        'subscription.status': 'expired'
                    });
                    
                    alert('Sua assinatura expirou. Entre em contato para renovar.');
                }
            }
        }
    } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
    }
}

// Funções para alternar entre login e cadastro
function showRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('backToLogin').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('backToLogin').classList.add('hidden');
}

// Logout
function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        auth.signOut().then(() => {
            console.log('Logout realizado');
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Erro no logout:', error);
            alert('Erro ao fazer logout. Tente novamente.');
        });
    }
}

// Reset de senha
function resetPassword() {
    const email = prompt('Digite seu email para recuperar a senha:');
    
    if (email) {
        auth.sendPasswordResetEmail(email)
            .then(() => {
                alert('Email de recuperação enviado! Verifique sua caixa de entrada.');
            })
            .catch((error) => {
                console.error('Erro ao enviar email de recuperação:', error);
                alert('Erro ao enviar email de recuperação. Verifique se o email está correto.');
            });
    }
}
