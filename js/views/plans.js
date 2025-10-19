/* views/plans.js - CRUD para planos com feedback após salvar/editar
   - Exibe toast de sucesso quando o plano é salvo/atualizado.
   - Trata exceções e exibe mensagem de erro clara.
   - Preparado para integração com Supabase: troque MockAPI.createPlan por supabase.from('plans').insert/update.
*/

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
      const div = document.createElement('div'); div.className='client-card';
      const left = document.createElement('div'); left.innerHTML = `<strong>${p.nome}</strong><div class="small-badge">${p.telas} telas • ${p.validadeEmMeses} meses • R$ ${Number(p.preco).toFixed(2)}</div>`;
      const right = document.createElement('div');
      const btnEdit = document.createElement('button'); btnEdit.className='flat-btn'; btnEdit.textContent='Editar';
      btnEdit.addEventListener('click', ()=> {
        openPlanModal('Editar plano', p);
      });
      right.appendChild(btnEdit);
      const user = Auth.getUser();
      if (user && user.role === 'master') {
        const btnDel = document.createElement('button'); btnDel.className='flat-btn'; btnDel.textContent='Excluir'; btnDel.style.color='var(--danger)';
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

  /**
   * Abre modal para criar/editar plano
   * title: string, plan: object|null
   */
  function openPlanModal(title, plan) {
    Modal.open({
      title,
      initialData: plan || {},
      contentBuilder(container, data, h) {
        // Nome
        const nome = h.createInput({label:'Nome', name:'nome', value: data.nome || '', required:true});

        // Telas (increment group)
        const telasLabel = document.createElement('label'); telasLabel.textContent = 'Telas';
        const telasGroup = document.createElement('div'); telasGroup.className = 'increment-group';
        const telasMinus = document.createElement('button'); telasMinus.type='button'; telasMinus.className='increment-btn'; telasMinus.textContent='−';
        const telasInput = document.createElement('input'); telasInput.type='number'; telasInput.name='telas'; telasInput.className='increment-input';
        telasInput.value = (typeof data.telas !== 'undefined' && data.telas !== null) ? data.telas : 1;
        const telasPlus = document.createElement('button'); telasPlus.type='button'; telasPlus.className='increment-btn'; telasPlus.textContent='+';
        const telasWarning = document.createElement('div'); telasWarning.className='limit-warning';

        telasGroup.appendChild(telasMinus);
        telasGroup.appendChild(telasInput);
        telasGroup.appendChild(telasPlus);

        // Validade em meses (1..12) (increment group)
        const validadeLabel = document.createElement('label'); validadeLabel.textContent = 'Validade em meses';
        const validadeGroup = document.createElement('div'); validadeGroup.className = 'increment-group';
        const validadeMinus = document.createElement('button'); validadeMinus.type='button'; validadeMinus.className='increment-btn'; validadeMinus.textContent='−';
        const validadeInput = document.createElement('input'); validadeInput.type='number'; validadeInput.name='validadeEmMeses'; validadeInput.className='increment-input';
        validadeInput.value = (typeof data.validadeEmMeses !== 'undefined' && data.validadeEmMeses !== null) ? data.validadeEmMeses : 1;
        const validadePlus = document.createElement('button'); validadePlus.type='button'; validadePlus.className='increment-btn'; validadePlus.textContent='+';

        validadeGroup.appendChild(validadeMinus);
        validadeGroup.appendChild(validadeInput);
        validadeGroup.appendChild(validadePlus);

        // Preço (campo com prefixo R$) — usa input text para aceitar ',' e '.'
        const precoLabel = document.createElement('label'); precoLabel.textContent = 'Preço (R$)';
        const precoWrap = document.createElement('div'); precoWrap.className = 'input-currency';
        const prefix = document.createElement('div'); prefix.className='currency-prefix'; prefix.textContent = 'R$';
        const precoInput = document.createElement('input');
        precoInput.type = 'text'; // aceitar "," e "."
        precoInput.name = 'preco';
        precoInput.id = 'currencyInput';
        precoInput.value = (typeof data.preco !== 'undefined' && data.preco !== null && data.preco !== '') ? formatNumberToPtBR(Number(data.preco)) : '';
        precoInput.placeholder = '0,00';
        precoInput.setAttribute('inputmode','decimal'); // sugere teclado numérico em mobile
        precoInput.autocomplete = 'off';
        precoInput.className = 'currency-input';
        precoWrap.appendChild(prefix); precoWrap.appendChild(precoInput);

        // Nota: força que o usuário clique/interaja no campo preço
        let precoTouched = false;
        precoInput.addEventListener('focus', () => { precoTouched = true; });
        precoInput.addEventListener('click', () => { precoTouched = true; });

        // Attach mask behaviors
        attachCurrencyMask(precoInput);

        // Montagem no container com espaçamento consistente
        const wrap = document.createElement('div');
        wrap.className = 'stack';
        // Nome
        wrap.appendChild(nome.wrap);

        // Telas
        const telasWrap = document.createElement('div');
        telasWrap.appendChild(telasLabel);
        telasWrap.appendChild(telasGroup);
        telasWrap.appendChild(telasWarning);
        wrap.appendChild(telasWrap);

        // Validade
        const validadeWrap = document.createElement('div');
        validadeWrap.appendChild(validadeLabel);
        validadeWrap.appendChild(validadeGroup);
        wrap.appendChild(validadeWrap);

        // Preço
        wrap.appendChild(precoLabel);
        wrap.appendChild(precoWrap);

        // Nota sobre obrigatoriedade de clicar no preço
        const precoNote = document.createElement('div'); precoNote.className = 'field-required-note';
        precoNote.textContent = 'Clique no campo de preço e informe o valor antes de salvar.';
        wrap.appendChild(precoNote);

        container.appendChild(wrap);

        // Helper: atualizar warning para telas
        function updateTelasWarning() {
          const val = parseInt(telasInput.value, 10) || 0;
          if (val > 3) {
            telasWarning.textContent = 'O limite padrão é 3 telas. Valores maiores são permitidos.';
          } else {
            telasWarning.textContent = '';
          }
        }

        // Constrain validade between 1 and 12 for buttons, but allow manual typing (with min attr)
        validadeInput.setAttribute('min', '1');
        validadeInput.setAttribute('max', '12');

        // Event handlers for telas
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
          // allow manual input; ensure at least 1
          let val = parseInt(telasInput.value, 10);
          if (isNaN(val) || val < 1) { telasInput.value = 1; val = 1; }
          updateTelasWarning();
        });

        // Event handlers for validade
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
          // allow manual input; keep in range visually
          let val = parseInt(validadeInput.value, 10);
          if (isNaN(val) || val < 1) validadeInput.value = 1;
          else if (val > 12) validadeInput.value = 12;
        });

        // Expor função de coleta de dados do modal
        container._collectData = () => {
          // Validar interação no preço
          const precoRaw = precoInput.value || '';
          const precoFloat = precoInput.getNumericValue ? precoInput.getNumericValue() : parseCurrencyToFloat(precoRaw);
          return {
            nome: nome.input.value,
            telas: parseInt(telasInput.value, 10) || 1,
            validadeEmMeses: parseInt(validadeInput.value, 10) || 1,
            // salvamos preco como number (float) com 2 casas
            preco: precoTouched && !isNaN(precoFloat) ? Number(precoFloat.toFixed(2)) : null,
            _precoTouched: precoTouched
          };
        };

        // Inicial update de warning
        updateTelasWarning();
      },

      // onSave agora trata erros e propaga para Modal; retornos e exceções preparados para Supabase
      onSave: async () => {
        const container = document.querySelector('#modals-root .modal-body');
        if (!container || !container._collectData) throw new Error('Erro ao coletar dados do formulário');
        const d = container._collectData();

        // Validações importantes antes de criar/atualizar
        if (!d.nome || d.nome.trim().length === 0) throw new Error('Nome do plano é obrigatório');

        // Verifica se usuário interagiu no campo preço e se valor parseou corretamente
        if (!d._precoTouched) {
          throw new Error('Você precisa clicar e informar o valor do campo Preço antes de salvar.');
        }
        if (d.preco === null || isNaN(d.preco)) {
          throw new Error('Preço inválido. Informe um valor numérico (ex.: 39,90).');
        }

        // Garantir ranges mínimos
        if (d.validadeEmMeses < 1) d.validadeEmMeses = 1;
        if (d.validadeEmMeses > 12) d.validadeEmMeses = 12;
        if (d.telas < 1) d.telas = 1;

        // Persistência: preparado para Supabase. No protótipo usamos MockAPI.createPlan.
        try {
          if (typeof plan !== 'undefined' && plan && plan.id) {
            // Em Supabase: supabase.from('plans').update({...}).eq('id', plan.id)
            await MockAPI.createPlan({ id: plan.id, nome: d.nome, telas: d.telas, validadeEmMeses: d.validadeEmMeses, preco: d.preco });
          } else {
            // Em Supabase: supabase.from('plans').insert([{ ... }])
            await MockAPI.createPlan({ nome: d.nome, telas: d.telas, validadeEmMeses: d.validadeEmMeses, preco: d.preco });
          }
        } catch (err) {
          // lança erro para o Modal exibir (Modal deve capturar e mostrar)
          // adicionamos mais contexto para debug/usuário
          const msg = err && err.message ? err.message : String(err);
          throw new Error('Falha ao salvar o plano: ' + msg);
        }
      },

      // onDone apos o fechamento do modal: re-render e toast de sucesso (pronto para usar resposta do Supabase)
      onDone: async () => {
        await render();
        // mostrar confirmação
        showToast('Plano salvo com sucesso', 'success');
      }
    });
  }

  /* ---------------------------
     Máscara e utilitários de moeda
     --------------------------- */

  // formata Number para PT-BR com 2 casas: 1234.5 => "1.234,50"
  function formatNumberToPtBR(n) {
    if (n === null || n === undefined || isNaN(n)) return '';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  // parse genérico (aceita "1.234,56" "1234.56" "1234,56" "1234" => Number)
  function parseCurrencyToFloat(v) {
    if (v === null || v === undefined) return NaN;
    const s = String(v).trim();
    if (s.length === 0) return NaN;
    const cleaned = s.replace(/[^\d.,-]/g, '').replace(/\s+/g,'');
    const hasComma = cleaned.indexOf(',') !== -1;
    const hasDot = cleaned.indexOf('.') !== -1;
    let normalized = cleaned;
    if (hasComma && hasDot) {
      // assume dot thousands, comma decimal
      normalized = normalized.replace(/\./g,'').replace(',', '.');
    } else if (hasComma && !hasDot) {
      normalized = normalized.replace(',', '.');
    }
    const num = parseFloat(normalized);
    return isNaN(num) ? NaN : num;
  }

  // implementa máscara leve: adapta milhares e decimal PT-BR, aceita . ou ,
  function attachCurrencyMask(inputEl) {
    if (!inputEl) return;

    // converte string raw para Number (mesma lógica)
    function parseRaw(raw) { return parseCurrencyToFloat(raw); }

    function formatForDisplay(num) {
      if (isNaN(num)) return '';
      return formatNumberToPtBR(num);
    }

    // expõe método para obter valor numérico
    inputEl.getNumericValue = () => {
      const n = parseRaw(inputEl.value);
      return isNaN(n) ? null : Number(n.toFixed(2));
    };

    // ao digitar: permitir chars numéricos, vírgula e ponto; forçar limpeza de demais
    inputEl.addEventListener('input', (e) => {
      const v = e.target.value;
      // keep allowed chars only while typing
      const cleaned = v.replace(/[^\d,.\-]/g, '');
      // if user typed both separators, we still allow until blur normalizes
      e.target.value = cleaned;
    });

    // on blur: parse e formatar para PT-BR com 2 casas
    inputEl.addEventListener('blur', (e) => {
      const n = parseRaw(e.target.value);
      if (isNaN(n)) {
        e.target.value = '';
        return;
      }
      e.target.value = formatForDisplay(n);
    });

    // on focus: mostra formatted value (mantemos o formato para consistência)
    inputEl.addEventListener('focus', (e) => {
      const n = parseRaw(e.target.value);
      if (!isNaN(n)) e.target.value = formatForDisplay(n);
    });

    // prevent invalid keys
    inputEl.addEventListener('keydown', (ev) => {
      const allowedNav = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','Home','End'];
      if (allowedNav.includes(ev.key)) return;
      const allowedPattern = /[0-9.,]/;
      if (!allowedPattern.test(ev.key)) ev.preventDefault();
    });

    // support paste: clean and format on next tick
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

  /* ---------------------------
     Toast helper (simples)
     --------------------------- */
  function showToast(message, type = 'info', timeout = 3500) {
    // type: success | info | error
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

  window.PlansView = { render };

  // inicial render
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('view-root')) {
      setTimeout(() => { render(); }, 0);
    }
  });
})();
