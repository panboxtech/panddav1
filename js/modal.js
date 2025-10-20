// js/modal.js
// Modal simples, acessível e independente de bibliotecas.
// Uso:
// Modal.open({ title, initialData, contentBuilder(container, data, helpers), onSave, onDone })
// contentBuilder recebe container (elemento), data (initialData) e um objeto helpers com createInput/createTextarea
// onSave deve retornar Promise ou lançar erro para bloquear o fechamento.
// onDone é chamado após salvar com sucesso.
(function () {
  const ROOT_ID = 'modals-root';

  function ensureRoot() {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.setAttribute('aria-live', 'polite');
      document.body.appendChild(root);
    }
    return root;
  }

  function createEl(tag, opts = {}) {
    const el = document.createElement(tag);
    if (opts.className) el.className = opts.className;
    if (typeof opts.text !== 'undefined') el.textContent = opts.text;
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach(k => {
        if (opts.attrs[k] === null) el.removeAttribute(k);
        else el.setAttribute(k, opts.attrs[k]);
      });
    }
    return el;
  }

  function focusableSelector() {
    return 'a[href], area[href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  }

  function trapFocus(modalEl) {
    const nodes = Array.from(modalEl.querySelectorAll(focusableSelector()));
    if (nodes.length === 0) return () => {};
    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    function handleKey(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeModal(modalEl);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }

  function disableScroll() {
    const prev = { overflow: document.documentElement.style.overflow || '' };
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = prev.overflow; };
  }

  function closeModal(modalObj) {
    if (!modalObj || !modalObj.root) return;
    const { backdrop, cleanup } = modalObj;
    backdrop.classList.add('hidden');
    setTimeout(() => {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      if (cleanup) cleanup();
    }, 220);
  }

  function createInputHelper() {
    return {
      createInput(opts = {}) {
        const wrap = createEl('div', { className: 'form-row' });
        const label = createEl('label', { text: opts.label || '' });
        const input = createEl('input');
        input.type = opts.type || 'text';
        if (opts.name) input.name = opts.name;
        if (typeof opts.value !== 'undefined') input.value = opts.value;
        if (opts.required) input.required = true;
        if (opts.attrs) {
          Object.keys(opts.attrs).forEach(k => input.setAttribute(k, opts.attrs[k]));
        }
        wrap.appendChild(label);
        wrap.appendChild(input);
        return { wrap, input, label };
      },
      createTextarea(opts = {}) {
        const wrap = createEl('div', { className: 'form-row' });
        const label = createEl('label', { text: opts.label || '' });
        const textarea = createEl('textarea');
        if (opts.name) textarea.name = opts.name;
        if (typeof opts.value !== 'undefined') textarea.value = opts.value;
        if (opts.attrs) {
          Object.keys(opts.attrs).forEach(k => textarea.setAttribute(k, opts.attrs[k]));
        }
        wrap.appendChild(label);
        wrap.appendChild(textarea);
        return { wrap, textarea, label };
      }
    };
  }

  function buildModalShell(title) {
    const root = ensureRoot();

    const backdrop = createEl('div', { className: 'overlay' });
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    const dialog = createEl('div', { className: 'card modal-dialog' });
    dialog.setAttribute('role', 'document');

    const header = createEl('div', { className: 'modal-header' });
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.gap = '12px';

    const h = createEl('h3', { text: title || '' });
    h.style.margin = '0';
    h.style.fontSize = '18px';
    header.appendChild(h);

    const closeBtn = createEl('button', { className: 'icon-btn', text: '✕', attrs: { 'aria-label': 'Fechar' } });
    closeBtn.addEventListener('click', () => closeModal(modalObj));
    header.appendChild(closeBtn);

    const body = createEl('div', { className: 'modal-body' });
    body.style.marginTop = '12px';

    const footer = createEl('div', { className: 'modal-footer' });
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.gap = '8px';
    footer.style.marginTop = '12px';

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    backdrop.appendChild(dialog);

    // click outside closes on mobile/overlay mode
    backdrop.addEventListener('click', (ev) => {
      if (ev.target === backdrop) closeModal(modalObj);
    });

    root.appendChild(backdrop);

    const cleanupFns = [];
    let restoreScroll = null;
    let untrap = null;

    const modalObj = {
      root: dialog,
      backdrop,
      body,
      footer,
      header,
      cleanup() {
        cleanupFns.forEach(fn => { try { fn(); } catch (e) {} });
        if (untrap) untrap();
        if (restoreScroll) restoreScroll();
      },
      registerCleanup(fn) { cleanupFns.push(fn); }
    };

    // disable scroll and trap focus
    restoreScroll = disableScroll();
    untrap = trapFocus(dialog);
    // focus first focusable later
    setTimeout(() => {
      const f = dialog.querySelector(focusableSelector());
      if (f) f.focus();
    }, 50);

    return modalObj;
  }

  // Modal API
  const Modal = {
    open(opts = {}) {
      const title = opts.title || '';
      const data = opts.initialData || {};
      const modalObj = buildModalShell(title);
      const helpers = createInputHelper();

      // build content via callback
      if (typeof opts.contentBuilder === 'function') {
        try {
          opts.contentBuilder(modalObj.body, data, helpers);
        } catch (err) {
          console.error('Modal contentBuilder error', err);
          const errEl = createEl('div', { text: 'Erro ao montar o formulário.' });
          modalObj.body.appendChild(errEl);
        }
      }

      // Footer buttons: Cancel and Save
      const btnCancel = createEl('button', { className: 'action-btn', text: 'Cancelar' });
      const btnSave = createEl('button', { className: 'primary', text: 'Salvar' });

      btnCancel.addEventListener('click', () => {
        closeModal(modalObj);
      });

      btnSave.addEventListener('click', async () => {
        // allow content to expose _collectData on modal body
        const collect = modalObj.body._collectData;
        try {
          if (typeof opts.onSave === 'function') {
            // call onSave which should perform validations and persist data
            const maybePromise = opts.onSave();
            await Promise.resolve(maybePromise);
          } else if (typeof collect === 'function') {
            // fallback: try collect + noop
            collect();
          }
          closeModal(modalObj);
          if (typeof opts.onDone === 'function') {
            try { opts.onDone(); } catch (e) {}
          }
        } catch (err) {
          // show error inline
          let errBox = modalObj.body.querySelector('.modal-error');
          if (!errBox) {
            errBox = createEl('div', { className: 'modal-error' });
            errBox.style.color = 'var(--danger)';
            errBox.style.marginTop = '8px';
            modalObj.body.insertBefore(errBox, modalObj.body.firstChild);
          }
          errBox.textContent = err && err.message ? err.message : String(err);
        }
      });

      modalObj.footer.appendChild(btnCancel);
      modalObj.footer.appendChild(btnSave);

      // expose close and helpers
      modalObj.close = () => closeModal(modalObj);
      modalObj.helpers = helpers;

      return modalObj;
    },
    closeAll() {
      const root = document.getElementById(ROOT_ID);
      if (!root) return;
      Array.from(root.children).forEach(c => c.remove());
    }
  };

  // export
  window.Modal = Modal;
})();
