/* UI behaviour for the redesign: theme popover, section reveal, hero parallax + pause, event expiry */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE=matchMedia('(hover:hover) and (pointer:fine)').matches;
// theme popover
$$('.theme').forEach(t=>{const b=$('.theme-btn',t);
  b.addEventListener('click',e=>{e.stopPropagation();const o=t.classList.toggle('open');b.setAttribute('aria-expanded',o);if(o){const f=$('[aria-pressed=true]',t)||$('[data-setskin]',t);f&&f.focus();}});
  t.addEventListener('click',e=>{if(e.target.closest('[data-setskin]')){t.classList.remove('open');b.setAttribute('aria-expanded','false');b.focus();}});
  document.addEventListener('click',e=>{if(!t.contains(e.target)){t.classList.remove('open');b.setAttribute('aria-expanded','false');}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&t.classList.contains('open')){t.classList.remove('open');b.setAttribute('aria-expanded','false');b.focus();}});
});
// reveal on scroll (content stays visible without JS: .rv is hidden only under html.js)
const rv=$$('.rv');
if(!RM&&'IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{rootMargin:'0px 0px -8% 0px',threshold:.06});rv.forEach(el=>io.observe(el));
  setTimeout(()=>rv.forEach(el=>el.classList.add('in')),2500);}
else rv.forEach(el=>el.classList.add('in'));
// hero: parallax on the illustration layers (fine pointer + motion allowed), pause control, optional video
const hh=$('.hh');
if(hh){const layers=$$('.hl',hh),vid=$('video',hh),pp=$('.hpp',hh);let paused=false;try{paused=localStorage.getItem('ks-motion')==='off';}catch(_){}
  const canPar=!RM&&FINE&&layers.length;
  function apply(){if(paused||!canPar){layers.forEach(l=>l.style.transform='');return;}const y=Math.min(scrollY,700);layers.forEach(l=>{const d=+l.dataset.depth||0;l.style.transform=`translate3d(0,${(y*d).toFixed(1)}px,0)`;});}
  function set(p){paused=p;hh.classList.toggle('paused',p);if(pp){pp.setAttribute('aria-pressed',p);}if(vid){p?vid.pause():vid.play().catch(()=>{});}try{localStorage.setItem('ks-motion',p?'off':'on');}catch(_){}apply();}
  if(RM&&vid){vid.removeAttribute('autoplay');vid.pause();paused=true;}
  if(pp)pp.addEventListener('click',()=>set(!paused));
  set(paused);
  if(canPar){let raf=0;addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;apply();});},{passive:true});}
  if(!canPar&&!vid&&pp)pp.hidden=true;
}
// dated items: an event that has ended must not look upcoming
const now=Date.now();
$$('[data-until]').forEach(el=>{const t=Date.parse(el.dataset.until);if(!isNaN(t)&&now>t){el.classList.add('past');$$('[data-when=future]',el).forEach(x=>x.hidden=true);$$('[data-when=past]',el).forEach(x=>x.hidden=false);}});
})();
