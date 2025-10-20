// js/main.js
// Inicialização da aplicação: MockAPI, Topbar e roteamento simples via menu lateral.

(function () {
  const VIEW_ROOT_ID = 'view-root';
  const MENU_ID = 'app-menu';

  function setActiveMenuItem(selectedEl) {
    const menu = document.getElementById(MENU_ID);
    if (!menu) return;
    Array.from(menu.querySelectorAll('.menu-item')).forEach(li => li.classList.remove('selected'));
    if (selectedEl) selectedEl.classList.add('selected');
  }

  function loadViewByName(name) {
    const root = document.getElementById(VIEW_ROOT_ID);
    if (!root) return;
    root.innerHTML = ''; // clear

    try {
      if (name === 'dashboard') {
        const h = document.createElement('div');
        h.textContent = 'Dashboard (em desenvolvimento)';
        root.appendChild(h);
        return;
      }
      if (name === 'clients' && window.ClientsView && typeof ClientsView.render === 'function') {
        ClientsView.render();
        return;
      }
      if (name === 'plans' && window.PlansView && typeof PlansView.render === 'function') {
        PlansView.render();
        return;
      }
      if (name === 'servers' && window.ServersView && typeof ServersView.render === 'function') {
        ServersView.render();
        return;
      }
      if (name === 'apps' && window.AppsView && typeof AppsView.render === 'function') {
        AppsView.render();
        return;
      }
      // fallback
      const p = document.createElement('div');
      p.textContent = 'View não encontrada: ' + name;
      root.appendChild(p);
    } catch (err) {
      console.error('Erro ao carregar view', name, err);
      const errEl = document.createElement('div');
      errEl.textContent = 'Erro ao carregar a view. Veja o console.';
      root.appendChild(errEl);
    }
  }

  function attachMenuHandlers() {
    const menu = document.getElementById(MENU_ID);
    if (!menu) return;
    menu.addEventListener('click', function (ev) {
      const li = ev.target.closest('.menu-item');
      if (!li) return;
      const view = li.getAttribute('data-view');
      setActiveMenuItem(li);
      loadViewByName(view);
      // close sidebar on mobile for better UX
      const sidebar = document.getElementById('sidebar');
      if (window.matchMedia('(max-width:900px)').matches && sidebar) {
        sidebar.classList.remove('expanded');
      }
    });
  }

  function ensureMockAPI() {
    if (window.MockAPI && typeof window.MockAPI.init === 'function') {
      try { MockAPI.init(); } catch (e) { /* ignore */ }
    } else {
      console.warn('MockAPI não encontrado');
    }
  }

  function init() {
    ensureMockAPI();

    // init Topbar if available
    if (window.Topbar && typeof Topbar.init === 'function') {
      try { Topbar.init(); } catch (e) { console.error('Topbar init falhou', e); }
    }

    attachMenuHandlers();

    // load default view (plans)
    const defaultItem = document.querySelector(`#${MENU_ID} .menu-item[data-view="plans"]`) || document.querySelector(`#${MENU_ID} .menu-item`);
    if (defaultItem) {
      setActiveMenuItem(defaultItem);
      loadViewByName(defaultItem.getAttribute('data-view') || 'dashboard');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

  window.AppInit = { init, loadViewByName };
})();
