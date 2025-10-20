(function () {
  const root = document.getElementById('view-root');

  function createEl(tag, opts = {}) {
    const el = document.createElement(tag);
    if (opts.className) el.className = opts.className;
    if (typeof opts.text !== 'undefined') el.textContent = opts.text;
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach(k => el.setAttribute(k, opts.attrs[k]));
    }
    return el;
  }

  async function render() {
    root.innerHTML = '';

    // Header
    const header = createEl('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const title = createEl('h2', { text: 'Planos' });
    const add = createEl('button', { className: 'primary', text: 'Novo plano' });

    header.appendChild(title);
    header.appendChild(add);
    root.appendChild(header);

    // List container
    const listCard = createEl('div', { className: 'card' });
    root.appendChild(listCard);

    const plans = await MockAPI.getPlans();
    const list = createEl('div', { className: 'plan-list' });

    plans.forEach(p => {
      list.appendChild(createPlanCard(p));
    });

    listCard.appendChild(list);

    add.addEventListener('click', () => openPlanModal('Novo plano', null));
  }

  function createPlanCard(plan) {
    const card = createEl('div', { className: 'plan-card' });

    // Left column
    const left = createEl('div', { className: 'plan-left' });

    const title = createEl('div', { className: 'plan-title', text: truncateString(plan.nome || '', 100) });

    const meta = createEl('div', { className: 'plan-meta' });

    const telasItem = createEl('div', { className: 'meta-item' });
    const telasIcon = createEl('span', { className: 'label-icon', text: '📺' });
    const telasText = createEl('span', { text: `${plan.telas} telas` });
    telasItem.appendChild(telasIcon);
    telasItem.appendChild(telasText);

    const mesesItem = createEl('div', { className: 'meta-item' });
    const mesesIcon = createEl('span', { className: 'label-icon', text: '📅' });
    const mesesText = createEl('span', { text: `${plan.validadeEmMeses} meses` });
    mesesItem.appendChild(mesesIcon);
    mesesItem.appendChild(mesesText);

    const precoItem = createEl('div', { className: 'meta-item' });
    const precoText = createEl('span', { text: `R$ ${Number(plan.preco).toFixed(2)}` });
    precoItem.appendChild(precoText);

    meta.appendChild(telasItem);
    meta.appendChild(mesesItem);
    meta.appendChild(precoItem);

    left.appendChild(title);
    left.appendChild(meta);

    if (plan.observacoes && plan.observacoes.trim().length > 0) {
      const note = createEl('div', { className: 'plan-note', text: truncateString(plan.observacoes, 100) });
      left.appendChild(note);
    }

    // Right column (actions)
    const right = createEl('div', { className: 'plan-actions' });

    const editBtn = createEl('button', { className: 'action-btn', text: 'Editar' });
    editBtn.addEventListener('click', () => openPlanModal('Editar plano', plan));
    right.appendChild(editBtn);

    const user = Auth.getUser();
    if (user && user.role === 'master') {
      const delBtn = createEl('button', { className: 'action-btn danger', text: 'Excluir' });
      delBtn.addEventListener('click', () => {
        if (!confirm('Excluir plano?')) return;
        MockDB.plans = MockDB.plans.filter(x => x.id !== plan.id);
        render();
        showToast('Plano excluído', 'info');
      });
      right.appendChild(delBtn);
    }

    card.appendChild(left);
    card.appendChild(right);

    return card;
  }

  function truncateString(s, max) {
    if (typeof s !== 'string') return '';
    if (s.length <= max) return s;
    return s.slice(0, max - 1).trim() + '…';
  }

  function openPlanModal(title, plan) {
    Modal.open({
      title,
      initialData: plan || {},
      contentBuilder(container, data, h) {
        // Nome (wider input to show more characters)
        const nome = h.createInput({ label: 'Nome', name: 'nome', value: data.nome || '', required: true });
        nome.input.style.width = '100%';
        nome.input.setAttribute('maxlength', '200');

        // Telas (integer; visible 2 digits)
        const telasLabel = createEl('label', { text: '' });
        const telasIcon = createEl('span', { className: 'label-icon', text: '📺 Telas' });
        telasLabel.appendChild(telasIcon);

        const telasGroup = createEl('div', { className: 'increment-group right-controls' });
        const telasInput = createEl('input', { attrs: { type: 'number', name: 'telas', min: '1' } });
        telasInput.className = 'increment-input size-2digits';
        telasInput.value = (typeof data.telas !== 'undefined' && data.telas !== null) ? data.telas : 1;

        const telasControls = createEl('div', { className: 'increment-controls' });
        const telasMinus = createEl('button', { className: 'increment-btn', text: '−' });
        const telasPlus = createEl('button', { className: 'increment-btn', text: '+' });
        telasControls.appendChild(telasMinus);
        telasControls.appendChild(telasPlus);

        telasGroup.appendChild(telasInput);
        telasGroup.appendChild(telasControls);

        const telasWarning = createEl('div', { className: 'limit-warning' });
        telasWarning.style.fontSize = '13px';
        telasWarning.style.color = 'var(--muted)';

        // Validade em meses (integer; visible 2 digits; range 1-12)
        const validadeLabel = createEl('label', { text: '' });
        const validadeIcon = createEl('span', { className: 'label-icon', text: '📅 Validade em meses' });
        validadeLabel.appendChild(validadeIcon);

        const validadeGroup = createEl('div', { className: 'increment-group right-controls' });
        const validadeInput = createEl('input', { attrs: { type: 'number', name: 'validadeEmMeses', min: '1', max: '12' } });
        validadeInput.className = 'increment-input size-2digits';
        validadeInput.value = (typeof data.validadeEmMeses !== 'undefined' && data.validadeEmMeses !== null) ? data.validadeEmMeses : 1;

        const validadeControls = createEl('div', { className: 'increment-controls' });
        const validadeMinus = createEl('button', { className: 'increment-btn', text: '−' });
        const validadePlus = createEl('button', { className: 'increment-btn', text: '+' });
        validadeControls.appendChild(validadeMinus);
        validadeControls.appendChild(validadePlus);

        validadeGroup.appendChild(validadeInput);
        validadeGroup.appendChild(validadeControls);

        // Preço with R$ prefix
        const precoLabel = createEl('label', { text: 'Preço (R$)' });
        const precoWrap = createEl('div', { className: 'input-currency' });
        const prefix = createEl('div', { className: 'currency-prefix', text: 'R$' });
        const precoInput = createEl('input', { attrs: { type: 'text', name: 'preco', inputmode: 'decimal', autocomplete: 'off' } });
        precoInput.className = 'currency-input';
        precoInput.value = (typeof data.preco !== 'undefined' && data.preco !== null && data.preco !== '') ? formatNumberToPtBR(Number(data.preco)) : '';
        precoWrap.appendChild(prefix);
        precoWrap.appendChild(precoInput);

        // Observações (textarea) — ensure alignment and full width
        const obsWrap = h.createTextarea({ label: 'Observações (opcional)', name: 'observacoes', value: data.observacoes || '', attrs: { rows: 4, placeholder: 'Observações sobre o plano (opcional)' } });
        // ensure wrapper has full width
        obsWrap.wrap.classList.add('textarea-wrap');

        // assemble form
        const formStack = createEl('div', { className: 'stack' });
        formStack.appendChild(nome.wrap);

        const telasWrap = createEl('div');
        telasWrap.appendChild(telasLabel);
        telasWrap.appendChild(telasGroup);
        telasWrap.appendChild(telasWarning);
        formStack.appendChild(telasWrap);

        const validadeWrap = createEl('div');
        validadeWrap.appendChild(validadeLabel);
        validadeWrap.appendChild(validadeGroup);
        formStack.appendChild(validadeWrap);

        formStack.appendChild(precoLabel);
        formStack.appendChild(precoWrap);

        formStack.appendChild(obsWrap.wrap);

        const precoNote = createEl('div', { className: 'field-required-note', text: 'Clique no campo de preço e informe o valor antes de salvar.' });
        formStack.appendChild(precoNote);

        container.appendChild(formStack);

        // interactions and constraints
        function updateTelasWarning() {
          const val = parseInt(telasInput.value, 10) || 0;
          if (val > 3) telasWarning.textContent = 'Limite padrão: 3';
          else telasWarning.textContent = '';
        }

        // ensure numeric constraints
        telasMinus.addEventListener('click', () => {
          let v = parseInt(telasInput.value, 10) || 1;
          if (v > 1) v--;
          telasInput.value = v;
          updateTelasWarning();
        });
        telasPlus.addEventListener('click', () => {
          let v = parseInt(telasInput.value, 10) || 0;
          v++;
          telasInput.value = v;
          updateTelasWarning();
        });
        telasInput.addEventListener('input', () => {
          let v = parseInt(telasInput.value, 10);
          if (isNaN(v) || v < 1) { telasInput.value = 1; v = 1; }
          updateTelasWarning();
        });

        validadeMinus.addEventListener('click', () => {
          let v = parseInt(validadeInput.value, 10) || 1;
          if (v > 1) v--;
          validadeInput.value = v;
        });
        validadePlus.addEventListener('click', () => {
          let v = parseInt(validadeInput.value, 10) || 1;
          if (v < 12) v++;
          validadeInput.value = v;
        });
        validadeInput.addEventListener('input', () => {
          let v = parseInt(validadeInput.value, 10);
          if (isNaN(v) || v < 1) validadeInput.value = 1;
          else if (v > 12) validadeInput.value = 12;
        });

        attachCurrencyMask(precoInput);

        // expose collect
        container._collectData = () => {
          const precoRaw = precoInput.value || '';
          const precoFloat = precoInput.getNumericValue ? precoInput.getNumericValue() : parseCurrencyToFloat(precoRaw);
          return {
            nome: nome.input.value,
            telas: parseInt(telasInput.value, 10) || 1,
            validadeEmMeses: parseInt(validadeInput.value, 10) || 1,
            preco: (!isNaN(precoFloat) && precoFloat !== null) ? Number(precoFloat.toFixed(2)) : null,
            _precoTouched: precoInput.value && precoInput.value.length > 0,
            observacoes: obsWrap.textarea.value ? obsWrap.textarea.value.trim() : ''
          };
        };

        updateTelasWarning();
      },

      onSave: async () => {
        const container = document.querySelector('#modals-root .modal-body');
        if (!container || !container._collectData) throw new Error('Erro ao coletar dados do formulário');
        const d = container._collectData();

        if (!d.nome || d.nome.trim().length === 0) throw new Error('Nome do plano é obrigatório');
        if (!d._precoTouched) throw new Error('Você precisa clicar e informar o valor do campo Preço antes de salvar.');
        if (d.preco === null || isNaN(d.preco)) throw new Error('Preço inválido. Informe um valor numérico (ex.: 39,90).');

        if (d.validadeEmMeses < 1) d.validadeEmMeses = 1;
        if (d.validadeEmMeses > 12) d.validadeEmMeses = 12;
        if (d.telas < 1) d.telas = 1;

        try {
          if (plan && plan.id) {
            await MockAPI.createPlan({ id: plan.id, nome: d.nome, telas: d.telas, validadeEmMeses: d.validadeEmMeses, preco: d.preco, observacoes: d.observacoes });
          } else {
            await MockAPI.createPlan({ nome: d.nome, telas: d.telas, validadeEmMeses: d.validadeEmMeses, preco: d.preco, observacoes: d.observacoes });
          }
        } catch (err) {
          const msg = err && err.message ? err.message : String(err);
          throw new Error('Falha ao salvar o plano: ' + msg);
        }
      },

      onDone: async () => {
        await render();
        showToast('Plano salvo com sucesso', 'success');
      }
    });
  }

  /* utilities (currency mask and helpers are same as previous versions) */

  function formatNumberToPtBR(n) {
    if (n === null || n === undefined || isNaN(n)) return '';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  function parseCurrencyToFloat(v) {
    if (v === null || v === undefined) return NaN;
    const s = String(v).trim();
    if (s.length === 0) return NaN;
    const cleaned = s.replace(/[^\d.,-]/g, '').replace(/\s+/g, '');
    const hasComma = cleaned.indexOf(',') !== -1;
    const hasDot = cleaned.indexOf('.') !== -1;
    let normalized = cleaned;
    if (hasComma && hasDot) normalized = normalized.replace(/\./g, '').replace(',', '.');
    else if (hasComma && !hasDot) normalized = normalized.replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? NaN : num;
  }

  function attachCurrencyMask(inputEl) {
    if (!inputEl) return;

    function parseRaw(raw) { return parseCurrencyToFloat(raw); }
    function formatForDisplay(num) {
      if (isNaN(num)) return '';
      return formatNumberToPtBR(num);
    }

    inputEl.getNumericValue = () => {
      const n = parseRaw(inputEl.value);
      return isNaN(n) ? null : Number(n.toFixed(2));
    };

    inputEl.addEventListener('input', (e) => {
      const v = e.target.value;
      const cleaned = v.replace(/[^\d,.\-]/g, '');
      e.target.value = cleaned;
    });

    inputEl.addEventListener('blur', (e) => {
      const n = parseRaw(e.target.value);
      if (isNaN(n)) { e.target.value = ''; return; }
      e.target.value = formatForDisplay(n);
    });

    inputEl.addEventListener('focus', (e) => {
      const n = parseRaw(e.target.value);
      if (!isNaN(n)) e.target.value = formatForDisplay(n);
    });

    inputEl.addEventListener('keydown', (ev) => {
      const allowedNav = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','Home','End'];
      if (allowedNav.includes(ev.key)) return;
      const allowedPattern = /[0-9.,]/;
      if (!allowedPattern.test(ev.key)) ev.preventDefault();
    });

    inputEl.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const text = (ev.clipboardData || window.clipboardData).getData('text') || '';
      const cleaned = text.replace(/[^\d,.\-]/g, '');
      inputEl.value = cleaned;
      setTimeout(() => {
        const n = parseRaw(inputEl.value);
        if (!isNaN(n)) inputEl.value = formatForDisplay(n);
      }, 50);
    });
  }

  function showToast(message, type = 'info', timeout = 3500) {
    const existing = document.getElementById('global-toast');
    if (existing) existing.remove();

    const t = createEl('div', { attrs: {} });
    t.id = 'global-toast';
    t.setAttribute('role','status');
    t.style.position = 'fixed';
    t.style.right = '20px';
    t.style.bottom = '20px';
    t.style.zIndex = 2000;
    t.style.padding = '12px 16px';
    t.style.borderRadius = '8px';
    t.style.color = '#fff';
    t.style.boxShadow = '0 6px 20px rgba(2,6,23,0.2)';
    t.style.fontSize = '14px';
    t.style.maxWidth = '320px';
    t.style.backdropFilter = 'saturate(120%) blur(4px)';

    if (type === 'success') t.style.background = 'linear-gradient(90deg,#10b981,#059669)';
    else if (type === 'error') t.style.background = 'linear-gradient(90deg,#ef4444,#dc2626)';
    else t.style.background = 'linear-gradient(90deg,#2563eb,#1e40af)';

    t.textContent = message;
    document.body.appendChild(t);

    setTimeout(() => {
      t.style.transition = 'opacity .3s ease, transform .3s ease';
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, timeout);
  }

  window.PlansView = { render };

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('view-root')) setTimeout(render, 0);
  });
})();
