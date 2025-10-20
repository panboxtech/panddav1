(function(){
  const root = document.getElementById('view-root');

  function formatDateIso(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  }

  function daysFromNow(isoDate) {
    const now = new Date(); const d = new Date(isoDate);
    const diff = Math.floor((d - now) / (1000*60*60*24));
    return diff;
  }

  async function render() {
    root.innerHTML = '';
    const header = document.createElement('div'); header.className = 'clients-header';
    const title = document.createElement('h2'); title.textContent = 'Clientes';
    const actions = document.createElement('div');
    const addBtn = document.createElement('button'); addBtn.className='primary'; addBtn.textContent='Novo cliente';
    actions.appendChild(addBtn);
    header.appendChild(title);
    header.appendChild(actions);
    root.appendChild(header);

    const filters = document.createElement('div'); filters.className='filter-row card';
    const selVencendo = document.createElement('select');
    selVencendo.innerHTML = '<option value="all">Todos</option><option value="vencendo">Vencendo (<=3 dias)</option><option value="vencidos30">Vencidos <30 dias</option><option value="vencidosMais30">Vencidos >30 dias</option>';
    const chNotificados = document.createElement('input'); chNotificados.type = 'checkbox'; chNotificados.id='f_notificados';
    const chLabel = document.createElement('label'); chLabel.textContent = ' Somente notificados'; chLabel.prepend(chNotificados);
    filters.appendChild(selVencendo); filters.appendChild(chLabel);
    root.appendChild(filters);

    const listContainer = document.createElement('div'); listContainer.className='card';
    root.appendChild(listContainer);

    const [clients, plans] = await Promise.all([MockAPI.getClients(), MockAPI.getPlans()]);
    let current = clients;

    function showClients(arr) {
      listContainer.innerHTML = '';
      if (arr.length === 0) {
        const p = document.createElement('div'); p.textContent = 'Nenhum cliente encontrado'; listContainer.appendChild(p); return;
      }
      const table = document.createElement('table'); table.className='table';
      const thead = document.createElement('thead'); thead.innerHTML = '<tr><th>Nome</th><th>Vencimento</th><th>Telas</th><th>Notificado</th><th>Ações</th></tr>';
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      arr.forEach(c => {
        const tr = document.createElement('tr');
        const tdNome = document.createElement('td'); tdNome.textContent = c.nome;
        const tdVenc = document.createElement('td'); tdVenc.textContent = formatDateIso(c.dataVencimento) + ' (' + daysFromNow(c.dataVencimento) + 'd)';
        const tdTelas = document.createElement('td'); tdTelas.textContent = c.telas;
        const tdNot = document.createElement('td'); tdNot.textContent = c.notificado ? 'Sim' : 'Não';
        const tdA = document.createElement('td');

        const btnEdit = document.createElement('button'); btnEdit.className='action-btn'; btnEdit.textContent='Editar';
        btnEdit.addEventListener('click', ()=> openEditClient(c));

        tdA.appendChild(btnEdit);

        const user = Auth.getUser();
        if (user && user.role === 'master') {
          const btnDel = document.createElement('button'); btnDel.className='action-btn danger'; btnDel.textContent='Excluir';
          btnDel.addEventListener('click', async () => {
            if (!confirm('Confirmar exclusão do cliente?')) return;
            await MockAPI.deleteClient(c.id);
            await reloadList();
          });
          tdA.appendChild(btnDel);
        }

        tr.appendChild(tdNome); tr.appendChild(tdVenc); tr.appendChild(tdTelas); tr.appendChild(tdNot); tr.appendChild(tdA);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      listContainer.appendChild(table);
    }

    async function reloadList() {
      const all = await MockAPI.getClients();
      current = all;
      applyFilters();
    }

    function applyFilters() {
      const sel = selVencendo.value;
      const onlyNot = chNotificados.checked;
      let out = current.slice();
      if (sel === 'vencendo') out = out.filter(c => daysFromNow(c.dataVencimento) <= 3 && daysFromNow(c.dataVencimento) >= 0);
      else if (sel === 'vencidos30') out = out.filter(c => daysFromNow(c.dataVencimento) < 0 && daysFromNow(c.dataVencimento) >= -30);
      else if (sel === 'vencidosMais30') out = out.filter(c => daysFromNow(c.dataVencimento) < -30);
      if (onlyNot) out = out.filter(c => c.notificado === true);
      showClients(out);
    }

    selVencendo.addEventListener('change', applyFilters);
    chNotificados.addEventListener('change', applyFilters);

    addBtn.addEventListener('click', () => openNewClient(plans));

    await showClients(current);
  }

  function openNewClient(plans) {
    Modal.open({
      title: 'Novo cliente',
      initialData: {},
      contentBuilder(container, data, h) {
        const form = document.createElement('form');
        form.className = 'stack';

        const secCliente = document.createElement('div'); secCliente.className='accordion';
        const clienteHeader = document.createElement('div'); clienteHeader.style.display='flex'; clienteHeader.style.justifyContent='space-between';
        const heading = document.createElement('strong'); heading.textContent='Cliente';
        const resumo = document.createElement('div'); resumo.className='small-badge'; resumo.textContent='Resumo: -';
        const toggle = document.createElement('button'); toggle.type='button'; toggle.className='flat-btn'; toggle.textContent='Minimizar';
        clienteHeader.appendChild(heading); clienteHeader.appendChild(resumo); clienteHeader.appendChild(toggle);
        secCliente.appendChild(clienteHeader);

        const clienteFields = document.createElement('div');
        const inpNome = h.createInput({label:'Nome', name:'nome', required:true});
        const inpTel = h.createInput({label:'Telefone', name:'telefone'});
        const inpEmail = h.createInput({label:'Email', name:'email', type:'email'});
        const selPlan = h.createSelect({label:'Plano', name:'planoId', options: plans.map(p=>({value:p.id,label:p.nome})) , required:true});
        const inpTelas = h.createInput({label:'Telas', name:'telas', type:'number', value: ''});
        const inpPreco = h.createInput({label:'Preço', name:'preco', type:'number', value: ''});
        const inpValidade = h.createInput({label:'Validade (data)', name:'dataVencimento', type:'date'});
        const chkNot = document.createElement('label'); chkNot.textContent='Notificado'; const ch = document.createElement('input'); ch.type='checkbox'; ch.name='notificado'; chkNot.prepend(ch);

        [inpNome.wrap, inpTel.wrap, inpEmail.wrap, selPlan.wrap, inpTelas.wrap, inpPreco.wrap, inpValidade.wrap, chkNot].forEach(n=> clienteFields.appendChild(n));
        secCliente.appendChild(clienteFields);

        let clienteCollapsed = false;
        toggle.addEventListener('click', () => {
          clienteCollapsed = !clienteCollapsed;
          clienteFields.style.display = clienteCollapsed ? 'none' : 'block';
          toggle.textContent = clienteCollapsed ? 'Expandir' : 'Minimizar';
          if (clienteCollapsed) { resumo.textContent = `Resumo: ${inpNome.input.value || '-'} | telas: ${inpTelas.input.value || '-'}`; }
          else { resumo.textContent = '-'; }
        });

        selPlan.select.addEventListener('change', (e) => {
          const pid = e.target.value;
          const plan = plans.find(p=>p.id===pid);
          if (!plan) return;
          inpTelas.input.value = plan.telas;
          inpPreco.input.value = plan.preco;
          const serverNow = new Date();
          let day = serverNow.getDate();
          let month = serverNow.getMonth();
          let year = serverNow.getFullYear();
          month += plan.validadeEmMeses;
          const tentative = new Date(year, month, day);
          if (tentative.getDate() !== day) {
            const next = new Date(year, month+1, 1);
            inpValidade.input.value = next.toISOString().slice(0,10);
            alert('A data calculada não existe neste mês. Ajustada para dia 01 do próximo mês.');
          } else {
            inpValidade.input.value = tentative.toISOString().slice(0,10);
          }
        });

        inpPreco.input.addEventListener('input', () => {
          const plan = plans.find(p=>p.id===selPlan.select.value);
          if (plan && Number(inpPreco.input.value) !== Number(plan.preco)) {
            inpPreco.wrap.querySelector('.feedback')?.remove();
            const f = document.createElement('div'); f.className='feedback'; f.textContent = `Valor difere do preço do plano (${plan.preco}).`;
            inpPreco.wrap.appendChild(f);
          } else {
            inpPreco.wrap.querySelector('.feedback')?.remove();
          }
        });

        const secPontos = document.createElement('div'); secPontos.className='accordion';
        const pontosHeader = document.createElement('div'); pontosHeader.style.display='flex'; pontosHeader.style.justifyContent='space-between';
        const ph = document.createElement('strong'); ph.textContent = 'Pontos de Acesso';
        const addPontoBtn = document.createElement('button'); addPontoBtn.type='button'; addPontoBtn.className='primary'; addPontoBtn.textContent='Adicionar ponto';
        pontosHeader.appendChild(ph); pontosHeader.appendChild(addPontoBtn);
        secPontos.appendChild(pontosHeader);

        const pontosList = document.createElement('div'); pontosList.className='pontos-list';
        secPontos.appendChild(pontosList);

        function createPontoCard(ponto) {
          const card = document.createElement('div'); card.className='ponto-card';
          const t = document.createElement('div'); t.textContent = `App: ${ponto.appNome || '-'}`;
          const c = document.createElement('div'); c.textContent = `Conexões: ${ponto.conexoesSimultaneas || 0}`;
          const u = document.createElement('div'); u.textContent = `Usuário: ${ponto.usuario || '-'}`;
          card.appendChild(t); card.appendChild(c); card.appendChild(u);
          card.addEventListener('click', ()=> {
            const ev = new CustomEvent('pontoSelected', { detail: ponto });
            form.dispatchEvent(ev);
          });
          return card;
        }

        const pontoForm = document.createElement('div'); pontoForm.style.marginTop='8px';
        const selApp = document.createElement('select'); selApp.name='appId';
        selApp.style.width='100%'; selApp.style.display='block';
        const inpConex = document.createElement('input'); inpConex.type='number'; inpConex.name='conexoesSimultaneas';
        inpConex.placeholder = 'Conexões simultâneas';
        const inpUser = document.createElement('input'); inpUser.name='usuario'; inpUser.placeholder='Usuário';
        const inpPass = document.createElement('input'); inpPass.name='senha'; inpPass.type='password'; inpPass.placeholder='Senha';
        const savePontoBtn = document.createElement('button'); savePontoBtn.type='button'; savePontoBtn.className='primary'; savePontoBtn.textContent='Salvar ponto';
        pontoForm.appendChild(selApp); pontoForm.appendChild(inpConex); pontoForm.appendChild(inpUser); pontoForm.appendChild(inpPass); pontoForm.appendChild(savePontoBtn);
        secPontos.appendChild(pontoForm);

        const pontosData = [];
        savePontoBtn.addEventListener('click', async () => {
          const appId = selApp.value;
          if (!appId) { alert('Selecione um app'); return; }
          const apps = await MockAPI.getApps();
          const app = apps.find(a=>a.id===appId);
          if (!app) { alert('App inválido'); return; }
          const conex = Number(inpConex.value) || 0;
          if (!app.multiplosAcessos) {
            if (conex !== 1 && conex !== 0) { alert('Este app não permite múltiplos acessos. Será definido como 1.'); }
          }
          const ponto = {
            id: uid('p_'),
            appId,
            appNome: app.nome,
            conexoesSimultaneas: app.multiplosAcessos ? conex || 1 : 1,
            usuario: inpUser.value,
            senha: inpPass.value
          };
          pontosData.push(ponto);
          pontosList.appendChild(createPontoCard(ponto));
          inpConex.value=''; inpUser.value=''; inpPass.value='';
        });

        form.addEventListener('pontoSelected', (e) => {
          const p = e.detail;
          selApp.value = p.appId;
          inpConex.value = p.conexoesSimultaneas;
          inpUser.value = p.usuario;
          inpPass.value = p.senha;
        });

        form.appendChild(secCliente);
        form.appendChild(secPontos);

        container.appendChild(form);

        MockAPI.getApps().then(apps=>{
          selApp.innerHTML = '<option value="">-- selecionar app --</option>';
          apps.forEach(a=> {
            const opt = document.createElement('option'); opt.value = a.id; opt.textContent = `${a.nome} (${a.codigoDeAcesso}) - servidor: ${a.serverId}`;
            selApp.appendChild(opt);
          });
        });

        container._collectData = () => {
          const cliente = {
            nome: inpNome.input.value,
            telefone: inpTel.input.value,
            email: inpEmail.input.value,
            planoId: selPlan.select.value,
            telas: Number(inpTelas.input.value),
            preco: Number(inpPreco.input.value),
            dataVencimento: inpValidade.input.value,
            notificado: ch.checked,
            pontosAcesso: pontosData.slice()
          };
          return cliente;
        };
      },

      onSave: async (collected) => {
        const container = document.querySelector('#modals-root .modal-body');
        if (container && container._collectData) {
          const data = container._collectData();
          const sumConex = data.pontosAcesso.reduce((s,p)=> s + Number(p.conexoesSimultaneas || 0), 0);
          if (sumConex !== data.telas) throw new Error('A soma de conexões dos pontos precisa ser igual ao número de telas.');
          const created = await MockAPI.createClient({
            nome: data.nome,
            telefone: data.telefone,
            email: data.email,
            dataVencimento: data.dataVencimento,
            notificado: data.notificado,
            planoId: data.planoId,
            telas: data.telas,
            preco: data.preco,
            pontosAcesso: data.pontosAcesso
          });
          return created;
        } else {
          throw new Error('Erro ao coletar dados do formulário');
        }
      },

      onDone: async () => {
        await render();
      }
    });
  }

  function openEditClient(client) {
    MockAPI.getPlans().then(plans => {
      Modal.open({
        title: 'Editar cliente',
        initialData: client,
        contentBuilder(container, data, h) {
          const form = document.createElement('form'); form.className='stack';
          const nome = h.createInput({label:'Nome', name:'nome', value: data.nome, required:true});
          const tel = h.createInput({label:'Telefone', name:'telefone', value: data.telefone});
          const email = h.createInput({label:'Email', name:'email', value: data.email});
          const selPlan = h.createSelect({label:'Plano', name:'planoId', options: plans.map(p=>({value:p.id,label:p.nome})), value: data.planoId});
          const telas = h.createInput({label:'Telas', name:'telas', type:'number', value: data.telas});
          const preco = h.createInput({label:'Preço', name:'preco', type:'number', value: data.preco});
          const dataV = h.createInput({label:'Validade', name:'dataVencimento', type:'date', value: data.dataVencimento.slice(0,10)});
          const not = document.createElement('label'); not.textContent='Notificado'; const ch = document.createElement('input'); ch.type='checkbox'; ch.name='notificado'; ch.checked = !!data.notificado; not.prepend(ch);

          [nome.wrap, tel.wrap, email.wrap, selPlan.wrap, telas.wrap, preco.wrap, dataV.wrap, not].forEach(n=> form.appendChild(n));
          container.appendChild(form);

          container._collectData = () => ({
            nome: nome.input.value,
            telefone: tel.input.value,
            email: email.input.value,
            planoId: selPlan.select.value,
            telas: Number(telas.input.value),
            preco: Number(preco.input.value),
            dataVencimento: dataV.input.value,
            notificado: ch.checked
          });
        },
        onSave: async () => {
          const container = document.querySelector('#modals-root .modal-body');
          const patch = container._collectData();
          await MockAPI.updateClient(client.id, {
            nome: patch.nome, telefone: patch.telefone, email: patch.email, planoId: patch.planoId,
            telas: patch.telas, preco: patch.preco, dataVencimento: patch.dataVencimento, notificado: patch.notificado
          });
        },
        onDone: async () => { await render(); }
      });
    });
  }

  window.ClientsView = { render };

  // Auto-register para main.js
})();
