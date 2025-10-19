/* main.js
   Entrada do app: inicializa mock, autenticação, controle de navegação, tema e sidebar.
   Alterações principais nesta versão:
     - Remove referências a #logoutBtn (botão removido do HTML).
     - Remove referências e lógica do dropdown da sidebar footer (myProfileBtn, signOutBtn, sidebar-footer-dropdown).
     - Topbar.render() gerencia mobileMenuBtn, tema e menu de perfil.
     - Mantém locais exatos onde integrar Supabase.
*/

const Main = (function(){
  async function init() {
    // Inicializa MockAPI
    MockAPI.init();

    // Autenticação (adapter atual usa localStorage). Ao migrar para Supabase:
    // - inicialize supabase client antes;
    // - use supabase.auth.onAuthStateChange para chamar Main.onAuthChanged.
    await Auth.init();

    // Inicializa Topbar (renderiza marca, botões, e conecta handler do mobile menu)
    if (window.Topbar && typeof window.Topbar.render === 'function') {
      window.Topbar.render();
    }

    // Theme: ler do localStorage como fallback (Topbar também sincroniza)
    const savedTheme = localStorage.getItem('pandda_theme') || 'light';
    setTheme(savedTheme);

    // Sidebar elements
    const sidebar = document.getElementById('sidebar');

    // Footer elements: agora simplificados (apenas avatar)
    const sidebarFooter = document.getElementById('sidebarFooter');
    const avatarEl = sidebarFooter ? sidebarFooter.querySelector('.user-avatar') : null;

    // Ao redimensionar, garantir consistência visual
    window.addEventListener('resize', () => {
      if (window.matchMedia('(max-width:900px)').matches) {
        sidebar.classList.remove('collapsed');
      } else {
        sidebar.classList.remove('expanded');
      }
      // fechar dropdown não necessário porque o dropdown foi removido
    });

    // Atualiza footer da sidebar com dados do usuário atual (iniciais no avatar)
    updateSidebarFooter();

    // Menu lateral navigation
    document.getElementById('menuList').addEventListener('click', (e)=> {
      const li = e.target.closest('.menu-item');
      if (!li) return;
      document.querySelectorAll('.menu-item').forEach(i=>i.classList.remove('selected'));
      li.classList.add('selected');
      const view = li.dataset.view;
      navigateTo(view);
      // Auto close mobile menu: Topbar gerencia overlay; garantimos aqui também
      const sidebarEl = document.getElementById('sidebar');
      if (window.matchMedia('(max-width:900px)').matches) {
        sidebarEl.classList.remove('expanded');
      }
    });

    // Expose onAuthChanged for Auth
    window.Main = { onAuthChanged };

    // Rota inicial
    navigateTo('dashboard');
  }

  async function onAuthChanged(user) {
    // Atualiza UI com permissões e sincroniza topbar
    if (user) {
      const loginOverlay = document.getElementById('loginOverlay');
      if (loginOverlay) loginOverlay.classList.add('hidden');
      updateSidebarFooter();
      if (window.Topbar && typeof window.Topbar.refreshProfile === 'function') {
        window.Topbar.refreshProfile(user);
      }
      const sel = document.querySelector('.menu-item.selected');
      if (sel) navigateTo(sel.dataset.view);
    } else {
      updateSidebarFooter();
      if (window.Topbar && typeof window.Topbar.refreshProfile === 'function') {
        window.Topbar.refreshProfile(null);
      }
    }
  }

  function updateSidebarFooter() {
    const footer = document.getElementById('sidebarFooter');
    if (!footer) return;
    const avatarEl = footer.querySelector('.user-avatar');
    const user = Auth.getUser();
    if (user) {
      const displayName = user.email || user.id || 'Usuário';
      const initials = getInitials(displayName);
      if (avatarEl) avatarEl.textContent = initials;
      const tooltipText = `${displayName}`;
      footer.setAttribute('aria-label', tooltipText);
    } else {
      if (avatarEl) avatarEl.textContent = 'AN';
      footer.setAttribute('aria-label', 'Anônimo');
    }
  }

  function getInitials(text) {
    if (!text) return 'U';
    const beforeAt = text.split('@')[0];
    const parts = beforeAt.split(/[.\s-_]+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
  }

  function setTheme(t) {
    const root = document.documentElement;
    if (t === 'dark') root.setAttribute('data-theme','dark');
    else root.removeAttribute('data-theme');
    localStorage.setItem('pandda_theme', t);
  }

  async function navigateTo(view) {
    if (view === 'dashboard') {
      const root = document.getElementById('view-root'); root.innerHTML = '<div class="card"><h2>Dashboard</h2><p>Visão geral do sistema (protótipo).</p></div>';
    } else if (view === 'clients') {
      await window.ClientsView.render();
    } else if (view === 'servers') {
      await window.ServersView.render();
    } else if (view === 'apps') {
      await window.AppsView.render();
    } else if (view === 'plans') {
      await window.PlansView.render();
    } else {
      document.getElementById('view-root').innerHTML = '<div class="card"><p>View não implementada</p></div>';
    }
  }

  return { init, onAuthChanged };
})();

document.addEventListener('DOMContentLoaded', () => { Main.init(); });
