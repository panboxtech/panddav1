/* login-page.js
   Lógica de login separada da aplicação principal.
   Observações e instruções de integração com Supabase:
     - Atualmente este arquivo usa MockAPI.login (do mockData.js) apenas para simular autenticação local.
     - Para integrar com Supabase:
         1) Incluir SDK do Supabase no login.html:
            <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
         2) Criar cliente supabase (substituir as variáveis abaixo):
            const SUPABASE_URL = 'https://your-project.supabase.co';
            const SUPABASE_ANON_KEY = 'public-anon-key';
            const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
         3) No lugar de MockAPI.login use:
            const res = await supabase.auth.signInWithPassword({ email, password });
            // se precisar de roles diferentes, controle via tabela users com coluna `role` e consulta após autenticar.
         4) Após autenticação com Supabase, redirecione para index.html (dashboard) ou para a rota desejada.
     - Importante: o protótipo atual define dois tipos de administrador (master e comum) no MockDB.
       Quando migrar a Supabase, mantenha uma coluna `role` em sua tabela `users` (valores: master | comum).
       Use RLS e policies para controlar permissões no backend (recomendado).
*/

/* Seletores */
const form = document.getElementById('loginPageForm');
const emailInput = document.getElementById('lp_email');
const passInput = document.getElementById('lp_password');
const roleSelect = document.getElementById('lp_role');
const rememberChk = document.getElementById('lp_remember');
const feedback = document.getElementById('lp_feedback');
const themeToggle = document.getElementById('lp_theme');

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
  const email = emailInput.value.trim();
  const password = passInput.value;
  const role = roleSelect.value;

  if (!email || !password || !role) {
    feedback.textContent = 'Preencha todos os campos.';
    return;
  }

  try {
    /* ---------- MOCK LOGIN (substituir por Supabase conforme instruções acima) ---------- */
    // MockAPI está presente no protótipo principal; caso execute a página de login isolada,
    // remova referências ao MockAPI e use supabase conforme instruções acima.
    const res = await MockAPI.login(email, password, role); // mock async
    // Se usar Supabase:
    // const res = await supabase.auth.signInWithPassword({ email, password });
    /* ------------------------------------------------------------------------------------ */

    // Persistir usuário no localStorage para o protótipo; em produção use session do supabase
    localStorage.setItem('pandda_user', JSON.stringify(res.user));
    feedback.textContent = 'Login bem-sucedido. Redirecionando...';

    // Redirecionar para a aplicação principal (index.html)
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 600);
  } catch (err) {
    feedback.textContent = 'Erro de autenticação: ' + (err.message || err);
  }
});

/* UX: submeter com Enter no campo senha já funciona por padrão */
emailInput.addEventListener('input', () => { feedback.textContent = ''; });
passInput.addEventListener('input', () => { feedback.textContent = ''; });
roleSelect.addEventListener('change', () => { feedback.textContent = ''; });

/* Sugestão de melhoria e segurança (comentário):
   - Ao migrar para Supabase, nunca guarde a senha no localStorage. Use a sessão retornada pelo supabase e cookies seguros.
   - Para armazenar preferência de tema global, considere salvar no perfil do usuário no Supabase e carregar após autenticação.
*/
