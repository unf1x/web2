(() => {
  const STORAGE_KEY = 'todo.lab.tasks.v1';
  const fmtDate = v => (v ? new Date(v).toISOString().slice(0, 10) : '');
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    function el(tag, { className = '', attrs = {}, text = '', on = {} } = {}) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text) node.textContent = text;
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      for (const [event, handler] of Object.entries(on)) node.addEventListener(event, handler);
      return node;
    }

    function createButton({ text = '', className = '', type = 'button', onClick } = {}) {
      const btn = el('button', { className, text, attrs: { type } });
      if (onClick) btn.addEventListener('click', onClick);
      return btn;
    }

  const state = { tasks: [], filter: 'all', sort: 'byOrder', query: '', dateFrom: '', dateTo: '' };

  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  const load = () => {
    try { state.tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || []; }
    catch { state.tasks = []; }
  };
  const normalizeOrder = () => {
    state.tasks
      .sort((a, b) => a.order - b.order || new Date(a.createdAt) - new Date(b.createdAt))
      .forEach((t, i) => (t.order = i));
    save();
  };

  function buildLogo(){
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.classList.add('brand-logo');

    const rect=document.createElementNS(ns,'rect');
    rect.setAttribute('x','0'); rect.setAttribute('y','0');
    rect.setAttribute('width','24'); rect.setAttribute('height','24');
    rect.setAttribute('rx','6'); rect.setAttribute('fill','var(--accent)');

    const tick=document.createElementNS(ns,'path');
    tick.setAttribute('d','M6 12l4 4 8-8');
    tick.setAttribute('fill','none');
    tick.setAttribute('stroke','#fff');
    tick.setAttribute('stroke-width','2');
    tick.setAttribute('stroke-linecap','round');
    tick.setAttribute('stroke-linejoin','round');

    svg.append(rect,tick);
    return svg;
  }


  const app = document.createElement('div'); app.id = 'app'; document.body.appendChild(app);

    const header = document.createElement('header');

    const brand = document.createElement('div');
    brand.className = 'brand';
    const h1 = document.createElement('h1');
    h1.textContent = 'To-Do';
    brand.append(buildLogo(), h1);

    const count = document.createElement('div');
    count.className = 'count';
    count.textContent = '0 задач';

    header.append(brand, count);


  const add = document.createElement('form'); add.className = 'panel add'; add.setAttribute('autocomplete','off');
  const titleInput = Object.assign(document.createElement('input'), { className:'field', placeholder:'Новая задача…', required:true });
  const dateInput  = Object.assign(document.createElement('input'), { className:'field', type:'date' });
  const addBtn = createButton({ text: 'Добавить', className: 'btn', type: 'submit' });
  add.append(titleInput, dateInput, addBtn);

  const bar = document.createElement('section'); bar.className = 'panel bar';
  const chips = document.createElement('div'); chips.className = 'chips';
  const mkChip = (label, val) => {
    const b = createButton({
      text: label,
      className: 'chip',
      onClick: () => { state.filter = val; render(); }
    });
    b.dataset.value = val;
    return b;
  };

  const chipAll = mkChip('Все','all'), chipAct = mkChip('Активные','active'), chipDone = mkChip('Выполненные','completed');
  chips.append(chipAll, chipAct, chipDone);

  const toolsRight = document.createElement('div'); toolsRight.className = 'tools-right';
  const searchInput = Object.assign(document.createElement('input'), { className:'field', placeholder:'Поиск: название или дата (ГГГГ-ММ-ДД)…' });

  const range = document.createElement('div'); range.className = 'range';
  const labFrom = document.createElement('label'); labFrom.textContent = 'С';
  const fromInput = Object.assign(document.createElement('input'), { className:'field', type:'date' });
  const labTo = document.createElement('label'); labTo.textContent = 'По';
  const toInput = Object.assign(document.createElement('input'), { className:'field', type:'date' });
  const clearRange = createButton({
    text: 'Сбросить даты',
    className: 'btn ghost',
    onClick: () => {
      fromInput.value=''; toInput.value='';
      state.dateFrom=''; state.dateTo='';
      render();
    }
  });
  range.append(labFrom, fromInput, labTo, toInput, clearRange);

  const sortSelect = Object.assign(document.createElement('select'), { className:'select' });
  [{value:'byOrder',label:'Вручную'},
   {value:'byDueAsc',label:'Сначала ближайшие'},
   {value:'byDueDesc',label:'Сначала дальние'},
   {value:'byCreatedDesc',label:'Сначала новые'}]
    .forEach(o=>{ const opt=document.createElement('option'); opt.value=o.value; opt.textContent=o.label; sortSelect.appendChild(opt); });

  toolsRight.append(searchInput, range, sortSelect);
  const spacer = document.createElement('div');
  bar.append(chips, spacer, toolsRight);

  const list = document.createElement('section'); list.className = 'panel list';
  const ul = document.createElement('ul'); list.append(ul);

  app.append(header, add, bar, list);
  function openModal({ title = '', bodyBuilder, onSubmit, submitText = 'Сохранить', cancelText = 'Отмена' }) {
    const backdrop = el('div', { className: 'modal-backdrop' });
    const modal = el('div', { className: 'modal', attrs: { role:'dialog','aria-modal':'true' } });

    const h = document.createElement('header');
    const h2 = el('h2', { text: title });
    const xBtn = createButton({ text:'✕', className:'btn icon', onClick: close });
    xBtn.setAttribute('aria-label','Закрыть');
    h.append(h2, xBtn);

    const body = el('div', { className:'body' });
    const ctx = bodyBuilder(body);

    const f = document.createElement('footer');
    const cancel = createButton({ text: cancelText, className:'btn ghost', onClick: close });
    const ok = createButton({ text: submitText, className:'btn', onClick: submit });
    f.append(cancel, ok);

    modal.append(h, body, f);
    backdrop.append(modal);
    document.body.append(backdrop);

    function submit(){
      if (onSubmit) {
        const ok = onSubmit(ctx);
        if (ok === false) return;
      }
      close();
    }
    function close(){ backdrop.remove(); }

    backdrop.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); submit(); }
    });
    setTimeout(() => {
      const first = body.querySelector('input,button,select,textarea');
      (first || ok).focus();
    }, 0);
    return { close };
  }

  function openEditTask(taskId){
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    openModal({
      title: 'Редактирование задачи',
      submitText: 'Сохранить',
      bodyBuilder(container){
        const row1 = el('div', { className:'row' });
        const l1 = el('label', { text:'Название' });
        const title = el('input', { className:'field', attrs:{ value: t.title || '', placeholder:'Название…' } });
        row1.append(l1, title);

        const row2 = el('div', { className:'row' });
        const l2 = el('label', { text:'Дата (ГГГГ-ММ-ДД, опционально)' });
        const date = el('input', { className:'field', attrs:{ type:'date', value: fmtDate(t.due) } });
        const error = el('div', { className:'error', text:'' });
        row2.append(l2, date, error);

        container.append(row1, row2);
        return { title, date, error };
      },
      onSubmit({ title, date, error }){
        const newTitle = (title.value || '').trim();
        const d = (date.value || '').trim();
        if (!newTitle) { error.textContent = 'Название не может быть пустым.'; title.focus(); return false; }
        if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) { error.textContent = 'Некорректная дата. Формат: ГГГГ-ММ-ДД.'; date.focus(); return false; }
        t.title = newTitle; t.due = d || '';
        save(); render();
      }
    });
  }

  function openDeleteConfirm(taskId){
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    openModal({
      title: 'Удаление задачи',
      submitText: 'Удалить',
      cancelText: 'Отмена',
      bodyBuilder(container){
        const row = el('div', { className:'row' });
        row.append(el('div', { text:`Удалить «${t.title || 'без названия'}»?` }));
        container.append(row);
        return {};
      },
      onSubmit(){
        state.tasks = state.tasks.filter(x => x.id !== taskId);
        normalizeOrder(); render();
      }
    });
  }


  const setCount = n => { count.textContent = `${n} задач`; };

  function render(){
    [...chips.children].forEach(c=>c.classList.toggle('active', c.dataset.value === state.filter));
    sortSelect.value = state.sort;

    let items = [...state.tasks];

    if(state.filter==='active') items = items.filter(t=>!t.completed);
    if(state.filter==='completed') items = items.filter(t=>t.completed);

    const df = state.dateFrom || '', dt = state.dateTo || '';
    if(df) items = items.filter(t => t.due && fmtDate(t.due) >= df);
    if(dt) items = items.filter(t => t.due && fmtDate(t.due) <= dt);

    const q = (state.query||'').trim().toLowerCase();
    if(q) items = items.filter(t => (t.title||'').toLowerCase().includes(q) || (t.due && fmtDate(t.due).includes(q)));

    items.sort((a,b)=>{
      if (state.sort === 'byOrder') {
        return a.order - b.order;
      }
      if (state.sort === 'byDueAsc') {
        const ad=a.due||'', bd=b.due||'';
        if(ad&&bd&&ad!==bd) return ad.localeCompare(bd);
        if(ad&&!bd) return -1; if(!ad&&bd) return 1;
        return a.order - b.order;
      }
      if (state.sort === 'byDueDesc') {
        const ad=a.due||'', bd=b.due||'';
        if(ad&&bd&&ad!==bd) return bd.localeCompare(ad);
        if(ad&&!bd) return -1; if(!ad&&bd) return 1;
        return b.order - a.order;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    while (ul.firstChild) ul.removeChild(ul.firstChild);

    if(!items.length){
      const empty = document.createElement('div'); empty.className='empty';
      empty.textContent = (q||df||dt||state.filter!=='all') ? 'Нет задач по заданным условиям.' : 'Пока нет задач. Добавьте первую!';
      ul.append(empty); setCount(0); return;
    }
    setCount(items.length);

    items.forEach(task=>{
      const li=document.createElement('li'); li.dataset.id=task.id; li.draggable=true;

      li.addEventListener('dragstart', onDragStart);
      li.addEventListener('dragend', onDragEnd);
      li.addEventListener('dragover', onDragOver);
      li.addEventListener('drop', onDrop);

      const c0=document.createElement('div');
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=task.completed;
      cb.addEventListener('change',()=>{ task.completed=cb.checked; save(); render(); });
      c0.append(cb);

      const c1=document.createElement('div'); c1.className='title';
      c1.textContent = task.title || '(без названия)'; if(task.completed) c1.classList.add('done');

      const c2=document.createElement('div'); c2.textContent = task.due ? fmtDate(task.due) : '—';

      const c3=document.createElement('div');
      const badge=document.createElement('span'); badge.className='status'+(task.completed?' ok':''); badge.textContent=task.completed?'Готово':'В работе';
      c3.append(badge);

      const c4=document.createElement('div'); c4.className='actions';

      const bEdit = createButton({
        className: 'btn icon edit',
        onClick: () => editTask(task.id)
      });
      bEdit.title = 'Редактировать';
      const svgNS='http://www.w3.org/2000/svg';
      const svg=document.createElementNS(svgNS,'svg');
      svg.setAttribute('viewBox','0 0 24 24');
      svg.setAttribute('fill','none');
      svg.setAttribute('stroke','currentColor');
      svg.setAttribute('stroke-width','2');
      svg.setAttribute('stroke-linecap','round');
      svg.setAttribute('stroke-linejoin','round');
      const p1=document.createElementNS(svgNS,'path'); p1.setAttribute('d','M12 20h9');
      const p2=document.createElementNS(svgNS,'path'); p2.setAttribute('d','M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z');
      svg.append(p1,p2);
      bEdit.append(svg);

      const bDel = createButton({
        className: 'btn icon',
        onClick: () => openDeleteConfirm(task.id)
      });
      bDel.title = 'Удалить';
      bDel.append(document.createTextNode('🗑️'));



      c4.append(bEdit,bDel);

      li.append(c0,c1,c2,c3,c4); ul.append(li);
    });
  }

  function onDragStart(e){ e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; }
  function onDragEnd(e){ e.currentTarget.classList.remove('dragging'); }

  function onDragOver(e){
    e.preventDefault();
    const over=e.currentTarget;
    const dragging=[...ul.children].find(x=>x.classList && x.classList.contains('dragging'));
    if(!dragging || over===dragging) return;
    const r=over.getBoundingClientRect();
    const before=(e.clientY - r.top) < r.height/2;
    ul.insertBefore(dragging, before?over:over.nextSibling);
  }
  function onDrop(){
    [...ul.children].forEach((li,i)=>{
      const t=state.tasks.find(x=>x.id===li.dataset.id);
      if(t) t.order=i;
    });
    save();
    state.sort = 'byOrder';
    render();
  }

  add.addEventListener('submit', e => {
    e.preventDefault();
    const title = titleInput.value.trim(); if(!title) return;
    state.tasks.push({ id: uid(), title, due: dateInput.value || '', completed:false, createdAt:new Date().toISOString(), order: state.tasks.length });
    normalizeOrder(); titleInput.value=''; dateInput.value=''; render();
  });

 function editTask(id){ openEditTask(id); }

  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; render(); });
  searchInput.addEventListener('input', debounce(() => { state.query = searchInput.value; render(); }, 200));
  fromInput.addEventListener('change', () => { state.dateFrom = fromInput.value; render(); });
  toInput.addEventListener('change',   () => { state.dateTo   = toInput.value;   render(); });

  load(); normalizeOrder(); render();
})();
