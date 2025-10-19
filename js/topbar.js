/**
 * topbar.js
 *
 * Responsabilidades:
 * - Renderizar/atualizar a topbar (marca, botão de tema, botão de perfil).
 * - Gerenciar menu de perfil (criação única, não acumula elementos no DOM).
 * - Sincronizar tema com localStorage (chave "pandda_theme").
 * - Controlar comportamento do botão #mobileMenuBtn:
 *     * Em mobile (<=900px) alterna sidebar.expanded (overlay).
 *     * Em desktop alterna sidebar.collapsed (colapsa para ícones).
 *
 * Observações Supabase (onde substituir):
 * - Logout: substituir Auth.logout() por supabase.auth.signOut() quando supabase estiver disponível.
 * - Carregar dados extras do usuário (nome/role): usar supabase.from('users').select(...).eq('id', userId).
 */

(function () {
  const ROOT_SELECTOR = '.topbar';
  const THEME_KEY = 'pandda_theme';
  let root = null;
  let menuEl = null;
  let profileBtn = null;
  let themeBtn = null;

  // Cria elemento DOM com opções simples (sem innerHTML)
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

  // Detecta se estamos em "mobile" (mesma quebra usada no CSS)
  function isMobileView() {
    return window.matchMedia('(max-width:900px)').matches;
  }

  // Garante criação única do menu de perfil
  function ensureProfileMenu() {
    if (menuEl && document.body.contains(menuEl)) return menuEl;

    menuEl = createEl('div', { className: 'profile-menu hidden', attrs: { role: 'menu' } });

    const profileItem = createEl('button', { className: 'menu-item', text: 'Meu perfil', attrs: { 'data-action': 'profile', role: 'menuitem' } });
    const logoutItem = createEl('button', { className: 'menu-item', text: 'Sair', attrs: { 'data-action': 'logout', role: 'menuitem' } });

    profileItem.addEventListener('click', (e) => {
      e.stopPropagation();
      // Ao integrar Supabase, busque dados extras aqui e populate modal
      Modal.open({
        title: 'Meu perfil',
        contentBuilder(container) {
          const info = createEl('div');
          const user = Auth.getUser() || {};
          const email = createEl('div', { text: `Email: ${user.email || '-'}` });
          const role = createEl('div', { text: `Papel: ${user.role || '-'}` });
          info.appendChild(email);
          info.appendChild(role);
          container.appendChild(info);
        },
        onSave: async () => {
          // Em Supabase: supabase.from('users').update(...).eq('id', userId)
          return Promise.resolve();
        }
      });
      hideProfileMenu();
    });

    logoutItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        // Substituir por supabase.auth.signOut() quando integrar:
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

  // Posiciona e mostra o menu relativo ao botão de perfil
  function showProfileMenu() {
    const menu = ensureProfileMenu();
    if (!profileBtn) return;
    const rect = profileBtn.getBoundingClientRect();
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

  // Tema
  function setTheme(next) {
    const rootDoc = document.documentElement;
    if (next === 'dark') rootDoc.setAttribute('data-theme', 'dark');
    else rootDoc.removeAttribute('data-theme');
    try { localStorage.setItem(THEME_KEY, next === 'dark' ? 'dark' : 'light'); } catch (e) {}
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  // Atualiza label do botão de perfil com fallback (name || email)
  function updateProfileButton(user) {
    if (!profileBtn) return;
    const display = (user && (user.name || user.email)) ? (user.name || user.email) : 'Usuário';
    const label = createEl('span', { text: display });
    const role = createEl('span', { className: 'role', text: ` ${user?.role || 'Admin'}` });
    while (profileBtn.firstChild) profileBtn.removeChild(profileBtn.firstChild);
    const strong = createEl('strong');
    strong.appendChild(label);
    profileBtn.appendChild(strong);
    profileBtn.appendChild(role);
  }

  // Controlador para o botão que fica na topbar (#mobileMenuBtn).
  // Usa a mesma lógica anterior do protótipo: mobile -> overlay; desktop -> collapsed.
  function attachMobileMenuHandler() {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (!btn || !sidebar) return;

    // remova possíveis listeners duplicados antes de anexar
    btn.replaceWith(btn.cloneNode(true));
    const freshBtn = document.getElementById('mobileMenuBtn');

    freshBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (isMobileView()) {
        // overlay: expand/collapse via class 'expanded'
        sidebar.classList.toggle('expanded');
      } else {
        // desktop: alterna colapso (apenas ícones)
        sidebar.classList.toggle('collapsed');
      }
      // Ao alternar sidebar pelo botão, fechar o menu de perfil caso aberto
      hideProfileMenu();
    });

    // fechar sidebar overlay se clicar fora quando em mobile
    document.addEventListener('click', (e) => {
      if (!isMobileView()) return;
      if (!sidebar.contains(e.target) && !freshBtn.contains(e.target)) {
        sidebar.classList.remove('expanded');
      }
    });

    // Ao redimensionar, garantir que estados inconsistentes não persistam
    window.addEventListener('resize', () => {
      if (isMobileView()) {
        sidebar.classList.remove('collapsed'); // garantir legibilidade em mobile
      } else {
        sidebar.classList.remove('expanded'); // remover overlay no desktop
      }
    });
  }

  // Renderiza topbar reutilizando a .topbar do HTML (ou criando se ausente)
  function render() {
    root = document.querySelector(ROOT_SELECTOR);
    if (!root) {
      root = createEl('header', { className: 'topbar' });
      document.body.insertBefore(root, document.body.firstChild);
    }
    // limpar conteúdo atual
    root.innerHTML = '';

    // marca
    const brand = createEl('div', { className: 'brand', text: 'Pandda' });

    // container direito
    const right = createEl('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '12px';

    // botão de tema
    themeBtn = createEl('button', { className: 'icon-btn', attrs: { 'aria-label': 'Alternar tema' } });
    themeBtn.textContent = '🌓';
    themeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleTheme(); });

    // botão de perfil
    profileBtn = createEl('button', { className: 'profile-btn', attrs: { 'aria-haspopup': 'true', 'aria-expanded': 'false' } });
    const placeholder = createEl('strong', { text: 'Usuário' });
    profileBtn.appendChild(placeholder);
    profileBtn.appendChild(createEl('span', { className: 'role', text: ' Admin' }));

    profileBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const isHidden = !ensureProfileMenu() || ensureProfileMenu().classList.contains('hidden');
      if (isHidden) showProfileMenu();
      else hideProfileMenu();
    });

    right.appendChild(themeBtn);
    right.appendChild(profileBtn);

    root.appendChild(brand);
    root.appendChild(right);

    // comportamento geral do clique fora
    document.addEventListener('click', (e) => {
      if (!menuEl) return;
      if (!menuEl.contains(e.target) && !profileBtn.contains(e.target)) {
        hideProfileMenu();
      }
    });

    // sincronizar tema salvo
    try {
      const saved = localStorage.getItem(THEME_KEY) || 'light';
      setTheme(saved === 'dark' ? 'dark' : 'light');
    } catch (e) {}

    // preencher dados do usuário atual
    updateProfileButton(Auth.getUser());

    // criar menu (uma vez) e configurar o handler do botão mobile/sidebar
    ensureProfileMenu();
    attachMobileMenuHandler();
  }

  // API pública
  window.Topbar = {
    render,
    refreshProfile(user) { updateProfileButton(user || Auth.getUser()); }
  };
})();
