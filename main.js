// Supabase Client
const SUPABASE_URL = 'https://sua-url-supabase.supabase.co'; // Substitua pela sua URL
const SUPABASE_KEY = 'sua-chave-anon-publica'; // Substitua pela sua chave anon pública
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Toast Messages
function showToast(message, type = 'info') {
    const toast = document.getElementById('message-toast');
    const messageEl = document.getElementById('toast-message');
    const icon = document.getElementById('toast-icon');

    const icons = {
        success: '<i class="fas fa-check-circle text-green-500"></i>',
        error: '<i class="fas fa-times-circle text-red-500"></i>',
        info: '<i class="fas fa-info-circle text-blue-500"></i>'
    };

    icon.innerHTML = icons[type] || icons.info;
    messageEl.textContent = message;

    toast.classList.remove('translate-x-full');
    setTimeout(() => {
        toast.classList.add('translate-x-full');
    }, 3000);
}

// Função para verificar se o usuário está autenticado e redirecionar
async function checkAuthAndRedirect() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Erro ao obter a sessão:', error);
        return;
    }

    if (session) {
        // Checa se o usuário logado é o administrador (pelo email)
        if (session.user.email === 'artebr.firme@gmail.com') {
            window.location.href = './admin.html';
        } else {
            // Para os outros usuários, busca o tipo e redireciona
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('user_type')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error('Erro ao buscar tipo de usuário:', error);
                    window.location.href = './index.html';
                    return;
                }

                const userType = data.user_type;

                if (userType === 'professor') {
                    window.location.href = './dashboard.html';
                } else if (userType === 'coordenadora') {
                    window.location.href = './coordenacao.html';
                } else if (userType === 'diretora') {
                    window.location.href = './direcao.html';
                } else {
                    window.location.href = './dashboard.html';
                }

            } catch (err) {
                console.error('Erro ao processar o redirecionamento:', err);
                window.location.href = './index.html';
            }
        }
    }
}

// Chamar a função ao carregar a página
checkAuthAndRedirect();


// Handle login form submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        showToast(`Erro no login: ${error.message}`, 'error');
    } else {
        showToast('Login bem-sucedido!', 'success');
        checkAuthAndRedirect(); 
    }
});

// Forgot password logic
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const cancelForgotBtn = document.getElementById('cancel-forgot');
const forgotPasswordForm = document.getElementById('forgot-password-form');

function showForgotPassword() {
    forgotPasswordModal.classList.remove('hidden');
    forgotPasswordModal.classList.add('flex');
}

function closeForgotPassword() {
    forgotPasswordModal.classList.remove('flex');
    forgotPasswordModal.classList.add('hidden');
}

forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    showForgotPassword();
});

cancelForgotBtn.addEventListener('click', closeForgotPassword);

forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
        showToast(`Erro ao enviar email de recuperação: ${error.message}`, 'error');
    } else {
        showToast('Verifique seu email para as instruções de recuperação!', 'success');
        closeForgotPassword();
    }
});

// Close modal when clicking outside
document.getElementById('forgotPasswordModal').addEventListener('click', (e) => {
    if (e.target.id === 'forgotPasswordModal') {
        closeForgotPassword();
    }
});

// Enter key handling
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeForgotPassword();
    }
});
