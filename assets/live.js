/* Shared client for the Consigli submissions (Supabase). Exposes window.SVET */
(()=>{'use strict';
const CFG=window.SVET_CFG||{};
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const VRSTE={cesta:['Težava na cesti','Criticità stradale'],pripomba:['Pripomba','Segnalazione'],predlog:['Predlog','Proposta'],vprasanje:['Vprašanje','Domanda'],ideja:['Ideja','Idea'],projekt:['Projekt','Progetto']};
const RES={3:['Nevarnost','Pericolo'],2:['Vsakodnevna ovira','Disagio quotidiano'],1:['Manjša nevšečnost','Fastidio']};
const NAP={zbrano:['Prejeto in objavljeno','Ricevuta e pubblicata'],posredovano:['Posredovano Občini','Inoltrata al Comune'],v_obravnavi:['V obravnavi','In esame'],v_izvajanju:['V izvajanju','In lavorazione'],reseno:['Rešeno','Risolta'],ni_izvedljivo:['Ni izvedljivo','Non realizzabile']};
const STATUS={novo:['Novo – čaka na pregled','Nuova – in attesa'],objavljeno:['Objavljeno','Pubblicata'],zavrnjeno:['Zavrnjeno','Rifiutata']};
let client=null;
function ready(){return !!(CFG.url&&CFG.key);}
async function getClient(){
  if(!ready())return null; if(client)return client;
  if(!window.supabase){await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';s.onload=res;s.onerror=rej;document.head.append(s);});}
  client=window.supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:true,detectSessionInUrl:true,flowType:'implicit'}});
  return client;
}
function fotoUrl(p){return CFG.url+'/storage/v1/object/public/fotografije/'+p.split('/').map(encodeURIComponent).join('/');}
function fmtDate(d){try{return new Date(d).toLocaleDateString('sl-SI',{day:'numeric',month:'numeric',year:'numeric'});}catch(_){return '';}}
const STEPS=['zbrano','posredovano','v_obravnavi','v_izvajanju','reseno'];
const STEPL={zbrano:['Prejeto','Ricevuta'],posredovano:['Posredovano Občini','Inoltrata al Comune'],v_obravnavi:['V obravnavi','In esame'],v_izvajanju:['V izvajanju','In lavorazione'],reseno:['Rešeno','Risolta']};
const NEXT={zbrano:['Svet bo prijavo posredoval Občini.','Il Consiglio inoltrerà la segnalazione al Comune.'],posredovano:['Čakamo odgovor Občine.','In attesa della risposta del Comune.'],v_obravnavi:['Občina preučuje rešitev.','Il Comune sta valutando la soluzione.'],v_izvajanju:['Dela so v teku.','Lavori in corso.'],reseno:['Zaključeno.','Concluso.'],ni_izvedljivo:['Občina je sporočila, da ni izvedljivo (glej odgovor).','Il Comune ha comunicato che non è realizzabile (vedi risposta).']};
function steps(nap){
  if(nap==='ni_izvedljivo')return `<ol class="lsteps"><li class="done">${STEPL.zbrano[0]} / <em>${STEPL.zbrano[1]}</em></li><li class="no">${NAP.ni_izvedljivo[0]} / <em>${NAP.ni_izvedljivo[1]}</em></li></ol>`;
  const k=Math.max(0,STEPS.indexOf(nap||'zbrano'));
  return '<ol class="lsteps">'+STEPS.map((x,i)=>`<li class="${i<k?'done':i===k?'now':''}">${STEPL[x][0]} / <em>${STEPL[x][1]}</em></li>`).join('')+'</ol>';
}
function card(p){
  const v=VRSTE[p.vrsta]||[p.vrsta,''], r=RES[p.resnost], nx=NEXT[p.napredek]||NEXT.zbrano;
  const phs=(p.fotografije||[]).map(f=>`<img src="${E(fotoUrl(f))}" alt="" loading="lazy" data-zoom="${E(fotoUrl(f))}">`).join('');
  const upd=p.updated_at||p.created_at;
  return `<article class="live r${p.resnost||0}" id="l-${E(p.id)}">
   <div class="top">${p.oznaka?`<b>${E(p.oznaka)}</b>`:''}<b><svg class="ic" aria-hidden="true"><use href="#i-pin"/></svg> ${E(p.vas)}</b><span>${E(v[0])} / <em>${E(v[1])}</em></span>${r?`<span>${E(r[0])} / <em>${E(r[1])}</em></span>`:''}</div>
   <dl class="lfacts">
    <dt>Zahteva / <em>Richiesta</em></dt><dd>${E(p.opis)}${p.kje?`<br><small>${E(p.kje)}</small>`:''}${p.predlog?`<br><b>Predlog / <em>Proposta</em>:</b> ${E(p.predlog)}`:''}</dd>
    <dt>Stanje / <em>Stato</em></dt><dd>${steps(p.napredek)}</dd>
    <dt>Zadnja posodobitev / <em>Ultimo aggiornamento</em></dt><dd>${fmtDate(upd)} <small>(${'prejeto / ricevuta '+fmtDate(p.created_at)})</small></dd>
    <dt>Naslednji korak / <em>Prossimo passo</em></dt><dd>${E(nx[0])} / <em>${E(nx[1])}</em></dd>
   </dl>
   ${phs?`<div class="phs">${phs}</div>`:''}
   ${p.odgovor?`<div class="ans"><b>Odgovor Sveta / <em>Risposta del Consiglio</em>:</b> ${E(p.odgovor)}</div>`:''}
  </article>`;
}
async function loadPublished(consiglio, kinds){
  const c=await getClient(); if(!c)return {error:'off',data:[]};
  let q=c.from('prijave').select('id,created_at,updated_at,consiglio_id,vas,vrsta,kategorija,kje,opis,predlog,resnost,lat,lon,fotografije,napredek,odgovor,oznaka').eq('status','objavljeno').order('created_at',{ascending:false}).limit(500);
  if(consiglio)q=q.eq('consiglio_id',consiglio);
  if(kinds&&kinds.length)q=q.in('vrsta',kinds);
  const {data,error}=await q; return {data:data||[],error};
}
async function mountList(el, consiglio, kinds, opts={}){
  if(!el)return [];
  if(!ready()){el.innerHTML=`<p class="empty">Spletni obrazec Sveta je v pripravi. Do takrat lahko pišete na <a href="mailto:cfks.borst@gmail.com">cfks.borst@gmail.com</a>.<br><em>Il modulo online del Consiglio è in attivazione. Nel frattempo potete scrivere a cfks.borst@gmail.com.</em></p>`;return [];}
  el.innerHTML='<p class="empty">Nalagam … / Caricamento …</p>';
  const {data,error}=await loadPublished(consiglio,kinds);
  if(error){el.innerHTML='<p class="empty">Podatkov trenutno ni mogoče naložiti. / Dati non disponibili al momento.</p>';return [];}
  el.innerHTML=data.length?data.map(card).join(''):`<p class="empty">${opts.empty||'Še ni objavljenih prijav. / Ancora nessuna segnalazione pubblicata.'}</p>`;
  const cnt=document.querySelector(opts.countSel||'[data-live-count]'); if(cnt)cnt.textContent=data.length;
  return data;
}
window.SVET={E,VRSTE,RES,NAP,STATUS,STEPS,NEXT,ready,getClient,fotoUrl,fmtDate,card,loadPublished,mountList,CFG};
})();
