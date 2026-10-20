/* Citizen submission form → Supabase (status 'novo', reviewed by the Consiglio). */
(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const V=window.VASI||{}, S=window.SVET, form=$('#pf');
const qs=new URLSearchParams(location.search);
if(!S||!S.ready()){ $('#off').hidden=false; form.querySelectorAll('input,select,textarea,button').forEach(e=>e.disabled=true); form.style.opacity=.55; }
// consiglio → villages
const svet=$('#f-svet'), vas=$('#f-vas');
function fillVas(){const list=V[svet.value]||[];vas.innerHTML='<option value="">—</option>'+list.map(v=>`<option value="${S.E(v[0]+(v[1]&&v[1]!==v[0]?' / '+v[1]:''))}">${S.E(v[0])}${v[1]&&v[1]!==v[0]?' / '+S.E(v[1]):''}</option>`).join('');
  if(map&&list.length)map.fitBounds(L.latLngBounds(list.map(v=>[v[2],v[3]])).pad(list.length>1?.5:0),{maxZoom:15});}
// map picker
let map=null, mk=null; const ll=$('#f-ll');
if(window.L){
  map=L.map('pickmap',{scrollWheelZoom:false},dragging:!L.Browser.mobile,tap:false}).setView([45.612,13.86],13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
  map.on('click',e=>{if(mk)mk.setLatLng(e.latlng);else mk=L.marker(e.latlng,{draggable:true}).addTo(map).on('dragend',show);show();});
}
function show(){const p=mk.getLatLng();ll.innerHTML=`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} – <span data-l="sl">izbrano</span><span data-l="it">selezionato</span>`;}
vas.addEventListener('change',()=>{const v=(V[svet.value]||[]).find(v=>vas.value.indexOf(v[0])===0);if(v&&map)map.setView([v[2],v[3]],16);});
svet.addEventListener('change',fillVas);
// type-dependent fields
function kind(){const k=(form.querySelector('[name=vrsta]:checked')||{}).value;$('#w-kat').hidden=$('#w-res').hidden=(k&&k!=='cesta');}
$$('[name=vrsta]').forEach(r=>r.addEventListener('change',kind));
if(qs.get('svet')&&V[qs.get('svet')]){svet.value=qs.get('svet');fillVas();}
if(qs.get('vrsta')){const r=form.querySelector(`[name=vrsta][value="${qs.get('vrsta')}"]`);if(r)r.checked=true;}
kind();
// photo resize
async function shrink(file){
  const url=URL.createObjectURL(file);
  try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});
    const m=1600, r=Math.min(1,m/Math.max(img.naturalWidth,img.naturalHeight));
    const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*r);c.height=Math.round(img.naturalHeight*r);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    return await new Promise(res=>c.toBlob(res,'image/jpeg',.82));
  }finally{URL.revokeObjectURL(url);}
}
const res=$('#f-res');
function msg(t,ok){res.hidden=false;res.className='result '+(ok?'ok':'err');res.innerHTML=t;res.scrollIntoView({block:'center'});}
form.addEventListener('submit',async e=>{
  e.preventDefault(); if($('#f-hp').value)return;
  const vrsta=(form.querySelector('[name=vrsta]:checked')||{}).value;
  const opis=$('#f-opis').value.trim();
  if(!svet.value||!vas.value||!vrsta||opis.length<5||!$('#f-ok').checked){msg('Izpolnite obvezna polja (*). / <em>Compilate i campi obbligatori (*).</em>');return;}
  const btn=form.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Pošiljam … / Invio …';
  try{
    const c=await S.getClient(); const id=crypto.randomUUID(); const fotos=[];
    const files=[...$('#f-foto').files].slice(0,4);
    for(let i=0;i<files.length;i++){
      let blob; try{blob=await shrink(files[i]);}catch(_){blob=null;}
      if(!blob){continue;}
      const path=`novo/${id}/${i+1}.jpg`;
      const {error}=await c.storage.from('fotografije').upload(path,blob,{contentType:'image/jpeg',upsert:false});
      if(!error)fotos.push(path);
    }
    const res_=(form.querySelector('[name=res]:checked')||{}).value, ze=(form.querySelector('[name=ze]:checked')||{}).value;
    const p=mk?mk.getLatLng():null;
    const row={id,consiglio_id:svet.value,vas:vas.value,vrsta,kategorija:vrsta==='cesta'?($('#f-kat').value||null):null,kje:$('#f-kje').value.trim()||null,opis,predlog:$('#f-predlog').value.trim()||null,
      resnost:vrsta==='cesta'&&res_?+res_:null,ze_prijavljeno:ze||null,lat:p?+p.lat.toFixed(6):null,lon:p?+p.lng.toFixed(6):null,fotografije:fotos};
    const {error}=await c.from('prijave').insert(row); if(error)throw error;
    const ime=$('#f-ime').value.trim(),email=$('#f-email').value.trim(),tel=$('#f-tel').value.trim();
    if(ime||email||tel)await c.from('kontakti').insert({prijava_id:id,ime:ime||null,email:email||null,telefon:tel||null});
    const skipped=files.length-fotos.length;
    form.reset();if(mk){map.removeLayer(mk);mk=null;ll.textContent='Ni izbrano / Non selezionato';}
    msg(`<b>Hvala! Prijava je bila poslana.</b> Svet jo bo pregledal in objavil na svoji strani.<br><em>Grazie! La segnalazione è stata inviata: il Consiglio la esaminerà e la pubblicherà sulla propria pagina.</em>${skipped?`<br>${skipped} fotografij ni bilo mogoče naložiti (format). / <em>${skipped} foto non caricate (formato non supportato).</em>`:''}`,true);
  }catch(err){console.error(err);msg('Pošiljanje ni uspelo. Poskusite znova ali pišite na cfks.borst@gmail.com. / <em>Invio non riuscito: riprovate o scrivete a cfks.borst@gmail.com.</em>');}
  finally{btn.disabled=false;btn.innerHTML='Pošlji · <em>Invia</em>';}
});
})();
