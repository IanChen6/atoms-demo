export function extractHtmlDocument(raw: string) {
  const source = raw.replaceAll(String.fromCharCode(0), '').trim();
  const htmlStart = source.search(/<html[\s>]/i);
  const htmlEnd = source.toLowerCase().lastIndexOf('</html>');
  if (htmlStart < 0 || htmlEnd < htmlStart) return null;
  const doctype = source.search(/<!doctype\s+html[^>]*>/i);
  const start = doctype >= 0 && doctype < htmlStart ? doctype : htmlStart;
  return source.slice(start, htmlEnd + 7).trim();
}

function decodedText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function applicationGuide(raw: string) {
  const html = extractHtmlDocument(raw) || raw;
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const headingMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const name =
    decodedText(titleMatch?.[1] || headingMatch?.[1] || '') || '未命名应用';
  const visible = decodedText(html).slice(0, 3000);
  const capabilities: string[] = [];
  if (/待办|任务|todo/i.test(visible)) capabilities.push('管理任务与完成状态');
  if (/笔记|记录|note/i.test(visible)) capabilities.push('记录和整理内容');
  if (/搜索|筛选|search/i.test(visible)) capabilities.push('搜索或筛选信息');
  if (/计时|倒计时|timer|专注/i.test(visible))
    capabilities.push('运行计时流程');
  if (/登录|注册|sign in|log in/i.test(visible))
    capabilities.push('完成账号操作');
  if (/图表|仪表盘|dashboard|数据/i.test(visible))
    capabilities.push('查看数据概览');
  if (/游戏|得分|分数|game/i.test(visible)) capabilities.push('进行互动体验');
  const introduction = capabilities.length
    ? `${name}是一款可在浏览器中直接使用的应用，支持${capabilities.slice(0, 3).join('、')}。`
    : `${name}是一款可在浏览器中直接使用的交互式单页应用。`;
  const instructions: string[] = [];
  if (/<input|<textarea|contenteditable/i.test(html))
    instructions.push('在页面输入区域填写内容，再使用对应操作按钮提交。');
  if (/<button/i.test(html))
    instructions.push('按照按钮文字完成主要操作，页面会即时反馈结果。');
  if (/localStorage/i.test(html))
    instructions.push('应用数据会自动保存，刷新页面后仍可继续使用。');
  if (!instructions.length)
    instructions.push('打开应用后，按照页面中的提示完成主要操作。');
  return { name, introduction, instructions };
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
  const bridge = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><style id="atom-select-style">.atom-selecting *{cursor:crosshair!important}.atom-selection-hover{outline:2px solid #315efb!important;outline-offset:2px!important}.atom-selection-picked{outline:3px solid #315efb!important;outline-offset:3px!important}</style><script>(function(){var values=${serialized},selecting=false,hovered=null,picked=null;function keys(){return Object.keys(values)}function persist(){parent.postMessage({source:'atom-preview',type:'storage',data:values},'*')}var store={get length(){return keys().length},key:function(i){return keys()[i]??null},getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(values,k)?values[k]:null},setItem:function(k,v){values[String(k)]=String(v);persist()},removeItem:function(k){delete values[String(k)];persist()},clear:function(){values={};persist()}};try{Object.defineProperty(window,'localStorage',{configurable:true,value:store})}catch(e){window.atomStorage=store}function clearHover(){if(hovered)hovered.classList.remove('atom-selection-hover');hovered=null}function pathFor(el){var parts=[];while(el&&el!==document.body&&parts.length<5){var part=el.tagName.toLowerCase();if(el.id){part+='#'+el.id;parts.unshift(part);break}if(el.classList.length)part+='.'+Array.from(el.classList).filter(function(x){return !x.startsWith('atom-selection')}).slice(0,2).join('.');parts.unshift(part);el=el.parentElement}return ['body'].concat(parts).join(' > ')}window.addEventListener('message',function(event){if(!event.data||event.data.source!=='atom-studio'||event.data.type!=='selection-mode')return;selecting=!!event.data.enabled;document.documentElement.classList.toggle('atom-selecting',selecting);if(!selecting)clearHover()});document.addEventListener('mouseover',function(event){if(!selecting)return;clearHover();hovered=event.target;hovered.classList.add('atom-selection-hover')},true);document.addEventListener('mouseout',function(){if(selecting)clearHover()},true);document.addEventListener('click',function(event){if(!selecting)return;event.preventDefault();event.stopPropagation();clearHover();if(picked)picked.classList.remove('atom-selection-picked');picked=event.target;picked.classList.add('atom-selection-picked');parent.postMessage({source:'atom-preview',type:'selection',data:{tag:picked.tagName.toLowerCase(),id:picked.id||'',classes:Array.from(picked.classList).filter(function(x){return !x.startsWith('atom-selection')}).join(' '),text:(picked.innerText||picked.textContent||'').trim().slice(0,160),path:pathFor(picked)}},'*')},true)})();</script>`;
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
