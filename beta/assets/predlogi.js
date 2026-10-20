/* Proposals page: search + filters, list <-> map selection, list/map switch on small screens.
   All cards are in the HTML; without JS everything stays visible and <details> still expand. */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const cards=$$('#plist .pc'),q=$('#pq'),loc=$('#ploc'),typ=$('#ptyp'),reset=$('#preset'),cnt=$('#pcount'),empty=$('#pempty'),pp=$('.pp');
let group='',sel=null,map=null,markers={};
const L_=()=>(window.KSLANG&&KSLANG.get())||'sl';
function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}
function apply(){
  const t=norm(q.value.trim()),l=loc.value,ty=typ.value;let n=0;const vis={};
  cards.forEach(c=>{const ok=(!group||c.dataset.group===group)&&(!l||c.dataset.locs.split('|').includes(l))&&(!ty||c.dataset.type===ty)&&(!t||norm(c.dataset.search).includes(t));
    c.hidden=!ok;if(ok){n++;c.dataset.pts.split('|').filter(Boolean).forEach(p=>vis[p]=(vis[p]||0)+1);}});
  cnt.textContent=n;empty.hidden=n>0;reset.hidden=!(group||l||ty||t);
  Object.entries(markers).forEach(([k,m])=>{const el=m.getElement&&m.getElement();const v=vis[k]||0;if(el){const pin=el.querySelector('.pmk');pin.classList.toggle('dim',!v);pin.querySelector('b').textContent=v||'0';}});
  if(sel&&sel.hidden)select(null);
}
$$('.chips button').forEach(b=>b.addEventListener('click',()=>{group=b.dataset.group;$$('.chips button').forEach(x=>x.setAttribute('aria-pressed',x===b));apply();}));
[q,loc,typ].forEach(e=>e.addEventListener('input',apply));
reset.addEventListener('click',()=>{q.value='';loc.value='';typ.value='';group='';$$('.chips button').forEach((x,i)=>x.setAttribute('aria-pressed',i===0));apply();q.focus();});
// selection: card -> markers
function select(card,scroll){
  if(sel)sel.classList.remove('sel');sel=card;
  const pts=card?card.dataset.pts.split('|').filter(Boolean):[];
  Object.entries(markers).forEach(([k,m])=>{const el=m.getElement&&m.getElement();if(el)el.querySelector('.pmk').classList.toggle('on',pts.includes(k));});
  const mc=document.getElementById('pmapc');if(mc)mc.classList.toggle('has-sel',pts.length>0);
  if(card){card.classList.add('sel');if(scroll)card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
    if(map&&pts.length){const ll=pts.map(k=>markers[k]&&markers[k].getLatLng()).filter(Boolean);if(ll.length===1)map.panTo(ll[0]);else if(ll.length)map.fitBounds(L.latLngBounds(ll).pad(.5),{maxZoom:14});}}
}
cards.forEach(c=>{c.addEventListener('click',e=>{if(e.target.closest('a,summary,button.loc,figure'))return;select(c===sel?null:c);});});
// place names inside cards filter by that place
document.addEventListener('click',e=>{const b=e.target.closest('button.loc');if(!b)return;loc.value=b.dataset.loc;apply();});
// map
function initMap(){
  if(map||!window.L||!window.PRED_PTS)return;
  map=L.map('pmapc',{scrollWheelZoom:false,tap:false});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap'}).addTo(map);
  const ll=[];
  PRED_PTS.forEach(p=>{const ic=L.divIcon({className:'',iconSize:[38,38],iconAnchor:[19,38],html:`<span class="pmk"><b>${p.n}</b></span>`});
    const m=L.marker([p.lat,p.lon],{icon:ic,keyboard:true,title:p.sl+' / '+p.it,alt:p.sl}).addTo(map);
    const off={right:[14,-22],left:[-14,-22],top:[0,-40],bottom:[0,0]}[p.d||'right'];m.bindTooltip(`<span class="pml">${p.sl}${p.it!==p.sl?' / '+p.it:''}</span>`,{permanent:true,direction:p.d||'right',offset:off,className:'pmt',opacity:1});
    m.on('click',()=>{loc.value=p.k;apply();const first=cards.find(c=>!c.hidden);if(first){select(first);if(pp.dataset.view==='map')setView('list');first.scrollIntoView({block:'start',behavior:'smooth'});}});
    markers[p.k]=m;ll.push([p.lat,p.lon]);});
  map.fitBounds(L.latLngBounds(ll).pad(.25));
  apply();
}
// list/map switch (small screens)
function setView(v){pp.dataset.view=v;$$('.pp-switch [data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===v));if(v==='map'&&map)setTimeout(()=>map.invalidateSize(),50);}
$$('.pp-switch [data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){initMap();io.disconnect();}});io.observe($('#pmapc'));}else initMap();
// deep link #p-N opens and selects the card
function fromHash(){const m=location.hash.match(/^#p-(\d+)$/);if(!m)return;const c=document.getElementById('p-'+m[1]);if(!c)return;c.hidden=false;const d=$('details',c);if(d)d.open=true;select(c,true);}
addEventListener('hashchange',fromHash);fromHash();
apply();
})();
