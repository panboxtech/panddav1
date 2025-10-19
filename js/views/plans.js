/* views/plans.js - simples CRUD para planos
   Comentários importantes preservados:
   - Implementa criação/edição de planos via Modal.open, reuso do modal.js.
   - Validação: validadeEmMeses entre 1 e 12; telas tem aviso se >3, sem impedir valor maior.
   - Campo PREÇO: exibe prefixo R$, aceita "." ou ","; obriga interação (clique) antes de salvar; salva como float com 2 casas.
   - Formulário responsivo; inputs e botões adequados para mobile via CSS.
*/

(function(){
  const root = document.getElementById('view-root');

  async function render(){
    root.innerHTML = '';
    const header = document.createElement('div'); header.style.display='flex'; header.style.justifyContent='space-between';
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
        precoInput.value = (typeof data.preco !== 'undefined' && data.preco !== null) ? Number(data.preco).toFixed(2) : '';
        precoInput.placeholder = '0,00';
        precoInput.setAttribute('inputmode','decimal'); // sugere teclado numérico em mobile
        precoInput.autocomplete = 'off';
        precoInput.className = 'currency-input';
        precoWrap.appendChild(prefix); precoWrap.appendChild(precoInput);

        // Nota: força que o usuário clique/interaja no campo preço
        let precoTouched = false;
        precoInput.addEventListener('focus', () => { precoTouched = true; });
        precoInput.addEventListener('click', () => { precoTouched = true; });

        // Ao perder foco, formatar valor para 2 casas e substituir , por .
        precoInput.addEventListener('blur', () => {
          const parsed = parseCurrencyToFloat(precoInput.value);
          if (!isNaN(parsed)) {
            precoInput.value = parsed.toFixed(2).replace('.', ','); // mostrar com vírgula para PT-BR; armazenaremos float com dot ao salvar
          } else {
            // deixar vazio se inválido
            precoInput.value = '';
          }
        });

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
          // parseCurrencyToFloat aceita "." ou ","
          const precoFloat = parseCurrencyToFloat(precoRaw);
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

        // util: parse currency string to float; accepts "." or ","; returns Number or NaN
        function parseCurrencyToFloat(v) {
          if (v === null || v === undefined) return NaN;
          const s = String(v).trim();
          if (s.length === 0) return NaN;
          // remove spaces and currency symbols
          const cleaned = s.replace(/[^\d.,-]/g, '').replace(/\s+/g,'');
          // if contains both comma and dot, assume dot is thousand separator and comma decimal (BR)\:
          if (cleaned.indexOf(',') > -1 && cleaned.indexOf('.') > -1) {
            // remove dots (thousand), replace comma with dot
            return parseFloat(cleaned.replace(/\./g,'').replace(',', '.'));
          }
          // if only comma present, replace with dot
          if (cleaned.indexOf(',') > -1) {
            return parseFloat(cleaned.replace(',', '.'));
          }
          // else parse direct
          return parseFloat(cleaned);
        }
      },

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

        // Persistência mock
        if (typeof plan !== 'undefined' && plan && plan.id) {
          // atualização: para o protótipo usamos createPlan que insere; manteremos comportamento permissivo
          await MockAPI.createPlan({ id: plan.id, nome: d.nome, telas: d.telas, validadeEmMeses: d.validadeEmMeses, preco: d.preco });
        } else {
          await MockAPI.createPlan({ nome: d.nome, telas: d.telas, validadeEmMeses: d.validadeEmMeses, preco: d.preco });
        }
      },

      onDone: async () => { await render(); }
    });
  }

  window.PlansView = { render };
})();
