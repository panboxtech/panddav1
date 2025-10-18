/* auth.js (adaptado)
   Objetivo:
     - Manter compatibilidade com o restante do protótipo que chama Auth.init(), Auth.getUser(), Auth.showLogin(), Auth.hideLogin().
     - Redirecionar para a página de login (login.html) quando necessário.
     - Ler/escrever a mesma chave localStorage usada pelo login-page.js ("pandda_user") para manter sessão no protótipo.
     - Comentários indicam como substituir para Supabase posteriormente.

   Comportamento principal:
     - init(): verifica se há usuário no localStorage; se não houver, redireciona para login.html.
     - showLogin(): redireciona para login.html.
     - hideLogin(): faz nada (login é feito na página separada), mantive a assinatura para compatibilidade.
     - getUser(): retorna o usuário atual lido de localStorage.
*/

/* Nota:
   - Antes essa versão do auth exibia um overlay de login embutido no index.html.
   - Agora o fluxo central de autenticação está em login-page.js (login.html); este arquivo age como adaptador.
   - Quando migrar para Supabase:
       * Remova localStorage usage e utilize supabase.auth.getSession() / onAuthStateChange.
       * Ajuste Main.onAuthChanged para reagir aos eventos do Supabase.
*/

const Auth = (function(){
  let currentUser = null;

  // Carrega usuário do localStorage (mesmo esquema usado pelo login-page.js)
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem('pandda_user');
      currentUser = raw ? JSON.parse(raw) : null;
    } catch (e) {
      currentUser = null;
    }
  }

  // Inicia o adaptador de autenticação
  async function init() {
    // Carrega usuário salvo (se houver)
    loadFromStorage();

    // Se não houver usuário logado no protótipo, redirecionar para login.html
    // Mantemos compatibilidade com ambientes de desenvolvimento que possam precisar do overlay
    if (!currentUser) {
      // Se estivermos já na página de login, não redirecionar em loop
      if (!/login\.html$/.test(window.location.pathname)) {
        // Redireciona para a página de login separada
        window.location.href = 'login.html';
        return;
      }
    } else {
      // Existe usuário: expor para o app e não redirecionar
      // Se estivermos na página de login, já logado, voltar para index
      if (/login\.html$/.test(window.location.pathname)) {
        window.location.href = 'index.html';
        return;
      }
    }

    // Se chegou até aqui, estamos numa página que não precisa redirecionamento imediato
    // Expor onAuthChanged para o Main (a Main inicializa Auth e espera chamadas)
    if (window.Main && typeof window.Main.onAuthChanged === 'function') {
      window.Main.onAuthChanged(currentUser);
    }
  }

  // Retorna usuário atual (lido do localStorage)
  function getUser() {
    if (!currentUser) loadFromStorage();
    return currentUser;
  }

  // Ao solicitar exibir o login, redirecionamos para a página dedicada
  function showLogin() {
    // se já estivermos em login.html não redirecionamos
    if (!/login\.html$/.test(window.location.pathname)) {
      window.location.href = 'login.html';
    }
  }

  // hideLogin não precisa fazer nada neste fluxo; preservado para compatibilidade
  function hideLogin() {
    // no fluxo atual o login é tratado na página login.html; manter assinatura
    // se desejar, podemos redirecionar para index.html quando chamado
    if (/login\.html$/.test(window.location.pathname)) {
      // tentar retornar para index caso haja usuário
      loadFromStorage();
      if (currentUser) window.location.href = 'index.html';
    }
  }

  // Função de logout simples para protótipo
  function logout() {
    localStorage.removeItem('pandda_user');
    currentUser = null;
    // redirecionar para login
    showLogin();
  }

  return { init, getUser, showLogin, hideLogin, logout };
})();
