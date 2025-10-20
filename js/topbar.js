// js/topbar.js
// Topbar render/handlers (preserva .profile-btn e integra toggle de tema).
(function () {
  const THEME_KEY = 'pandda_theme';

  function createEl(tag, opts = {}) {
    const el = document.createElement(tag);
    if (opts.className) el.className = opts.className;
    if (typeof opts.text !== 'undefined') el.textContent = opts.text;
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach(k => el.setAttribute(k, opts.attrs[k]));
    }
    return el;
  }

  function setTheme(next) {
    const root = document.documentElement;
    if (next === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem(THEME_KEY, next === 'dark' ? 'dark' : 'light'); } catch (e) {}
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  function init() {
    // inicializa dados mock se necessário
    if (window.MockAPI && typeof window.MockAPI.init === 'function') {
      try { MockAPI.init(); } catch (e) { /* ignore */ }
    }

    // ligar botão de tema se existir
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn && !themeBtn._topbar_theme_attached) {
      themeBtn._topbar_theme_attached = true;
      themeBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleTheme(); });
    }

    // garantir estado do tema salvo
    try {
      const saved = localStorage.getItem(THEME_KEY) || 'light';
      setTheme(saved === 'dark' ? 'dark' : 'light');
    } catch (e) { /* ignore */ }

    // Profile button: abrir menu simples (preserva classes)
    const profileBtn = document.querySelector('.profile-btn');
    if (profileBtn && !profileBtn._topbar_profile_attached) {
      profileBtn._topbar_profile_attached = true;
      profileBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const menu = ensureProfileMenu();
        const hidden = menu.classList.contains('hidden');
        if (hidden) {
          showProfileMenu(profileBtn, menu);
        } else {
          hideProfileMenu(menu, profileBtn);
        }
      });

      // fechar ao clicar fora
      document.addEventListener('click', function (e) {
        const menu = document.querySelector('.profile-menu');
        if (!menu) return;
        if (!menu.contains(e.target) && !profileBtn.contains(e.target)) {
          hideProfileMenu(menu, profileBtn);
        }
      });
    }
  }

  /* Perfil menu builders */
  function ensureProfileMenu() {
    let menu = document.querySelector('.profile-menu');
    if (menu && document.body.contains(menu)) return menu;
    menu = createEl('div', { className: 'profile-menu hidden' });
    const profileItem = createEl('button', { className: 'menu-item', text: 'Meu perfil' });
    const logoutItem = createEl('button', { className: 'menu-item', text: 'Sair' });

    profileItem.addEventListener('click', function (e) {
      e.stopPropagation();
      // abrir modal de perfil (se existir Modal)
      if (window.Modal && typeof Modal.open === 'function') {
        Modal.open({
          title: 'Meu perfil',
          contentBuilder(container) {
            const info = createEl('div', { text: `Email: ${Auth && Auth.getUser ? (Auth.getUser().email || '-') : '-'}` });
            container.appendChild(info);
          },
          onSave: async () => Promise.resolve()
        });
      }
      hideProfileMenu(menu);
    });

    logoutItem.addEventListener('click', function (e) {
      e.stopPropagation();
      try { if (window.Auth && typeof Auth.logout === 'function') Auth.logout(); } catch (err) { console.error(err); }
      hideProfileMenu(menu);
    });

    menu.appendChild(profileItem);
    menu.appendChild(logoutItem);
    document.body.appendChild(menu);
    return menu;
  }

  function showProfileMenu(btn, menu) {
    if (!btn || !menu) return;
    const rect = btn.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
    menu.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
  }

  function hideProfileMenu(menu, btn) {
    if (!menu) return;
    menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  // init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

  // export for tests/debug
  window.Topbar = { init, setTheme, toggleTheme };
})();
