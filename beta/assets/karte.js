/* Historical maps viewer: IIIF deep zoom (OpenSeadragon) in a fullscreen overlay.
   - single sheet: IIIF info.json from the Archivio di Stato di Trieste
   - .kmos: mosaic of the original sheets placed on the cadastral grid (window.KMOS)
   - ← / → (keyboard or buttons) move to the previous / next map of the page */
(()=>{'use strict';
let ov,viewer,ttl,arch,cnt,list=[],idx=-1;
const L=()=>(window.KSLANG&&KSLANG.get())||'sl';
function build(){
  ov=document.createElement('div');ov.className='kov';ov.hidden=true;
  ov.innerHTML='<div class="kov-bar"><button type="button" class="kov-b kov-p" aria-label="Prejšnja / Precedente">‹</button><span class="kov-n nol"></span><button type="button" class="kov-b kov-nx" aria-label="Naslednja / Successiva">›</button><b class="kov-t"></b><span class="kov-act"><button type="button" class="kov-b" data-z="1" aria-label="Povečaj / Ingrandisci">+</button><button type="button" class="kov-b" data-z="-1" aria-label="Pomanjšaj / Riduci">−</button><button type="button" class="kov-b" data-z="0" aria-label="Celotna karta / Mappa intera">⤢</button><a class="kov-b kov-a" target="_blank" rel="noopener" aria-label="Arhivski zapis / Scheda d’archivio">↗</a><button type="button" class="kov-b kov-x" aria-label="Zapri / Chiudi">✕</button></span></div><div class="kov-v" id="kov-v"></div><p class="kov-c">© Archivio di Stato di Trieste – Catasto franceschino</p>';
  document.body.append(ov);ttl=ov.querySelector('.kov-t');arch=ov.querySelector('.kov-a');cnt=ov.querySelector('.kov-n');
  ov.querySelector('.kov-x').onclick=close;
  ov.querySelector('.kov-p').onclick=()=>step(-1);
  ov.querySelector('.kov-nx').onclick=()=>step(1);
  ov.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{if(!viewer)return;const z=+b.dataset.z;if(!z)viewer.viewport.goHome();else viewer.viewport.zoomBy(z>0?1.6:1/1.6);});
  addEventListener('keydown',e=>{
    if(!ov||ov.hidden)return;
    if(e.key==='Escape'){close();}
    else if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();step(1);}
    else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();step(-1);}
  },true);
}
const infoCache={};
function info(svc){return infoCache[svc]||(infoCache[svc]=fetch(window.KIIIF+svc+'/info.json').then(r=>r.json()));}
async function mosaicSources(k){
  const m=(window.KMOS||{})[k];if(!m)return[];
  const infos=await Promise.all(m.sheets.map(s=>info(s.svc)));
  const out=[];
  m.sheets.forEach((s,i)=>s.clips.forEach((c,j)=>{
    const P=8,x=Math.max(0,c[0]-P),y=Math.max(0,c[1]-P),x2=Math.min(s.W,c[0]+c[2]+P),y2=Math.min(s.H,c[1]+c[3]+P);
    const ts=new OpenSeadragon.IIIFTileSource(Object.assign({},infos[i]));
    out.push({tileSource:ts,x:s.x,y:s.y,width:s.w,degrees:(s.deg>0?s.deg-360:s.deg),clip:new OpenSeadragon.Rect(x,y,x2-x,y2-y)});
  }));
  return out;
}
let tok=0;
function show(i){
  idx=(i+list.length)%list.length;const btn=list[idx];const my=++tok;
  const l=L();
  ttl.textContent=btn.dataset['title'+(l==='it'?'It':'Sl')];
  cnt.textContent=(idx+1)+' / '+list.length;
  if(btn.dataset.arch){arch.href=btn.dataset.arch;arch.hidden=false;}else arch.hidden=true;
  if(viewer){viewer.destroy();viewer=null;}
  viewer=OpenSeadragon({element:document.getElementById('kov-v'),showNavigationControl:false,showNavigator:true,navigatorPosition:'BOTTOM_RIGHT',
    crossOriginPolicy:'Anonymous',maxZoomPixelRatio:2.5,visibilityRatio:.5,imageLoaderLimit:8,gestureSettingsTouch:{pinchRotate:false},
    collectionMode:false,preserveViewport:false});window.__kv=viewer;
  if(btn.dataset.mosaic){const m=(window.KMOS||{})[btn.dataset.mosaic];
    mosaicSources(btn.dataset.mosaic).then(src=>{if(my!==tok||!viewer)return;
      viewer.addOnceHandler('open',()=>{const r=new OpenSeadragon.Rect(-.03,-.03,m.cols+.06,m.rows*.8+.06);viewer.viewport.fitBounds(r,true);viewer.viewport.homeBounds=r;viewer.viewport.goHome=function(i){this.fitBounds(r,i);};});
      viewer.open(src);}).catch(()=>{});}
  else viewer.open(btn.dataset.iiif+'/info.json');
}
function step(d){if(list.length>1)show(idx+d);}
function open(btn){
  if(!window.OpenSeadragon){if(btn.dataset.iiif)window.open(btn.dataset.iiif+'/full/max/0/default.jpg','_blank');return;}
  if(!ov)build();
  list=[...document.querySelectorAll('.kthumb')];
  ov.hidden=false;document.documentElement.classList.add('kov-on');
  show(list.indexOf(btn));
  history.pushState({kov:1},'');
}
function hide(){ov.hidden=true;document.documentElement.classList.remove('kov-on');if(viewer){viewer.destroy();viewer=null;}}
function close(){if(!ov||ov.hidden)return;hide();if(history.state&&history.state.kov)history.back();}
addEventListener('popstate',()=>{if(ov&&!ov.hidden)hide();});
document.addEventListener('click',e=>{const b=e.target.closest('.kthumb');if(b){e.preventDefault();open(b);}});
})();
