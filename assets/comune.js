/* Iz občine / Dal Comune — voci dell'albo pretorio e notizie del Comune, aggiornate ogni notte (assets/comune.json). */
(()=>{'use strict';
const T=(sl,it)=>`<span data-l="sl" lang="sl">${sl}</span><span data-l="it" lang="it">${it}</span>`;
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CAT={viabilita:['Promet','Viabilità','road'],lavori:['Javna dela','Lavori pubblici','tool'],avvisi:['Obvestila in razpisi','Avvisi e bandi','bell'],
  bp:['Participativni proračun','Bilancio partecipativo','euro'],eventi:['Dogodki','Eventi','calendar']};
const fmt=d=>{if(!d)return'';const[y,m,g]=d.split('-');return `${+g}. ${+m}. ${y}`;};
const today=()=>new Date().toISOString().slice(0,10);
const base=()=>{const s=document.currentScript||[...document.scripts].find(x=>/comune\.js/.test(x.src));return s?s.src.replace(/assets\/comune\.js.*$/,''):'';};
const BASE=base();
let DATA=null;
async function load(){
  if(DATA)return DATA;
  const r=await fetch(BASE+'assets/comune.json',{cache:'no-cache'});
  if(!r.ok)throw new Error(r.status);
  DATA=await r.json();
  const t=today();
  DATA.items=[...(DATA.albo||[]).filter(x=>!x.until||x.until>=t),...(DATA.rss||[])].sort((a,b)=>b.date.localeCompare(a.date));
  return DATA;
}
function vasLabel(ids){
  const C=window.KS_CONS||{};
  if(!ids||!ids.length)return T('Vsa občina','Tutto il Comune');
  return ids.map(i=>C[i]?T(esc(C[i].ssl),esc(C[i].sit)):i).join(', ');
}
function card(x,opt){
  const c=CAT[x.cat]||CAT.avvisi;
  const sl=x.sl||x.it, it=x.it||x.sl;
  const doc=x.src==='albo'?`${T(esc(x.tipo_sl),esc(x.tipo_it))}${x.num?' '+T('št.','n.')+' '+esc(x.num):''}`:T('Novica Občine','Notizia del Comune');
  const until=x.until?` · ${T('objavljeno do','pubblicato fino al')} ${fmt(x.until)}`:'';
  const src=x.src==='albo'?T('Oglasna deska Občine','Albo pretorio del Comune'):T('Spletna stran Občine','Sito del Comune');
  return `<article class="cm-item cm-${x.cat}">
 <div class="cm-top"><span class="cm-chip">${T(c[0],c[1])}</span>${opt.showVas===false?'':`<span class="cm-vas">${vasLabel(x.svet)}</span>`}<time datetime="${x.date}">${fmt(x.date)}</time></div>
 <p class="cm-t">${T(esc(sl),esc(it))}</p>
 <p class="cm-meta">${doc}${until} · <a href="${esc(x.url)}" target="_blank" rel="noopener">${src} ↗</a></p>
</article>`;
}
function empty(msg){return `<p class="cm-empty">${msg}</p>`;}
function errBox(el,fn){el.innerHTML=`<p class="cm-empty">${T('Podatkov Občine trenutno ni mogoče naložiti.','Al momento non è possibile caricare i dati del Comune.')} <button type="button" class="btn ghost sm">${T('Poskusi znova','Riprova')}</button></p>`;el.querySelector('button').onclick=fn;}
function stamp(d){const s=d.stato||{};const a=(s.albo||{}).aggiornato||(s.rss||{}).aggiornato;return a?`<p class="cm-stamp">${T('Samodejno posodobljeno','Aggiornato automaticamente il')} ${fmt(a)} · ${T('vir','fonte')}: ${T('Občina Dolina','Comune di San Dorligo della Valle')}</p>`:'';}

/* Home: ultime voci con filtri */
async function home(el,opt={}){
  try{const d=await load();
    const lim=opt.limit||6, recent=new Date(Date.now()-75*864e5).toISOString().slice(0,10);
    const all=d.items.filter(x=>x.cat!=='eventi'&&(x.src==='albo'||x.date>=recent));
    const cats=['vse','viabilita','lavori','avvisi','bp'].filter(k=>k==='vse'||all.some(x=>x.cat===k));
    let cur='vse',more=false;
    const draw=()=>{const L=all.filter(x=>cur==='vse'||x.cat===cur);const shown=more?L:L.slice(0,lim);
      el.innerHTML=`<div class="cm-filt" role="tablist">${cats.map(k=>`<button type="button" role="tab" aria-selected="${k===cur}" data-k="${k}">${k==='vse'?T('Vse','Tutto'):T(CAT[k][0],CAT[k][1])}</button>`).join('')}</div>
<div class="cm-list">${shown.map(x=>card(x,{})).join('')||empty(T('Trenutno ni objav.','Nessuna voce al momento.'))}</div>
${L.length>lim&&!more?`<p><button type="button" class="btn ghost sm cm-more">${T('Pokaži vse','Mostra tutto')} (${L.length})</button></p>`:''}${stamp(d)}`;
      el.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{cur=b.dataset.k;more=false;draw();});
      const m=el.querySelector('.cm-more');if(m)m.onclick=()=>{more=true;draw();};};
    draw();
  }catch(e){errBox(el,()=>home(el,opt));}
}
/* Pagina della frazione: tre gruppi */
async function svet(el,id){
  try{const d=await load();
    const mine=d.items.filter(x=>(x.svet||[]).includes(id));
    const gen=d.items.filter(x=>(!x.svet||!x.svet.length)&&(x.cat==='avvisi'||x.cat==='bp')&&(x.src==='albo'));
    const grp=(k1,k2,list)=>`<section class="cm-grp"><h3>${T(k1,k2)}</h3>${list.length?`<div class="cm-list">${list.map(x=>card(x,{showVas:false})).join('')}</div>`:empty(T('Trenutno nič.','Nulla al momento.'))}</section>`;
    el.innerHTML=`<div class="cm-grps">
${grp('Promet','Viabilità',mine.filter(x=>x.cat==='viabilita'))}
${grp('Javna dela','Lavori pubblici',mine.filter(x=>x.cat==='lavori'||x.cat==='bp'))}
${grp('Obvestila in razpisi','Avvisi e bandi',[...mine.filter(x=>x.cat==='avvisi'||x.cat==='eventi'),...gen].slice(0,8))}
</div>${stamp(d)}`;
  }catch(e){errBox(el,()=>svet(el,id));}
}
/* Elenco per categoria (BP, eventi) */
async function list(el,opt={}){
  try{const d=await load();
    const L=d.items.filter(x=>(opt.cats||[]).includes(x.cat)).slice(0,opt.limit||10);
    el.innerHTML=(L.length?`<div class="cm-list">${L.map(x=>card(x,{})).join('')}</div>`:empty(opt.empty||T('Trenutno nič.','Nulla al momento.')))+stamp(d);
  }catch(e){errBox(el,()=>list(el,opt));}
}
/* Riquadro stagionale: vegetazione lungo le strade e pericolo incendi */
const NO_FIRE=['e','g'];
function sezona(el,opt={}){
  const q=new URLSearchParams(location.search).get('sezona');
  const d=q?new Date(q):new Date(), md=(d.getMonth()+1)*100+d.getDate();
  const out=[];
  if(md>=501&&md<=930)out.push(`<article class="sz sz-veg"><h3>${T('Vejevje in živa meja ob cestah','Rami e siepi lungo le strade')}</h3>
<p>${T('Lastniki in uporabniki zemljišč ob cestah morajo redno obrezovati drevje, grmovje in živo mejo, da ne segajo na cestišče, ne zakrivajo prometnih znakov in ne ovirajo preglednosti.','Proprietari e conduttori dei terreni lungo le strade devono tagliare regolarmente alberi, arbusti e siepi che sporgono sulla carreggiata, coprono i segnali o riducono la visibilità.')}</p>
<p class="sz-src"><a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1992-04-30;285~art29" target="_blank" rel="noopener">${T('Cestni zakonik, 29. člen','Codice della strada, art. 29')} ↗</a></p></article>`);
  const fire=(md>=115&&md<=415)||(md>=615&&md<=930);
  if(fire&&!(opt.svet&&NO_FIRE.includes(opt.svet)))out.push(`<article class="sz sz-fire"><h3>${T('Požarna ogroženost na Krasu','Pericolo di incendi sul Carso')}</h3>
<p>${T('V tem obdobju je nevarnost požarov v naravi večja. Ne kurite na prostem in ne sežigajte rastlinskih odpadkov, kadar Dežela razglasi obdobje velike požarne ogroženosti. Požar takoj sporočite na številko 112.','In questo periodo il rischio di incendi boschivi è più alto. Non accendete fuochi all’aperto e non bruciate residui vegetali quando la Regione dichiara lo stato di grave pericolosità. Segnalate subito ogni incendio al 112.')}</p>
<p class="sz-src"><a href="https://www.protezionecivile.fvg.it" target="_blank" rel="noopener">${T('Civilna zaščita FJK','Protezione civile FVG')} ↗</a></p></article>`);
  if(!out.length){el.hidden=true;return;}
  el.hidden=false;el.innerHTML=out.join('');
}
/* Allerta meteo: banda in cima a ogni pagina finché l'allerta è valida */
const LV={yellow:['rumeno','gialla'],orange:['oranžno','arancione'],red:['rdeče','rossa']};
const dt=s=>{const d=new Date(s);if(d.getMinutes()===59)d.setMinutes(60);return `${d.getDate()}. ${d.getMonth()+1}., ${d.getHours()}.${String(d.getMinutes()).padStart(2,'0')}`;};
async function meteo(el){
  if(!el)return;
  try{const d=await load();const now=Date.now();
    const L=(d.meteo||[]).filter(x=>new Date(x.expires).getTime()>now);
    if(!L.length){el.hidden=true;return;}
    const top=L[0].level;
    el.className='meteo meteo-'+top;
    el.innerHTML=`<div class="meteo-in"><b>${T('Vremensko opozorilo','Allerta meteo')}</b> ${L.map(x=>`<span class="meteo-i"><i class="dot ${x.level}"></i>${T(`${esc(x.sl)} – ${LV[x.level][0]} opozorilo`,`${esc(x.it)} – allerta ${LV[x.level][1]}`)} · ${T('od','dal')} ${dt(x.onset)} ${T('do','al')} ${dt(x.expires)}</span>`).join('')}
 <span class="meteo-src"><a href="https://www.protezionecivile.fvg.it" target="_blank" rel="noopener">${T('Uradna obvestila: Civilna zaščita FJK','Avvisi ufficiali: Protezione civile FVG')} ↗</a> · ${T('vir','fonte')}: <a href="https://meteoalarm.org/en/live/region/IT?s=friuli" target="_blank" rel="noopener">MeteoAlarm</a></span></div>`;
    el.hidden=false;
  }catch(e){el.hidden=true;}
}
window.KS_COMUNE={load,home,svet,list,sezona,card,meteo};
})();
