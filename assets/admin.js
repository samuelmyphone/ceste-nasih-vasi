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
  $('#a-reload').onclick=()=>{load();badge();};$('#a-out').onclick=()=>c.auth.signOut();
  $$('.adm-tabs [data-t]').forEach(btn=>btn.addEventListener('click',()=>{$$('.adm-tabs [data-t]').forEach(x=>x.setAttribute('aria-selected',x===btn));const t=$('#a-tab');t.value=btn.dataset.t;t.dispatchEvent(new Event('change'));}));
  statusOpts();load();badge();
}
function statusOpts(){const tab=$('#a-tab').value;$('#a-status').hidden=(tab==='objave'||tab==='stat');const bp=tab==='bp',s=$('#a-status');s.innerHTML=bp?'<option value="">Vsi / Tutti</option>'+Object.entries(BPST).map(([k,v])=>`<option value="${k}">${v}</option>`).join(''):'<option value="novo">Nove / Nuove</option><option value="objavljeno">Objavljene / Pubblicate</option><option value="zavrnjeno">Zavrnjene / Rifiutate</option><option value="">Vse / Tutte</option>';if(bp)s.value='';}
async function load(){
  const L=$('#a-list');L.innerHTML='<p class="empty">Nalagam … / Caricamento …</p>';
  const tab=$('#a-tab').value; if(tab==='objave')return loadObj(); if(tab==='stat')return loadStat();
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
    const {error}=await c.from(T).delete().eq('id',p.id);if(error){m.textContent=error.message;return;}el.remove();badge();return;}
  if(a==='pub')upd.status='objavljeno'; if(a==='rej')upd.status='zavrnjeno';
  if(a==='mail'){if(!S.CFG.bpEmail){m.textContent='E-naslov Občine še ni določen (config.js → bpEmail). / Indirizzo del Comune non ancora definito.';}
    location.href=bpMail(Object.assign({},p,upd));upd.status='poslano';upd.poslano_at=new Date().toISOString();}
  if(!bp&&upd.status&&upd.status!==p.status||a==='save'||a==='mail'||a==='pub'||a==='rej'){upd.pregledal=me.email;if(!bp)upd.pregledano_at=new Date().toISOString();}
  const {error}=await c.from(T).update(upd).eq('id',p.id);
  m.textContent=error?error.message:'Shranjeno / Salvato ✓';badge();
  if(!error&&(a==='pub'||a==='rej'||a==='mail'))setTimeout(load,600);
}
$('#a-form')?.addEventListener('submit',async e=>{e.preventDefault();const em=$('#a-email').value.trim();const r=$('#a-msg');
  const {error}=await c.auth.signInWithOtp({email:em,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}});
  r.hidden=false;r.className='result '+(error?'err':'ok');r.innerHTML=error?(/signup|not allowed|not found/i.test(error.message)?'Ta e-naslov nima dostopa. Za dostop se obrnite na upravitelja strani. / <em>Questo indirizzo non è abilitato: chiedete l’accesso all’amministratore del sito.</em>':E(error.message)):'Povezava je bila poslana – preverite e-pošto. / <em>Link inviato: controllate la posta.</em>';});

/* ================= OBVESTILA / AVVISI ================= */
const VRO={obvestilo:['Obvestilo','Avviso'],sestanek:['Seja sveta','Riunione del Consiglio'],zupan:['Sestanek z županom','Riunione col Sindaco'],skupscina:['Zbor krajanov','Assemblea pubblica'],dogodek:['Dogodek','Evento'],dela:['Dela, zapore','Lavori, chiusure']};
const SITE=location.href.replace(/upravljanje\.html.*$/,'');
const pad=n=>String(n).padStart(2,'0');
function locDT(iso){if(!iso)return ['',''];const d=new Date(iso);return [d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),(d.getHours()||d.getMinutes())?pad(d.getHours())+':'+pad(d.getMinutes()):''];}
function toISO(d,t){if(!d)return null;return new Date(d+'T'+(t||'00:00')).toISOString();}
function svetOpts(val){const own=me.consiglio_id;let o=own?'':`<option value=""${val==null?' selected':''}>Vsi sveti / Tutti i Consigli</option>`;
  o+=Object.entries(CONS).filter(([k])=>!own||k===own).map(([k,v])=>`<option value="${k}"${k===val?' selected':''}>${k}) ${E(v)}</option>`).join('');return o;}
function objForm(o={}){
  const [zd,zt]=locDT(o.zacetek),[kd,kt]=locDT(o.konec);
  return `<article class="adm-item obj-form" data-id="${o.id||''}">
  <h3 style="margin:0 0 8px">${o.id?'Uredi obvestilo / Modifica avviso':'Novo obvestilo / Nuovo avviso'}</h3>
  <div class="grid g2"><label class="field"><span class="lbl">Svet / Consiglio</span><select data-f="consiglio_id">${svetOpts(o.id?o.consiglio_id:(me.consiglio_id||($('#a-svet').value||null)))}</select></label>
  <label class="field"><span class="lbl">Vrsta / Tipo</span><select data-f="vrsta">${Object.entries(VRO).map(([k,v])=>`<option value="${k}"${k===(o.vrsta||'obvestilo')?' selected':''}>${v[0]} / ${v[1]}</option>`).join('')}</select></label></div>
  <div class="grid g2"><label class="field"><span class="lbl">Naslov (SL) *</span><input data-f="naslov_sl" maxlength="160" value="${E(o.naslov_sl||'')}"></label>
  <label class="field"><span class="lbl">Titolo (IT)</span><input data-f="naslov_it" maxlength="160" value="${E(o.naslov_it||'')}"></label></div>
  <div class="grid g2"><label class="field"><span class="lbl">Besedilo (SL)</span><textarea data-f="besedilo_sl" rows="4">${E(o.besedilo_sl||'')}</textarea></label>
  <label class="field"><span class="lbl">Testo (IT)</span><textarea data-f="besedilo_it" rows="4">${E(o.besedilo_it||'')}</textarea></label></div>
  <div class="grid g4"><label class="field"><span class="lbl">Datum / Data</span><input type="date" data-f="zd" value="${zd}"></label><label class="field"><span class="lbl">Ura / Ora</span><input type="time" data-f="zt" value="${zt}"></label>
  <label class="field"><span class="lbl">Do (datum) / Fino a</span><input type="date" data-f="kd" value="${kd}"></label><label class="field"><span class="lbl">Do (ura) / Ora fine</span><input type="time" data-f="kt" value="${kt}"></label></div>
  <div class="grid g2"><label class="field"><span class="lbl">Kraj / Luogo</span><input data-f="kraj" maxlength="200" value="${E(o.kraj||'')}"></label>
  <label class="field"><span class="lbl">Povezava / Link (neobvezno)</span><input data-f="povezava" type="url" maxlength="500" value="${E(o.povezava||'')}"></label></div>
  <label class="field"><span class="lbl">Priloge (PDF, slike) / Allegati</span><input type="file" data-f="files" multiple accept="application/pdf,image/*">${(o.priloge||[]).length?`<span class="hint">${o.priloge.map(p=>E(p.split('/').pop())).join(', ')}</span>`:''}</label>
  <label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" data-f="objavljeno"${o.objavljeno===false?'':' checked'}> Objavljeno / Pubblicato</label>
  <div class="row-btn"><button class="btn small" type="button" data-o="save">Shrani / Salva</button><button class="btn ghost small" type="button" data-o="cancel">Prekliči / Annulla</button></div>
  <p class="hint" data-msg></p></article>`;
}
function waText(o){
  const v=VRO[o.vrsta]||VRO.obvestilo, w=o.zacetek?new Date(o.zacetek):null;
  const t=w&&(w.getHours()||w.getMinutes())?pad(w.getHours())+'.'+pad(w.getMinutes()):'';
  const sv=o.consiglio_id?CONS[o.consiglio_id]:'';
  const sl=[`*${v[0].toUpperCase()}: ${o.naslov_sl}*`, w?`📅 ${w.getDate()}. ${w.getMonth()+1}. ${w.getFullYear()}${t?', ob '+t:''}`:'', o.kraj?`📍 ${o.kraj}`:'', o.besedilo_sl||''].filter(Boolean);
  const it=[`*${v[1].toUpperCase()}: ${o.naslov_it||o.naslov_sl}*`, w?`📅 ${pad(w.getDate())}/${pad(w.getMonth()+1)}/${w.getFullYear()}${t?', ore '+t:''}`:'', o.kraj?`📍 ${o.kraj}`:'', o.besedilo_it||''].filter(Boolean);
  return [...sl,'',...it,'',`${sv?'Svet KS '+sv.split(',')[0]+' · ':''}${SITE}koledar.html${o.consiglio_id?'?svet='+o.consiglio_id:''}`].join('\n');
}
function objItem(o){
  const v=VRO[o.vrsta]||VRO.obvestilo, w=o.zacetek?new Date(o.zacetek).toLocaleString('sl-SI',{dateStyle:'short',timeStyle:'short'}):'—';
  return `<article class="adm-item" data-id="${o.id}"><div class="top"><span class="status s-${o.objavljeno?'objavljeno':'novo'}">${o.objavljeno?'Objavljeno / Pubblicato':'Osnutek / Bozza'}</span><b>${E(o.consiglio_id?CONS[o.consiglio_id]:'Vsi sveti / Tutti')}</b><span>${E(v[0])} / ${E(v[1])}</span><span>${E(w)}</span></div>
  <h3 style="margin:6px 0">${E(o.naslov_sl)}${o.naslov_it?` / <em>${E(o.naslov_it)}</em>`:''}</h3>${o.kraj?`<p>📍 ${E(o.kraj)}</p>`:''}
  <div class="row-btn"><button class="btn small" type="button" data-o="wa">WhatsApp</button><button class="btn ghost small" type="button" data-o="edit">Uredi / Modifica</button><button class="btn ghost small danger" type="button" data-o="del">Izbriši / Elimina</button></div>
  <div data-wa hidden><textarea readonly rows="9" style="width:100%;font-family:inherit"></textarea><div class="row-btn"><button class="btn small" type="button" data-o="copy">Kopiraj / Copia</button><a class="btn ghost small" target="_blank" rel="noopener" data-o="share">Odpri WhatsApp / Apri WhatsApp</a></div></div><p class="hint" data-msg></p></article>`;
}
let OBJ=[];
async function loadObj(){
  const L=$('#a-list'), sv=$('#a-svet').value;
  let q=c.from('objave').select('*').order('zacetek',{ascending:false,nullsFirst:true}).order('created_at',{ascending:false}).limit(200);
  if(sv)q=q.eq('consiglio_id',sv);
  const {data,error}=await q;
  if(error){L.innerHTML=`<p class="result err">${E(error.message)}</p><p class="hint">Če tabela še ne obstaja, je treba v Supabase zagnati faza1.sql. / Se la tabella non esiste ancora va eseguito faza1.sql su Supabase.</p>`;return;}
  OBJ=data;
  L.innerHTML=`<p class="row-btn"><button class="btn" type="button" id="o-new">+ Novo obvestilo / Nuovo avviso</button><a class="btn ghost" href="koledar.html" target="_blank">Koledar / Calendario ↗</a></p><div id="o-form"></div>`+(data.length?data.map(objItem).join(''):'<p class="empty">Ni obvestil. / Nessun avviso.</p>');
  $('#o-new').onclick=()=>{$('#o-form').innerHTML=objForm();bindForm($('#o-form .obj-form'),{});};
  $$('.adm-item[data-id]',L).forEach(el=>{if(el.classList.contains('obj-form'))return;el.addEventListener('click',e=>{const b=e.target.closest('[data-o]');if(b)objAct(el,b.dataset.o,OBJ.find(x=>x.id===el.dataset.id));});});
}
function bindForm(el,o){
  el.querySelector('[data-o="cancel"]').onclick=()=>{el.remove();};
  el.querySelector('[data-o="save"]').onclick=async()=>{
    const m=el.querySelector('[data-msg]'), f=k=>el.querySelector(`[data-f="${k}"]`), v=k=>f(k).value.trim();
    if(v('naslov_sl').length<3){m.textContent='Manjka naslov (SL). / Manca il titolo (SL).';return;}
    const row={consiglio_id:v('consiglio_id')||null,vrsta:v('vrsta'),naslov_sl:v('naslov_sl'),naslov_it:v('naslov_it')||null,besedilo_sl:v('besedilo_sl')||null,besedilo_it:v('besedilo_it')||null,
      zacetek:toISO(v('zd'),v('zt')),konec:v('kd')?toISO(v('kd'),v('kt')):(v('kt')&&v('zd')?toISO(v('zd'),v('kt')):null),kraj:v('kraj')||null,povezava:(/^https?:\/\//i.test(v('povezava'))?v('povezava'):null),objavljeno:f('objavljeno').checked,avtor:me.email};
    m.textContent='Shranjujem … / Salvataggio …';
    const files=[...f('files').files]; let pri=[...(o.priloge||[])];
    for(const file of files){const path=`${row.consiglio_id||'vsi'}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g,'_')}`;
      const {error}=await c.storage.from('objave').upload(path,file,{upsert:false,contentType:file.type});if(error){m.textContent=error.message;return;}pri.push(path);}
    row.priloge=pri;
    const r=o.id?await c.from('objave').update(row).eq('id',o.id).select().single():await c.from('objave').insert(row).select().single();
    if(r.error){m.textContent=r.error.message;return;}
    await loadObj(); const it=$(`.adm-item[data-id="${r.data.id}"]`); if(it){objAct(it,'wa',r.data);it.scrollIntoView({block:'center'});}
  };
}
async function objAct(el,a,o){
  const m=el.querySelector('[data-msg]');
  if(a==='edit'){$('#o-form').innerHTML=objForm(o);bindForm($('#o-form .obj-form'),o);$('#o-form').scrollIntoView({block:'start'});return;}
  if(a==='del'){if(!confirm('Izbrišem obvestilo? / Eliminare l’avviso?'))return;
    if((o.priloge||[]).length)await c.storage.from('objave').remove(o.priloge);
    const {error}=await c.from('objave').delete().eq('id',o.id);if(error){m.textContent=error.message;return;}el.remove();return;}
  if(a==='wa'){const box=el.querySelector('[data-wa]'),t=waText(o);box.hidden=false;box.querySelector('textarea').value=t;box.querySelector('[data-o="share"]').href='https://wa.me/?text='+encodeURIComponent(t);return;}
  if(a==='copy'){const t=el.querySelector('[data-wa] textarea');try{await navigator.clipboard.writeText(t.value);}catch(_){t.select();document.execCommand('copy');}m.textContent='Kopirano – prilepite v skupino WhatsApp. / Copiato – incollalo nel gruppo WhatsApp.';}
}
/* ================= STATISTIKA ================= */
async function loadStat(){
  const L=$('#a-list'); const dni=+(L.dataset.dni||30);
  const svet=me.consiglio_id||($('#a-svet').value||null);
  const {data,error}=await c.rpc('statistika',{dni,svet});
  if(error){L.innerHTML=`<p class="result err">${E(error.message)}</p><p class="hint">Če funkcija še ne obstaja, je treba v Supabase zagnati faza1.sql. / Se la funzione non esiste ancora va eseguito faza1.sql su Supabase.</p>`;return;}
  const d=data||{}, days=d.po_dnevih||[], mx=Math.max(1,...days.map(x=>x.n));
  const tbl=(rows,k,h)=>`<table class="bpt"><thead><tr><th>${h}</th><th style="text-align:right">#</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${E(r[k])}</td><td style="text-align:right">${r.n}</td></tr>`).join('')||'<tr><td colspan="2">—</td></tr>'}</tbody></table>`;
  const j=d.jeziki||{},n=d.naprave||{};
  L.innerHTML=`<div class="row-btn">${[7,30,90,365].map(x=>`<button type="button" class="btn small${x===dni?'':' ghost'}" data-dni="${x}">${x} dni / giorni</button>`).join('')}</div>
  <div class="stats"><div><b>${d.skupaj||0}</b><span>ogledov strani / pagine viste</span></div><div><b>${j.sl||0} · ${j.it||0}</b><span>SLO · ITA</span></div><div><b>${n.m||0} · ${n.d||0}</b><span>telefon · računalnik / telefono · computer</span></div></div>
  <div class="panel"><h3 style="margin-top:0">Po dnevih / Per giorno</h3><div class="st-bars">${days.map(x=>`<div title="${x.d}: ${x.n}"><i style="height:${Math.round(x.n/mx*100)}%"></i></div>`).join('')}</div><p class="hint">${days.length?days[0].d+' → '+days[days.length-1].d:''}</p></div>
  ${svet?`<p class="hint">Samo strani krajevne skupnosti ${E(CONS[svet]||svet)} (/sveti/…). Domača stran, koledar in obrazec so skupni vsem in so šteti samo v skupni statistiki. / <em>Solo le pagine della frazione (/sveti/…). Home, calendario e modulo sono comuni e compaiono solo nella statistica generale.</em></p>`:`<div class="panel"><h3 style="margin-top:0">Po krajevnih skupnostih / Per frazione</h3><table class="bpt"><thead><tr><th>Svet / Consiglio</th><th style="text-align:right">#</th></tr></thead><tbody>${(d.po_svetih||[]).map(r=>`<tr><td>${E(r.id)}) ${E(r.ime)}</td><td style="text-align:right">${r.n}</td></tr>`).join('')}</tbody></table><p class="hint">Ogledi strani posameznih svetov (/sveti/…). Za podrobnosti izberite svet zgoraj. / <em>Visite alle pagine dei singoli Consigli; per i dettagli scegliete il Consiglio in alto.</em></p></div>`}
  <div class="grid g2"><div class="panel"><h3 style="margin-top:0">Strani / Pagine</h3>${tbl(d.strani||[],'p','Stran / Pagina')}</div><div class="panel"><h3 style="margin-top:0">Od kod / Provenienza</h3>${tbl(d.viri||[],'v','Vir / Fonte')}</div></div>
  <p class="hint">Brez piškotkov in osebnih podatkov. / Senza cookie né dati personali.</p>`;
  $$('[data-dni]',L).forEach(b=>b.onclick=()=>{L.dataset.dni=b.dataset.dni;loadStat();});
}
/* ================= ŠTEVEC / CONTATORE ================= */
async function badge(){
  try{const sv=me.consiglio_id;
    let q1=c.from('prijave').select('id',{count:'exact',head:true}).eq('status','novo'); if(sv)q1=q1.eq('consiglio_id',sv);
    let q2=c.from('bp_predlogi').select('id',{count:'exact',head:true}).eq('status','novo'); if(sv)q2=q2.eq('consiglio_id',sv);
    const [a,b]=await Promise.all([q1,q2]);
    const n1=$('[data-n="prijave"]'),n2=$('[data-n="bp"]');
    if(n1)n1.textContent=a.count||''; if(n2)n2.textContent=b.count||'';
  }catch(_){}
}
init();
})();
