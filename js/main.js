/* main.js
   Entrada do app: inicializa mock, autenticação, controle de navegação, tema e sidebar.
   Alterações principais:
     - Removeu-se a lógica redundante que lidava com #mobileMenuBtn e toggle de sidebar.
     - Topbar.render() agora é responsável por gerenciar #mobileMenuBtn e posicionamento do sidebar.
     - Em onAuthChanged, Topbar.refreshProfile(user) é chamado para sincronizar o topo com estado de autenticação.
     - Comentários mostram onde integrar Supabase.
*/

const Main = (function(){
  async function init() {
    // Inicializa MockAPI (substituir por carregamento real com Supabase quando integrado)
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

    // Sidebar elements (o controle de abrir/fechar agora é gerido por topbar.js)
    const sidebar = document.getElementById('sidebar');

    // Footer elements (mantém lógica da sidebar footer)
    const sidebarFooter = document.getElementById('sidebarFooter');
    const avatarEl = sidebarFooter.querySelector('.user-avatar');
    const dropdown = sidebarFooter.querySelector('.sidebar-footer-dropdown');
    const myProfileBtn = document.getElementById('myProfileBtn');
    const signOutBtn = document.getElementById('signOutBtn');

    // Ao redimensionar, garantir consistência visual (manter comportamentos existentes)
    window.addEventListener('resize', () => {
      // Se a Topbar já removeu/ajustou classes via seu resize handler, aqui apenas reforçamos
      if (window.matchMedia('(max-width:900px)').matches) {
        sidebar.classList.remove('collapsed');
      } else {
        sidebar.classList.remove('expanded');
      }
      closeFooterDropdown();
    });

    // Atualiza footer da sidebar com dados do usuário atual (nome, role e avatar iniciais)
    updateSidebarFooter();

    // Footer dropdown behavior
    sidebarFooter.addEventListener('click', (e) => {
      if (sidebar.classList.contains('collapsed')) return;
      const isOpen = sidebarFooter.classList.contains('open');
      if (isOpen) closeFooterDropdown();
      else openFooterDropdown();
    });

    sidebarFooter.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (sidebar.classList.contains('collapsed')) return;
        const isOpen = sidebarFooter.classList.contains('open');
        if (isOpen) closeFooterDropdown();
        else openFooterDropdown();
      } else if (e.key === 'Escape') {
        closeFooterDropdown();
      }
    });

    myProfileBtn.addEventListener('click', () => {
      Modal.open({
        title: 'Meu perfil',
        contentBuilder(container, data, h) {
          const user = Auth.getUser() || {};
          const email = h.createInput({ label: 'Email', name: 'email', value: user.email || '', required: true });
          const role = h.createInput({ label: 'Papel', name: 'role', value: user.role || '', attrs: { readonly: true } });
          container.appendChild(email.wrap);
          container.appendChild(role.wrap);
          container._collectData = () => ({ email: email.input.value, role: role.input.value });
        },
        onSave: async () => {
          // Em Supabase: supabase.from('users').update(...).eq('id', userId)
          return Promise.resolve();
        }
      });
      closeFooterDropdown();
    });

    signOutBtn.addEventListener('click', () => {
      // Atual fluxo de protótipo
      localStorage.removeItem('pandda_user');
      Auth.showLogin();
      closeFooterDropdown();
    });

    // Navegação do menu lateral
    document.getElementById('menuList').addEventListener('click', (e)=> {
      const li = e.target.closest('.menu-item');
      if (!li) return;
      document.querySelectorAll('.menu-item').forEach(i=>i.classList.remove('selected'));
      li.classList.add('selected');
      const view = li.dataset.view;
      navigateTo(view);
      // Auto close mobile menu: topbar.js também lida com overlay, reforçamos aqui
      const sidebarEl = document.getElementById('sidebar');
      if (window.matchMedia('(max-width:900px)').matches) {
        sidebarEl.classList.remove('expanded');
      }
      closeFooterDropdown();
    });

    // Expose onAuthChanged for Auth
    window.Main = { onAuthChanged };

    // Rota inicial
    navigateTo('dashboard');

    function openFooterDropdown() {
      sidebarFooter.classList.add('open');
      sidebarFooter.setAttribute('aria-expanded','true');
      dropdown.setAttribute('aria-hidden','false');
    }
    function closeFooterDropdown() {
      sidebarFooter.classList.remove('open');
      sidebarFooter.setAttribute('aria-expanded','false');
      dropdown.setAttribute('aria-hidden','true');
    }
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
    const userNameEl = footer.querySelector('.user-name');
    const userRoleEl = footer.querySelector('.user-role');
    const user = Auth.getUser();
    if (user) {
      const displayName = user.email || user.id || 'Admin';
      userNameEl.textContent = displayName;
      userRoleEl.textContent = user.role ? (user.role === 'master' ? 'Master' : 'Comum') : 'Comum';
      const initials = getInitials(displayName);
      if (avatarEl) avatarEl.textContent = initials;
      const tooltipText = `${displayName} • ${userRoleEl.textContent}`;
      footer.setAttribute('aria-label', tooltipText);
    } else {
      userNameEl.textContent = 'Anônimo';
      userRoleEl.textContent = '-';
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
