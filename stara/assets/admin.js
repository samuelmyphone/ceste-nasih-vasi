/* Admin console for Presidents / Vice-presidents: review, publish, reject, answer; BP proposals. */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const S=window.SVET, CONS=window.CONS||{}, E=S.E;
if(!S.ready()){$('#a-off').hidden=false;return;}
let c, me=null, kontakti={};
const BPST={novo:'Nov / Nuova',v_pregledu:'V pregledu / In esame',dopolniti:'Dopolniti / Da integrare',poslano:'Poslano Občini / Inviata al Comune',zavrnjeno:'Zavrnjeno / Respinta'};
function sel(name,obj,val){return `<select data-f="${name}">`+Object.entries(obj).map(([k,v])=>`<option value="${k}"${k===val?' selected':''}>${E(Array.isArray(v)?v[0]+' / '+v[1]:v)}</option>`).join('')+'</select>';}
async function init(){
  c=await S.getClient();
  const {data:{session}}=await c.auth.getSession();
  const had=!!session;
  // reload only on a real change (login from the email link / logout), never on session restore or token refresh
  c.auth.onAuthStateChange((ev,s)=>{if(ev==='SIGNED_OUT'&&had)location.reload();else if(ev==='SIGNED_IN'&&!had&&s)location.reload();});
  if(session&&/access_token|^#$/.test(location.hash)||location.hash==='#')history.replaceState(null,'',location.pathname+location.search);
  if(!session){$('#a-login').hidden=false;return;}
  const email=session.user.email;
  const {data}=await c.from('admini').select('email,consiglio_id,vloga').ilike('email',email);
  me=data&&data[0];
  if(!me){$('#a-login').hidden=false;$('#a-form').hidden=true;$('#a-login').insertAdjacentHTML('beforeend',`<p class="result err">${E(email)}: ni pooblastila za upravljanje. / <em>non autorizzato.</em></p><button class="btn ghost small" type="button" id="a-out2">Odjava / Esci</button>`);$('#a-out2').onclick=()=>c.auth.signOut();return;}
  $('#a-app').hidden=false;
  $('#a-who').textContent=`${email} · ${me.consiglio_id?CONS[me.consiglio_id]:'vsi sveti / tutti i Consigli'}`;
  const sv=$('#a-svet');
  sv.innerHTML=(me.consiglio_id?'':'<option value="">Vsi sveti / Tutti</option>')+Object.entries(CONS).filter(([k])=>!me.consiglio_id||k===me.consiglio_id).map(([k,v])=>`<option value="${k}">${k}) ${E(v)}</option>`).join('');
  ['#a-svet','#a-tab','#a-status'].forEach(s=>$(s).addEventListener('change',()=>{if(s==='#a-tab')statusOpts();load();}));
  $('#a-reload').onclick=load;$('#a-out').onclick=()=>c.auth.signOut();
  statusOpts();load();
}
function statusOpts(){const bp=$('#a-tab').value==='bp',s=$('#a-status');s.innerHTML=bp?'<option value="">Vsi / Tutti</option>'+Object.entries(BPST).map(([k,v])=>`<option value="${k}">${v}</option>`).join(''):'<option value="novo">Nove / Nuove</option><option value="objavljeno">Objavljene / Pubblicate</option><option value="zavrnjeno">Zavrnjene / Rifiutate</option><option value="">Vse / Tutte</option>';if(bp)s.value='';}
async function load(){
  const L=$('#a-list');L.innerHTML='<p class="empty">Nalagam … / Caricamento …</p>';
  const bp=$('#a-tab').value==='bp', sv=$('#a-svet').value, st=$('#a-status').value;
  let q=c.from(bp?'bp_predlogi':'prijave').select('*').order('created_at',{ascending:false}).limit(300);
  if(sv)q=q.eq('consiglio_id',sv); if(st)q=q.eq('status',st);
  const {data,error}=await q;
  if(error){L.innerHTML=`<p class="result err">${E(error.message)}</p>`;return;}
  if(!data.length){L.innerHTML='<p class="empty">Ni zapisov. / Nessun elemento.</p>';return;}
  if(!bp){const ids=data.map(d=>d.id);const {data:k}=await c.from('kontakti').select('*').in('prijava_id',ids);kontakti={};(k||[]).forEach(x=>kontakti[x.prijava_id]=x);}
  L.innerHTML=data.map(bp?bpItem:item).join('');
  $$('.adm-item',L).forEach(el=>el.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(b)act(el,b.dataset.a,bp,data.find(d=>d.id===el.dataset.id));}));
}
function item(p){
  const k=kontakti[p.id], v=S.VRSTE[p.vrsta]||[p.vrsta,''];
  const ph=(p.fotografije||[]).map(f=>`<img src="${E(S.fotoUrl(f))}" alt="" data-zoom="${E(S.fotoUrl(f))}">`).join('');
  return `<article class="adm-item" data-id="${p.id}">
  <div class="top"><span class="status s-${p.status}">${E((S.STATUS[p.status]||[p.status])[0])}</span><b>${E(CONS[p.consiglio_id]||p.consiglio_id)}</b><span>${E(p.vas)}</span><span>${E(v[0])} / <em>${E(v[1])}</em></span>${p.resnost?`<span>${E(S.RES[p.resnost][0])}</span>`:''}<span>${S.fmtDate(p.created_at)}</span></div>
  ${p.kategorija?`<p><b>Kategorija:</b> ${E(p.kategorija)}</p>`:''}${p.kje?`<p><b>Kje / Dove:</b> ${E(p.kje)}</p>`:''}
  ${p.lat?`<p><a href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=18/${p.lat}/${p.lon}" target="_blank" rel="noopener">Zemljevid / Mappa ↗</a></p>`:''}
  <label class="field"><span class="lbl">Opis (uredite, če vsebuje osebne podatke) / <em>Descrizione (modificabile)</em></span><textarea data-f="opis">${E(p.opis)}</textarea></label>
  <label class="field"><span class="lbl">Predlog / <em>Proposta</em></span><textarea data-f="predlog">${E(p.predlog||'')}</textarea></label>
  ${ph?`<div class="phs">${ph}</div>`:''}
  <div class="grid g3"><label class="field"><span class="lbl">Oznaka / <em>Codice</em> (npr. B8)</span><input data-f="oznaka" value="${E(p.oznaka||'')}"></label>
  <label class="field"><span class="lbl">Napredek / <em>Stato</em></span>${sel('napredek',S.NAP,p.napredek)}</label>
  <div class="field"><span class="lbl">Kontakt (ni javno / non pubblico)</span><span>${k?E([k.ime,k.email,k.telefon].filter(Boolean).join(' · ')):'—'}</span></div></div>
  <label class="field"><span class="lbl">Odgovor Sveta (javno) / <em>Risposta del Consiglio (pubblica)</em></span><textarea data-f="odgovor">${E(p.odgovor||'')}</textarea></label>
  <div class="row-btn"><button class="btn small" data-a="pub" type="button">Objavi / Pubblica</button><button class="btn ghost small" data-a="save" type="button">Shrani / Salva</button><button class="btn ghost small" data-a="rej" type="button">Zavrni / Rifiuta</button><button class="btn ghost small danger" data-a="del" type="button">Izbriši / Elimina</button></div>
  <p class="hint" data-msg></p></article>`;
}
function bpItem(p){
  const rows=(p.stroski||[]).map(r=>`<tr><td>${E(r.postavka)}</td><td style="text-align:right">${(+r.znesek||0).toLocaleString('sl-SI',{minimumFractionDigits:2})} €</td></tr>`).join('');
  const m=Object.entries(p.merila||{}).map(([k,v])=>`${v?'☑':'☐'} ${E(k)}`).join(' · ');
  return `<article class="adm-item" data-id="${p.id}">
  <div class="top"><span class="status s-${p.status==='poslano'?'objavljeno':p.status==='zavrnjeno'?'zavrnjeno':'novo'}">${E(BPST[p.status]||p.status)}</span><b>${E(CONS[p.consiglio_id]||'')}</b><span>${S.fmtDate(p.created_at)}</span>${p.poslano_at?`<span>poslano ${S.fmtDate(p.poslano_at)}</span>`:''}</div>
  <h3 style="margin:6px 0">${E(p.naslov)}</h3>
  <p><b>1. Zakaj / Perché:</b> ${E(p.zakaj)}</p><p><b>2. Kje / Dove:</b> ${E(p.kje)}${p.lat?` – <a href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=18/${p.lat}/${p.lon}" target="_blank" rel="noopener">zemljevid ↗</a>`:''}</p><p><b>3. Izboljšave / Migliorie:</b> ${E(p.izboljsave)}</p>
  <table style="width:100%;max-width:560px;border-collapse:collapse">${rows}<tr><th style="text-align:right">Skupaj / Totale</th><th style="text-align:right">${(+p.vrednost||0).toLocaleString('sl-SI',{minimumFractionDigits:2})} €</th></tr></table>
  ${p.podrocje?`<p><b>Področje / Area:</b> ${E(p.podrocje)}</p>`:''}<p class="hint">${m}</p>
  ${(p.priloge||[]).length?`<div class="phs">${p.priloge.map(f=>`<img src="${E(S.fotoUrl(f))}" alt="" data-zoom="${E(S.fotoUrl(f))}">`).join('')}</div>`:''}
  <p><b>Predlagatelj / Proponente:</b> ${E(p.ime)} · <a href="mailto:${E(p.email)}">${E(p.email)}</a>${p.telefon?' · '+E(p.telefon):''}</p>
  <div class="grid g2"><label class="field"><span class="lbl">Status</span>${sel('status',BPST,p.status)}</label><label class="field"><span class="lbl">Opomba Sveta / <em>Nota del Consiglio</em></span><textarea data-f="opomba_sveta">${E(p.opomba_sveta||'')}</textarea></label></div>
  <div class="row-btn"><button class="btn small" data-a="mail" type="button">Pošlji Občini (e-pošta) / Invia al Comune</button><button class="btn ghost small" data-a="save" type="button">Shrani / Salva</button><button class="btn ghost small danger" data-a="del" type="button">Izbriši / Elimina</button></div>
  <p class="hint" data-msg></p></article>`;
}
function bpMail(p){
  const to=(S.CFG.bpEmail||'');
  const eur=n=>(+n||0).toLocaleString('it-IT',{minimumFractionDigits:2})+' €';
  const body=[`Svet krajevne skupnosti ${CONS[p.consiglio_id]} posreduje v predhodni pregled predlog za participativni proračun ${p.leto}.`,`Il Consiglio delle frazioni trasmette per una valutazione preventiva la seguente proposta per il bilancio partecipativo ${p.leto}.`,'',
   `Naziv / Titolo: ${p.naslov}`,'',`1. Zakaj / Perché: ${p.zakaj}`,'',`2. Kje / Dove: ${p.kje}${p.lat?` (${(+p.lat).toFixed(5)}, ${(+p.lon).toFixed(5)})`:''}`,'',`3. Izboljšave / Migliorie: ${p.izboljsave}`,'',
   `4.–5. Stroški / Spese (IVA incl.):`,...(p.stroski||[]).map(r=>`   - ${r.postavka}: ${eur(r.znesek)}`),`   Skupaj / Totale: ${eur(p.vrednost)}`,'',
   p.opomba_sveta?`Opomba Sveta / Nota del Consiglio: ${p.opomba_sveta}`:'',
   `Predlagatelj / Proponente: ${p.ime} – ${p.email}${p.telefon?' – '+p.telefon:''}`,'',
   'Prosimo za predhodno mnenje o skladnosti s pravilnikom (čl. 9) pred uradno oddajo.','Si chiede un parere preventivo sulla conformità al regolamento (art. 9) prima della presentazione ufficiale.'].filter((l,i,a)=>l!==''||a[i-1]!=='').join('\n');
  return `mailto:${encodeURIComponent(to)}?cc=${encodeURIComponent(p.email)}&subject=${encodeURIComponent('Participativni proračun / Bilancio partecipativo – predlog: '+p.naslov)}&body=${encodeURIComponent(body)}`;
}
async function act(el,a,bp,p){
  const m=$('[data-msg]',el), val=f=>{const x=$(`[data-f="${f}"]`,el);return x?x.value.trim():undefined;};
  const T=bp?'bp_predlogi':'prijave'; let upd={};
  if(bp){upd={status:val('status'),opomba_sveta:val('opomba_sveta')||null};}
  else{upd={opis:val('opis'),predlog:val('predlog')||null,oznaka:val('oznaka')||null,napredek:val('napredek'),odgovor:val('odgovor')||null};}
  if(a==='del'){if(!confirm('Izbrišem dokončno? / Eliminare definitivamente?'))return;
    const paths=bp?(p.priloge||[]):(p.fotografije||[]);if(paths.length)await c.storage.from('fotografije').remove(paths);
    const {error}=await c.from(T).delete().eq('id',p.id);if(error){m.textContent=error.message;return;}el.remove();return;}
  if(a==='pub')upd.status='objavljeno'; if(a==='rej')upd.status='zavrnjeno';
  if(a==='mail'){if(!S.CFG.bpEmail){m.textContent='E-naslov Občine še ni določen (config.js → bpEmail). / Indirizzo del Comune non ancora definito.';}
    location.href=bpMail(Object.assign({},p,upd));upd.status='poslano';upd.poslano_at=new Date().toISOString();}
  if(!bp&&upd.status&&upd.status!==p.status||a==='save'||a==='mail'||a==='pub'||a==='rej'){upd.pregledal=me.email;if(!bp)upd.pregledano_at=new Date().toISOString();}
  const {error}=await c.from(T).update(upd).eq('id',p.id);
  m.textContent=error?error.message:'Shranjeno / Salvato ✓';
  if(!error&&(a==='pub'||a==='rej'||a==='mail'))setTimeout(load,600);
}
$('#a-form')?.addEventListener('submit',async e=>{e.preventDefault();const em=$('#a-email').value.trim();const r=$('#a-msg');
  const {error}=await c.auth.signInWithOtp({email:em,options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}});
  r.hidden=false;r.className='result '+(error?'err':'ok');r.innerHTML=error?E(error.message):'Povezava je bila poslana – preverite e-pošto. / <em>Link inviato: controllate la posta.</em>';});
init();
})();
