(function(){
  const root = document.getElementById('view-root');

  async function render() {
    root.innerHTML = '';
    const header = document.createElement('div'); header.style.display='flex'; header.style.justifyContent='space-between';
    const title = document.createElement('h2'); title.textContent = 'Servidores';
    const addBtn = document.createElement('button'); addBtn.className='primary'; addBtn.textContent='Novo servidor';
    header.appendChild(title); header.appendChild(addBtn);
    root.appendChild(header);

    const list = document.createElement('div'); list.className='card';
    root.appendChild(list);

    const servers = await MockAPI.getServers();
    servers.forEach(s => {
      const div = document.createElement('div'); div.className='client-card';
      const left = document.createElement('div'); left.innerHTML = `<strong>${s.nome}</strong><div class="small-badge">${s.alias}</div>`;
      const right = document.createElement('div');
      const btnEdit = document.createElement('button'); btnEdit.className='action-btn'; btnEdit.textContent='Editar';
      btnEdit.addEventListener('click', ()=> {
        Modal.open({
          title: 'Editar servidor',
          contentBuilder(container, data, h) {
            const nome = h.createInput({label:'Nome', name:'nome', value: s.nome, required:true});
            const alias = h.createInput({label:'Alias', name:'alias', value: s.alias});
            container.appendChild(nome.wrap); container.appendChild(alias.wrap);
            container._collectData = ()=> ({ nome: nome.input.value, alias: alias.input.value });
          },
          onSave: async ()=> {
            const container = document.querySelector('#modals-root .modal-body');
            const patch = container._collectData();
            await MockAPI.createServer({ id: s.id, nome: patch.nome, alias: patch.alias });
          },
          onDone: async ()=> render()
        });
      });

      right.appendChild(btnEdit);
      const user = Auth.getUser();
      if (user && user.role === 'master') {
        const btnDel = document.createElement('button'); btnDel.className='action-btn danger'; btnDel.style.color='var(--danger)'; btnDel.textContent='Excluir';
        btnDel.addEventListener('click', async ()=> {
          if (!confirm('Excluir servidor?')) return;
          MockDB.servers = MockDB.servers.filter(x=>x.id !== s.id);
          await render();
        });
        right.appendChild(btnDel);
      }
      div.appendChild(left); div.appendChild(right);
      list.appendChild(div);
    });

    addBtn.addEventListener('click', ()=> {
      Modal.open({
        title: 'Novo servidor',
        contentBuilder(container, data, h) {
          const nome = h.createInput({label:'Nome', name:'nome', required:true});
          const alias = h.createInput({label:'Alias', name:'alias'});
          container.appendChild(nome.wrap); container.appendChild(alias.wrap);
          container._collectData = ()=> ({ nome: nome.input.value, alias: alias.input.value });
        },
        onSave: async ()=> {
          const container = document.querySelector('#modals-root .modal-body');
          const d = container._collectData();
          await MockAPI.createServer({ nome: d.nome, alias: d.alias });
        },
        onDone: async ()=> render()
      });
    });
  }

  window.ServersView = { render };
})();
