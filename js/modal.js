/* modal.js
   Comportamento:
     - Modal.open(opts) abre um modal reutilizando #modals-root.
     - Por padrão closeOnOverlayClick = false (não fecha ao clicar fora).
     - Fecha somente ao clicar no botão X, no botão Cancelar, ou por chamada a Modal.close().
     - Mantém hooks: contentBuilder(container, initialData, helpers), onSave, onDone, onCancel.
     - Retém acessibilidade básica (focus trap simples, aria).
*/

const Modal = (function(){
  const ROOT_ID = 'modals-root';
  let activeModal = null;

  function ensureRoot() {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.setAttribute('aria-hidden','true');
      document.body.appendChild(root);
    }
    return root;
  }

  function createModalStructure(opts) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.zIndex = 1150;

    const dialog = document.createElement('div');
    dialog.className = 'card modal-dialog';
    dialog.style.minWidth = opts.minWidth || '320px';
    dialog.style.maxWidth = opts.maxWidth || '720px';
    dialog.style.position = 'relative';

    // header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '8px';

    const title = document.createElement('h3');
    title.textContent = opts.title || '';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'flat-btn';
    closeBtn.setAttribute('aria-label','Fechar');
    closeBtn.innerHTML = '✕';
    closeBtn.style.fontSize = '18px';

    header.appendChild(title);
    header.appendChild(closeBtn);

    // body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.style.maxHeight = '65vh';
    body.style.overflow = 'auto';

    // footer (ok/cancel)
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.gap = '8px';
    footer.style.marginTop = '12px';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'flat-btn';
    cancelBtn.textContent = opts.cancelText || 'Cancelar';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'primary';
    saveBtn.textContent = opts.saveText || 'Salvar';

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);

    return { overlay, dialog, header, body, footer, closeBtn, cancelBtn, saveBtn };
  }

  // Simple focus trap: keep focus inside modal
  function trapFocus(modalEl) {
    const focusable = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return function(){};
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function onKey(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      } else if (e.key === 'Escape') {
        // closing on Escape only when allowed via option
        if (activeModal && activeModal.opts && activeModal.opts.allowEscape) {
          Modal.close();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    first.focus();
    return () => document.removeEventListener('keydown', onKey);
  }

  async function open(opts = {}) {
    if (activeModal) {
      // fechar modal ativo antes de abrir outro
      close();
    }

    const root = ensureRoot();
    const s = createModalStructure(opts);
    root.appendChild(s.overlay);
    root.setAttribute('aria-hidden','false');

    // attach data
    activeModal = {
      root,
      overlay: s.overlay,
      dialog: s.dialog,
      body: s.body,
      header: s.header,
      footer: s.footer,
      closeBtn: s.closeBtn,
      cancelBtn: s.cancelBtn,
      saveBtn: s.saveBtn,
      opts: Object.assign({ closeOnOverlayClick: false, allowEscape: false }, opts)
    };

    // Prevent overlay click closing unless explicitly enabled
    s.overlay.addEventListener('click', (ev) => {
      // if click directly on overlay (not inside dialog)
      if (ev.target === s.overlay) {
        if (activeModal.opts.closeOnOverlayClick) {
          close();
        } else {
          // ignore outside clicks
          ev.stopPropagation();
        }
      }
    });

    // Close button (X) behavior: explicit close
    s.closeBtn.addEventListener('click', () => {
      if (activeModal.opts && typeof activeModal.opts.onCancel === 'function') {
        try { activeModal.opts.onCancel(); } catch(e){ console.error(e); }
      }
      close();
    });

    // Cancel button behavior: explicit close
    s.cancelBtn.addEventListener('click', async () => {
      if (activeModal.opts && typeof activeModal.opts.onCancel === 'function') {
        try { await activeModal.opts.onCancel(); } catch(e){ console.error(e); }
      }
      close();
    });

    // Save button behavior: call onSave and handle errors
    s.saveBtn.addEventListener('click', async () => {
      if (!activeModal) return;
      s.saveBtn.disabled = true;
      const prevText = s.saveBtn.textContent;
      s.saveBtn.textContent = activeModal.opts.savingText || 'Salvando...';
      try {
        if (activeModal.opts && typeof activeModal.opts.onSave === 'function') {
          await activeModal.opts.onSave();
        }
        // close and call onDone
        close();
        if (activeModal.opts && typeof activeModal.opts.onDone === 'function') {
          try { await activeModal.opts.onDone(); } catch(e){ console.error(e); }
        }
      } catch (err) {
        // Restore state and show error inside modal body or via toast
        s.saveBtn.disabled = false;
        s.saveBtn.textContent = prevText;
        const msg = err && err.message ? err.message : String(err);
        showModalError(s.body, msg);
        console.error('Modal save error:', err);
      }
    });

    // Allow developer to build content
    const helpers = {
      createInput(def = {}) {
        const wrap = document.createElement('div');
        wrap.className = 'field';
        const label = document.createElement('label');
        label.textContent = def.label || '';
        const input = document.createElement('input');
        input.name = def.name || '';
        input.type = def.type || 'text';
        if (def.value !== undefined) input.value = def.value;
        if (def.required) input.required = true;
        wrap.appendChild(label);
        wrap.appendChild(input);
        return { wrap, input };
      }
    };

    // call contentBuilder
    if (typeof activeModal.opts.contentBuilder === 'function') {
      try {
        activeModal.opts.contentBuilder(activeModal.body, activeModal.opts.initialData || {}, helpers);
      } catch (e) {
        console.error('Erro em contentBuilder do Modal:', e);
        showModalError(activeModal.body, 'Erro ao montar conteúdo do modal.');
      }
    }

    // focus trap
    const releaseTrap = trapFocus(s.dialog);
    activeModal.releaseTrap = releaseTrap;

    // expose close for external use
    return { close: close };
  }

  function showModalError(container, message) {
    if (!container) return;
    const existing = container.querySelector('.modal-error');
    if (existing) existing.remove();
    const err = document.createElement('div');
    err.className = 'modal-error';
    err.style.background = 'linear-gradient(90deg,#ef4444,#dc2626)';
    err.style.color = '#fff';
    err.style.padding = '8px 12px';
    err.style.borderRadius = '6px';
    err.style.marginBottom = '8px';
    err.textContent = message;
    container.insertBefore(err, container.firstChild);
  }

  function close() {
    if (!activeModal) return;
    try {
      if (activeModal.releaseTrap) activeModal.releaseTrap();
    } catch(e){ /* ignore */ }

    try {
      if (activeModal.overlay && activeModal.overlay.parentNode) {
        activeModal.overlay.parentNode.removeChild(activeModal.overlay);
      }
    } catch(e){ console.error(e); }

    try {
      if (activeModal.root) activeModal.root.setAttribute('aria-hidden','true');
    } catch(e){}

    activeModal = null;
  }

  // API
  return { open, close };
})();

// Export to global
window.Modal = Modal;
