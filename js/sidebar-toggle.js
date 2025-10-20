// js/sidebar-toggle.js
// Compat layer robusto para alternar sidebar entre collapsed (desktop) e expanded (mobile).
(function () {
  function isMobile() {
    return window.matchMedia('(max-width:900px)').matches;
  }

  function findElements() {
    return {
      mobileBtn: document.getElementById('mobileMenuBtn'),
      sidebar: document.getElementById('sidebar')
    };
  }

  function attachHandlers() {
    const els = findElements();
    if (!els.mobileBtn || !els.sidebar) return;

    // remove listeners duplicados com flag
    if (els.mobileBtn._sidebar_toggle_attached) return;
    els.mobileBtn._sidebar_toggle_attached = true;

    els.mobileBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (isMobile()) {
        // mobile: overlay open/close
        els.sidebar.classList.toggle('expanded');
        els.sidebar.classList.remove('collapsed');
      } else {
        // desktop: collapse/uncollapse
        els.sidebar.classList.toggle('collapsed');
        els.sidebar.classList.remove('expanded');
      }
    });

    // fechar overlay ao clicar fora no mobile
    document.addEventListener('click', function (e) {
      if (!isMobile()) return;
      const target = e.target;
      if (!els.sidebar.contains(target) && !els.mobileBtn.contains(target)) {
        els.sidebar.classList.remove('expanded');
      }
    });

    // sincronizar classes quando redimensionar
    window.addEventListener('resize', function () {
      if (isMobile()) {
        els.sidebar.classList.remove('collapsed');
      } else {
        els.sidebar.classList.remove('expanded');
      }
    });

    // acessibilidade: fechar sidebar com ESC no mobile
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isMobile()) {
        els.sidebar.classList.remove('expanded');
      }
    });
  }

  // Tentativa inicial de attach imediata e fallback para DOMContentLoaded
  try {
    attachHandlers();
  } catch (err) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachHandlers);
    } else {
      setTimeout(attachHandlers, 50);
    }
  }
})();
