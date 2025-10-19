(function(){
  const root = document.querySelector('.topbar');

  function render() {
    if (!root) return;
    root.innerHTML = '';

    const brand = document.createElement('div');
    brand.className = 'brand';
    brand.textContent = 'Painel';

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '12px';

    // Botão de tema (já existente)
    const themeBtn = document.createElement('button');
    themeBtn.className = 'icon-btn';
    themeBtn.innerHTML = '🌓';
    themeBtn.title = 'Alternar tema';
    themeBtn.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme');
      document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    };

    // Botão de perfil
    const user = Auth.getUser();
    const profileBtn = document.createElement('button');
    profileBtn.className = 'profile-btn';
    profileBtn.innerHTML = `<strong>${user?.name || 'Usuário'}</strong> – <span class="role">${user?.role || 'Admin'}</span>`;
    profileBtn.setAttribute('aria-haspopup','true');
    profileBtn.setAttribute('aria-expanded','false');

    // Menu suspenso
    const menu = document.createElement('div');
    menu.className = 'profile-menu hidden';
    menu.innerHTML = `
      <button class="menu-item" data-action="profile">Meu perfil</button>
      <button class="menu-item" data-action="logout">Sair</button>
    `;
    document.body.appendChild(menu);

    // Posicionamento e comportamento
    profileBtn.onclick = (e) => {
      e.stopPropagation();
      const rect = profileBtn.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 6}px`;
      menu.style.right = `${window.innerWidth - rect.right}px`;
      menu.classList.remove('hidden');
      profileBtn.setAttribute('aria-expanded','true');
    };

    document.addEventListener('click', () => {
      menu.classList.add('hidden');
      profileBtn.setAttribute('aria-expanded','false');
    });

    menu.querySelector('[data-action="logout"]').onclick = () => {
      Auth.logout();
    };

    menu.querySelector('[data-action="profile"]').onclick = () => {
      alert('Funcionalidade "Meu perfil" ainda não implementada.');
    };

    right.appendChild(themeBtn);
    right.appendChild(profileBtn);
    root.appendChild(brand);
    root.appendChild(right);
  }

  window.Topbar = { render };
})();
