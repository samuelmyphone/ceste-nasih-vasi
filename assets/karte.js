/* Historical maps viewer: IIIF deep zoom (OpenSeadragon) in a fullscreen overlay */
(()=>{'use strict';
let ov,viewer,ttl,arch;
function build(){
  ov=document.createElement('div');ov.className='kov';ov.hidden=true;
  ov.innerHTML='<div class="kov-bar"><b class="kov-t"></b><span class="kov-act"><button type="button" class="kov-b" data-z="1" aria-label="Povečaj / Ingrandisci">+</button><button type="button" class="kov-b" data-z="-1" aria-label="Pomanjšaj / Riduci">−</button><button type="button" class="kov-b" data-z="0" aria-label="Celotna karta / Mappa intera">⤢</button><a class="kov-b kov-a" target="_blank" rel="noopener" aria-label="Arhivski zapis / Scheda d’archivio">↗</a><button type="button" class="kov-b kov-x" aria-label="Zapri / Chiudi">✕</button></span></div><div class="kov-v" id="kov-v"></div><p class="kov-c">© Archivio di Stato di Trieste – Catasto franceschino</p>';
  document.body.append(ov);ttl=ov.querySelector('.kov-t');arch=ov.querySelector('.kov-a');
  ov.querySelector('.kov-x').onclick=close;
  ov.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{if(!viewer)return;const z=+b.dataset.z;if(!z)viewer.viewport.goHome();else viewer.viewport.zoomBy(z>0?1.6:1/1.6);});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!ov.hidden)close();});
}
function open(btn){
  if(!window.OpenSeadragon){window.open(btn.dataset.iiif+'/full/max/0/default.jpg','_blank');return;}
  if(!ov)build();
  const l=(window.KSLANG&&KSLANG.get())||'sl';
  ttl.textContent=btn.dataset['title'+(l==='it'?'It':'Sl')];arch.href=btn.dataset.arch;
  ov.hidden=false;document.documentElement.classList.add('kov-on');
  if(viewer){viewer.destroy();viewer=null;}
  viewer=OpenSeadragon({element:document.getElementById('kov-v'),tileSources:btn.dataset.iiif+'/info.json',showNavigationControl:false,showNavigator:true,navigatorPosition:'BOTTOM_RIGHT',crossOriginPolicy:'Anonymous',maxZoomPixelRatio:2.5,visibilityRatio:.6,gestureSettingsTouch:{pinchRotate:false}});
  history.pushState({kov:1},'');
}
function close(){if(!ov||ov.hidden)return;ov.hidden=true;document.documentElement.classList.remove('kov-on');if(viewer){viewer.destroy();viewer=null;}if(history.state&&history.state.kov)history.back();}
addEventListener('popstate',()=>{if(ov&&!ov.hidden){ov.hidden=true;document.documentElement.classList.remove('kov-on');if(viewer){viewer.destroy();viewer=null;}}});
document.addEventListener('click',e=>{const b=e.target.closest('.kthumb');if(b){e.preventDefault();open(b);}});
})();
