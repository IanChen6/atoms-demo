export function demo(prompt: string, previous = '') {
  const kind = /计时|timer|番茄|专注/i.test(prompt)
    ? 'timer'
    : /笔记|记事|note/i.test(prompt)
      ? 'notes'
      : previous.includes('data-kind="notes"')
        ? 'notes'
        : previous.includes('data-kind="timer"')
          ? 'timer'
          : 'todo';
  const color = /绿|green/i.test(prompt)
    ? '#16806a'
    : /紫|purple/i.test(prompt)
      ? '#7955d9'
      : /红|red/i.test(prompt)
        ? '#d34959'
        : '#315efb';
  const dark = /深色|暗色|dark/i.test(prompt);
  const title =
    kind === 'timer'
      ? '留一点时间，给专注。'
      : kind === 'notes'
        ? '把灵感，留在这里。'
        : '今天，专注于重要的事。';
  const content =
    kind === 'timer'
      ? '<div class="timer" id="clock">25:00</div><div class="actions"><button id="start">开始专注</button><button id="reset" class="secondary">重置</button></div><p id="status">准备好后，开始你的 25 分钟。</p>'
      : '<form id="entry"><input id="text" required maxlength="300" placeholder="' +
        (kind === 'notes' ? '写下一个灵感…' : '添加一个新任务…') +
        '"><button>添加</button></form><input id="search" placeholder="搜索' +
        (kind === 'notes' ? '笔记' : '任务') +
        '…" aria-label="搜索"><div id="list"></div><p id="count"></p>';
  return (
    '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
    title +
    '</title><style>*{box-sizing:border-box}body{margin:0;background:' +
    (dark ? '#151b29' : '#f8faff') +
    ';color:' +
    (dark ? '#e7edf9' : '#24314c') +
    ';font:16px Arial,"PingFang SC",sans-serif}main{max-width:650px;margin:60px auto;padding:24px}small{color:' +
    color +
    ';letter-spacing:3px}h1{font-size:clamp(24px,5vw,36px);line-height:1.5;margin:24px 0 8px}.subtitle{color:#8893a5;margin-bottom:34px;line-height:1.8}form,.row,.actions{display:flex;gap:12px;align-items:center}input{border:1px solid #ccd5e5;background:transparent;color:inherit;padding:14px;border-radius:9px;font:inherit;min-width:0}form input{flex:1}button{border:0;background:' +
    color +
    ';color:white;padding:14px 18px;border-radius:9px;cursor:pointer;font:inherit}button.secondary{background:#dfe6f2;color:#324561}#search{width:100%;margin:20px 0 12px}.row{padding:17px 4px;border-bottom:1px solid #c9d1df55}.row span{flex:1;overflow-wrap:anywhere;white-space:pre-wrap}.row button{background:transparent;color:#8690a2;padding:5px}.row.done span{text-decoration:line-through;opacity:.5}#count,#status{color:#8791a3;font-size:14px;margin-top:24px}.timer{font-size:80px;font-variant-numeric:tabular-nums;margin:45px 0}.tag{border:1px solid #ccd5e5;border-radius:20px;padding:5px 10px;font-size:12px;color:#8893a5;float:right}@media(max-width:450px){main{margin:15px auto;padding:20px}.timer{font-size:64px}}</style></head><body data-kind="' +
    kind +
    '"><main><small>' +
    (kind === 'timer'
      ? 'FOCUS / TIME'
      : kind === 'notes'
        ? 'CAPTURE / IDEAS'
        : 'LESS / BUT BETTER') +
    '</small><span class="tag">交互示例</span><h1>' +
    title +
    '</h1><p class="subtitle">' +
    (kind === 'timer'
      ? '关掉干扰，留出一段属于自己的时间。'
      : kind === 'notes'
        ? '每一个值得记住的想法，都有自己的位置。'
        : '清空脑海中的待办，一次向前迈出一步。') +
    '</p>' +
    content +
    '</main><script>' +
    (kind === 'timer'
      ? `let remaining=1500,interval=null;const clock=document.getElementById('clock'),start=document.getElementById('start');function draw(){clock.textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0')}start.onclick=()=>{if(interval){clearInterval(interval);interval=null;start.textContent='继续专注'}else{start.textContent='暂停';document.getElementById('status').textContent='正在专注，每一分钟都算数。';interval=setInterval(()=>{remaining--;draw();if(remaining<=0){clearInterval(interval);interval=null;start.disabled=true;document.getElementById('status').textContent='完成了！休息一下吧。'}},1000)}};document.getElementById('reset').onclick=()=>{clearInterval(interval);interval=null;remaining=1500;start.disabled=false;start.textContent='开始专注';draw()};`
      : `let items=[];try{items=JSON.parse(localStorage.getItem('atom-demo-items')||'[]')}catch(e){}const list=document.getElementById('list'),input=document.getElementById('text'),search=document.getElementById('search');function save(){localStorage.setItem('atom-demo-items',JSON.stringify(items))}function draw(){list.replaceChildren();const filtered=items.filter(x=>x.text.toLowerCase().includes(search.value.toLowerCase()));for(const item of filtered){const row=document.createElement('div');row.className='row'+(item.done?' done':'');${kind === 'todo' ? `const check=document.createElement('input');check.type='checkbox';check.checked=item.done;check.setAttribute('aria-label','完成任务');check.onchange=()=>{item.done=check.checked;save();draw()};row.append(check);` : ''}const span=document.createElement('span');span.textContent=item.text;const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label','删除');del.onclick=()=>{items=items.filter(x=>x.id!==item.id);save();draw()};row.append(span,del);list.append(row)}document.getElementById('count').textContent=items.length?items.length+' 条记录 · 已自动保存':'还没有记录，添加第一条吧。'}document.getElementById('entry').onsubmit=e=>{e.preventDefault();if(!input.value.trim())return;items.unshift({id:Date.now()+Math.random(),text:input.value.trim(),done:false});input.value='';save();draw()};search.oninput=draw;draw();`) +
    '</script></body></html>'
  );
}
export function extractHtmlDocument(raw: string) {
  const source = raw.replaceAll(String.fromCharCode(0), '').trim();
  const htmlStart = source.search(/<html[\s>]/i);
  const htmlEnd = source.toLowerCase().lastIndexOf('</html>');
  if (htmlStart < 0 || htmlEnd < htmlStart) return null;
  const doctype = source.search(/<!doctype\s+html[^>]*>/i);
  const start = doctype >= 0 && doctype < htmlStart ? doctype : htmlStart;
  return source.slice(start, htmlEnd + 7).trim();
}

export function previewDocument(
  raw: string,
  initialStorage: Record<string, string> = {},
) {
  const html = extractHtmlDocument(raw) || raw;
  const serialized = JSON.stringify(initialStorage)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const bridge = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><script>(function(){var values=${serialized};function keys(){return Object.keys(values)}function persist(){parent.postMessage({source:'atom-preview',type:'storage',data:values},'*')}var store={get length(){return keys().length},key:function(i){return keys()[i]??null},getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(values,k)?values[k]:null},setItem:function(k,v){values[String(k)]=String(v);persist()},removeItem:function(k){delete values[String(k)];persist()},clear:function(){values={};persist()}};try{Object.defineProperty(window,'localStorage',{configurable:true,value:store})}catch(e){window.atomStorage=store}})();</script>`;
  const withoutDoctype = html.replace(/<!doctype[^>]*>/i, '');
  if (/<head[\s>]/i.test(withoutDoctype)) {
    return (
      '<!doctype html>' +
      withoutDoctype.replace(/<head([^>]*)>/i, `<head$1>${bridge}`)
    );
  }
  return (
    '<!doctype html>' +
    withoutDoctype.replace(/<html([^>]*)>/i, `<html$1><head>${bridge}</head>`)
  );
}
