/* modal.js
   Versão estável:
     - Modal.open(opts) abre um modal reutilizando #modals-root.
     - Não fecha ao clicar fora por padrão; fecha apenas ao clicar em X, no botão Cancelar, em Salvar (após sucesso) ou por chamada a Modal.close().
     - Fornece helpers robustos para contentBuilder: createInput, createSelect, createTextarea, createCheckbox, createSwitch.
     - Handler de salvar captura contexto estável (modalCtx) para evitar acesso a activeModal após mudanças assíncronas.
     - Exibe erro inline no modal em caso de falha no onSave e não deixa o modal fechar.
     - Mantém focus trap básico e acessibilidade mínima.
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
        if (activeModal && activeModal.opts && activeModal.opts.allowEscape) {
          Modal.close();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    try { (first || modalEl.querySelector('.flat-btn')).focus(); } catch(e){ /* ignore */ }
    return () => document.removeEventListener('keydown', onKey);
  }

  function buildFieldWrapper({ labelText, required }) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    if (labelText) {
      const label = document.createElement('label');
      label.textContent = labelText + (required ? ' *' : '');
      wrap.appendChild(label);
    }
    return wrap;
  }

  // Helpers factory: cria elementos de formulário reutilizáveis para contentBuilder
  function createHelpers(container) {
    return {
      createInput(def = {}) {
        const wrap = buildFieldWrapper({ labelText: def.label, required: !!def.required });
        const input = document.createElement('input');
        input.name = def.name || '';
        input.type = def.type || 'text';
        if (def.value !== undefined && def.value !== null) input.value = def.value;
        if (def.placeholder) input.placeholder = def.placeholder;
        if (def.required) input.required = true;
        if (def.attrs) {
          Object.keys(def.attrs).forEach(k => input.setAttribute(k, def.attrs[k]));
        }
        wrap.appendChild(input);
        return { wrap, input };
      },

      createSelect(def = {}) {
        const wrap = buildFieldWrapper({ labelText: def.label, required: !!def.required });
        const select = document.createElement('select');
        select.name = def.name || '';
        if (def.required) select.required = true;
        if (def.attrs) {
          Object.keys(def.attrs).forEach(k => select.setAttribute(k, def.attrs[k]));
        }
        const opts = def.options || [];
        if (def.placeholder) {
          const ph = document.createElement('option');
          ph.value = '';
          ph.textContent = def.placeholder;
          ph.disabled = !!def.placeholderDisabled;
          ph.selected = def.value === undefined || def.value === null || def.value === '';
          select.appendChild(ph);
        }
        opts.forEach(o => {
          const option = document.createElement('option');
          if (typeof o === 'string') {
            option.value = o;
            option.textContent = o;
          } else {
            option.value = o.value;
            option.textContent = o.label;
          }
          if (def.value !== undefined && String(option.value) === String(def.value)) option.selected = true;
          select.appendChild(option);
        });
        wrap.appendChild(select);
        return { wrap, select };
      },

      createTextarea(def = {}) {
        const wrap = buildFieldWrapper({ labelText: def.label, required: !!def.required });
        const ta = document.createElement('textarea');
        ta.name = def.name || '';
        if (def.value !== undefined) ta.value = def.value;
        if (def.placeholder) ta.placeholder = def.placeholder;
        if (def.attrs) {
          Object.keys(def.attrs).forEach(k => ta.setAttribute(k, def.attrs[k]));
        }
        wrap.appendChild(ta);
        return { wrap, textarea: ta };
      },

      createCheckbox(def = {}) {
        const wrap = document.createElement('div');
        wrap.className = 'field';
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = def.name || '';
        if (def.checked) input.checked = true;
        if (def.attrs) {
          Object.keys(def.attrs).forEach(k => input.setAttribute(k, def.attrs[k]));
        }
        label.appendChild(input);
        label.appendChild(document.createTextNode(' ' + (def.label || '')));
        wrap.appendChild(label);
        return { wrap, input };
      },

      createSwitch(def = {}) {
        return this.createCheckbox(def);
      }
    };
  }

  async function open(opts = {}) {
    if (activeModal) {
      close();
    }

    const root = ensureRoot();
    const s = createModalStructure(opts);
    root.appendChild(s.overlay);
    root.setAttribute('aria-hidden','false');

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

    // overlay click: only close if explicitly allowed
    s.overlay.addEventListener('click', (ev) => {
      if (ev.target === s.overlay) {
        if (activeModal && activeModal.opts && activeModal.opts.closeOnOverlayClick) {
          close();
        } else {
          ev.stopPropagation();
        }
      }
    });

    // close X
    s.closeBtn.addEventListener('click', () => {
      if (activeModal && activeModal.opts && typeof activeModal.opts.onCancel === 'function') {
        try { activeModal.opts.onCancel(); } catch(e){ console.error(e); }
      }
      close();
    });

    // cancel button
    s.cancelBtn.addEventListener('click', async () => {
      if (activeModal && activeModal.opts && typeof activeModal.opts.onCancel === 'function') {
        try { await activeModal.opts.onCancel(); } catch(e){ console.error(e); }
      }
      close();
    });

    // save button: capture a stable modal context and use it during the async flow
    s.saveBtn.addEventListener('click', async () => {
      // capture context locally to avoid race where activeModal becomes null during async ops
      const modalCtx = activeModal ? {
        body: activeModal.body,
        saveBtn: activeModal.saveBtn,
        opts: activeModal.opts
      } : null;

      if (!modalCtx) {
        // modal already closed or not initialized; defensive no-op
        console.warn('Salvar acionado, mas modal já foi fechado.');
        return;
      }

      // quick validation: ensure body._collectData is present before attempting onSave
      if (!modalCtx.body._collectData || typeof modalCtx.body._collectData !== 'function') {
        showModalError(modalCtx.body, 'Formulário inválido: função de coleta de dados ausente.');
        return;
      }

      // disable UI and show saving text
      modalCtx.saveBtn.disabled = true;
      const prevText = modalCtx.saveBtn.textContent;
      modalCtx.saveBtn.textContent = modalCtx.opts.savingText || 'Salvando...';

      try {
        if (modalCtx.opts && typeof modalCtx.opts.onSave === 'function') {
          await modalCtx.opts.onSave();
        }
        // onSave succeeded: close modal and call onDone using latest activeModal (if still present)
        const onDoneFn = modalCtx.opts && typeof modalCtx.opts.onDone === 'function' ? modalCtx.opts.onDone : null;
        close(); // safe to close here
        if (onDoneFn) {
          try { await onDoneFn(); } catch(e){ console.error('Erro em onDone:', e); }
        }
      } catch (err) {
        // restore UI state
        modalCtx.saveBtn.disabled = false;
        modalCtx.saveBtn.textContent = prevText;
        const msg = err && err.message ? err.message : String(err);
        showModalError(modalCtx.body, msg);
        console.error('Modal save error:', err);
      }
    });

    // build helpers and call contentBuilder
    const helpers = createHelpers(s.body);
    try {
      if (typeof activeModal.opts.contentBuilder === 'function') {
        activeModal.opts.contentBuilder(s.body, activeModal.opts.initialData || {}, helpers);
      }
    } catch (e) {
      console.error('Erro em contentBuilder do Modal:', e);
      showModalError(s.body, 'Erro ao montar conteúdo do modal.');
    }

    // focus trap
    const releaseTrap = trapFocus(s.dialog);
    activeModal.releaseTrap = releaseTrap;

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

  return { open, close };
})();

// Export to global
window.Modal = Modal;
