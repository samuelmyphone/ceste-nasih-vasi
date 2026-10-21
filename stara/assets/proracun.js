/* Bilancio partecipativo: filters on the 2025 list + project proposal form. */
(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
// filters
const q=$('#bpq'),cs=$('#bpc'),ps=$('#bpp'),n=$('#bpn');
function f(){const t=(q.value||'').trim().toLowerCase();let k=0;$$('#bplist .proj').forEach(a=>{const ok=(!t||a.dataset.q.includes(t))&&(!cs.value||a.dataset.c.includes(cs.value)||a.dataset.c==='*')&&(!ps.value||a.dataset.p===ps.value);a.hidden=!ok;if(ok)k++;});n.textContent=k+' / '+$$('#bplist .proj').length;}
[q,cs,ps].forEach(e=>e&&e.addEventListener('input',f));if(q)f();
// cost table
const tb=$('#bp-cost tbody'), tot=$('#bp-tot');
function row(){const tr=document.createElement('tr');tr.innerHTML='<td><input type="text" aria-label="Postavka / Voce" maxlength="200"></td><td><input type="number" min="0" step="0.01" inputmode="decimal" aria-label="€" style="text-align:right"></td>';tb.append(tr);}
for(let i=0;i<6;i++)row();
const sum=()=>{let s=0;$$('#bp-cost tbody input[type=number]').forEach(i=>s+=+i.value||0);tot.textContent=s.toLocaleString('sl-SI',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';tot.style.color=(s&&(s<3000||s>15000))?'#c0271b':'';return s;};
tb.addEventListener('input',sum);sum();
// map
let map=null,mk=null;
if(window.L&&$('#bp-map')){map=L.map('bp-map',{scrollWheelZoom:false,dragging:!L.Browser.mobile,tap:false}).setView([45.612,13.86],13);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
  map.on('click',e=>{if(mk)mk.setLatLng(e.latlng);else mk=L.marker(e.latlng,{draggable:true}).addTo(map);});
  document.addEventListener('click',e=>{if(e.target.closest('#t-pr'))setTimeout(()=>map.invalidateSize(),50);});}
// submit
const S=window.SVET, form=$('#bpform'), res=$('#bp-res');
if(!form)return;
if(!S||!S.ready()){const p=document.createElement('p');p.className='notice';p.innerHTML='Spletni obrazec je v pripravi; predlog lahko medtem pošljete na <a href="mailto:cfks.borst@gmail.com">cfks.borst@gmail.com</a>.<br><em>Il modulo è in attivazione: nel frattempo potete inviare la proposta a cfks.borst@gmail.com.</em>';form.before(p);form.querySelector('button[type=submit]').disabled=true;}
function msg(t,ok){res.hidden=false;res.className='result '+(ok?'ok':'err');res.innerHTML=t;res.scrollIntoView({block:'center'});}
async function shrink(file){const url=URL.createObjectURL(file);try{const img=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=url;});const m=1600,k=Math.min(1,m/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return await new Promise(r=>c.toBlob(r,'image/jpeg',.82));}finally{URL.revokeObjectURL(url);}}
form.addEventListener('submit',async e=>{
  e.preventDefault();if($('#bp-hp').value)return;
  const v=id=>$(id).value.trim();
  const need=['#bp-svet','#bp-naslov','#bp-zakaj','#bp-kje','#bp-izb','#bp-ime','#bp-email'];
  if(need.some(i=>!v(i))||!$('#bp-ok').checked){msg('Izpolnite obvezna polja (*). / <em>Compilate i campi obbligatori (*).</em>');return;}
  const stroski=$$('#bp-cost tbody tr').map(tr=>{const [a,b]=tr.querySelectorAll('input');return {postavka:a.value.trim(),znesek:+b.value||0};}).filter(r=>r.postavka||r.znesek);
  const total=sum(); if(!stroski.length){msg('Vpišite vsaj eno postavko stroškov. / <em>Inserite almeno una voce di spesa.</em>');return;}
  const merila={};$$('#bpform [name=m]').forEach(c=>merila[c.value]=c.checked);
  const btn=form.querySelector('button[type=submit]');btn.disabled=true;
  try{const c=await S.getClient();const id=crypto.randomUUID();const priloge=[];
    const files=[...$('#bp-foto').files].slice(0,4);
    for(let i=0;i<files.length;i++){let b;try{b=await shrink(files[i]);}catch(_){b=null;}if(!b)continue;const p=`novo/bp-${id}/${i+1}.jpg`;const {error}=await c.storage.from('fotografije').upload(p,b,{contentType:'image/jpeg'});if(!error)priloge.push(p);}
    const p=mk?mk.getLatLng():null;
    const {error}=await c.from('bp_predlogi').insert({id,consiglio_id:v('#bp-svet'),naslov:v('#bp-naslov'),zakaj:v('#bp-zakaj'),kje:v('#bp-kje'),izboljsave:v('#bp-izb'),vrednost:total||null,stroski,podrocje:($('#bp-podrocje')||{}).value||null,merila,lat:p?p.lat:null,lon:p?p.lng:null,priloge,ime:v('#bp-ime'),email:v('#bp-email'),telefon:v('#bp-tel')||null});
    if(error)throw error;
    form.reset();sum();if(mk){map.removeLayer(mk);mk=null;}
    msg('<b>Hvala! Predlog je bil poslan Svetu.</b> Predsednik ali podpredsednik vas bo kontaktiral in predlog posredoval Občini v predhodni pregled.<br><em>Grazie! La proposta è stata inviata al Consiglio, che vi contatterà e la inoltrerà al Comune per la valutazione preventiva.</em>',true);
  }catch(err){console.error(err);msg('Pošiljanje ni uspelo. / <em>Invio non riuscito.</em> cfks.borst@gmail.com');}
  finally{btn.disabled=false;}
});
})();
