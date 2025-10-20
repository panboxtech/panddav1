(function(){
  const root = document.getElementById('view-root');

  async function render(){
    root.innerHTML = '';
    const header = document.createElement('div'); header.style.display='flex'; header.style.justifyContent='space-between'; header.style.alignItems='center';
    const title = document.createElement('h2'); title.textContent = 'Planos';
    const add = document.createElement('button'); add.className='primary'; add.textContent='Novo plano';
    header.appendChild(title); header.appendChild(add); root.appendChild(header);
    const list = document.createElement('div'); list.className='card'; root.appendChild(list);

    const plans = await MockAPI.getPlans();
    plans.forEach(p=>{
      const div = document.createElement('div'); div.className = 'client-card';
      const left = document.createElement('div');
      // mostrar observações se existir
      left.innerHTML = `<strong>${p.nome}</strong><div class="small-badge">${p.telas} telas • ${p.validadeEmMeses} meses • R$ ${Number(p.preco).toFixed(2)}</div>${p.observacoes ? `<div class="small-note">${escapeHtml(p.observacoes)}</div>` : ''}`;
      const right = document.createElement('div');
      const btnEdit = document.createElement('button'); btnEdit.className='action-btn'; btnEdit.textContent='Editar';
      btnEdit.addEventListener('click', ()=> {
        openPlanModal('Editar plano', p);
      });
      right.appendChild(btnEdit);
      const user = Auth.getUser();
      if (user && user.role === 'master') {
        const btnDel = document.createElement('button'); btnDel.className='action-btn danger'; btnDel.textContent='Excluir';
        btnDel.addEventListener('click', ()=> {
          if (!confirm('Excluir plano?')) return;
          MockDB.plans = MockDB.plans.filter(x=>x.id !== p.id);
          render();
          showToast('Plano excluído', 'info');
        });
        right.appendChild(btnDel);
      }
      div.appendChild(left); div.appendChild(right); list.appendChild(div);
    });

    add.addEventListener('click', ()=> openPlanModal('Novo plano', null));
  }

  function openPlanModal(title, plan) {
    Modal.open({
      title,
      initialData: plan || {},
      contentBuilder(container, data, h) {
        // Nome
        const nome = h.createInput({label:'Nome', name:'nome', value: data.nome || '', required:true});

        // Telas (increment group) com ícone no label
        const telasLabel = document.createElement('label'); telasLabel.innerHTML = '📺 Telas';
        const telasGroup = document.createElement('div'); telasGroup.className = 'increment-group right-controls';
        const telasInput = document.createElement('input'); telasInput.type='number'; telasInput.name='telas'; telasInput.className='increment-input';
        telasInput.value = (typeof data.telas !== 'undefined' && data.telas !== null) ? data.telas : 1;
        const telasButtons = document.createElement('div'); telasButtons.className = 'increment-controls';
        const telasMinus = document.createElement('button'); telasMinus.type='button'; telasMinus.className='increment-btn'; telasMinus.textContent='−';
        const telasPlus = document.createElement('button'); telasPlus.type='button'; telasPlus.className='increment-btn'; telasPlus.textContent='+';
        telasButtons.appendChild(telasMinus); telasButtons.appendChild(telasPlus);
        telasGroup.appendChild(telasInput); telasGroup.appendChild(telasButtons);
        const telasWarning = document.createElement('div'); telasWarning.className='limit-warning';

        // Validade em meses com ícone
        const validadeLabel = document.createElement('label'); validadeLabel.innerHTML = '📅 Validade em meses';
        const validadeGroup = document.createElement('div'); validadeGroup.className = 'increment-group right-controls';
        const validadeInput = document.createElement('input'); validadeInput.type='number'; validadeInput.name='validadeEmMeses'; validadeInput.className='increment-input';
        validadeInput.value = (typeof data.validadeEmMeses !== 'undefined' && data.validadeEmMeses !== null) ? data.validadeEmMeses : 1;
        const validadeButtons = document.createElement('div'); validadeButtons.className = 'increment-controls';
        const validadeMinus = document.createElement('button'); validadeMinus.type='button'; validadeMinus.className='increment-btn'; validadeMinus.textContent='−';
        const validadePlus = document.createElement('button'); validadePlus.type='button'; validadePlus.className='increment-btn'; validadePlus.textContent='+';
        validadeButtons.appendChild(validadeMinus); validadeButtons.appendChild(validadePlus);
        validadeGroup.appendChild(validadeInput); validadeGroup.appendChild(validadeButtons);

        // Preço (campo com prefixo R$)
        const precoLabel = document.createElement('label'); precoLabel.textContent = 'Preço (R$)';
        const precoWrap = document.createElement('div'); precoWrap.className = 'input-currency';
        const prefix = document.createElement('div'); prefix.className='currency-prefix'; prefix.textContent = 'R$';
        const precoInput = document.createElement('input');
        precoInput.type = 'text';
        precoInput.name = 'preco';
        precoInput.id = 'currencyInput';
        precoInput.value = (typeof data.preco !== 'undefined' && data.preco !== null && data.preco !== '') ? formatNumberToPtBR(Number(data.preco)) : '';
        precoInput.placeholder = '0,00';
        precoInput.setAttribute('inputmode','decimal');
        precoInput.autocomplete = 'off';
        precoInput.className = 'currency-input';
        precoWrap.appendChild(prefix); precoWrap.appendChild(precoInput);

        let precoTouched = false;
        precoInput.addEventListener('focus', () => { precoTouched = true; });
        precoInput.addEventListener('click', () => { precoTouched = true; });

        attachCurrencyMask(precoInput);

        // Observações (opcional) - textarea
        const obsWrap = h.createTextarea({label:'Observações (opcional)', name:'observacoes', value: data.observacoes || '', attrs: { rows: 4, placeholder: 'Observações sobre o plano (opcional)'}});

        // Montagem no container
        const wrap = document.createElement('div'); wrap.className='stack';
        wrap.appendChild(nome.wrap);

        const telasWrap = document.createElement('div'); telasWrap.appendChild(telasLabel); telasWrap.appendChild(telasGroup); telasWrap.appendChild(telasWarning);
        wrap.appendChild(telasWrap);

        const validadeWrap = document.createElement('div'); validadeWrap.appendChild(validadeLabel); validadeWrap.appendChild(validadeGroup);
        wrap.appendChild(validadeWrap);

        wrap.appendChild(precoLabel); wrap.appendChild(precoWrap);
        wrap.appendChild(obsWrap.wrap);

        const precoNote = document.createElement('div'); precoNote.className = 'field-required-note';
        precoNote.textContent = 'Clique no campo de preço e informe o valor antes de salvar.';
        wrap.appendChild(precoNote);

        container.appendChild(wrap);

        // Handlers e constrains
        function updateTelasWarning() {
          const val = parseInt(telasInput.value, 10) || 0;
          if (val > 3) {
            telasWarning.textContent = 'O limite padrão é 3 telas. Valores maiores são permitidos.';
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

        // Expor coleta de dados
        container._collectData = () => {
          const precoRaw = precoInput.value || '';
          const precoFloat = precoInput.getNumericValue ? precoInput.getNumericValue() : parseCurrencyToFloat(precoRaw);
          return {
            nome: nome.input.value,
            telas: parseInt(telasInput.value, 10) || 1,
            validadeEmMeses: parseInt(validadeInput.value, 10) || 1,
            preco: precoTouched && !isNaN(precoFloat) ? Number(precoFloat.toFixed(2)) : null,
            _precoTouched: precoTouched,
            observacoes: obsWrap.textarea.value?.trim() || ''
          };
        };

        updateTelasWarning();
      },

      onSave: async () => {
        const container = document.querySelector('#modals-root .modal-body');
        if (!container || !container._collectData) throw new Error('Erro ao coletar dados do formulário');
        const d = container._collectData();

        if (!d.nome || d.nome.trim().length === 0) throw new Error('Nome do plano é obrigatório');

        if (!d._precoTouched) {
          throw new Error('Você precisa clicar e informar o valor do campo Preço antes de salvar.');
        }
        if (d.preco === null || isNaN(d.preco)) {
          throw new Error('Preço inválido. Informe um valor numérico (ex.: 39,90).');
        }

        if (d.validadeEmMeses < 1) d.validadeEmMeses = 1;
        if (d.validadeEmMeses > 12) d.validadeEmMeses = 12;
        if (d.telas < 1) d.telas = 1;

        try {
          if (typeof plan !== 'undefined' && plan && plan.id) {
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
     Utilitários (mesmos da versão anterior)
     --------------------------- */

  function formatNumberToPtBR(n) {
    if (n === null || n === undefined || isNaN(n)) return '';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  function parseCurrencyToFloat(v) {
    if (v === null || v === undefined) return NaN;
    const s = String(v).trim();
    if (s.length === 0) return NaN;
    const cleaned = s.replace(/[^\d.,-]/g, '').replace(/\s+/g,'');
    const hasComma = cleaned.indexOf(',') !== -1;
    const hasDot = cleaned.indexOf('.') !== -1;
    let normalized = cleaned;
    if (hasComma && hasDot) {
      normalized = normalized.replace(/\./g,'').replace(',', '.');
    } else if (hasComma && !hasDot) {
      normalized = normalized.replace(',', '.');
    }
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
      if (isNaN(n)) {
        e.target.value = '';
        return;
      }
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

    const t = document.createElement('div');
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

    if (type === 'success') {
      t.style.background = 'linear-gradient(90deg,#10b981,#059669)';
    } else if (type === 'error') {
      t.style.background = 'linear-gradient(90deg,#ef4444,#dc2626)';
    } else {
      t.style.background = 'linear-gradient(90deg,#2563eb,#1e40af)';
    }

    t.textContent = message;
    document.body.appendChild(t);

    setTimeout(() => {
      t.style.transition = 'opacity .3s ease, transform .3s ease';
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, timeout);
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
  }

  window.PlansView = { render };

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('view-root')) {
      setTimeout(() => { render(); }, 0);
    }
  });
})();
