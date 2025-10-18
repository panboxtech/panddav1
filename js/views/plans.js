/* views/plans.js - simples CRUD para planos */
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
        Modal.open({
          title: 'Editar plano',
          contentBuilder(container,data,h) {
            const nome = h.createInput({label:'Nome', name:'nome', value:p.nome, required:true});
            const telas = h.createInput({label:'Telas', name:'telas', type:'number', value:p.telas});
            const validade = h.createInput({label:'Validade em meses', name:'validadeEmMeses', type:'number', value:p.validadeEmMeses});
            const preco = h.createInput({label:'Preço', name:'preco', type:'number', value:p.preco});
            [nome.wrap, telas.wrap, validade.wrap, preco.wrap].forEach(n=> container.appendChild(n));
            container._collectData = ()=> ({ nome: nome.input.value, telas: Number(telas.input.value), validadeEmMeses: Number(validade.input.value), preco: Number(preco.input.value) });
          },
          onSave: async ()=> {
            const c = document.querySelector('#modals-root .modal-body'); const patch = c._collectData();
            await MockAPI.createPlan({ id: p.id, ...patch }); // mock
          },
          onDone: async ()=> render()
        });
      });
      right.appendChild(btnEdit);
      const user = Auth.getUser();
      if (user && user.role === 'master') {
        const btnDel = document.createElement('button'); btnDel.className='flat-btn'; btnDel.textContent='Excluir'; btnDel.style.color='var(--danger)';
        btnDel.addEventListener('click', ()=> {
          if (!confirm('Excluir plano?')) return;
          // Mock delete
          MockDB.plans = MockDB.plans.filter(x=>x.id !== p.id);
          render();
        });
        right.appendChild(btnDel);
      }
      div.appendChild(left); div.appendChild(right);
      list.appendChild(div);
    });

    add.addEventListener('click', ()=> {
      Modal.open({
        title:'Novo plano',
        contentBuilder(container,data,h) {
          const nome = h.createInput({label:'Nome', name:'nome', required:true});
          const telas = h.createInput({label:'Telas', name:'telas', type:'number'});
          const validade = h.createInput({label:'Validade em meses', name:'validadeEmMeses', type:'number'});
          const preco = h.createInput({label:'Preço', name:'preco', type:'number'});
          [nome.wrap, telas.wrap, validade.wrap, preco.wrap].forEach(n=> container.appendChild(n));
          container._collectData = ()=> ({ nome: nome.input.value, telas: Number(telas.input.value), validadeEmMeses: Number(validade.input.value), preco: Number(preco.input.value) });
        },
        onSave: async ()=> {
          const c = document.querySelector('#modals-root .modal-body'); const d = c._collectData();
          await MockAPI.createPlan({ nome:d.nome, telas:d.telas, validadeEmMeses:d.validadeEmMeses, preco:d.preco });
        },
        onDone: async ()=> render()
      });
    });
  }

  window.PlansView = { render };
})();
