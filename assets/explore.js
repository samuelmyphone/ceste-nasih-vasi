/* Explorer for the Consiglio dossier pages: hero, village/theme filter, search, severity, map clusters. */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const make=(tag,cls,html='')=>{const e=document.createElement(tag);if(cls)e.className=cls;e.innerHTML=html;return e;};
const D=$('.dossier'); if(!D)return;
const roads=!!$('.village',D);
const reduce=()=>matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth';
// hero (site style)
const h1=$('h1',D), sub=h1&&h1.nextElementSibling, intro=$('.intro',D);
if(h1){
  const hero=make('section','hero'), main=make('div','');
  main.append(make('p','eyebrow',window.KSLANG?KSLANG.t('Krajevna skupnost Boršt–Pesek','Frazione di Sant’Antonio in Bosco–Pesek'):'Krajevna skupnost Boršt–Pesek'));
  h1.before(hero); hero.append(main); main.append(h1);
  if(sub&&sub.tagName==='P'){sub.className='sub';main.append(sub);}
  main.append(make('p','lead',roads?'Zbrane težave in predlogi krajanov za varnejše ceste v naših vaseh.<br><em>Le segnalazioni dei residenti, raccolte per strade più sicure nelle nostre frazioni.</em>':'Predlogi, vprašanja in ideje krajanov za boljše življenje v naših vaseh.<br><em>Proposte, domande e idee dei residenti per migliorare la vita nelle frazioni.</em>'));
  hero.append(make('aside','hero-side',roads?'<span class="mini">Sestanek z županom / Incontro con il Sindaco</span><strong><span data-l="sl">21. oktober 2026</span><span data-l="it">21 ottobre 2026</span></strong><p>Občina Dolina<br><em>Comune di San Dorligo della Valle</em></p><a href="#browse">Pregled točk / Elenco dei punti →</a>':'<span class="mini">Skupaj za naše vasi / Insieme per le frazioni</span><strong><span data-l="sl">Od predlogov do rešitev</span><span data-l="it">Dalle proposte alle soluzioni</span></strong><p><span data-l="sl">Prispevki krajanov 2025–2026</span><span data-l="it">Contributi dei residenti 2025–2026</span></p><a href="../../prijava.html?svet=c&amp;vrsta=predlog"><span data-l="sl">Dodaj predlog</span><span data-l="it">Aggiungi una proposta</span> →</a>'));
  if(intro){const note=make('details','source-note','<summary>O zbirki in virih / <em>Informazioni sulla raccolta e sulle fonti</em></summary>');note.append(intro);hero.after(note);}
}
const empty=make('p','empty','Ni zadetkov. Poskusite z drugim iskanjem.<br><em>Nessun risultato. Prova un’altra ricerca.</em>');empty.hidden=true;
let activeGroup='',activeSeverity='',query='',controls,entries=[],sections=[];
function toolbar(title,subtitle,sevOptions){
  const bar=make('div','toolbar',`<h2>${title}<small>${subtitle}</small></h2><label class="search-wrap"><span aria-hidden="true">⌕</span><input type="search" placeholder="Išči / Cerca…" aria-label="Išči / Cerca"></label>${sevOptions?`<select aria-label="Resnost / Gravità">${sevOptions}</select>`:''}`);bar.id='browse';
  const result=make('div','results-note','<span role="status" aria-live="polite"></span><button type="button" hidden>Ponastavi / Azzera filtri</button>');
  $('input',bar).addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase();filter();});
  if($('select',bar))$('select',bar).addEventListener('change',e=>{activeSeverity=e.target.value;filter();});
  $('button',result).addEventListener('click',reset);
  return {bar,result};
}
function reset(){activeGroup='';activeSeverity='';query='';if(controls){$('input',controls.bar).value='';const s=$('select',controls.bar);if(s)s.value='';}filter();}
function filter(){
  let count=0;
  entries.forEach(e=>{e.node.hidden=!((!activeGroup||e.group===activeGroup)&&(!activeSeverity||e.severity===activeSeverity)&&(!query||e.text.includes(query)));if(!e.node.hidden)count++;});
  sections.forEach(s=>{s.node.hidden=!$$('article',s.node).some(a=>!a.hidden);});
  if(roads)$$('.tbl tbody tr',D).forEach(row=>{const code=$('a',row)?.textContent;row.hidden=!!document.getElementById('c-'+code)?.hidden;});
  $$('.village-buttons button',D).forEach(b=>{const on=b.dataset.group===activeGroup;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on);});
  if(controls){$('span',controls.result).innerHTML=`${count} <span data-l="sl">${roads?'točk':'prispevkov'}</span><span data-l="it">${roads?'punti':'contributi'}</span>${activeGroup?' · '+activeGroup:''}`;$('button',controls.result).hidden=!(activeGroup||activeSeverity||query);}
  empty.hidden=count>0;
  dispatchEvent(new Event('draft-filter'));
}
function groupButton(box,label,second,count,group=''){
  const b=make('button','',`<span>${label}${second?'<small>'+second+'</small>':''}</span><b>${count}</b>`);b.type='button';b.dataset.group=group;
  b.addEventListener('click',()=>{activeGroup=group;filter();if(roads&&window.draftFit)window.draftFit();if(!roads&&group){sections.find(s=>s.group===group)?.node.scrollIntoView({block:'start',behavior:reduce()});}});box.append(b);
}
if(roads){
  $$('.village',D).forEach(s=>{const group=$('h2 span',s)?.textContent||$('h2',s).textContent;sections.push({node:s,group});$('h2',s).dataset.count=$$('article',s).length;
    $$('article',s).forEach(a=>entries.push({node:a,group,severity:a.classList.contains('g3')?'g3':a.classList.contains('g2')?'g2':'g1',text:a.textContent.toLocaleLowerCase()}));});
  const map=$('#lmap'),mapTitle=map.previousElementSibling,tools=$('.maptools',D);
  const explore=make('section','explore'),panel=make('div','map-panel');
  if(mapTitle&&mapTitle.matches('h2'))mapTitle.before(explore),mapTitle.remove();else map.before(explore);
  panel.append(make('div','panel-head','<h2>Zemljevid težav<small>La mappa delle criticità</small></h2><button type="button" class="fit-button">↗ Vse točke / Tutti i punti</button>'),map);if(tools)panel.append(tools);explore.append(panel);
  const side=make('aside','sidebar','<p class="section-kicker">RAZIŠČI / ESPLORA</p><h2>Naše vasi<small>Le nostre frazioni</small></h2><div class="village-buttons"></div><p class="sidebar-note">Izberite vas za prikaz njenih točk.<br><em>Seleziona una frazione per vederne le segnalazioni.</em></p>');explore.append(side);
  const box=$('.village-buttons',side);groupButton(box,'Vse vasi','Tutte le frazioni',entries.length);
  sections.forEach(s=>groupButton(box,s.group,$('h2 em',s.node)?.textContent.replace(/^\/\s*/,''),$$('article',s.node).length,s.group));
  $('.fit-button',panel).addEventListener('click',()=>{reset();window.draftFit?.();});
  const table=$('.tbl',D);if(table){const old=table.previousElementSibling;if(old&&old.matches('h2'))old.remove();controls=toolbar('Pregled prijav','Le criticità, punto per punto','<option value="">Vse stopnje / Tutte le gravità</option><option value="g3">Nevarnost / Pericolo</option><option value="g2">Ovira / Disagio</option><option value="g1">Nevšečnost / Fastidio</option>');table.before(controls.bar,controls.result,empty);}
  const st=$$('.sec',D).find(e=>/Točke/.test(e.textContent));if(st){st.innerHTML='Podrobnosti po vaseh / <em>Dettagli per frazione</em>';}
  window.draftRevealAll=reset;
  addEventListener('draft-map-ready',()=>{
    const map=window.draftMap,points=window.draftPoints,markers=window.draftMarkers,L=window.L;let clusters=[];
    const visible=()=>points.filter(p=>{const c=document.getElementById('c-'+p.id);return !c||!c.hidden;});
    window.draftFit=()=>{const v=visible();if(v.length)map.fitBounds(L.latLngBounds(v.map(p=>[p.lat,p.lon])).pad(.16),{maxZoom:16});};
    function draw(){
      clusters.forEach(c=>map.removeLayer(c));clusters=[];
      points.forEach(p=>{if(map.hasLayer(markers[p.id]))map.removeLayer(markers[p.id]);});
      const groups=[];
      visible().forEach(p=>{const pos=map.latLngToLayerPoint([p.lat,p.lon]);const g=groups.find(g=>g.pos.distanceTo(pos)<40);if(g)g.points.push(p);else groups.push({pos,points:[p]});});
      groups.forEach(g=>{
        if(g.points.length===1){markers[g.points[0].id].addTo(map);return;}
        const b=L.latLngBounds(g.points.map(p=>[p.lat,p.lon]));
        const c=L.marker(b.getCenter(),{icon:L.divIcon({className:'cluster-marker',html:String(g.points.length),iconSize:[43,43],iconAnchor:[21,21]}),title:g.points.map(p=>p.id).join(', ')}).addTo(map);
        c.on('click',()=>{if(map.getZoom()>=18){c.bindPopup(g.points.map(p=>`<button type="button" class="pbtn" data-id="${p.id}">${p.id} · ${p.sl}</button>`).join('<br>')).openPopup();}else map.fitBounds(b.pad(.4),{maxZoom:19});});clusters.push(c);
      });
    }
    map.on('zoomend moveend',draw);addEventListener('draft-filter',draw);
    if(window.ResizeObserver)new ResizeObserver(()=>map.invalidateSize()).observe($('#lmap'));
    window.draftFit();draw();
    document.addEventListener('click',e=>{if(e.target.closest('.showmap'))reset();},true);
  });
}else{
  const titles=[
   ['Krožna avtobusna linija 51','Collegamento circolare della linea 51'],['Vozni red za dijake','Orari adatti agli studenti'],['Pokrita in osvetljena postajališča','Fermate coperte e illuminate'],['Jutranji prevoz do Trsta','Collegamento mattutino con Trieste'],['Navetta za Pesek 60','Navetta per Pesek 60'],['Ureditev območja nekdanjega motela','Riqualificazione dell’area dell’ex motel'],['Optično omrežje za Pesek 60','Fibra ottica per Pesek 60'],['Sestanek s stanovalci','Incontro con i residenti'],['Referenčni e-naslov Občine','Un indirizzo email di riferimento'],['Dostopno in urejeno pokopališče','Accessibilità e cura del cimitero'],['Nujna deratizacija','Intervento urgente di derattizzazione'],['Voda za gašenje gozdnih požarov','Rete idrica per l’antincendio boschivo'],['Stenice v stanovanjih','Presenza di cimici nelle abitazioni'],['Sanacija borovega sprevodnega prelca','Bonifica dalla processionaria'],['Zgodovinska imena naših krajev','Nomi e memoria dei luoghi'],['Kolesarske povezave in oprema','Collegamenti e servizi per le biciclette'],['Varna pot do avtobusa','Un percorso sicuro verso il bus'],['Glasovi naših vasi','Voci e memorie delle nostre frazioni'],['Enosmerni promet Boršt–Zabrežec','Senso unico Sant’Antonio in Bosco–Moccò'],['Razsvetljava proti gozdu','Illuminazione della strada verso il bosco']];
  const groups=$$('.grp',D);
  if(groups.length){
    const lay=make('div','proposal-layout'),content=make('div','proposal-content');groups[0].before(lay);
    const side=make('aside','sidebar','<p class="section-kicker">TEME / ARGOMENTI</p><h2>Vsebina<small>Esplora le proposte</small></h2><div class="village-buttons"></div><p class="sidebar-note">Vprašanja, predlogi in projekti po temah.<br><em>Domande, proposte e progetti per argomento.</em></p>');lay.append(side,content);
    groups.forEach((s,i)=>{content.append(s);s.id='tema-'+i;const h=$('h2',s),group=h.childNodes[0].textContent.trim().replace(/\s*\/\s*$/,'');sections.push({node:s,group});$$('article',s).forEach(a=>entries.push({node:a,group,severity:'',text:a.textContent.toLocaleLowerCase()}));});
    const note=$('.source-note',D)||$('.hero',D);
    note.after(make('div','dstats proposal-stats',`<div><b>${entries.length}</b><span>prispevkov krajanov<br><em>contributi dei residenti</em></span></div><div><b>${groups.length}</b><span>tematskih sklopov<br><em>ambiti tematici</em></span></div><div><b>2025–26</b><span>obdobje zbiranja<br><em>periodo della raccolta</em></span></div>`));
    const box=$('.village-buttons',side);groupButton(box,'Vse teme','Tutti gli argomenti',entries.length);
    sections.forEach(s=>groupButton(box,s.group,($('h2 em',s.node)?.textContent||'').replace(/^\/\s*/,''),$$('article',s.node).length,s.group));
    if(entries.length===titles.length)entries.forEach((e,i)=>{const [sl,it]=titles[i];const t=$('.tags',e.node);if(t)t.after(make('h3','',`<span data-l="sl" lang="sl">${sl}</span><small data-l="it" lang="it">${it}</small>`));e.text=e.node.textContent.toLocaleLowerCase();e.node.id=e.node.id||'p-'+(i+1);});
    controls=toolbar('Prispevki krajanov','Proposte, domande e idee');lay.before(controls.bar,controls.result,empty);
    $$('.fig',D).forEach(f=>{f.tabIndex=0;f.setAttribute('role','button');f.setAttribute('aria-label','Povečaj shemo / Ingrandisci schema');f.append(make('span','enlarge-hint','↗ Povečaj / Ingrandisci'));f.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f.click();}});});
  }
}
$$('em',D).forEach(e=>e.lang='it');
filter();
})();
