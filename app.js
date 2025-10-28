(() => {
  const STORAGE_KEY='todo.lab.tasks.v1';
  const fmtDate=v=>v?new Date(v).toISOString().slice(0,10):'';
  const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
  const debounce=(fn,ms=250)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};
  const state={tasks:[],filter:'all',query:''};
  const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state.tasks));
  const load=()=>{try{state.tasks=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')||[]}catch{state.tasks=[];}};

  (function addFavicon(){
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#7C3AED"/><path d="M18 34l8 8 20-20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const link=document.createElement('link'); link.rel='icon'; link.type='image/svg+xml'; link.href='data:image/svg+xml,'+encodeURIComponent(svg); document.head.appendChild(link);
  })();

  const style=document.createElement('style'); style.textContent=`
:root{--bg:#F4F2F9;--panel:#fff;--ink:#0F172A;--muted:#475569;--line:#E3E0EF;--accent:#7C3AED;--accent-weak:#F3E8FF}
*{box-sizing:border-box} html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font:14px/1.45 ui-sans-serif,system-ui,Inter}
#app{max-width:980px;margin:28px auto;padding:0 16px 24px}
.panel{background:#fff;border:1px solid var(--line);border-radius:10px}
.add{display:grid;grid-template-columns:1fr 160px 120px;gap:8px;padding:10px 12px;margin-bottom:10px}
.bar{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;padding:10px 12px;margin-bottom:10px}
.chips{display:flex;gap:6px}
.chip{padding:6px 10px;border:1px solid var(--line);border-radius:999px;background:#fff;color:#475569;cursor:pointer}
.chip.active{border-color:var(--accent);background:var(--accent-weak);color:var(--accent)}
.field{padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:#fff}
.list{padding:6px}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
li{display:grid;grid-template-columns:40px 1fr 160px 120px 110px;gap:8px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:8px;background:#fff}
.title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.done{color:#98A2B3;text-decoration:line-through}
.status{display:inline-block;padding:3px 8px;border:1px solid var(--line);border-radius:999px;background:#F5F6FA}
.status.ok{background:#E9F8EE;border-color:#BFE8CF;color:#065F2B}
.btn{padding:9px 12px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:#fff}
.btn.icon{padding:5px 8px;background:#fff;color:#0F172A;border:1px solid var(--line)}
`;
  document.head.appendChild(style);

  const app=document.createElement('div'); app.id='app'; document.body.appendChild(app);

  const add=document.createElement('form'); add.className='panel add'; add.setAttribute('autocomplete','off');
  const titleInput=Object.assign(document.createElement('input'),{className:'field',placeholder:'Новая задача…',required:true});
  const dateInput=Object.assign(document.createElement('input'),{className:'field',type:'date'});
  const addBtn=Object.assign(document.createElement('button'),{className:'btn',type:'submit'}); addBtn.textContent='Добавить';
  add.append(titleInput,dateInput,addBtn);

  const bar=document.createElement('section'); bar.className='panel bar';
  const chips=document.createElement('div'); chips.className='chips';
  const mkChip=(label,val)=>{const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=label; b.dataset.value=val; b.addEventListener('click',()=>{state.filter=val;render();}); return b;};
  const chipAll=mkChip('Все','all'), chipAct=mkChip('Активные','active'), chipDone=mkChip('Выполненные','completed');
  chips.append(chipAll,chipAct,chipDone);
  const searchWrap=document.createElement('div');
  const searchInput=Object.assign(document.createElement('input'),{className:'field',placeholder:'Поиск по названию…'});
  searchWrap.append(searchInput);
  bar.append(chips, searchWrap);

  const list=document.createElement('section'); list.className='panel list';
  const ul=document.createElement('ul'); list.append(ul);

  app.append(add,bar,list);

  function render(){
    [...chips.children].forEach(c=>c.classList.toggle('active',c.dataset.value===state.filter));
    let items=[...state.tasks];
    if(state.filter==='active') items=items.filter(t=>!t.completed);
    if(state.filter==='completed') items=items.filter(t=>t.completed);

    const q=(state.query||'').trim().toLowerCase();
    if(q) items=items.filter(t=>(t.title||'').toLowerCase().includes(q));

    while(ul.firstChild) ul.removeChild(ul.firstChild);
    items.forEach(task=>{
      const li=document.createElement('li');

      const c0=document.createElement('div');
      const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=task.completed;
      cb.addEventListener('change',()=>{task.completed=cb.checked;save();render();});
      c0.append(cb);

      const c1=document.createElement('div'); c1.className='title';
      c1.textContent=task.title||'(без названия)'; if(task.completed) c1.classList.add('done');

      const c2=document.createElement('div'); c2.textContent=task.due?fmtDate(task.due):'—';

      const c3=document.createElement('div');
      const badge=document.createElement('span'); badge.className='status'+(task.completed?' ok':''); badge.textContent=task.completed?'Готово':'В работе';
      c3.append(badge);

      const c4=document.createElement('div');
      const bEdit=document.createElement('button'); bEdit.className='btn icon'; bEdit.title='Редактировать'; bEdit.append(document.createTextNode('✏️'));
      bEdit.addEventListener('click',()=>editTask(task.id));
      const bDel=document.createElement('button'); bDel.className='btn icon'; bDel.title='Удалить'; bDel.append(document.createTextNode('🗑️'));
      bDel.addEventListener('click',()=>{ if(confirm('Удалить задачу?')){ state.tasks=state.tasks.filter(t=>t.id!==task.id); save(); render(); }});
      c4.append(bEdit,bDel);

      li.append(c0,c1,c2,c3,c4); ul.append(li);
    });
  }

  function editTask(id){
    const t=state.tasks.find(x=>x.id===id); if(!t) return;
    const nt=prompt('Изменить название задачи:',t.title)??t.title;
    let nd=t.due;
    if(confirm('Изменить дату? «ОК» — ввести новую, «Отмена» — оставить как есть.')){
      const d=prompt('Дата ГГГГ-ММ-ДД (пусто — без срока):',fmtDate(t.due));
      if(d===''||/^\d{4}-\d{2}-\d{2}$/.test(d)) nd=d||''; else alert('Некорректная дата, оставляю прежнюю.');
    }
    t.title=String(nt).trim()||t.title; t.due=nd; save(); render();
  }

  add.addEventListener('submit',e=>{
    e.preventDefault();
    const title=titleInput.value.trim(); if(!title) return;
    state.tasks.push({id:uid(),title,due:dateInput.value||'',completed:false,createdAt:new Date().toISOString(),order:state.tasks.length});
    save(); titleInput.value=''; dateInput.value=''; render();
  });
  searchInput.addEventListener('input', debounce(()=>{ state.query = searchInput.value; render(); },200));

  load(); render();
})();
