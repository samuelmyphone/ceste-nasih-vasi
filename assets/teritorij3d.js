/* 3D territory viewer: MapLibre GL + terrain (AWS Terrain Tiles, Terrarium encoding) + Esri / OSM imagery.
   Data: window.T3D = {fz:[{id,slug,sl,it,col,vasi:[[sl,it,lat,lon]]}], views:{...}} */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const box=$('#t3d'),D=window.T3D;
const lang=()=>(window.KSLANG&&KSLANG.get())||'sl';
function fail(){box.classList.add('t3d-fail');$('#t3d-fail').hidden=false;}
if(!window.maplibregl||!D){fail();return;}
try{const c=document.createElement('canvas');if(!(c.getContext('webgl2')||c.getContext('webgl')))throw 0;}catch(_){fail();return;}

const style={version:8,
 sources:{
  sat:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Ortofoto © Esri, Maxar, Earthstar Geographics'},
  osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap contributors'},
  dem:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Teren / Rilievo: AWS Terrain Tiles (Mapzen)'},
  hs:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium'}
 },
 layers:[
  {id:'bg',type:'background',paint:{'background-color':'#dfe6e3'}},
  {id:'sat',type:'raster',source:'sat'},
  {id:'osm',type:'raster',source:'osm',layout:{visibility:'none'}},
  {id:'hs',type:'hillshade',source:'hs',layout:{visibility:'none'},paint:{'hillshade-exaggeration':.5,'hillshade-shadow-color':'#3a2a1e'}}
 ],
 sky:{'sky-color':'#9ec3dc','horizon-color':'#e8eef0','fog-color':'#e8eef0','sky-horizon-blend':.5,'horizon-fog-blend':.6,'fog-ground-blend':.3}
};
const V=D.views;
const map=new maplibregl.Map({container:'t3d-map',style,center:V.all.c,zoom:V.all.z,pitch:V.all.p,bearing:V.all.b,maxPitch:80,antialias:true,attributionControl:{compact:true}});
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
map.addControl(new maplibregl.FullscreenControl({container:box}),'top-right');
map.on('error',e=>{if(e&&e.error&&/webgl/i.test(String(e.error.message)))fail();});
let exag=1.4;
map.on('load',()=>{
 map.setTerrain({source:'dem',exaggeration:exag});
 // villages
 const fc={type:'FeatureCollection',features:[]};
 D.fz.forEach(f=>f.vasi.forEach(v=>fc.features.push({type:'Feature',geometry:{type:'Point',coordinates:[v[3],v[2]]},properties:{fz:f.id,slug:f.slug,sl:v[0],it:v[1],col:f.col}})));
 map.addSource('vasi',{type:'geojson',data:fc});
 map.addLayer({id:'vasi-dot',type:'circle',source:'vasi',paint:{'circle-radius':['interpolate',['linear'],['zoom'],11,4,15,8],'circle-color':['get','col'],'circle-stroke-color':'#fff','circle-stroke-width':2}});
 // HTML labels (follow terrain; bilingual)
 fc.features.forEach(ft=>{const p=ft.properties;const el=document.createElement('button');el.type='button';el.className='t3d-lbl';el.style.setProperty('--c',p.col);
  el.innerHTML=`<b data-l="sl" lang="sl">${p.sl}</b><b data-l="it" lang="it">${p.it}</b><small>${p.fz})</small>`;
  el.addEventListener('click',()=>{select(p.fz);popup(ft);});
  new maplibregl.Marker({element:el,anchor:'bottom',offset:[0,-8]}).setLngLat(ft.geometry.coordinates).addTo(map);});
});
let pop=null;
function popup(ft){const p=ft.properties,f=D.fz.find(x=>x.id===p.fz);if(pop)pop.remove();
 const n=lang()==='it'?`${p.it}`:`${p.sl}`;const fn=lang()==='it'?f.it:f.sl;
 pop=new maplibregl.Popup({offset:18,maxWidth:'280px'}).setLngLat(ft.geometry.coordinates)
  .setHTML(`<div class="t3d-pop"><b>${n}</b><span>${fn}</span><a href="sveti/${f.slug}/">${lang()==='it'?'Pagina della frazione':'Stran krajevne skupnosti'} →</a></div>`).addTo(map);}
function fly(v){const o={center:v.c,zoom:v.z,pitch:v.p,bearing:v.b};if(RM)map.jumpTo(o);else map.flyTo({...o,duration:3200,essential:false,curve:1.3});}
function select(id){$$('.t3d-views button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===id));}
$$('.t3d-views button').forEach(b=>b.addEventListener('click',()=>{stopOrbit();select(b.dataset.v);fly(V[b.dataset.v]);}));
// layers
$$('[data-base]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.base;['sat','osm'].forEach(l=>map.setLayoutProperty(l,'visibility',l===k?'visible':'none'));map.setLayoutProperty('hs','visibility',k==='osm'?'visible':'none');$$('[data-base]').forEach(x=>x.setAttribute('aria-pressed',x===b));}));
// exaggeration
const ex=$('#t3d-ex'),exv=$('#t3d-exv');
ex.addEventListener('input',()=>{exag=+ex.value;exv.textContent='×'+exag.toFixed(1);if(map.getTerrain())map.setTerrain({source:'dem',exaggeration:exag});});
// user-started slow orbit
let orbit=0;const ob=$('#t3d-orbit');
function stopOrbit(){if(orbit){cancelAnimationFrame(orbit);orbit=0;ob.setAttribute('aria-pressed','false');}}
function tick(){map.setBearing(map.getBearing()+.08);orbit=requestAnimationFrame(tick);}
ob.addEventListener('click',()=>{if(orbit)stopOrbit();else{ob.setAttribute('aria-pressed','true');orbit=requestAnimationFrame(tick);}});
if(RM)ob.hidden=true;
map.on('mousedown',stopOrbit);map.on('touchstart',stopOrbit);map.on('wheel',stopOrbit);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopOrbit();});
addEventListener('ks-lang',()=>{if(pop)pop.remove();});
select('all');
})();
