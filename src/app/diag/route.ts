/** Embed diagnostics: plain HTML (no React) to see what a host (e.g. Notion mobile) does with our iframe. */
export const dynamic = 'force-dynamic';

const html = `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Werba Way · діагностика</title>
<style>
body{margin:0;padding:16px;background:#FFF6C9;color:#1B2A4A;font:16px/1.5 -apple-system,system-ui,sans-serif}
h1{font-size:20px;margin:0 0 10px}.row{padding:6px 0;border-bottom:1px dashed #c9b97a}
.ok{color:#1d7a4f;font-weight:700}.no{color:#b23b28;font-weight:700}code{font-size:12px;word-break:break-all}
</style></head><body>
<h1>Werba Way — діагностика вбудовування</h1>
<div class="row"><span class="ok">1 ✓</span> HTML завантажився</div>
<div class="row" id="js"><span class="no">2 ✗</span> JavaScript не запустився</div>
<div id="out"></div>
<script>
(function(){
  var out=document.getElementById('out');
  function row(ok,label,val){var d=document.createElement('div');d.className='row';
    d.innerHTML='<span class="'+(ok?'ok':'no')+'">'+(ok?'✓':'✗')+'</span> '+label+(val?' — <code></code>':'');
    if(val) d.querySelector('code').textContent=val; out.appendChild(d);}
  document.getElementById('js').innerHTML='<span class="ok">2 ✓</span> JavaScript працює';
  var inFrame=false; try{inFrame=window.self!==window.top}catch(e){inFrame=true}
  row(true,'У рамці (iframe)',String(inFrame));
  var anc=''; try{anc=Array.prototype.join.call(location.ancestorOrigins||[],', ')}catch(e){}
  row(true,'Хто вбудовує', anc||document.referrer||'(невідомо)');
  row(true,'Пристрій', navigator.userAgent);
  row(true,'Розмір вікна', innerWidth+'×'+innerHeight);
  try{localStorage.setItem('wwdiag','1');localStorage.removeItem('wwdiag');row(true,'Сховище браузера')}catch(e){row(false,'Сховище браузера',String(e&&e.name))}
  try{document.cookie='wwdiag=1;SameSite=None;Secure';row(document.cookie.indexOf('wwdiag')>=0,'Cookies')}catch(e){row(false,'Cookies',String(e&&e.name))}
  try{row(String(location.origin)!=='null','Origin',String(location.origin))}catch(e){row(false,'Origin','?')}
  fetch('/api/mock-exam/pl-b1-probny-01').then(function(r){row(r.ok,'Запит до сервера','HTTP '+r.status)})
    .catch(function(e){row(false,'Запит до сервера',String(e))});
  window.addEventListener('error',function(e){ if(e.target===window) row(false,'Помилка JS',e.message)},true);
})();
</script>
</body></html>`;

export function GET() {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': 'frame-ancestors *',
    },
  });
}
