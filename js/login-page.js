/* login-page.js
   Lógica de login separada da aplicação principal.

   Correções aplicadas:
    - Se MockAPI existir (arquivo mockData.js carregado), chama MockAPI.init() para garantir dados mock.
    - Verifica se MockAPI está disponível antes de usá-lo e entrega uma mensagem clara se não estiver
      (ajuda a diagnosticar problemas de inclusão/ordem de scripts).
    - Mantém comentários sobre integração com Supabase.
*/

/* Seletores */
const form = document.getElementById('loginPageForm');
const emailInput = document.getElementById('lp_email');
const passInput = document.getElementById('lp_password');
const roleSelect = document.getElementById('lp_role');
const rememberChk = document.getElementById('lp_remember');
const feedback = document.getElementById('lp_feedback');
const themeToggle = document.getElementById('lp_theme');

/* Inicializar mock se disponível */
if (typeof MockAPI !== 'undefined' && MockAPI && typeof MockAPI.init === 'function') {
  try {
    MockAPI.init(); // garante que MockDB esteja seeded quando a página de login usar o mock
  } catch (e) {
    console.warn('Falha ao inicializar MockAPI:', e);
  }
} else {
  // Caso MockAPI não esteja carregado, mostramos aviso no feedback para facilitar debug.
  // Em produção este bloco não é necessário quando a integração com Supabase for usada.
  console.info('MockAPI não detectado. Se pretende usar o mock local, importe js/mockData.js antes deste script.');
}

/* Tema local apenas para a página de login */
(function initTheme() {
  const saved = localStorage.getItem('pandda_login_theme') || 'light';
  applyTheme(saved === 'dark');
  themeToggle.checked = saved === 'dark';
  themeToggle.addEventListener('change', (e) => {
    applyTheme(e.target.checked);
    localStorage.setItem('pandda_login_theme', e.target.checked ? 'dark' : 'light');
  });

  function applyTheme(dark) {
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }
})();

/* Validação simples e envio */
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  feedback.textContent = 'Enviando...';
  feedback.style.color = ''; // reset
  const email = emailInput.value.trim();
  const password = passInput.value;
  const role = roleSelect.value;

  if (!email || !password || !role) {
    feedback.textContent = 'Preencha todos os campos.';
    feedback.style.color = 'var(--danger)';
    return;
  }

  try {
    // Se MockAPI estiver disponível usamos o mock (útil em desenvolvimento local)
    if (typeof MockAPI !== 'undefined' && MockAPI && typeof MockAPI.login === 'function') {
      const res = await MockAPI.login(email, password, role);
      // Persistir usuário no localStorage para o protótipo; em produção use session do supabase
      localStorage.setItem('pandda_user', JSON.stringify(res.user));
      feedback.textContent = 'Login bem-sucedido. Redirecionando...';
      setTimeout(() => { window.location.href = 'index.html'; }, 400);
      return;
    }

    // Caso MockAPI não exista, tentar integração com Supabase se SDK estiver disponível
    if (typeof supabase !== 'undefined' && supabase && typeof supabase.auth !== 'undefined') {
      // exemplo de uso com Supabase (descomente e configure SUPABASE_URL/KEY se integrar)
      // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      // if (error) throw error;
      // // obter role: se mantiver tabela users, busque role após autenticar
      // localStorage.setItem('pandda_user', JSON.stringify(data.user));
      // window.location.href = 'index.html';
      throw new Error('Supabase detectado mas integração não configurada (descomente o bloco e configure).');
    }

    // Se chegamos aqui, nenhum método de autenticação está disponível
    throw new Error('Nenhum método de autenticação disponível. Inclua js/mockData.js ou configure Supabase.');
  } catch (err) {
    console.error(err);
    feedback.textContent = 'Erro de autenticação: ' + (err.message || err);
    feedback.style.color = 'var(--danger)';
  }
});

/* UX: limpar feedback ao digitar */
emailInput.addEventListener('input', () => { feedback.textContent = ''; });
passInput.addEventListener('input', () => { feedback.textContent = ''; });
roleSelect.addEventListener('change', () => { feedback.textContent = ''; });

/* Recomendações de integração com Supabase (mantidas como comentário):
   - Incluir SDK do Supabase em login.html:
       <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
   - Inicializar cliente:
       const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   - Substituir blocos MockAPI.login por supabase.auth.signInWithPassword({ email, password })
   - Após autenticação, busque a role do usuário via tabela users (por exemplo supabase.from('users').select('role').eq('id', user.id))
   - Em produção, utilize onAuthStateChange e session do Supabase em vez de localStorage.
*/
