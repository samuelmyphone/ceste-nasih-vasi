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
// hero video: source chosen once (mobile/desktop), poster first, respects reduced motion + save-data,
// pauses off-screen / in background tabs, manual pause sticks, failures keep the poster.
const hh=$('.hh');
if(hh){const v=$('.hh-video',hh),btn=$('.hpp',hh);
 if(v&&btn){
  const LBL={pause:{sl:'Ustavi video',it:'Metti in pausa il video'},play:{sl:'Predvajaj video',it:'Avvia il video'}};
  const saveData=!!(navigator.connection&&navigator.connection.saveData);
  let userPaused=false,visible=true,loaded=false,failed=false;
  const lang=()=>(window.KSLANG&&KSLANG.get())||'sl';
  function label(){const k=v.paused?'play':'pause';const t=LBL[k][lang()];btn.setAttribute('aria-label',t);btn.title=t;btn.setAttribute('aria-pressed',String(!v.paused));hh.classList.toggle('paused',v.paused);}
  function load(){if(loaded)return;loaded=true;const mob=matchMedia('(max-width:860px)').matches;v.src=mob?v.dataset.srcMobile:v.dataset.src;}
  function tryPlay(){if(failed||userPaused||!visible||document.hidden)return;load();const p=v.play();if(p&&p.catch)p.catch(()=>{label();});}
  v.addEventListener('playing',()=>{hh.classList.add('vplay');label();});
  v.addEventListener('pause',label);
  v.addEventListener('error',()=>{failed=true;hh.classList.remove('vplay');btn.hidden=true;});
  btn.hidden=false;
  btn.addEventListener('click',()=>{if(v.paused){userPaused=false;failed=false;load();v.play().catch(()=>{});}else{userPaused=true;v.pause();}label();});
  addEventListener('ks-lang',label);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)v.pause();else tryPlay();});
  if('IntersectionObserver' in window)new IntersectionObserver(es=>es.forEach(e=>{visible=e.isIntersecting;if(!visible)v.pause();else tryPlay();}),{threshold:.15}).observe(hh);
  if(RM||saveData){userPaused=true;}  // poster only; the button starts the video on request
  label();tryPlay();
 }
}
// light depth effects (fine pointer + motion allowed only)
if(!RM&&FINE){
 const hin=$('.hh-in'),hh2=$('.hh');
 if(hin&&hh2){let raf=0;const f=()=>{raf=0;const y=Math.max(0,Math.min(scrollY,hh2.offsetHeight));hin.style.transform=`translate3d(0,${(y*.22).toFixed(1)}px,0)`;hin.style.opacity=String(1-Math.min(.6,y/hh2.offsetHeight*.9));};
  addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(f);},{passive:true});}
 $$('.tilt').forEach(el=>{let r=null;
  el.addEventListener('pointerenter',()=>{r=el.getBoundingClientRect();el.classList.add('tilting');});
  el.addEventListener('pointermove',e=>{if(!r)r=el.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
   el.style.transform=`perspective(900px) rotateX(${(-y*5).toFixed(2)}deg) rotateY(${(x*6).toFixed(2)}deg) translateY(-4px)`;el.style.setProperty('--gx',((x+.5)*100).toFixed(1)+'%');el.style.setProperty('--gy',((y+.5)*100).toFixed(1)+'%');});
  el.addEventListener('pointerleave',()=>{r=null;el.classList.remove('tilting');el.style.transform='';});});
}
// dated items: an event that has ended must not look upcoming
const now=Date.now();
$$('[data-until]').forEach(el=>{const t=Date.parse(el.dataset.until);if(!isNaN(t)&&now>t){el.classList.add('past');$$('[data-when=future]',el).forEach(x=>x.hidden=true);$$('[data-when=past]',el).forEach(x=>x.hidden=false);}});
})();
