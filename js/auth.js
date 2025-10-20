// js/auth.js
// Mock mínimo de Auth usado pela UI. Em produção substitua pelo provedor real.
(function () {
  const STORAGE_KEY = 'pandda_current_user';

  function ensureSeedUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const demo = { id: 'u_demo', email: 'admin@pandda.com', role: 'master', name: 'Administrador' };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
      }
    } catch (e) { /* ignore */ }
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setUser(user) {
    try {
      if (!user) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {}
  }

  function logout() {
    setUser(null);
    try { window.location.reload(); } catch (e) {}
  }

  function login(email, password) {
    // Simples tentativa de autenticar contra MockDB.users se disponível
    try {
      if (window.MockDB && Array.isArray(MockDB.users)) {
        const found = MockDB.users.find(u => u.email === email && u.password === password);
        if (found) {
          const publicUser = { id: found.id, email: found.email, role: found.role, name: found.name || found.email };
          setUser(publicUser);
          return Promise.resolve({ user: publicUser });
        }
      }
    } catch (e) { /* ignore */ }
    return Promise.reject(new Error('Credenciais inválidas'));
  }

  ensureSeedUser();

  window.Auth = {
    getUser,
    setUser,
    logout,
    login
  };
})();
