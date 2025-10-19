/* views/plans.js - simples CRUD para planos
   Comentários importantes preservados:
   - Implementa criação/edição de planos via Modal.open, reuso do modal.js.
   - Validação: validadeEmMeses entre 1 e 12; telas tem aviso se >3, sem impedir valor maior.
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
      const left = document.createElement('div'); left.innerHTML = `<strong>${p.nome}</strong><div class="small-badge">${p.telas} telas • ${p.validadeEmMeses} meses • R$ ${p.preco}</div>`;
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

        // Preço
        const preco = h.createInput({label:'Preço', name:'preco', type:'number', value: (typeof data.preco !== 'undefined' && data.preco !== null) ? data.preco : 0});

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
        wrap.appendChild(preco.wrap);

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
          // allow manual input; but if out of range, don't block — provide min/max attributes
          let val = parseInt(validadeInput.value, 10);
          if (isNaN(val) || val < 1) validadeInput.value = 1;
          else if (val > 12) validadeInput.value = 12;
        });

        // Expor função de coleta de dados do modal
        container._collectData = () => {
          return {
            nome: nome.input.value,
            telas: parseInt(telasInput.value, 10) || 1,
            validadeEmMeses: parseInt(validadeInput.value, 10) || 1,
            preco: parseFloat(preco.input.value) || 0
          };
        };

        // Inicial update de warning
        updateTelasWarning();
      },

      onSave: async () => {
        const container = document.querySelector('#modals-root .modal-body');
        if (!container || !container._collectData) throw new Error('Erro ao coletar dados do formulário');
        const d = container._collectData();

        // Validações importantes antes de criar/atualizar
        if (!d.nome || d.nome.trim().length === 0) throw new Error('Nome do plano é obrigatório');
        if (d.validadeEmMeses < 1) d.validadeEmMeses = 1;
        if (d.validadeEmMeses > 12) d.validadeEmMeses = 12;
        if (d.telas < 1) d.telas = 1;

        // Mock persist: se plan foi passada via initialData, atualizamos; caso contrário criamos novo
        if (typeof plan !== 'undefined' && plan && plan.id) {
          // atualização no MockDB
          await MockAPI.createPlan({ id: plan.id, nome: d.nome, telas: d.telas, validadeEmMeses: d.validadeEmMeses, preco: d.preco });
          // Observação: MockAPI.createPlan no protótipo apenas insere; para simular update mantemos comportamento permissivo
          // Em produção: usar supabase.from('plans').update(patch).eq('id', plan.id)
        } else {
          await MockAPI.createPlan({ nome: d.nome, telas: d.telas, validadeEmMeses: d.validadeEmMeses, preco: d.preco });
        }
      },

      onDone: async () => { await render(); }
    });
  }

  window.PlansView = { render };
})();
