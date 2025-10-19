/**
 * js/topbar.js
 *
 * Responsabilidades:
 * - Renderizar e manter a topbar sem recriar elementos existentes do DOM.
 * - Gerenciar menu de perfil (criado apenas uma vez).
 * - Sincronizar tema com localStorage (chave "pandda_theme").
 * - Controlar comportamento do botão #mobileMenuBtn:
 *     * Em mobile (<=900px) alterna sidebar.expanded (overlay).
 *     * Em desktop alterna sidebar.collapsed (colapsa para ícones).
 *
 * Regras importantes do projeto:
 * - Não injetar markup via strings (sem innerHTML).
 * - Reutilizar nodes existentes no index.html quando possível.
 *
 * Integração Supabase:
 * - Substituir Auth.getUser() / Auth.logout() por supabase.auth.getSession() / supabase.auth.signOut()
 *   quando o cliente Supabase estiver inicializado.
 *
 * Uso:
 * - Chamar Topbar.init() uma vez após DOMContentLoaded (ou Topbar.render() se preferir).
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

  // --- helpers simples para criar elementos sem innerHTML ---
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

  // --- menu de perfil: criação única, sem acumular no body ---
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
      // Abrir modal de perfil; carregar dados extra via Supabase quando integrado
      Modal.open({
        title: 'Meu perfil',
        contentBuilder(container) {
          const user = Auth.getUser() || {};
          const info = createEl('div');
          info.appendChild(createEl('div', { text: `Email: ${user.email || '-'}` }));
          info.appendChild(createEl('div', { text: `Papel: ${user.role || '-'}` }));
          container.appendChild(info);
        },
        onSave: async () => {
          // Se for usar Supabase: aqui você pode chamar supabase.from('users').update(...).eq('id', userId)
          return Promise.resolve();
        }
      });
      hideProfileMenu();
    });

    logoutItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        // Substituir por supabase.auth.signOut() ao integrar Supabase
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

  // --- atualiza o botão de perfil com fallback (name || email) ---
  function updateProfileButton(user) {
    if (!profileBtn) return;
    const display = (user && (user.name || user.email)) ? (user.name || user.email) : 'Usuário';

    // evita recriar attributes já definidos; só atualiza conteúdo interno
    // remover filhos antigos
    while (profileBtn.firstChild) profileBtn.removeChild(profileBtn.firstChild);

    const strong = createEl('strong', { text: display });
    const role = createEl('span', { className: 'role', text: ` ${user?.role || 'Admin'}` });

    profileBtn.appendChild(strong);
    profileBtn.appendChild(role);
  }

  // --- comportamento do botão #mobileMenuBtn (reusa o botão existente) ---
  function attachMobileMenuHandler() {
    // Reutilizar o botão se já existe (não substituir nem clonar)
    mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    if (!mobileBtn || !sidebar) return;

    // Importantíssimo: não usar replaceWith/cloneNode aqui (isso causa o piscar).
    // Remover listeners antigos de forma defensiva: armazenamos referência e usamos um wrapper (nomeado)
    // para poder remover caso necessário. Aqui assumimos inicialização única.
    const handleClick = (ev) => {
      ev.stopPropagation();
      if (isMobileView()) {
        sidebar.classList.toggle('expanded');
      } else {
        sidebar.classList.toggle('collapsed');
      }
      // fechar menu de perfil se aberto
      hideProfileMenu();
    };

    // Remover listeners duplicados potencialmente anexados anteriormente:
    // Como não temos acesso às funções originais anexadas, uma estratégia segura é
    // clonar somente o conteúdo do botão (conservando o nó) sem trocar o nó em si:
    // - Se o botão já tiver listeners problemáticos em ambientes anteriores, o ideal
    //   é garantir que Topbar.init seja chamado apenas uma vez.
    // Para simplicidade e segurança: remover todos os listeners substituindo por uma cópia leve do conteúdo.
    const preservedAttrs = {};
    for (const attr of mobileBtn.attributes) preservedAttrs[attr.name] = attr.value;
    const newBtn = mobileBtn.cloneNode(true); // clona sem listeners
    // copia atributos (já copiados pelo cloneNode), então substitui o nó no DOM mantendo posição
    mobileBtn.parentNode.replaceChild(newBtn, mobileBtn);
    mobileBtn = newBtn;

    mobileBtn.addEventListener('click', handleClick);

    // fechar overlay quando clicar fora (mobile)
    document.addEventListener('click', (e) => {
      if (!isMobileView()) return;
      if (!sidebar.contains(e.target) && !mobileBtn.contains(e.target)) {
        sidebar.classList.remove('expanded');
      }
    });

    // garantir estado consistente ao redimensionar
    window.addEventListener('resize', () => {
      if (isMobileView()) {
        sidebar.classList.remove('collapsed');
      } else {
        sidebar.classList.remove('expanded');
      }
    });
  }

  // --- render sem destruir elementos estáticos existentes ---
  function render() {
    // procura raiz existente; se não existir cria (apenas o container)
    root = document.querySelector(ROOT_SELECTOR);
    if (!root) {
      root = createEl('header', { className: 'topbar' });
      // inserir no topo do body se não existir
      document.body.insertBefore(root, document.body.firstChild);
    }

    // Reusar marca (.brand) se presente; caso contrário, criar
    let brandEl = root.querySelector('.brand');
    if (!brandEl) {
      brandEl = createEl('div', { className: 'brand', text: 'Pandda' });
      // inserir no início da topbar
      root.insertBefore(brandEl, root.firstChild);
    } else {
      // garantir valor consistente (não sobrescrever visualmente a menos que necessário)
      if (!brandEl.textContent || brandEl.textContent.trim().length === 0) brandEl.textContent = 'Pandda';
    }

    // Reusar área de ações (direita) se existir; caso não exista, criar
    let right = root.querySelector('.top-actions');
    if (!right) {
      right = createEl('div', { className: 'top-actions' });
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '12px';
      root.appendChild(right);
    }

    // Botão de tema: reutilizar se já existir no DOM (ex.: id=themeToggle) ou criar um interno
    // Preferimos selecionar #themeToggle se presente no HTML (compatibilidade)
    themeBtn = document.getElementById('themeToggle') || right.querySelector('.icon-btn[data-role="theme"]');
    if (!themeBtn) {
      themeBtn = createEl('button', { className: 'icon-btn', attrs: { 'aria-label': 'Alternar tema' } });
      themeBtn.textContent = '🌓';
      themeBtn.setAttribute('data-role', 'theme');
      right.appendChild(themeBtn);
    } else {
      // move o elemento themeBtn para a área direita (se estiver em outro lugar)
      if (themeBtn.parentNode !== right) right.appendChild(themeBtn);
    }
    // garantir handler único: remover e adicionar
    themeBtn.replaceWith(themeBtn.cloneNode(true));
    themeBtn = document.querySelector('[data-role="theme"]') || document.getElementById('themeToggle');
    if (!themeBtn) themeBtn = right.querySelector('.icon-btn[data-role="theme"]'); // fallback
    themeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleTheme(); });

    // Botão de perfil: reutilizar se existir (procure .profile-btn), caso contrário criar
    profileBtn = root.querySelector('.profile-btn');
    if (!profileBtn) {
      profileBtn = createEl('button', { className: 'profile-btn', attrs: { 'aria-haspopup': 'true', 'aria-expanded': 'false' } });
      const placeholder = createEl('strong', { text: 'Usuário' });
      profileBtn.appendChild(placeholder);
      profileBtn.appendChild(createEl('span', { className: 'role', text: ' Admin' }));
      right.appendChild(profileBtn);
    } else {
      // move para área direita se não estiver
      if (profileBtn.parentNode !== right) right.appendChild(profileBtn);
    }

    // garantir listener de abrir/fechar menu (removemos listeners antigos clonando o nó)
    const newProfileBtn = profileBtn.cloneNode(true);
    profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);
    profileBtn = newProfileBtn;
    profileBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const isHidden = !ensureProfileMenu() || ensureProfileMenu().classList.contains('hidden');
      if (isHidden) showProfileMenu();
      else hideProfileMenu();
    });

    // garantir menu criado
    ensureProfileMenu();

    // sincronizar tema salvo
    try {
      const saved = localStorage.getItem(THEME_KEY) || 'light';
      setTheme(saved === 'dark' ? 'dark' : 'light');
    } catch (e) { /* ignore */ }

    // preencher dados do usuário no botão
    updateProfileButton(Auth.getUser());

    // sempre garantir clique fora para fechar menu (adicionar uma vez)
    // (defensiva: adicionamos um handler idempotente)
    if (!document._topbar_profile_outside_listener_attached) {
      document.addEventListener('click', (e) => {
        if (!menuEl) return;
        if (!menuEl.contains(e.target) && profileBtn && !profileBtn.contains(e.target)) {
          hideProfileMenu();
        }
      });
      document._topbar_profile_outside_listener_attached = true;
    }

    // anexar handler do botão mobile/menu da topbar (reusa o botão que vem do HTML)
    attachMobileMenuHandler();
  }

  // API pública
  window.Topbar = {
    render,
    // init é um alias que garante compatibilidade com fluxos que chamam Topbar.init()
    init: render,
    refreshProfile(user) { updateProfileButton(user || Auth.getUser()); }
  };
})();
