/* main.js
   Entrada do app: inicializa mock, autenticação, controle de navegação, tema e sidebar comportamento responsivo.

   Alterações aplicadas:
     - Deleguei a renderização do topbar para Topbar (js/topbar.js).
     - Removi listener redundante para #themeToggle (Topbar já expõe botão e lógica).
     - Ao mudar autenticação, atualizo Topbar.refreshProfile(user).
     - Comentários mostram onde integrar o Supabase.
*/

const Main = (function(){
  async function init() {
    // Inicializa MockAPI
    MockAPI.init();

    // Autenticação
    await Auth.init();

    // Inicializa Topbar (se estiver carregado)
    if (window.Topbar && typeof window.Topbar.render === 'function') {
      window.Topbar.render();
    }

    // Theme: ler do localStorage (Topbar também sincroniza; mantemos como fallback)
    const savedTheme = localStorage.getItem('pandda_theme') || 'light';
    setTheme(savedTheme);

    // Nota: Topbar já possui o botão de alternância de tema; não é necessário duplicar o listener.
    // Se o layout manter o botão #themeToggle no HTML, podemos mantê-lo para compatibilidade,
    // mas evitar duplicação de comportamento. Mantemos o botão antigo sem adicionar listener aqui.

    // Sidebar behavior: usamos o mesmo botão da topbar (mobileMenuBtn)
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    // Footer elements
    const sidebarFooter = document.getElementById('sidebarFooter');
    const avatarEl = sidebarFooter.querySelector('.user-avatar');
    const dropdown = sidebarFooter.querySelector('.sidebar-footer-dropdown');
    const myProfileBtn = document.getElementById('myProfileBtn');
    const signOutBtn = document.getElementById('signOutBtn');

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
      // Fechar dropdown ao alternar a sidebar para evitar sobreposição/estado inconsistente
      closeFooterDropdown();
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
      // Se clicou fora do footer dropdown, fechar o dropdown
      if (!sidebarFooter.contains(e.target)) {
        closeFooterDropdown();
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
      // fechar dropdown ao redimensionar
      closeFooterDropdown();
    });

    // Atualiza footer da sidebar com dados do usuário atual (nome, role e avatar iniciais)
    updateSidebarFooter();

    // Ao clicar no footer: alterna dropdown. Se sidebar estiver colapsada, não abrir dropdown (tooltip será usado)
    sidebarFooter.addEventListener('click', (e) => {
      // Se a sidebar estiver colapsada, evitar abrir o dropdown e permitir o tooltip
      if (sidebar.classList.contains('collapsed')) return;
      const isOpen = sidebarFooter.classList.contains('open');
      if (isOpen) closeFooterDropdown();
      else openFooterDropdown();
    });

    // Acessibilidade: abrir dropdown ao pressionar Enter/Space no footer
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

    // Dropdown item handlers
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
          // No protótipo não alteramos realmente o usuário; apenas fecha o modal com feedback.
          // Com Supabase: aqui você chamaria supabase.from('users').update({...}).eq('id', userId)
          return Promise.resolve();
        }
      });
      closeFooterDropdown();
    });

    signOutBtn.addEventListener('click', () => {
      localStorage.removeItem('pandda_user');
      Auth.showLogin();
      closeFooterDropdown();
    });

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
      // fechar o dropdown se estiver aberto
      closeFooterDropdown();
    });

    // Expose onAuthChanged for Auth
    window.Main = { onAuthChanged };

    // Initial route/dashboard
    navigateTo('dashboard');

    // Helpers para o dropdown
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
    // user: { id, email, role }
    // Atualiza UI com permissões
    if (user) {
      // esconder botão login e apresentar app
      const loginOverlay = document.getElementById('loginOverlay');
      if (loginOverlay) loginOverlay.classList.add('hidden');
      updateSidebarFooter();
      // Atualizar topbar com dados do usuário se Topbar estiver carregado
      if (window.Topbar && typeof window.Topbar.refreshProfile === 'function') {
        window.Topbar.refreshProfile(user);
      }
      // Re-render current view to aplicar permissões
      const sel = document.querySelector('.menu-item.selected');
      if (sel) navigateTo(sel.dataset.view);
    } else {
      updateSidebarFooter(); // mostra estado anônimo quando não logado
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
      // Avatar: usar iniciais do nome/email
      const initials = getInitials(displayName);
      if (avatarEl) avatarEl.textContent = initials;
      // Tooltip texto (quando sidebar colapsada)
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
    // Se for email, pegar antes do @
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
