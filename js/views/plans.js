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
    const header = createEl('div', { className: 'd-flex', text: '' });
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const title = createEl('h2', { text: 'Planos' });
    const add = createEl('button', { className: 'primary', text: 'Novo plano' });

    header.appendChild(title);
    header.appendChild(add);
    root.appendChild(header);

    const listCard = createEl('div', { className: 'card' });
    root.appendChild(listCard);

    const plans = await MockAPI.getPlans();
    const list = createEl('div', { className: 'plan-list' });

    plans.forEach(p => {
      const card = createPlanCard(p);
      list.appendChild(card);
    });

    listCard.appendChild(list);

    add.addEventListener('click', () => openPlanModal('Novo plano', null));
  }

  function createPlanCard(plan) {
    const card = createEl('div', { className: 'plan-card' });

    // left column: title, meta, note
    const left = createEl('div', { className: 'plan-left' });
    left.style.flex = '1 1 auto';
    left.style.minWidth = '0';

    const title = createEl('div', { className: 'plan-title', text: truncateString(plan.nome || '', 45) });
    const meta = createEl('div', { className: 'plan-meta' });

    const telasItem = createEl('div', { className: 'meta-item' });
    const telasIcon = createEl('span', { className: 'label-icon', text: '' });
    telasIcon.textContent = '📺';
    const telasText = createEl('span', { text: `${plan.telas} telas` });
    telasItem.appendChild(telasIcon);
    telasItem.appendChild(telasText);

    const mesesItem = createEl('div', { className: 'meta-item' });
    const mesesIcon = createEl('span', { className: 'label-icon', text: '' });
    mesesIcon.textContent = '📅';
    const mesesText = createEl('span', { text: `${plan.validadeEmMeses} meses` });
    mesesItem.appendChild(mesesIcon);
    mesesItem.appendChild(mesesText);

    const precoItem = createEl('div', { className: 'meta-item' });
    const precoText = createEl('span', { text: `R$ ${Number(plan.preco).toFixed(2)}` });
    precoItem.appendChild(precoText);

    meta.appendChild(telasItem);
    meta.appendChild(mesesItem);
    meta.appendChild(precoItem);

    const note = createEl('div', { className: 'plan-note', text: truncateString(plan.observacoes || '', 45) });

    left.appendChild(title);
    left.appendChild(meta);
    if (plan.observacoes && plan.observacoes.trim().length > 0) left.appendChild(note);

    // right column: actions
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
        // Nome
        const nome = h.createInput({ label: 'Nome', name: 'nome', value: data.nome || '', required: true });

        // Telas
        const telasLabel = createEl('label');
        const telasLabelIcon = createEl('span', { className: 'label-icon' });
        telasLabelIcon.textContent = '📺 Telas';
        telasLabel.appendChild(telasLabelIcon);

        const telasGroup = createEl('div', { className: 'increment-group right-controls' });
        const telasInput = createEl('input', { attrs: { type: 'number', name: 'telas' } });
        telasInput.className = 'increment-input';
        telasInput.value = (typeof data.telas !== 'undefined' && data.telas !== null) ? data.telas : 1;

        const telasControls = createEl('div', { className: 'increment-controls' });
        const telasMinus = createEl('button', { className: 'increment-btn', text: '−' });
        const telasPlus = createEl('button', { className: 'increment-btn', text: '+' });
        telasControls.appendChild(telasMinus);
        telasControls.appendChild(telasPlus);

        telasGroup.appendChild(telasInput);
        telasGroup.appendChild(telasControls);

        const telasWarning = createEl('div', { className: 'limit-warning', text: '' });
        telasWarning.style.fontSize = '13px';
        telasWarning.style.color = 'var(--muted)';

        // Validade
        const validadeLabel = createEl('label');
        const validadeLabelIcon = createEl('span', { className: 'label-icon' });
        validadeLabelIcon.textContent = '📅 Validade em meses';
        validadeLabel.appendChild(validadeLabelIcon);

        const validadeGroup = createEl('div', { className: 'increment-group right-controls' });
        const validadeInput = createEl('input', { attrs: { type: 'number', name: 'validadeEmMeses' } });
        validadeInput.className = 'increment-input';
        validadeInput.value = (typeof data.validadeEmMeses !== 'undefined' && data.validadeEmMeses !== null) ? data.validadeEmMeses : 1;
        const validadeControls = createEl('div', { className: 'increment-controls' });
        const validadeMinus = createEl('button', { className: 'increment-btn', text: '−' });
        const validadePlus = createEl('button', { className: 'increment-btn', text: '+' });
        validadeControls.appendChild(validadeMinus);
        validadeControls.appendChild(validadePlus);
        validadeGroup.appendChild(validadeInput);
        validadeGroup.appendChild(validadeControls);

        // Preço
        const precoLabel = createEl('label', { text: 'Preço (R$)' });
        const precoWrap = createEl('div', { className: 'input-currency' });
        const prefix = createEl('div', { className: 'currency-prefix', text: 'R$' });
        const precoInput = createEl('input', { attrs: { type: 'text', name: 'preco', inputmode: 'decimal', autocomplete: 'off' } });
        precoInput.className = 'currency-input';
        precoInput.value = (typeof data.preco !== 'undefined' && data.preco !== null && data.preco !== '') ? formatNumberToPtBR(Number(data.preco)) : '';
        precoWrap.appendChild(prefix);
        precoWrap.appendChild(precoInput);

        // Observações (opcional)
        const obsWrap = h.createTextarea({ label: 'Observações (opcional)', name: 'observacoes', value: data.observacoes || '', attrs: { rows: 4, placeholder: 'Observações sobre o plano (opcional)' } });

        // Build form
        const wrap = createEl('div', { className: 'stack' });
        wrap.appendChild(nome.wrap);

        const telasWrap = createEl('div');
        telasWrap.appendChild(telasLabel);
        telasWrap.appendChild(telasGroup);
        telasWrap.appendChild(telasWarning);
        wrap.appendChild(telasWrap);

        const validadeWrap = createEl('div');
        validadeWrap.appendChild(validadeLabel);
        validadeWrap.appendChild(validadeGroup);
        wrap.appendChild(validadeWrap);

        wrap.appendChild(precoLabel);
        wrap.appendChild(precoWrap);

        wrap.appendChild(obsWrap.wrap);

        const precoNote = createEl('div', { className: 'field-required-note', text: 'Clique no campo de preço e informe o valor antes de salvar.' });
        wrap.appendChild(precoNote);

        container.appendChild(wrap);

        // Interaction logic
        function updateTelasWarning() {
          const val = parseInt(telasInput.value, 10) || 0;
          if (val > 3) {
            telasWarning.textContent = 'Limite padrão: 3';
            // keep short text to avoid layout shift on mobile
          } else {
            telasWarning.textContent = '';
          }
        }

        validadeInput.setAttribute('min', '1');
        validadeInput.setAttribute('max', '12');

        telasMinus.addEventListener('click', () => {
          let val = parseInt(telasInput.value, 10) || 1;
          if (val > 1) val--;
          telasInput.value = val;
          updateTelasWarning();
        });
        telasPlus.addEventListener('click', () => {
          let val = parseInt(telasInput.value, 10) || 0;
          val++;
          telasInput.value = val;
          updateTelasWarning();
        });
        telasInput.addEventListener('input', () => {
          let val = parseInt(telasInput.value, 10);
          if (isNaN(val) || val < 1) { telasInput.value = 1; val = 1; }
          updateTelasWarning();
        });

        validadeMinus.addEventListener('click', () => {
          let val = parseInt(validadeInput.value, 10) || 1;
          if (val > 1) val--;
          validadeInput.value = val;
        });
        validadePlus.addEventListener('click', () => {
          let val = parseInt(validadeInput.value, 10) || 1;
          if (val < 12) val++;
          validadeInput.value = val;
        });
        validadeInput.addEventListener('input', () => {
          let val = parseInt(validadeInput.value, 10);
          if (isNaN(val) || val < 1) validadeInput.value = 1;
          else if (val > 12) validadeInput.value = 12;
        });

        // currency mask helpers
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

  /* ---------------------------
     UTILITÁRIOS
     --------------------------- */

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
      const allowedNav = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
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

    const t = document.createElement('div');
    t.id = 'global-toast';
    t.setAttribute('role', 'status');
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
