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
    const z=+el.dataset.zoom||0;
    if(pts.length===1||z){m.setView([pts[0][0],pts[0][1]],z||16);}
    else m.fitBounds(L.latLngBounds(pts.map(p=>[p[0],p[1]])).pad(.18));
    if(el.dataset.labels!=='0')pts.forEach(p=>{if(p[2])L.marker([p[0],p[1]],{interactive:false,icon:L.divIcon({className:'sat-lbl',html:'<span>'+p[2]+'</span>',iconSize:null})}).addTo(m);});
  };
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){make(e.target);io.unobserve(e.target);}}),{rootMargin:'200px'});els.forEach(e=>io.observe(e));}
  else els.forEach(make);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
