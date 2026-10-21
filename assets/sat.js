/* Satellite thumbnails (Esri World Imagery) for .sat[data-pts='[[lat,lon,"label"],…]'] */
(()=>{'use strict';
function init(){
  if(!window.L)return;
  const els=[...document.querySelectorAll('.sat[data-pts]')];
  const make=el=>{
    if(el._m)return;let pts=[];try{pts=JSON.parse(el.dataset.pts);}catch(_){return;}
    const m=L.map(el,{dragging:false,zoomControl:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,boxZoom:false,keyboard:false,tap:false,attributionControl:true,zoomSnap:0.25});
    el._m=m;
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri, Maxar, Earthstar Geographics'}).addTo(m);
    m.attributionControl.setPrefix(false);
    const z=+el.dataset.z||0;
    if(pts.length===1||z){m.setView([pts[0][0],pts[0][1]],z||16);}
    else m.fitBounds(L.latLngBounds(pts.map(p=>[p[0],p[1]])).pad(.18));
    if(el.dataset.labels!=='0')pts.forEach(p=>{if(p[2])L.marker([p[0],p[1]],{interactive:false,icon:L.divIcon({className:'sat-lbl',html:'<span>'+p[2]+'</span>',iconSize:null})}).addTo(m);});
  };
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){make(e.target);io.unobserve(e.target);}}),{rootMargin:'200px'});els.forEach(e=>io.observe(e));}
  else els.forEach(make);
}
// click on a village thumbnail: large interactive map + three panels (reports, info sheet, 3D)
const ROOT=((document.currentScript&&document.currentScript.src)||'').replace(/assets\/sat\.js.*$/,'');
const TT=(sl,it)=>`<span data-l="sl" lang="sl">${sl}</span><span data-l="it" lang="it">${it}</span>`;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GRAV={3:['#c0392b','nevarnost','pericolo'],2:['#d68910','vsakodnevna ovira','disagio'],1:['#7f8c8d','manjša težava','fastidio']};
let ov=null;
function closeOv(){if(ov){if(ov._m)ov._m.remove();ov.remove();ov=null;document.documentElement.classList.remove('kov-on');}}
function openVas(card){
  if(!window.L)return;const el=card.querySelector('.sat[data-pts]');let pts=[];try{pts=JSON.parse(el.dataset.pts);}catch(_){return;}
  const D=window.VAS_DATA||{},vas=card.dataset.vas,svet=card.dataset.svet||D.svet,V=(D.vasi||{})[vas]||['',pts[0][0],pts[0][1]];
  const it=V[0]||vas,lat=V[1],lon=V[2];
  closeOv();ov=document.createElement('div');ov.className='vov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label',vas);
  const t3d=`${ROOT}teritorij-3d.html#ll=${lat},${lon}&n=${encodeURIComponent(vas)}`;
  ov.innerHTML=`<div class="vov-bar"><b class="vov-t">${TT(esc(vas),esc(it))}</b>
   <span class="vov-tabs" role="tablist"><button type="button" role="tab" data-p="prijave" aria-selected="false">${TT('Prijave','Segnalazioni')} <i class="vov-n"></i></button><button type="button" role="tab" data-p="info" aria-selected="false">${TT('O vasi','Scheda')}</button><a class="vov-3d" href="${t3d}">${TT('3D pogled','Vista 3D')} ↗</a></span>
   <span class="vov-sw"><button type="button" data-b="sat" aria-pressed="true">${TT('Satelit','Satellite')}</button><button type="button" data-b="osm" aria-pressed="false">${TT('Karta','Mappa')}</button></span>
   <button type="button" class="vov-x" aria-label="Zapri / Chiudi">✕</button></div>
   <div class="vov-body"><div class="vov-m"></div><aside class="vov-p" hidden><button type="button" class="vov-pc" aria-label="Skrij / Nascondi">✕</button><div class="vov-pi"></div></aside></div>`;
  document.body.append(ov);document.documentElement.classList.add('kov-on');
  const m=L.map(ov.querySelector('.vov-m'),{zoomControl:true,zoomSnap:.5});ov._m=m;
  const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri, Maxar, Earthstar Geographics'}).addTo(m);
  const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});
  m.attributionControl.setPrefix(false);m.setView([lat,lon],17);
  ov.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const s=b.dataset.b==='sat';if(s){m.removeLayer(osm);sat.addTo(m);}else{m.removeLayer(sat);osm.addTo(m);}ov.querySelectorAll('[data-b]').forEach(x=>x.setAttribute('aria-pressed',x===b));});
  ov.querySelector('.vov-x').onclick=closeOv;
  const P=ov.querySelector('.vov-p'),PI=ov.querySelector('.vov-pi');
  const showP=(k)=>{ov.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.p===k));P.hidden=!k;setTimeout(()=>m.invalidateSize(),50);if(k==='prijave')renderReports();if(k==='info')renderInfo();};
  ov.querySelectorAll('[role=tab]').forEach(b=>b.onclick=()=>showP(b.getAttribute('aria-selected')==='true'?null:b.dataset.p));
  ov.querySelector('.vov-pc').onclick=()=>showP(null);
  // reports: road dossier points + published reports from the online form
  const layer=L.layerGroup().addTo(m);const iss=(D.issues||{})[vas]||[];let live=[];const mk={};
  function dot(col){return L.divIcon({className:'vov-dot',html:`<i style="background:${col}"></i>`,iconSize:[18,18],iconAnchor:[9,9]});}
  iss.forEach(x=>{const g=GRAV[x[3]]||GRAV[1];mk[x[0]]=L.marker([x[1],x[2]],{icon:dot(g[0]),title:x[0]}).addTo(layer).bindPopup(`<b>${esc(x[0])}</b> ${TT(esc(x[4]),esc(x[5]))}<br><a href="${ROOT}sveti/borst/ceste.html#${esc(x[0])}">${TT('Podrobnosti','Dettagli')} →</a>`);});
  const n=ov.querySelector('.vov-n');const setN=()=>{n.textContent=(iss.length+live.length)||'';};setN();
  if(window.SVET&&SVET.ready())SVET.loadPublished(svet).then(r=>{live=(r.data||[]).filter(p=>(p.vas||'').indexOf(vas)===0);live.forEach(p=>{if(p.lat){mk['L'+p.id]=L.marker([p.lat,p.lon],{icon:dot('#2471a3')}).addTo(layer).bindPopup(`${esc(p.opis).slice(0,160)}`);}});setN();if(!P.hidden&&ov.querySelector('[data-p=prijave][aria-selected=true]'))renderReports();}).catch(()=>{});
  function renderReports(){
    const li=iss.map(x=>{const g=GRAV[x[3]]||GRAV[1];return `<li><button type="button" data-k="${esc(x[0])}"><i style="background:${g[0]}"></i><b>${esc(x[0])}</b> ${TT(esc(x[4]),esc(x[5]))}</button></li>`;}).join('')+
      live.map(p=>`<li><button type="button" data-k="L${p.id}"${p.lat?'':' disabled'}><i style="background:#2471a3"></i>${esc(p.opis).slice(0,140)}${p.opis.length>140?'…':''}</button></li>`).join('');
    PI.innerHTML=`<h3>${TT('Prijave v vasi','Segnalazioni nel paese')}</h3>${li?`<ul class="vov-list">${li}</ul>`:`<p class="hint">${TT('Za to vas še ni objavljenih prijav.','Per questo paese non ci sono ancora segnalazioni pubblicate.')}</p>`}
      ${iss.length?`<p class="vov-leg"><span><i style="background:#c0392b"></i>${TT('nevarnost','pericolo')}</span><span><i style="background:#d68910"></i>${TT('ovira','disagio')}</span><span><i style="background:#7f8c8d"></i>${TT('manjše','minore')}</span><span><i style="background:#2471a3"></i>${TT('spletni obrazec','modulo online')}</span></p>`:''}
      <p><a class="btn small" href="${ROOT}prijava.html?svet=${svet}&vas=${encodeURIComponent(vas)}">${TT('Prijavi težavo v tej vasi','Segnala un problema in questo paese')}</a></p>
      ${D.dossier?`<p><a href="${ROOT}sveti/borst/ceste.html">${TT('Celoten zemljevid težav na cestah','Mappa completa delle criticità stradali')} →</a></p>`:''}`;
    PI.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=mk[b.dataset.k];if(k){m.setView(k.getLatLng(),18);k.openPopup();}});
  }
  function renderInfo(){
    const I=(D.info||{})[vas];const links=card.querySelector('.ks-links');
    const row=(lab,v)=>v?`<p><b>${lab}:</b> ${v}</p>`:'';
    const lst=(a,b)=>(a&&a.length)?`<ul>${a.map((x,i)=>`<li>${TT(esc(x),esc((b||[])[i]||x))}</li>`).join('')}</ul>`:'';
    PI.innerHTML=`<h3>${TT(esc(vas),esc(it))}</h3>`+(I?`${I.history_sl?`<p>${TT(esc(I.history_sl),esc(I.history_it))}</p>`:''}
      ${row(TT('Nadmorska višina','Altitudine'),I.alt?I.alt+' m':'')}${row(TT('Prebivalci','Abitanti'),I.pop?esc(I.pop):'')}
      ${row(TT('Cerkev','Chiesa'),I.church_sl?TT(esc(I.church_sl),esc(I.church_it)):'')}
      ${(I.landmarks_sl||[]).length?`<p><b>${TT('Znamenitosti in narava','Luoghi e natura')}</b></p>${lst(I.landmarks_sl,I.landmarks_it)}`:''}
      ${(I.culture_sl||[]).length?`<p><b>${TT('Društva in običaji','Associazioni e tradizioni')}</b></p>${lst(I.culture_sl,I.culture_it)}`:''}
      ${(I.sources||[]).length?`<p class="vov-src">${TT('Viri','Fonti')}: ${I.sources.map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener">${(()=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(_){return 'link'}})()}</a>`).join(' · ')}</p>`:''}`
      :`<p class="hint">${TT('Podatki o vasi so v pripravi.','La scheda del paese è in preparazione.')}</p>`)+
      (links?`<p class="ks-links">${links.innerHTML}</p>`:'');
  }
  ov.querySelector('.vov-x').focus();
}
document.addEventListener('click',e=>{const s=e.target.closest('.ks-card.vas .sat');if(s){e.preventDefault();openVas(s.closest('.ks-card'));}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOv();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
