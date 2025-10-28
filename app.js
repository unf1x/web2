(() => {
  const STORAGE_KEY = 'todo.lab.tasks.v1';
  const fmtDate = v => (v ? new Date(v).toISOString().slice(0, 10) : '');
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const state = { tasks: [], filter: 'all', sort: 'byDueAsc', query: '', dateFrom: '', dateTo: '' };

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

  (function addFavicon() {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
         <rect width="64" height="64" rx="12" fill="#7C3AED"/>
         <path d="M18 34l8 8 20-20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`;
    const link = document.createElement('link');
    link.rel = 'icon'; link.type = 'image/svg+xml';
    link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    document.head.appendChild(link);
  })();

  const style = document.createElement('style');
  style.textContent = `
:root{
  --bg:#F4F2F9; --panel:#FFFFFF; --ink:#0F172A; --muted:#475569; --line:#E3E0EF;
  --accent:#7C3AED; --accent-weak:#F3E8FF; --ok:#16A34A; --danger:#B91C1C;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font:14px/1.45 ui-sans-serif,system-ui,Inter,Segoe UI,Roboto,Arial}
#app{max-width:980px;margin:28px auto;padding:0 16px 24px}

header{display:flex;justify-content:space-between;align-items:end;margin-bottom:12px}
h1{margin:0;font-size:24px;font-weight:700}
.count{color:var(--muted);font-size:12.5px}

.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px}
.add{display:grid;grid-template-columns:1fr 160px 120px;gap:8px;padding:10px 12px;margin-bottom:10px}
.bar{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:10px 12px;margin-bottom:10px}
.chips{display:flex;gap:6px}
.chip{padding:6px 10px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--muted);cursor:pointer;transition:border-color .12s, background-color .12s, color .12s}
.chip:hover{border-color:var(--accent)}
.chip.active{border-color:var(--accent);background:var(--accent-weak);color:var(--accent)}

.tools-right{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.field,.select{padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink)}
.range{display:flex;gap:6px;align-items:center}
.range .field{width:140px}

.btn{padding:9px 12px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:#fff;font-weight:600;cursor:pointer}
.btn.ghost{background:#fff;color:var(--accent);border-color:var(--accent)}
.btn.icon{padding:5px 8px;background:#fff;color:#0F172A;border:1px solid var(--line)}
.btn.icon:hover{border-color:var(--accent)}
.btn.icon.edit{ color: var(--accent); border-color: var(--accent); background: var(--accent-weak); }
.btn.icon svg{ width:16px; height:16px; display:block; }

.list{padding:6px}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
li{display:grid;grid-template-columns:40px 1fr 160px 120px 110px;gap:8px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:8px;background:#fff}
li.dragging{outline:2px solid var(--accent);background:var(--accent-weak)}
.title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.done{color:#98A2B3;text-decoration:line-through}

input[type="checkbox"]{ width:16px; height:16px; accent-color: var(--accent); }

.status{display:inline-block;padding:3px 8px;border:1px solid var(--line);border-radius:999px;background:#F5F6FA}
.status.ok{background:#E9F8EE;border-color:#BFE8CF;color:#065F2B}

.empty{padding:16px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:8px;background:#fff}

@media(max-width:900px){ .bar{grid-template-columns:1fr} .tools-right{justify-content:stretch} }
@media(max-width:720px){
  .add{grid-template-columns:1fr 1fr}.add .btn{grid-column:span 2}
  li{grid-template-columns:32px 1fr;grid-auto-rows:auto}
  .range .field{width:100%}
}
`;
  document.head.appendChild(style);

  const app = document.createElement('div'); app.id = 'app'; document.body.appendChild(app);

  const header = document.createElement('header');
  const h1 = document.createElement('h1'); h1.textContent = 'To-Do';
  const count = document.createElement('div'); count.className = 'count'; count.textContent = '0 задач';
  header.append(h1, count);

  const add = document.createElement('form'); add.className = 'panel add'; add.setAttribute('autocomplete','off');
  const titleInput = Object.assign(document.createElement('input'), { className:'field', placeholder:'Новая задача…', required:true });
  const dateInput  = Object.assign(document.createElement('input'), { className:'field', type:'date' });
  const addBtn     = Object.assign(document.createElement('button'), { className:'btn', type:'submit' }); addBtn.textContent='Добавить';
  add.append(titleInput, dateInput, addBtn);

  const bar = document.createElement('section'); bar.className = 'panel bar';
  const chips = document.createElement('div'); chips.className = 'chips';
  const mkChip = (label,val) => { const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=label; b.dataset.value=val; b.addEventListener('click',()=>{state.filter=val; render();}); return b; };
  const chipAll = mkChip('Все','all'), chipAct = mkChip('Активные','active'), chipDone = mkChip('Выполненные','completed');
  chips.append(chipAll, chipAct, chipDone);

  const toolsRight = document.createElement('div'); toolsRight.className = 'tools-right';
  const searchInput = Object.assign(document.createElement('input'), { className:'field', placeholder:'Поиск: название или дата (ГГГГ-ММ-ДД)…' });

  const range = document.createElement('div'); range.className = 'range';
  const labFrom = document.createElement('label'); labFrom.textContent = 'С';
  const fromInput = Object.assign(document.createElement('input'), { className:'field', type:'date' });
  const labTo = document.createElement('label'); labTo.textContent = 'По';
  const toInput = Object.assign(document.createElement('input'), { className:'field', type:'date' });
  const clearRange = document.createElement('button'); clearRange.type='button'; clearRange.className='btn ghost'; clearRange.textContent='Сбросить даты';
  clearRange.addEventListener('click',()=>{ fromInput.value=''; toInput.value=''; state.dateFrom=''; state.dateTo=''; render(); });
  range.append(labFrom, fromInput, labTo, toInput, clearRange);

  const sortSelect = Object.assign(document.createElement('select'), { className:'select' });
  [{value:'byDueAsc',label:'Сначала ближайшие'},
   {value:'byDueDesc',label:'Сначала дальние'},
   {value:'byCreatedDesc',label:'Сначала новые'}]
    .forEach(o=>{ const opt=document.createElement('option'); opt.value=o.value; opt.textContent=o.label; sortSelect.appendChild(opt); });

  toolsRight.append(searchInput, range, sortSelect);
  const spacer = document.createElement('div');
  bar.append(chips, spacer, toolsRight);

  const list = document.createElement('section'); list.className = 'panel list';
  const ul = document.createElement('ul'); list.append(ul);

  app.append(header, add, bar, list);

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
      if(state.sort==='byDueAsc'){
        const ad=a.due||'', bd=b.due||'';
        if(ad&&bd&&ad!==bd) return ad.localeCompare(bd);
        if(ad&&!bd) return -1; if(!ad&&bd) return 1;
        return a.order - b.order;
      }
      if(state.sort==='byDueDesc'){
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

      const bEdit=document.createElement('button'); bEdit.className='btn icon edit'; bEdit.title='Редактировать';
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
      svg.append(p1,p2); bEdit.append(svg);
      bEdit.addEventListener('click',()=>editTask(task.id));

      const bDel=document.createElement('button'); bDel.className='btn icon'; bDel.title='Удалить';
      bDel.append(document.createTextNode('🗑️'));
      bDel.addEventListener('click',()=>{ if(confirm('Удалить задачу?')){ state.tasks = state.tasks.filter(t=>t.id!==task.id); normalizeOrder(); render(); }});

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
    save(); render();
  }

  add.addEventListener('submit', e => {
    e.preventDefault();
    const title = titleInput.value.trim(); if(!title) return;
    state.tasks.push({ id: uid(), title, due: dateInput.value || '', completed:false, createdAt:new Date().toISOString(), order: state.tasks.length });
    normalizeOrder(); titleInput.value=''; dateInput.value=''; render();
  });

  function editTask(id){
    const t=state.tasks.find(x=>x.id===id); if(!t) return;
    const nt=prompt('Изменить название задачи:', t.title) ?? t.title;
    let nd=t.due;
    if(confirm('Изменить дату? «ОК» — ввести новую, «Отмена» — оставить как есть.')){
      const d=prompt('Дата ГГГГ-ММ-ДД (пусто — без срока):', fmtDate(t.due));
      if(d===''||/^\d{4}-\d{2}-\d{2}$/.test(d)) nd=d||''; else alert('Некорректная дата, оставляю прежнюю.');
    }
    t.title = String(nt).trim() || t.title;
    t.due = nd;
    save(); render();
  }

  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; render(); });
  searchInput.addEventListener('input', debounce(() => { state.query = searchInput.value; render(); }, 200));
  fromInput.addEventListener('change', () => { state.dateFrom = fromInput.value; render(); });
  toInput.addEventListener('change',   () => { state.dateTo   = toInput.value;   render(); });

  load(); normalizeOrder(); render();
})();
