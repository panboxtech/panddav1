/* modal.js
   Gerencia janelas de formulário (cadastro/edição) reutilizáveis.
   Exporta: Modal.open({title, contentBuilder, onSave, initialData, roleRestriction})
   - contentBuilder(container, data, helpers) => monta inputs diretamente usando createElement e value bindings
   - onSave(data) => chamado ao salvar, deve retornar Promise
   Comentários explicam como adaptar para uso com Supabase.
*/

const Modal = (function(){
  const root = document.getElementById('modals-root');

  function createModalShell() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.tabIndex = -1;

    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('role','dialog');

    const header = document.createElement('div');
    header.style.display = 'flex'; header.style.justifyContent='space-between'; header.style.alignItems='center';
    const title = document.createElement('h3');
    const closeBtn = document.createElement('button'); closeBtn.className='icon-btn'; closeBtn.textContent='✕';

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body';

    const footer = document.createElement('div');
    footer.style.marginTop='12px'; footer.style.display='flex'; footer.style.justifyContent='flex-end'; footer.style.gap='8px';

    const saveBtn = document.createElement('button'); saveBtn.className='primary'; saveBtn.textContent='Salvar';
    const cancelBtn = document.createElement('button'); cancelBtn.className='flat-btn'; cancelBtn.textContent='Cancelar';
    const feedback = document.createElement('div'); feedback.className='feedback';

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    card.appendChild(feedback);
    overlay.appendChild(card);

    // Close handlers
    closeBtn.addEventListener('click', ()=> close(overlay));
    cancelBtn.addEventListener('click', ()=> close(overlay));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(overlay); });

    return { overlay, card, title, body, saveBtn, feedback };
  }

  function close(overlay) { root.innerHTML = ''; root.setAttribute('aria-hidden','true'); }

  /**
   * Abre um modal reusável.
   * options: { title, initialData, contentBuilder(container, data, helpers), onSave(data) => Promise }
   */
  function open(options) {
    const shell = createModalShell();
    root.appendChild(shell.overlay);
    root.setAttribute('aria-hidden','false');
    shell.title.textContent = options.title || 'Modal';

    // Helpers para o contentBuilder
    const helpers = {
      createInput({label, name, type='text', value='', required=false, attrs={}}){
        const wrap = document.createElement('label');
        wrap.style.display='block';
        wrap.style.marginTop='8px';
        wrap.textContent = label;
        const input = document.createElement('input');
        input.type = type;
        input.name = name;
        input.value = value ?? '';
        if(required) input.required = true;
        Object.entries(attrs).forEach(([k,v])=> input.setAttribute(k,v));
        input.style.display='block';
        input.style.width='100%';
        input.style.marginTop='4px';
        wrap.appendChild(input);
        return { wrap, input };
      },
      createSelect({label, name, options=[], value=null, required=false}){
        const wrap = document.createElement('label');
        wrap.style.display='block';
        wrap.style.marginTop='8px';
        wrap.textContent = label;
        const select = document.createElement('select');
        select.name = name;
        if(required) select.required = true;
        select.style.display='block';
        select.style.width='100%';
        select.style.marginTop='4px';
        const emptyOpt = document.createElement('option'); emptyOpt.value=''; emptyOpt.textContent='-- selecionar --';
        select.appendChild(emptyOpt);
        options.forEach(o=>{
          const opt = document.createElement('option'); opt.value = o.value; opt.textContent = o.label;
          select.appendChild(opt);
        });
        if(value) select.value = value;
        wrap.appendChild(select);
        return { wrap, select };
      }
    };

    // Monta o conteúdo
    if (typeof options.contentBuilder === 'function') {
      options.contentBuilder(shell.body, options.initialData || {}, helpers);
    } else {
      shell.body.textContent = 'Nenhum contentBuilder informado.';
    }

    // Save handler
    shell.saveBtn.addEventListener('click', async () => {
      shell.feedback.textContent = 'Salvando...';
      // Recolher dados dos inputs dentro do body
      const inputs = shell.body.querySelectorAll('input,select,textarea');
      const data = {};
      inputs.forEach(i => {
        if (i.type === 'checkbox') data[i.name] = i.checked;
        else data[i.name] = i.value;
      });
      try {
        if (options.onSave) {
          const res = await options.onSave(data);
          shell.feedback.textContent = 'Salvo com sucesso';
          setTimeout(()=> close(shell.overlay), 600);
          if (options.onDone) options.onDone(res);
        } else {
          shell.feedback.textContent = 'Nenhuma ação definida';
        }
      } catch (err) {
        shell.feedback.textContent = 'Erro: ' + err.message;
      }
    });
  }

  return { open, close };
})();
