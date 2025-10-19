/**
 * topbar.js
 *
 * Versão reescrita do componente Topbar seguindo estas premissas:
 * - Não injeta HTML por string (sem innerHTML) para manter legibilidade e segurança.
 * - Reusa a estrutura existente no index.html quando disponível (evita duplicação).
 * - Cria o menu de perfil apenas uma vez e o reutiliza, evitando acúmulo no DOM.
 * - Usa fallback para exibir nome do usuário (email quando name ausente).
 * - Sincroniza alternância de tema com localStorage na chave "pandda_theme".
 * - Comentários explicativos mostram exatamente onde integrar o Supabase e o que substituir.
 *
 * Observação sobre integração com Supabase:
 * - Para autenticação substituir chamadas a Auth.getUser / Auth.logout por uso de
 *   supabase.auth.getSession() / supabase.auth.signOut() e reagir a onAuthStateChange.
 * - Para obter dados do usuário (nome, role) você pode manter uma tabela "users"
 *   e buscar campos adicionais após autenticação: supabase.from('users').select(...).eq('id', user.id)
 *
 * Uso:
 * - O arquivo exporta window.Topbar.render() que monta/atualiza o conteúdo da topbar.
 * - Chamar Topbar.render() após o carregamento do usuário ou após mudanças de login.
 */

(function () {
  const ROOT_SELECTOR = '.topbar';
  const THEME_KEY = 'pandda_theme';
  let root = null;
  let menuEl = null;
  let profileBtn = null;
  let themeBtn = null;

  // Cria um elemento com atributos e retorno do elemento
  function createEl(tag, opts = {}) {
    const el = document.createElement(tag);
    if (opts.className) el.className = opts.className;
    if (opts.text) el.textContent = opts.text;
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach((k) => el.setAttribute(k, opts.attrs[k]));
    }
    if (opts.props) {
      Object.keys(opts.props).forEach((k) => (el[k] = opts.props[k]));
    }
    return el;
  }

  // Garante que exista apenas um menu global e o retorna
  function ensureProfileMenu() {
    if (menuEl && document.body.contains(menuEl)) return menuEl;

    menuEl = createEl('div', { className: 'profile-menu hidden', attrs: { role: 'menu' } });
    // Botões do menu montados via DOM APIs (sem innerHTML)
    const profileItem = createEl('button', { className: 'menu-item', text: 'Meu perfil', attrs: { 'data-action': 'profile', role: 'menuitem' } });
    const logoutItem = createEl('button', { className: 'menu-item', text: 'Sair', attrs: { 'data-action': 'logout', role: 'menuitem' } });

    // Eventos
    profileItem.addEventListener('click', (e) => {
      e.stopPropagation();
      // Abre modal de perfil usando Modal (já presente no projeto).
      // Se for integrar com Supabase, aqui você pode abrir o modal e carregar dados adicionais
      // via supabase.from('users').select(...).eq('id', userId).single() para preencher os campos.
      Modal.open({
        title: 'Meu perfil',
        contentBuilder(container) {
          const info = createEl('div');
          const user = Auth.getUser() || {};
          const email = createEl('div', { text: `Email: ${user.email || '-'}` });
          const role = createEl('div', { text: `Papel: ${user.role || '-'}` });
          info.appendChild(email);
          info.appendChild(role);
          // Aqui você pode adicionar inputs para editar perfil e, na onSave do Modal,
          // chamar supabase.from('users').update({ ... }).eq('id', userId)
          container.appendChild(info);
        },
        onSave: async () => {
          // Em implementação com Supabase: atualizar user na tabela "users" aqui.
          // Exemplo comentado:
          // const { data: session } = await supabase.auth.getSession();
          // const userId = session?.user?.id;
          // await supabase.from('users').update({ name, ... }).eq('id', userId);
          return Promise.resolve();
        }
      });
      hideProfileMenu();
    });

    logoutItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      // Fluxo atual do protótipo usa Auth.logout() (localStorage).
      // Ao migrar para Supabase substituir por supabase.auth.signOut()
      // e garantir que Main.onAuthChanged seja chamado via onAuthStateChange.
      try {
        // Exemplo de substituição:
        // if (typeof supabase !== 'undefined' && supabase.auth) {
        //   await supabase.auth.signOut();
        // } else {
        //   Auth.logout();
        // }
        Auth.logout();
      } catch (err) {
        console.error('Erro ao deslogar:', err);
      }
      hideProfileMenu();
    });

    menuEl.appendChild(profileItem);
    menuEl.appendChild(logoutItem);
    document.body.appendChild(menuEl);

    return menuEl;
  }

  // Mostra/posiciona o menu relativo ao botão de perfil
  function showProfileMenu() {
    const menu = ensureProfileMenu();
    if (!profileBtn) return;
    const rect = profileBtn.getBoundingClientRect();

    // Calcula posição simples: abaixo do botão e alinhado à direita do botão
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
    menu.classList.remove('hidden');
    profileBtn.setAttribute('aria-expanded', 'true');
  }
  function hideProfileMenu() {
    if (!menuEl) return;
    menuEl.classList.add('hidden');
    if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
  }

  // Sincroniza estado do tema com localStorage e atualiza attribute no html
  function setTheme(next) {
    const rootDoc = document.documentElement;
    if (next === 'dark') rootDoc.setAttribute('data-theme', 'dark');
    else rootDoc.removeAttribute('data-theme');
    try {
      localStorage.setItem(THEME_KEY, next === 'dark' ? 'dark' : 'light');
    } catch (e) {
      // localStorage pode falhar em contextos restritos; ignorar silenciosamente
    }
  }

  // Alterna tema baseado no valor atual (lê attribute)
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  // Atualiza texto e role do botão de perfil com dados do usuário
  function updateProfileButton(user) {
    if (!profileBtn) return;
    const display = (user && (user.name || user.email)) ? (user.name || user.email) : 'Usuário';
    // Limitar texto para evitar overflow mantendo legibilidade
    const label = createEl('span', { text: display });
    const role = createEl('span', { className: 'role', text: ` ${user?.role || 'Admin'}` });

    // Limpar conteúdo atual com cuidado (não recriar attributes essenciais)
    while (profileBtn.firstChild) profileBtn.removeChild(profileBtn.firstChild);
    const strong = createEl('strong');
    strong.appendChild(label);
    profileBtn.appendChild(strong);
    profileBtn.appendChild(role);
  }

  // Monta a estrutura da topbar usando elementos existentes quando possível
  function render() {
    root = document.querySelector(ROOT_SELECTOR);
    if (!root) {
      // Se o index.html não contém .topbar, criamos a estrutura básica para evitar erros
      root = createEl('header', { className: 'topbar' });
      document.body.insertBefore(root, document.body.firstChild);
    }

    // Limpa apenas o conteúdo (mantendo o elemento raiz)
    root.innerHTML = '';

    // Brand (usar marca consistente Pandda)
    const brand = createEl('div', { className: 'brand' });
    brand.textContent = 'Pandda';

    // Árvore direita (botões)
    const right = createEl('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '12px';

    // Botão de tema (reutiliza lógica existente do Main para persistência)
    themeBtn = createEl('button', { className: 'icon-btn', attrs: { 'aria-label': 'Alternar tema' } });
    themeBtn.textContent = '🌓';
    themeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTheme();
    });

    // Botão de perfil (criado sem innerHTML); armazenamos referência global local
    profileBtn = createEl('button', { className: 'profile-btn', attrs: { 'aria-haspopup': 'true', 'aria-expanded': 'false' } });
    // Preenchimento inicial (será atualizado por updateProfileButton)
    const placeholder = createEl('strong', { text: 'Usuário' });
    profileBtn.appendChild(placeholder);
    const roleSpan = createEl('span', { className: 'role', text: ' Admin' });
    profileBtn.appendChild(roleSpan);

    // Handler de clique abre/fecha menu
    profileBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const isHidden = !ensureProfileMenu() || ensureProfileMenu().classList.contains('hidden');
      if (isHidden) showProfileMenu();
      else hideProfileMenu();
    });

    // Append nodes
    right.appendChild(themeBtn);
    right.appendChild(profileBtn);

    // Inserir na root
    root.appendChild(brand);
    root.appendChild(right);

    // Garante que clique fora fecha o menu
    document.addEventListener('click', (e) => {
      if (!menuEl) return;
      if (!menuEl.contains(e.target) && !profileBtn.contains(e.target)) {
        hideProfileMenu();
      }
    });

    // Ao redimensionar, reposicionar (quando menu estiver visível)
    window.addEventListener('resize', () => {
      if (menuEl && !menuEl.classList.contains('hidden')) {
        showProfileMenu();
      }
    });

    // Sincronizar estado do tema inicial com localStorage
    try {
      const saved = localStorage.getItem(THEME_KEY) || 'light';
      setTheme(saved === 'dark' ? 'dark' : 'light');
    } catch (e) {
      // ignore
    }

    // Atualizar botão de perfil com dados atuais do usuário
    const user = Auth.getUser();
    updateProfileButton(user);
    // Assegurar menu já criado e eventos configurados
    ensureProfileMenu();
  }

  // Export público: render e uma função utilitária para forçar atualização do perfil
  window.Topbar = {
    render,
    // Atualiza apenas a seção do perfil (útil quando o usuário loga/desloga)
    refreshProfile(user) {
      updateProfileButton(user || Auth.getUser());
    }
  };
})();
