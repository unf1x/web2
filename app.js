(() => {
  (function addFavicon() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="12" fill="#7C3AED"/>
      <path d="M18 34l8 8 20-20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
    document.head.appendChild(link);
  })();

  const style = document.createElement('style');
  style.textContent = `
:root{--bg:#F4F2F9;--panel:#FFFFFF;--ink:#0F172A;--muted:#475569;--line:#E3E0EF;--accent:#7C3AED;--radius:10px}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font:14px/1.45 ui-sans-serif,system-ui,Inter,Segoe UI,Roboto,Arial}
#app{max-width:980px;margin:28px auto;padding:0 16px 24px}
header{display:flex;justify-content:space-between;align-items:end;margin-bottom:12px}
h1{margin:0;font-size:24px;font-weight:700}
.count{color:var(--muted);font-size:12.5px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius)}
`;
  document.head.appendChild(style);

  const app = document.createElement('div'); app.id = 'app'; document.body.appendChild(app);
  const header = document.createElement('header');
  const h1 = document.createElement('h1'); h1.textContent = 'To-Do';
  const count = document.createElement('div'); count.className = 'count'; count.textContent = '0 задач';
  header.append(h1, count);
  app.append(header);
})();
