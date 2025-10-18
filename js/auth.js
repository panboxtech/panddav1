/* auth.js
   Contém a lógica do login separada das regras de negócio.
   Pontos de substituição por Supabase:
     - Substituir MockAPI.login por supabase.auth.signInWithPassword({ email, password })
     - Salvar token/usuario conforme retorno do Supabase
*/

const Auth = (function(){
  let currentUser = null;

  async function showLogin() {
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('loginOverlay').ariaHidden = 'false';
  }
  function hideLogin() {
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('loginOverlay').ariaHidden = 'true';
  }

  async function init() {
    // Ativa evento do formulário de login
    const form = document.getElementById('loginForm');
    const feedback = document.getElementById('loginFeedback');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      feedback.textContent = 'Entrando...';
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const role = document.getElementById('loginRole').value;
      try {
        // Aqui trocar MockAPI.login por supabase auth
        const res = await MockAPI.login(email, password, role);
        currentUser = res.user;
        feedback.textContent = 'Login bem sucedido';
        hideLogin();
        // Persistir localmente a role/usuario. Em produção usar armazenamento seguro / session do Supabase
        localStorage.setItem('pandda_user', JSON.stringify(currentUser));
        Main.onAuthChanged(currentUser);
      } catch (err) {
        feedback.textContent = 'Erro: ' + err.message;
      }
    });

    // Checar usuário salvo (mock)
    const saved = localStorage.getItem('pandda_user');
    if (saved) {
      currentUser = JSON.parse(saved);
      Main.onAuthChanged(currentUser);
    } else {
      await showLogin();
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
      currentUser = null;
      localStorage.removeItem('pandda_user');
      showLogin();
    });
  }

  function getUser() { return currentUser; }

  return { init, getUser, showLogin, hideLogin };
})();
