(function(){
  const root = document.getElementById('view-root');

  async function render(){
    root.innerHTML = '';
    const header = document.createElement('div'); header.style.display='flex'; header.style.justifyContent='space-between';
    const title = document.createElement('h2'); title.textContent = 'Apps';
    const add = document.createElement('button'); add.className='primary'; add.textContent='Novo App';
    header.appendChild(title); header.appendChild(add); root.appendChild(header);

    const list = document.createElement('div'); list.className='card'; root.appendChild(list);

    const [apps, servers] = await Promise.all([MockAPI.getApps(), MockAPI.getServers()]);
    apps.forEach(a=>{
      const div = document.createElement('div'); div.className='client-card';
      const left = document.createElement('div'); left.innerHTML = `<strong>${a.nome}</strong><div class="small-badge">${a.codigoDeAcesso} • servidor: ${a.serverId}</div>`;
      const right = document.createElement('div');
      const btnEdit = document.createElement('button'); btnEdit.className='action-btn'; btnEdit.textContent='Editar';
      btnEdit.addEventListener('click', ()=> {
        Modal.open({
          title:'Editar app',
          contentBuilder(container,data,h) {
            const nome = h.createInput({label:'Nome', name:'nome', value:a.nome, required:true});
            const codigo = h.createInput({label:'Código de Acesso', name:'codigoDeAcesso', value:a.codigoDeAcesso});
            const urlA = h.createInput({label:'URL Android', name:'urlDownloadAndroid', value:a.urlDownloadAndroid});
            const urlI = h.createInput({label:'URL iOS', name:'urlDownloadIos', value:a.urlDownloadIos});
            const mult = h.createSelect({label:'Múltiplos acessos', name:'multiplosAcessos', options:[{value:'true',label:'true'},{value:'false',label:'false'}], value:String(a.multiplosAcessos)});
            const selServer = h.createSelect({label:'Servidor', name:'serverId', options: servers.map(s=>({value:s.id,label:s.nome})), value:a.serverId});
            [nome.wrap,codigo.wrap,urlA.wrap,urlI.wrap,mult.wrap,selServer.wrap].forEach(n=>container.appendChild(n));
            container._collectData = ()=> ({
              nome: nome.input.value, codigoDeAcesso: codigo.input.value, urlDownloadAndroid: urlA.input.value,
              urlDownloadIos: urlI.input.value, multiplosAcessos: mult.select.value === 'true', serverId: selServer.select.value
            });
          },
          onSave: async ()=> {
            const c = document.querySelector('#modals-root .modal-body'); const patch = c._collectData();
            await MockAPI.createApp({ id:a.id, ...patch });
          },
          onDone: async ()=> render()
        });
      });
      right.appendChild(btnEdit);
      const user = Auth.getUser();
      if (user && user.role === 'master') {
        const btnDel = document.createElement('button'); btnDel.className='action-btn danger'; btnDel.textContent='Excluir';
        btnDel.addEventListener('click', ()=> {
          if (!confirm('Excluir app?')) return;
          MockDB.apps = MockDB.apps.filter(x=>x.id!==a.id);
          render();
        });
        right.appendChild(btnDel);
      }
      div.appendChild(left); div.appendChild(right); list.appendChild(div);
    });

    add.addEventListener('click', ()=> {
      MockAPI.getServers().then(servers=>{
        Modal.open({
          title:'Novo App',
          contentBuilder(container,data,h){
            const nome = h.createInput({label:'Nome', name:'nome', required:true});
            const codigo = h.createInput({label:'Código de Acesso', name:'codigoDeAcesso'});
            const urlA = h.createInput({label:'URL Android', name:'urlDownloadAndroid'});
            const urlI = h.createInput({label:'URL iOS', name:'urlDownloadIos'});
            const codigoDon = h.createInput({label:'Código Downloader', name:'codigoDonwloadDownloader'});
            const codigoNT = h.createInput({label:'Código NTDown', name:'codigoNTDown'});
            const mult = h.createSelect({label:'Múltiplos acessos', name:'multiplosAcessos', options:[{value:'true',label:'true'},{value:'false',label:'false'}], value:''});
            const selServer = h.createSelect({label:'Servidor', name:'serverId', options: servers.map(s=>({value:s.id,label:s.nome})), required:true});
            [nome.wrap,codigo.wrap,urlA.wrap,urlI.wrap,codigoDon.wrap,codigoNT.wrap,mult.wrap,selServer.wrap].forEach(n=>container.appendChild(n));
            container._collectData = ()=> ({
              nome: nome.input.value, codigoDeAcesso: codigo.input.value, urlDownloadAndroid: urlA.input.value,
              urlDownloadIos: urlI.input.value, codigoDonwloadDownloader: codigoDon.input.value, codigoNTDown: codigoNT.input.value,
              multiplosAcessos: mult.select.value === 'true', serverId: selServer.select.value
            });
          },
          onSave: async ()=> {
            const c = document.querySelector('#modals-root .modal-body'); const data = c._collectData();
            if (typeof data.multiplosAcessos !== 'boolean') throw new Error('Selecione true ou false para multiplosAcessos.');
            await MockAPI.createApp(data);
          },
          onDone: async ()=> render()
        });
      });
    });
  }

  window.AppsView = { render };
})();
