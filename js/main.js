/* main.js
   Entrada do app: inicializa mock, autenticação, controle de navegação, tema e sidebar comportamento responsivo.
   Observações para Supabase:
     - Inicializar supabase no topo deste arquivo se for usar recursos globais.
     - Substituir MockAPI.init por carregamento real dos dados.

   Alterações aplicadas:
     - Garantia de que topbar permanece sobre o conteúdo (z-index no CSS).
     - Aplicado padding-top global (CSS) para deslocar sidebar e main abaixo da topbar.
     - Mantidos comportamentos de toggle do menu: mobile overlay (expanded) e desktop collapse (collapsed).
     - Ao redimensionar, limpezas de classes para evitar estados conflitantes.
*/

const Main = (function(){
  async function init() {
    // Inicializa MockAPI
    MockAPI.init();

    // Autenticação
    await Auth.init();

    // Theme: ler do localStorage
    const savedTheme = localStorage.getItem('pandda_theme') || 'light';
    setTheme(savedTheme);

    // Eventos de toggle de tema
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('themeToggleSidebar').addEventListener('click', toggleTheme);

    // Sidebar behavior: usamos o mesmo botão da topbar (mobileMenuBtn)
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    // Função utilitária que detecta mobile
    function isMobileView() {
      return window.matchMedia('(max-width:900px)').matches;
    }

    // Clique no botão da topbar:
    // - mobile: alterna sidebar.expanded (overlay)
    // - desktop: alterna sidebar.collapsed (minimizado mostrando só ícones)
    mobileMenuBtn.addEventListener('click', () => {
      if (isMobileView()) {
        sidebar.classList.toggle('expanded');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });

    // Clique fora fecha o menu apenas no mobile (comportamento de overlay)
    document.addEventListener('click', (e) => {
      const isMobile = isMobileView();
      if (isMobile) {
        const sidebarEl = document.getElementById('sidebar');
        if (!sidebarEl.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
          sidebarEl.classList.remove('expanded');
        }
      }
    });

    // Ao redimensionar a janela, ajustar classes para evitar estados conflitantes
    window.addEventListener('resize', () => {
      if (isMobileView()) {
        // garantir que collapsed não impeça a abertura mobile
        sidebar.classList.remove('collapsed');
      } else {
        // garantir que expanded overlay não persista no desktop
        sidebar.classList.remove('expanded');
      }
    });

    // NOTE: Removemos qualquer referência ao id 'sidebarToggle' (botão interno antigo).
    // Verifique se não há usos residuais em outros arquivos; neste protótipo não existem.

    // Menu navigation
    document.getElementById('menuList').addEventListener('click', (e)=> {
      const li = e.target.closest('.menu-item');
      if (!li) return;
      document.querySelectorAll('.menu-item').forEach(i=>i.classList.remove('selected'));
      li.classList.add('selected');
      const view = li.dataset.view;
      navigateTo(view);
      // Auto close mobile menu
      if (window.matchMedia('(max-width:900px)').matches) {
        sidebar.classList.remove('expanded');
      }
    });

    // Expose onAuthChanged for Auth
    window.Main = { onAuthChanged };

    // Initial route/dashboard
    navigateTo('dashboard');
  }

  async function onAuthChanged(user) {
    // user: { id, email, role }
    // Atualiza UI com permissões
    if (user) {
      // esconder botão login e apresentar app
      document.getElementById('loginOverlay').classList.add('hidden');
      // Re-render current view to aplicar permissões
      const sel = document.querySelector('.menu-item.selected');
      if (sel) navigateTo(sel.dataset.view);
    } else {
      // mostrar login overlay (Auth.showLogin já faz isso)
    }
  }

  function setTheme(t) {
    const root = document.documentElement;
    if (t === 'dark') root.setAttribute('data-theme','dark');
    else root.removeAttribute('data-theme');
    localStorage.setItem('pandda_theme', t);
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  async function navigateTo(view) {
    // Limpa view-root e carrega a view correspondente
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
