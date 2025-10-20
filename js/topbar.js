/**
 * js/topbar.js
 *
 * Mantém a topbar sem perder atributos/classes do DOM original.
 * Reusa elementos, evita innerHTML total e preserva .profile-btn.
 */
(function () {
  const ROOT_SELECTOR = '.topbar';
  const THEME_KEY = 'pandda_theme';
  let root = null;
  let menuEl = null;
  let profileBtn = null;
  let themeBtn = null;
  let mobileBtn = null;

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

  function ensureProfileMenu() {
    if (menuEl && document.body.contains(menuEl)) return menuEl;

    menuEl = createEl('div', { className: 'profile-menu hidden', attrs: { role: 'menu' } });

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
          container.appendChild(info);
        },
        onSave: async () => Promise.resolve()
      });
      hideProfileMenu();
    });

    logoutItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      try { Auth.logout(); } catch (err) { console.error('Erro ao deslogar:', err); }
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

  function setTheme(next) {
    const rootDoc = document.documentElement;
    if (next === 'dark') rootDoc.setAttribute('data-theme', 'dark');
    else rootDoc.removeAttribute('data-theme');
    try { localStorage.setItem(THEME_KEY, next === 'dark' ? 'dark' : 'light'); } catch (e) {}
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  function updateProfileButton(user) {
    if (!profileBtn) return;
    const display = (user && (user.name || user.email)) ? (user.name || user.email) : 'Usuário';
    while (profileBtn.firstChild) profileBtn.removeChild(profileBtn.firstChild);
    const strong = createEl('strong', { text: display });
    profileBtn.appendChild(strong);
  }

  function attachMobileMenuHandler() {
    mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (!mobileBtn || !sidebar) return;

    // Substituir por clone apenas para remover listeners antigos sem afetar outros nós
    const newBtn = mobileBtn.cloneNode(true);
    mobileBtn.parentNode.replaceChild(newBtn, mobileBtn);
    mobileBtn = newBtn;

    const handleClick = (ev) => {
      ev.stopPropagation();
      if (isMobileView()) sidebar.classList.toggle('expanded');
      else sidebar.classList.toggle('collapsed');
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
      if (isMobileView()) sidebar.classList.remove('collapsed');
      else sidebar.classList.remove('expanded');
    });
  }

  function render() {
    root = document.querySelector(ROOT_SELECTOR);
    if (!root) {
      root = createEl('header', { className: 'topbar' });
      document.body.insertBefore(root, document.body.firstChild);
    }

    // Reusar .brand
    let brandEl = root.querySelector('.brand');
    if (!brandEl) {
      brandEl = createEl('div', { className: 'brand', text: 'Pandda' });
      root.insertBefore(brandEl, root.firstChild);
    } else {
      if (!brandEl.textContent || brandEl.textContent.trim().length === 0) brandEl.textContent = 'Pandda';
    }

    // Reusar top-actions
    let right = root.querySelector('.top-actions');
    if (!right) {
      right = createEl('div', { className: 'top-actions' });
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '12px';
      root.appendChild(right);
    }

    // Theme button
    themeBtn = document.getElementById('themeToggle') || right.querySelector('.icon-btn[data-role="theme"]');
    if (!themeBtn) {
      themeBtn = createEl('button', { className: 'icon-btn', text: '🌓', attrs: { 'aria-label': 'Alternar tema' } });
      themeBtn.setAttribute('data-role', 'theme');
      right.appendChild(themeBtn);
    } else {
      if (themeBtn.parentNode !== right) right.appendChild(themeBtn);
    }
    const themeClone = themeBtn.cloneNode(true);
    themeBtn.parentNode.replaceChild(themeClone, themeBtn);
    themeBtn = themeClone;
    themeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleTheme(); });

    // Profile button: reusar ou criar; garantir classe profile-btn preservada
    profileBtn = root.querySelector('.profile-btn');
    if (!profileBtn) {
      profileBtn = createEl('button', { className: 'profile-btn', attrs: { 'aria-haspopup': 'true', 'aria-expanded': 'false' } });
      profileBtn.appendChild(createEl('strong', { text: 'Usuário' }));
      right.appendChild(profileBtn);
    } else {
      if (profileBtn.parentNode !== right) right.appendChild(profileBtn);
      if (!profileBtn.classList.contains('profile-btn')) profileBtn.classList.add('profile-btn');
    }

    // Remover listeners antigos via clone, mas preservando classes/atributos
    const newProfileBtn = profileBtn.cloneNode(true);
    profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);
    profileBtn = newProfileBtn;
    profileBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const isHidden = !ensureProfileMenu() || ensureProfileMenu().classList.contains('hidden');
      if (isHidden) showProfileMenu();
      else hideProfileMenu();
    });

    ensureProfileMenu();

    try {
      const saved = localStorage.getItem(THEME_KEY) || 'light';
      setTheme(saved === 'dark' ? 'dark' : 'light');
    } catch (e) { /* ignore */ }

    updateProfileButton(Auth.getUser());

    if (!document._topbar_profile_outside_listener_attached) {
      document.addEventListener('click', (e) => {
        if (!menuEl) return;
        if (!menuEl.contains(e.target) && profileBtn && !profileBtn.contains(e.target)) {
          hideProfileMenu();
        }
      });
      document._topbar_profile_outside_listener_attached = true;
    }

    attachMobileMenuHandler();
  }

  window.Topbar = { render, init: render, refreshProfile(user) { updateProfileButton(user || Auth.getUser()); } };
})();
