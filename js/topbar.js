/**
 * js/topbar.js
 *
 * Responsabilidades:
 * - Renderizar e manter a topbar sem destruir elementos estáticos existentes.
 * - Gerenciar menu de perfil (criado apenas uma vez).
 * - O botão de perfil exibe apenas o nome/usuário (sem mostrar o tipo/role).
 * - Sincronizar tema com localStorage (chave "pandda_theme").
 * - Controlar comportamento do botão #mobileMenuBtn:
 *     * Em mobile (<=900px) alterna sidebar.expanded (overlay).
 *     * Em desktop alterna sidebar.collapsed (colapsa para ícones).
 *
 * Observações para Supabase:
 * - Substituir Auth.getUser() / Auth.logout() por supabase.auth.getSession() / supabase.auth.signOut()
 *   quando o cliente Supabase estiver inicializado. Comentários no código indicam locais exatos.
 *
 * Uso:
 * - Chamar Topbar.render() ou Topbar.init() uma vez após DOMContentLoaded.
 * - Chamar Topbar.refreshProfile(user) quando o usuário mudar.
 */

(function () {
  const ROOT_SELECTOR = '.topbar';
  const THEME_KEY = 'pandda_theme';
  let root = null;
  let menuEl = null;
  let profileBtn = null;
  let themeBtn = null;
  let mobileBtn = null;

  // --- helpers simples ---
  function createEl(tag, opts = {}) {
    const el = document.createElement(tag);
    if (opts.className) el.className = opts.className;
    if (opts.text) el.textContent = opts.text;
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach((k) => {
        if (opts.attrs[k] === null) el.removeAttribute(k);
        else el.setAttribute(k, opts.attrs[k]);
      });
    }
    if (opts.props) {
      Object.keys(opts.props).forEach((k) => {
        el[k] = opts.props[k];
      });
    }
    return el;
  }

  function isMobileView() {
    return window.matchMedia('(max-width:900px)').matches;
  }

  // --- menu de perfil: criação única ---
  function ensureProfileMenu() {
    if (menuEl && document.body.contains(menuEl)) return menuEl;

    menuEl = createEl('div', { className: 'profile-menu hidden', attrs: { role: 'menu' } });

    // Menu: "Meu perfil" e "Sair". Logout chama Auth.logout() no protótipo.
    const profileItem = createEl('button', {
      className: 'menu-item',
      text: 'Meu perfil',
      attrs: { 'data-action': 'profile', role: 'menuitem' }
    });

    const logoutItem = createEl('button', {
      className: 'menu-item',
      text: 'Sair',
      attrs: { 'data-action': 'logout', role: 'menuitem' }
    });

    profileItem.addEventListener('click', (e) => {
      e.stopPropagation();
      Modal.open({
        title: 'Meu perfil',
        contentBuilder(container) {
          const user = Auth.getUser() || {};
          const info = createEl('div');
          info.appendChild(createEl('div', { text: `Email: ${user.email || '-'}` }));
          // Não exibimos role aqui por decisão do design atual
          container.appendChild(info);
        },
        onSave: async () => {
          // Para Supabase: supabase.from('users').update(...).eq('id', userId)
          return Promise.resolve();
        }
      });
      hideProfileMenu();
    });

    logoutItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        // Substituir por supabase.auth.signOut() quando Supabase estiver integrado:
        // if (typeof supabase !== 'undefined' && supabase.auth) { await supabase.auth.signOut(); }
        // else { Auth.logout(); }
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

  // --- tema ---
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

  // --- atualiza botão de perfil: somente nome/usuário (sem role) ---
  function updateProfileButton(user) {
    if (!profileBtn) return;
    const display = (user && (user.name || user.email)) ? (user.name || user.email) : 'Usuário';
    while (profileBtn.firstChild) profileBtn.removeChild(profileBtn.firstChild);
    const strong = createEl('strong', { text: display });
    profileBtn.appendChild(strong);
  }

  // --- comportamento do botão #mobileMenuBtn (reusa o botão existente) ---
  function attachMobileMenuHandler() {
    mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (!mobileBtn || !sidebar) return;

    // Para evitar piscar, substituímos o nó apenas por clone do próprio botão
    // e adicionamos o handler no clone (assim removemos listeners antigos).
    const newBtn = mobileBtn.cloneNode(true);
    mobileBtn.parentNode.replaceChild(newBtn, mobileBtn);
    mobileBtn = newBtn;

    const handleClick = (ev) => {
      ev.stopPropagation();
      if (isMobileView()) {
        sidebar.classList.toggle('expanded');
      } else {
        sidebar.classList.toggle('collapsed');
      }
      hideProfileMenu();
    };

    mobileBtn.addEventListener('click', handleClick);

    document.addEventListener('click', (e) => {
      if (!isMobileView()) return;
      if (!sidebar.contains(e.target) && !mobileBtn.contains(e.target)) {
        sidebar.classList.remove('expanded');
      }
    });

    window.addEventListener('resize', () => {
      if (isMobileView()) {
        sidebar.classList.remove('collapsed');
      } else {
        sidebar.classList.remove('expanded');
      }
    });
  }

  // --- render sem destruir elementos estáticos ---
  function render() {
    root = document.querySelector(ROOT_SELECTOR);
    if (!root) {
      root = createEl('header', { className: 'topbar' });
      document.body.insertBefore(root, document.body.firstChild);
    }

    // Reusar .brand se existir
    let brandEl = root.querySelector('.brand');
    if (!brandEl) {
      brandEl = createEl('div', { className: 'brand', text: 'Pandda' });
      root.insertBefore(brandEl, root.firstChild);
    } else {
      if (!brandEl.textContent || brandEl.textContent.trim().length === 0) brandEl.textContent = 'Pandda';
    }

    // Reusar top-actions container
    let right = root.querySelector('.top-actions');
    if (!right) {
      right = createEl('div', { className: 'top-actions' });
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '12px';
      root.appendChild(right);
    }

    // Theme button: preferir #themeToggle se presente no HTML
    themeBtn = document.getElementById('themeToggle') || right.querySelector('.icon-btn[data-role="theme"]');
    if (!themeBtn) {
      themeBtn = createEl('button', { className: 'icon-btn', attrs: { 'aria-label': 'Alternar tema' } });
      themeBtn.textContent = '🌓';
      themeBtn.setAttribute('data-role', 'theme');
      right.appendChild(themeBtn);
    } else {
      if (themeBtn.parentNode !== right) right.appendChild(themeBtn);
    }
    // Remover listeners antigos via clone e adicionar o handler
    const themeClone = themeBtn.cloneNode(true);
    themeBtn.parentNode.replaceChild(themeClone, themeBtn);
    themeBtn = themeClone;
    themeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleTheme(); });

    // Profile button: reusar .profile-btn ou criar novo
    profileBtn = root.querySelector('.profile-btn');
    if (!profileBtn) {
      profileBtn = createEl('button', { className: 'profile-btn', attrs: { 'aria-haspopup': 'true', 'aria-expanded': 'false' } });
      profileBtn.appendChild(createEl('strong', { text: 'Usuário' }));
      right.appendChild(profileBtn);
    } else {
      if (profileBtn.parentNode !== right) right.appendChild(profileBtn);
    }

    // Remover listeners antigos no profileBtn substituindo por clone
    const newProfileBtn = profileBtn.cloneNode(true);
    profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);
    profileBtn = newProfileBtn;
    profileBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const isHidden = !ensureProfileMenu() || ensureProfileMenu().classList.contains('hidden');
      if (isHidden) showProfileMenu();
      else hideProfileMenu();
    });

    // Garantir menu criado e sincronizar tema salvo
    ensureProfileMenu();
    try {
      const saved = localStorage.getItem(THEME_KEY) || 'light';
      setTheme(saved === 'dark' ? 'dark' : 'light');
    } catch (e) { /* ignore */ }

    // Preencher nome do usuário no botão de perfil
    updateProfileButton(Auth.getUser());

    // Clique fora fecha menu (adiciona listener idempotente)
    if (!document._topbar_profile_outside_listener_attached) {
      document.addEventListener('click', (e) => {
        if (!menuEl) return;
        if (!menuEl.contains(e.target) && profileBtn && !profileBtn.contains(e.target)) {
          hideProfileMenu();
        }
      });
      document._topbar_profile_outside_listener_attached = true;
    }

    // Anexa handler do mobile/menu (reutiliza #mobileMenuBtn já presente)
    attachMobileMenuHandler();
  }

  // API pública
  window.Topbar = {
    render,
    init: render,
    refreshProfile(user) { updateProfileButton(user || Auth.getUser()); }
  };
})();
