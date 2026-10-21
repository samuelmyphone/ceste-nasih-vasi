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
// click on a village thumbnail: large interactive satellite map with the card's links
let ov=null;
function closeOv(){if(ov){if(ov._m)ov._m.remove();ov.remove();ov=null;document.documentElement.classList.remove('kov-on');}}
function openVas(card){
  if(!window.L)return;const el=card.querySelector('.sat[data-pts]');let pts=[];try{pts=JSON.parse(el.dataset.pts);}catch(_){return;}
  closeOv();ov=document.createElement('div');ov.className='vov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
  const h=card.querySelector('h3'),links=card.querySelector('.ks-links');
  ov.innerHTML='<div class="vov-bar"><b class="vov-t"></b><span class="vov-l"></span><span class="vov-sw"><button type="button" data-b="sat" aria-pressed="true"><span data-l="sl" lang="sl">Satelit</span><span data-l="it" lang="it">Satellite</span></button><button type="button" data-b="osm" aria-pressed="false"><span data-l="sl" lang="sl">Karta</span><span data-l="it" lang="it">Mappa</span></button></span><button type="button" class="vov-x" aria-label="Zapri / Chiudi">✕</button></div><div class="vov-m"></div>';
  ov.querySelector('.vov-t').innerHTML=h?h.innerHTML:'';if(links)ov.querySelector('.vov-l').innerHTML=links.innerHTML;
  document.body.append(ov);document.documentElement.classList.add('kov-on');
  const m=L.map(ov.querySelector('.vov-m'),{zoomControl:true,zoomSnap:.5});ov._m=m;
  const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri, Maxar, Earthstar Geographics'}).addTo(m);
  const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});
  m.attributionControl.setPrefix(false);m.setView([pts[0][0],pts[0][1]],17);
  ov.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const s=b.dataset.b==='sat';if(s){m.removeLayer(osm);sat.addTo(m);}else{m.removeLayer(sat);osm.addTo(m);}ov.querySelectorAll('[data-b]').forEach(x=>x.setAttribute('aria-pressed',x===b));});
  ov.querySelector('.vov-x').onclick=closeOv;ov.querySelector('.vov-x').focus();
}
document.addEventListener('click',e=>{const s=e.target.closest('.ks-card.vas .sat');if(s){e.preventDefault();openVas(s.closest('.ks-card'));}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeOv();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
