(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
// mobile menu + dropdown
const mb=$('.menu-btn'), nav=$('.nav');
if(mb&&nav){mb.addEventListener('click',()=>{const o=nav.classList.toggle('open');mb.setAttribute('aria-expanded',o)});}
const tm=$('.tb-menu');if(tm&&nav){tm.addEventListener('click',e=>{e.stopPropagation();const o=nav.classList.toggle('open');if(mb)mb.setAttribute('aria-expanded',o);if(o){scrollTo({top:0});}});}
// collapsible cards on phones (long lists)
const MQ=matchMedia('(max-width:720px)');
function collapsible(sel,headSel){$$(sel).forEach(c=>{if(c.dataset.col)return;c.dataset.col=1;c.classList.add('collapsible');const h=headSel?$(headSel,c):c.firstElementChild;if(!h)return;h.classList.add('col-head');h.setAttribute('role','button');h.tabIndex=0;h.setAttribute('aria-expanded','false');const t=()=>{const o=c.classList.toggle('open');h.setAttribute('aria-expanded',o);};h.addEventListener('click',e=>{if(e.target.closest('a,button:not(.col-head)'))return;if(!MQ.matches)return;t();});h.addEventListener('keydown',e=>{if(MQ.matches&&(e.key==='Enter'||e.key===' ')){e.preventDefault();t();}});});}
window.KSCOLLAPSE=collapsible;
addEventListener('DOMContentLoaded',()=>{collapsible('.dossier .card','header');collapsible('.dossier article.pit','h3');collapsible('#bplist .proj','header');});
document.addEventListener('click',e=>{const b=e.target.closest('.pbtn');if(b){const c=document.getElementById('c-'+b.dataset.id);if(c)c.classList.add('open');}});
$$('.dd>button').forEach(b=>{b.addEventListener('click',e=>{const d=b.parentElement;$$('.dd.open').forEach(x=>{if(x!==d){x.classList.remove('open');$('button',x).setAttribute('aria-expanded','false');}});const o=d.classList.toggle('open');b.setAttribute('aria-expanded',o);e.stopPropagation();});});
document.addEventListener('click',e=>{$$('.dd.open').forEach(d=>{if(!d.contains(e.target)){d.classList.remove('open');$('button',d).setAttribute('aria-expanded','false');}});});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$$('.dd.open').forEach(d=>d.classList.remove('open'));closeLb();}});
// tabs
$$('[role=tablist]').forEach(tl=>{const tabs=$$('[role=tab]',tl);tabs.forEach(t=>t.addEventListener('click',()=>{tabs.forEach(x=>{const on=x===t;x.setAttribute('aria-selected',on);const p=document.getElementById(x.getAttribute('aria-controls'));if(p)p.hidden=!on;});try{history.replaceState(null,'','#'+t.dataset.hash)}catch(_){}}));
  const go=()=>{const h=location.hash.slice(1);const m=tabs.find(t=>t.dataset.hash===h);if(m){m.click();m.scrollIntoView({block:'start'});}};go();addEventListener('hashchange',go);});
// lightbox (any [data-zoom] image or figure)
let lb;function closeLb(){if(lb){lb.remove();lb=null;}}
document.addEventListener('click',e=>{const z=e.target.closest('[data-zoom]');if(!z)return;e.preventDefault();
  const src=z.dataset.zoom||z.querySelector('img')?.src;closeLb();lb=document.createElement('div');lb.className='lbx';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');
  if(src){const i=document.createElement('img');i.src=src;i.alt='';lb.append(i);}else{const s=z.querySelector('svg');if(s){const c=s.cloneNode(true);c.style.width='min(1000px,94vw)';c.style.height='auto';lb.append(c);}}
  const b=document.createElement('button');b.type='button';b.textContent='Zapri / Chiudi';b.addEventListener('click',closeLb);lb.append(b);lb.addEventListener('click',ev=>{if(ev.target===lb)closeLb();});document.body.append(lb);b.focus();});
// back to top
const bt=document.createElement('button');bt.className='back-top';bt.type='button';bt.textContent='↑';bt.setAttribute('aria-label','Na vrh / Torna in alto');bt.hidden=true;bt.addEventListener('click',()=>scrollTo({top:0}));document.body.append(bt);
addEventListener('scroll',()=>{bt.hidden=scrollY<600;},{passive:true});
})();
