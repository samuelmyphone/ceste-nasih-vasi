#!/usr/bin/env python3
"""Mesečni povzetek prijav krajanov / Riepilogo mensile delle segnalazioni dei residenti.

Input:
  --db FILE       JSON delle segnalazioni dal database (senza dati personali: nessun nome, email o telefono)
  --bp FILE       JSON delle proposte BP dal database (facoltativo)
  --mese YYYY-MM  mese del riepilogo (default: mese corrente)
  --prova         aggiunge la fascia "bozza di prova"
Fonti fisse dal sito: sveti/borst/ceste.html (punti raccolti), assets/comune.json (atti del Comune).
Output: HTML email-safe su stdout (o --out FILE).
"""
import argparse, datetime, html, json, math, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..')
SITE = 'https://cfks-dolina.org/'
E = lambda s: html.escape(str(s or ''), quote=True)
SVETI = {'a': ('Dolina–Kroglje', 'Dolina–Crogole', 'dolina'), 'b': ('Boljunec', 'Bagnoli della Rosandra', 'boljunec'),
         'c': ('Boršt–Pesek', 'Boršt–Pesek', 'borst'), 'd': ('Ricmanje–Log', 'San Giuseppe–Log', 'ricmanje'),
         'e': ('Domjo', 'Domio', 'domjo'), 'f': ('Mačkolje–Prebeneg', 'Caresana–Prebeneg', 'mackolje'),
         'g': ('Žavlje–Frankovec', 'Aquilinia–Francovez', 'zavlje')}
MES_SL = ['januar', 'februar', 'marec', 'april', 'maj', 'junij', 'julij', 'avgust', 'september', 'oktober', 'november', 'december']
MES_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
GRAV = {3: ('Nevarnost', 'Pericolo', '#c0271b'), 2: ('Vsakodnevna ovira', 'Disagio', '#D34817'), 1: ('Manjša nevšečnost', 'Fastidio', '#7d776f')}
NAP = {'zbrano': ('Prejeto', 'Ricevuta'), 'posredovano': ('Posredovano Občini', 'Inoltrata al Comune'),
       'v_obravnavi': ('V obravnavi', 'In esame'), 'v_izvajanju': ('V izvajanju', 'In esecuzione'),
       'reseno': ('Rešeno', 'Risolta'), 'ni_izvedljivo': ('Ni izvedljivo', 'Non realizzabile')}
ZAPRTO = {'reseno', 'ni_izvedljivo'}
VRSTA = {'cesta': ('Težava na cesti', 'Problema stradale'), 'pripomba': ('Pripomba', 'Osservazione'), 'predlog': ('Predlog', 'Proposta'),
         'vprasanje': ('Vprašanje', 'Domanda'), 'ideja': ('Ideja', 'Idea'), 'projekt': ('Projekt', 'Progetto')}

# stile
C_INK, C_MUT, C_LINE, C_ACC, C_BRAND = '#1d2a35', '#5f6b76', '#e3e7eb', '#D34817', '#1d3b53'
FONT = "font-family:Arial,Helvetica,sans-serif"


def bi(sl, it, tag='div', st=''):
    return f'<{tag} style="{st}">{sl}<br><span style="color:{C_MUT};font-style:italic">{it}</span></{tag}>'


def h2(n, sl, it):
    return (f'<h2 style="{FONT};font-size:18px;color:{C_BRAND};margin:30px 0 4px;border-bottom:2px solid {C_ACC};padding-bottom:6px">'
            f'{n}. {sl} <span style="color:{C_MUT};font-weight:normal;font-size:15px">/ {it}</span></h2>')


def note(sl, it):
    return f'<p style="{FONT};font-size:13px;color:{C_MUT};margin:4px 0 10px">{sl}<br><i>{it}</i></p>'


def badge(txt, col):
    return f'<span style="display:inline-block;background:{col};color:#fff;font-size:11px;font-weight:bold;border-radius:10px;padding:2px 8px;letter-spacing:.04em">{txt}</span>'


def dist(a, b):
    R = 6371000
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    return 2 * R * math.asin(math.sqrt(math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2))


def strip(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s or '')).strip()


# --- fonti --------------------------------------------------------------------------------
def tocke_borst():
    """24 punti raccolti dal Consiglio Boršt–Pesek (modulo online, ottobre 2026)."""
    s = open(os.path.join(ROOT, 'sveti/borst/ceste.html'), encoding='utf-8').read()
    pts = json.loads(re.search(r'var PTS=(\[.*?\]);', s, re.S).group(1))
    out = []
    for p in pts:
        m = re.search(r'id="c-' + p['id'] + r'".*?</article>', s, re.S)
        art = m.group(0) if m else ''
        probs = re.findall(r'<li>(.*?)</li>', (re.search(r'<ul class="prob">(.*?)</ul>', art, re.S) or [None, ''])[1], re.S)
        prob = []
        for li in probs:
            sl, _, it = li.partition('<br>')
            prob.append((strip(sl), strip(it)))
        pr = re.search(r'<div class="prop">.*?<p>(.*?)</p>', art, re.S)
        prs, _, pri = (pr.group(1) if pr else '').partition('<br>')
        ze = re.search(r'Già segnalato al Comune</em>: ([^<]*)', art)
        vas = re.search(r'<td><a href="#c-' + p['id'] + r'">\w+</a></td><td>([^<]*)</td>', s)
        out.append(dict(oz=p['id'], vas=vas.group(1) if vas else '', sl=html.unescape(p['sl']), it=html.unescape(p['it']), prob=prob,
                        predlog=(strip(prs), strip(pri)), res={'g3': 3, 'g2': 2, 'g1': 1}[p['g']],
                        lat=p['lat'], lon=p['lon'], ze=(ze.group(1).strip() if ze else '—'), vir='zbirka',
                        url=f"{SITE}sveti/borst/ceste.html#c-{p['id']}", svet='c', created='2026-10-01', napredek='zbrano'))
    return out


def prijave_db(path):
    if not path or not os.path.exists(path):
        return []
    rows = json.load(open(path, encoding='utf-8')) or []
    out = []
    for r in rows:
        if r.get('st') == 'zavrnjeno':
            continue
        c = r['c'][:10]
        code = r.get('oz') or f"{r['s'].upper()}-{c[2:4]}{c[5:7]}-{r['id'][:4].upper()}"
        out.append(dict(oz=code, vas=r.get('vas', ''), sl=r.get('kat') or VRSTA.get(r['v'], (r['v'],))[0],
                        it=r.get('kat') or '', vrsta=r['v'], prob=[(r.get('opis', ''), '')] + ([(f"Kje: {r['kje']}", f"Dove: {r['kje']}")] if r.get('kje') else []),
                        predlog=(r.get('predlog') or '', ''), res=r.get('res') or 0, lat=r.get('lat'), lon=r.get('lon'),
                        ze=r.get('ze') or '—', vir='spletna stran', foto=r.get('f', 0), objavljeno=r.get('st') == 'objavljeno',
                        url=f"{SITE}sveti/{SVETI[r['s']][2]}/", svet=r['s'], created=c, updated=r['u'][:10],
                        napredek=r.get('n', 'zbrano'), odgovor=r.get('odg')))
    return out


def comune():
    try:
        return json.load(open(os.path.join(ROOT, 'assets/comune.json'), encoding='utf-8'))
    except Exception:
        return {'albo': [], 'rss': []}


def tocke_sestanka():
    """Questioni presentate all'incontro col Sindaco del 21/10/2026 (dal sito)."""
    s = open(os.path.join(ROOT, 'sestanek-2026-10-21.html'), encoding='utf-8').read()
    out = []
    for b, sp in re.findall(r'<li><b>(.*?)</b><span>(.*?)</span></li>', s, re.S):
        sl = re.search(r'data-l="sl"[^>]*>(.*?)</span>', b); it = re.search(r'data-l="it"[^>]*>(.*?)</span>', b)
        out.append((strip(sl.group(1) if sl else b), strip(it.group(1) if it else '')))
    return out


# --- rendering ------------------------------------------------------------------------------
def card(p, nuovo=False, oggi=None):
    g = GRAV.get(p['res'])
    top = f'<b style="font-size:15px">{E(p["oz"])}</b> · {E(p["vas"])}'
    if nuovo:
        top += ' ' + badge('NOVO / NUOVO', C_ACC)
    if g:
        top += ' ' + badge(f'{g[0]} / {g[1]}', g[2])
    if oggi and p['napredek'] not in ZAPRTO:
        d = (oggi - datetime.date.fromisoformat(p['created'])).days
        top += f' <span style="color:{C_MUT};font-size:12px">· odprto {d} dni / aperta da {d} giorni</span>'
    tit = bi(f'<b>{E(p["sl"])}</b>', E(p['it']), st='margin:6px 0') if p['it'] and p['it'] != p['sl'] else f'<div style="margin:6px 0"><b>{E(p["sl"])}</b></div>'
    pr = ''.join(f'<li style="margin:0 0 4px">{E(a)}' + (f'<br><span style="color:{C_MUT};font-style:italic">{E(b)}</span>' if b else '') + '</li>' for a, b in p['prob'][:3])
    if len(p['prob']) > 3:
        pr += f'<li style="color:{C_MUT}">… +{len(p["prob"]) - 3}</li>'
    prop = ''
    if p['predlog'][0]:
        prop = (f'<div style="margin:6px 0 0;padding:6px 10px;background:#f4f7f9;border-radius:6px"><b>Predlog / Proposta:</b> {E(p["predlog"][0])}'
                + (f'<br><span style="color:{C_MUT};font-style:italic">{E(p["predlog"][1])}</span>' if p['predlog'][1] else '') + '</div>')
    nap = NAP.get(p['napredek'], (p['napredek'], ''))
    links = [f'<a href="{E(p["url"])}" style="color:{C_BRAND}">Na spletni strani / Sul sito</a>']
    if p.get('lat'):
        links.append(f'<a href="https://www.openstreetmap.org/?mlat={p["lat"]}&mlon={p["lon"]}#map=18/{p["lat"]}/{p["lon"]}" style="color:{C_BRAND}">Zemljevid / Mappa</a>')
    meta = (f'Stanje / Stato: <b>{nap[0]} / {nap[1]}</b> · Že prijavljeno Občini / Già segnalato al Comune: {E(p["ze"])}'
            + (f' · Fotografije / Foto: {p["foto"]}' if p.get('foto') else '') + ' · ' + ' · '.join(links))
    odg = f'<div style="margin:6px 0 0"><b>Odgovor / Risposta:</b> {E(p["odgovor"])}</div>' if p.get('odgovor') else ''
    return (f'<div style="border:1px solid {C_LINE};border-left:4px solid {(g or (0, 0, C_BRAND))[2]};border-radius:8px;padding:10px 14px;margin:0 0 10px;{FONT};font-size:14px;color:{C_INK}">'
            f'{top}{tit}<ul style="margin:4px 0 0;padding-left:18px">{pr}</ul>{prop}{odg}'
            f'<div style="margin:8px 0 0;font-size:12px;color:{C_MUT}">{meta}</div></div>')


def gruppi(points, raggio=150):
    pts = [p for p in points if p.get('lat')]
    used, out = set(), []
    for p in pts:
        if p['oz'] in used:
            continue
        g = [q for q in pts if dist((p['lat'], p['lon']), (q['lat'], q['lon'])) <= raggio]
        if len(g) >= 3:
            for q in g:
                used.add(q['oz'])
            out.append(g)
    return out


def build(mese, db_path, bp_path, prova, oggi):
    y, m = map(int, mese.split('-'))
    m0 = datetime.date(y, m, 1)
    m1 = datetime.date(y + (m == 12), m % 12 + 1, 1)
    inmese = lambda d: m0.isoformat() <= d < m1.isoformat()
    tutte = tocke_borst() + prijave_db(db_path)
    nuove = [p for p in tutte if inmese(p['created'])]
    vecchie = [p for p in tutte if p['created'] < m0.isoformat() and p['napredek'] not in ZAPRTO]
    risolte = [p for p in tutte if p['napredek'] in ZAPRTO and inmese(p.get('updated', p['created']))]
    oltre60 = [p for p in tutte if p['napredek'] in ('zbrano', 'posredovano') and (oggi - datetime.date.fromisoformat(p['created'])).days > 60]
    key = lambda p: (-p['res'], p['svet'], p['oz'])
    cm = comune()
    bp_rows = json.load(open(bp_path, encoding='utf-8')) if bp_path and os.path.exists(bp_path) else []
    per = f'{MES_SL[m - 1]} {y}', f'{MES_IT[m - 1]} {y}'
    fino = oggi < m1 - datetime.timedelta(days=1)

    H = [f'<div style="background:#eef2f5;padding:18px 0"><div style="max-width:760px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;{FONT};color:{C_INK}">',
         f'<div style="height:6px;background:{C_ACC}"></div><div style="padding:20px 26px">']
    if prova:
        H.append(f'<div style="background:#fff6cc;border:1px solid #e6c200;border-radius:8px;padding:8px 12px;font-size:13px;margin:0 0 14px">'
                 f'<b>OSNUTEK ZA PREIZKUS / BOZZA DI PROVA</b> – poslano samo upravitelju, ne Občini. / inviata solo all’amministratore, non al Comune.</div>')
    H.append(f'<div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:{C_ACC};font-weight:bold">Sveti krajevnih skupnosti Občine Dolina · Consigli delle frazioni del Comune di San Dorligo della Valle</div>')
    H.append(f'<h1 style="font-size:24px;margin:6px 0 2px;color:{C_INK}">Mesečni povzetek prijav krajanov – {per[0]}</h1>'
             f'<div style="font-size:17px;color:{C_MUT};font-style:italic">Riepilogo mensile delle segnalazioni dei residenti – {per[1]}</div>')
    if fino:
        H.append(note(f'Stanje na dan {oggi.day}. {oggi.month}. {oggi.year}.', f'Situazione al {oggi.day}/{oggi.month}/{oggi.year}.'))
    # sintesi
    nper = sum(1 for p in nuove if p['res'] == 3)
    box = lambda n, sl, it, col=C_BRAND: (f'<td style="width:25%;padding:6px"><div style="border:1px solid {C_LINE};border-radius:8px;padding:10px;text-align:center">'
                                          f'<div style="font-size:26px;font-weight:bold;color:{col}">{n}</div><div style="font-size:12px">{sl}<br><i style="color:{C_MUT}">{it}</i></div></div></td>')
    H.append('<table role="presentation" style="width:100%;border-collapse:collapse;margin:14px 0 4px"><tr>'
             + box(len(nuove), 'novih prijav', 'nuove segnalazioni', C_ACC) + box(nper, 'nevarnih', 'di pericolo', '#c0271b')
             + box(len(vecchie) + sum(1 for p in nuove if p['napredek'] not in ZAPRTO), 'odprtih skupaj', 'aperte in totale')
             + box(len(risolte), 'rešenih v mesecu', 'risolte nel mese', '#3f8a5a') + '</tr></table>')
    H.append(note('Imena, e-naslovi in telefonske številke prijaviteljev se nikoli ne posredujejo. Vsaka prijava ima stalno oznako: prosimo, da jo navedete v odgovoru.',
                  'Nomi, email e telefoni dei segnalanti non vengono mai trasmessi. Ogni segnalazione ha un codice stabile: vi chiediamo di citarlo nella risposta.'))

    # 1 nuove
    H.append(h2(1, 'Nove prijave v mesecu', 'Nuove segnalazioni del mese'))
    if any(p['vir'] == 'zbirka' for p in nuove):
        H.append(note('Oznake B, Z, H, J, D, T, P, G: točke, ki jih je svet Boršt–Pesek zbral oktobra 2026 s spletnim obrazcem in jih objavil na zemljevidu cest.',
                      'Codici B, Z, H, J, D, T, P, G: punti raccolti dal Consiglio Boršt–Pesek in ottobre 2026 con il modulo online e pubblicati sulla mappa delle strade.'))
    ceste = sorted([p for p in nuove if p.get('vrsta', 'cesta') == 'cesta'], key=key)
    altre = sorted([p for p in nuove if p.get('vrsta', 'cesta') != 'cesta'], key=key)
    H.append(f'<h3 style="font-size:15px;margin:12px 0 6px">Ceste / Strade ({len(ceste)})</h3>')
    H += [card(p, True) for p in ceste] or [note('Ni novih prijav.', 'Nessuna nuova segnalazione.')]
    H.append(f'<h3 style="font-size:15px;margin:12px 0 6px">Druge prijave, predlogi in vprašanja / Altre segnalazioni, proposte e domande ({len(altre)})</h3>')
    H += [card(p, True) for p in altre] or [note('Ni novih.', 'Nessuna nuova.')]

    # 2 aperte precedenti
    H.append(h2(2, 'Odprte prijave iz prejšnjih mesecev', 'Segnalazioni ancora aperte dei mesi precedenti'))
    H += [card(p, False, oggi) for p in sorted(vecchie, key=key)] or [note('Ni odprtih prijav iz prejšnjih mesecev (sistem prijav deluje od oktobra 2026).',
                                                                         'Nessuna segnalazione aperta dei mesi precedenti (il sistema delle segnalazioni è attivo da ottobre 2026).')]
    # 3 risolte
    H.append(h2(3, 'Rešene v mesecu', 'Risolte nel mese'))
    H += [card(p) for p in risolte] or [note('V tem mesecu ni bila nobena prijava označena kot rešena.', 'Nel mese nessuna segnalazione è stata segnata come risolta.')]
    # 4 oltre 60 giorni
    H.append(h2(4, 'Brez odgovora več kot 60 dni', 'Senza risposta da oltre 60 giorni'))
    H += [card(p, False, oggi) for p in sorted(oltre60, key=key)] or [note('Nobene. Ta seznam bo služil za konferenco predsednikov.', 'Nessuna. Questo elenco servirà per la conferenza dei presidenti.')]
    # 5 concentrazioni
    H.append(h2(5, 'Ponavljajoče se točke', 'Punti ricorrenti'))
    H.append(note('Območja z vsaj tremi prijavami v polmeru 150 m: tu je verjetno smiseln celovit poseg namesto posameznih popravil.',
                  'Zone con almeno tre segnalazioni entro 150 m: qui è probabilmente opportuno un intervento complessivo invece di singole riparazioni.'))
    gg = gruppi(tutte)
    if gg:
        rows = ''.join(f'<tr><td style="padding:6px;border-bottom:1px solid {C_LINE}"><b>{E(g[0]["vas"])}</b></td><td style="padding:6px;border-bottom:1px solid {C_LINE}">{len(g)}</td>'
                       f'<td style="padding:6px;border-bottom:1px solid {C_LINE}">{", ".join(E(q["oz"]) for q in g)}</td>'
                       f'<td style="padding:6px;border-bottom:1px solid {C_LINE}">{sum(1 for q in g if q["res"] == 3)}</td></tr>' for g in gg)
        H.append(f'<table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f4f7f9"><th align="left" style="padding:6px">Kraj / Località</th><th align="left" style="padding:6px">Prijav / Segn.</th><th align="left" style="padding:6px">Oznake / Codici</th><th align="left" style="padding:6px">Nevarnih / Pericolo</th></tr>{rows}</table>')
    else:
        H.append(note('Ni zgostitev.', 'Nessuna concentrazione.'))
    # 6 atti del Comune collegati
    H.append(h2(6, 'Akti Občine v istih krajih', 'Atti del Comune nelle stesse località'))
    H.append(note('Odredbe in javna dela z oglasne deske Občine, ki zadevajo vasi s prijavami. Povezava je samo krajevna in jo je treba preveriti.',
                  'Ordinanze e lavori dall’albo pretorio che riguardano località con segnalazioni. Il collegamento è solo per località e va verificato.'))
    vasi = {}
    for p in tutte:
        for w in re.split(r'[ /]+', p['vas']):
            if len(w) > 3:
                vasi.setdefault(w.lower().replace('ž', 'z').replace('š', 's').replace('č', 'c'), []).append(p['oz'])
    rel = []
    for a in cm.get('albo', []):
        if a['cat'] not in ('viabilita', 'lavori'):
            continue
        t = (a['it'] + ' ' + a.get('sl', '')).lower().replace('ž', 'z').replace('š', 's').replace('č', 'c')
        hit = sorted({oz for w, l in vasi.items() if re.search(r'\b' + re.escape(w[:5]), t) for oz in l})
        if hit:
            rel.append((a, hit))
    if rel:
        rows = ''.join(f'<tr><td style="padding:6px;border-bottom:1px solid {C_LINE};white-space:nowrap">{E(a["tipo_it"])} {E(a["num"])}</td>'
                       f'<td style="padding:6px;border-bottom:1px solid {C_LINE}">{E(a.get("sl") or "")}<br><i style="color:{C_MUT}">{E(a["it"][:220])}</i></td>'
                       f'<td style="padding:6px;border-bottom:1px solid {C_LINE}">{", ".join(hit[:8])}{"…" if len(hit) > 8 else ""}</td></tr>' for a, hit in rel)
        H.append(f'<table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f4f7f9"><th align="left" style="padding:6px">Akt / Atto</th><th align="left" style="padding:6px">Vsebina / Oggetto</th><th align="left" style="padding:6px">Prijave v kraju / Segn. nella località</th></tr>{rows}</table>')
    else:
        H.append(note('Ni aktov v krajih s prijavami.', 'Nessun atto nelle località con segnalazioni.'))
    # 7 domande per il Sindaco
    H.append(h2(7, 'Vprašanja za sestanke z županom', 'Domande per gli incontri col Sindaco'))
    vpr = [p for p in tutte if p.get('vrsta') == 'vprasanje' and p['napredek'] not in ZAPRTO]
    H += [card(p) for p in vpr] or [note('Krajani ta mesec niso poslali novih vprašanj.', 'Nel mese i residenti non hanno inviato nuove domande.')]
    tt = tocke_sestanka()
    if tt:
        H.append('<div style="font-size:14px;margin:8px 0 4px"><b>Teme sestanka 21. 10. 2026 – čakamo na pisni odgovor</b><br><i style="color:#5f6b76">Temi dell’incontro del 21/10/2026 – in attesa di risposta scritta</i></div><ol style="font-size:14px;margin:4px 0;padding-left:22px">'
                 + ''.join(f'<li style="margin:0 0 4px">{E(a)}<br><i style="color:{C_MUT}">{E(b)}</i></li>' for a, b in tt) + '</ol>')
    # 8 statistiche
    H.append(h2(8, 'Statistika po krajevnih skupnostih', 'Statistiche per frazione'))
    rows = ''
    for sid, (sl, it, _) in SVETI.items():
        L = [p for p in tutte if p['svet'] == sid]
        n = sum(1 for p in L if inmese(p['created']))
        op = sum(1 for p in L if p['napredek'] not in ZAPRTO)
        rs = sum(1 for p in L if p['napredek'] in ZAPRTO)
        pe = sum(1 for p in L if p['res'] == 3 and p['napredek'] not in ZAPRTO)
        rows += (f'<tr><td style="padding:6px;border-bottom:1px solid {C_LINE}">{sid}) {E(sl)}' + (f' <i style="color:{C_MUT}">/ {E(it)}</i>' if it != sl else '')
                 + ('' if sid != 'b' else f' <i style="color:{C_MUT}">(svet ni ustanovljen / consiglio non costituito)</i>') + '</td>'
                 + ''.join(f'<td align="center" style="padding:6px;border-bottom:1px solid {C_LINE}">{v}</td>' for v in (n, op, pe, rs)) + '</tr>')
    H.append(f'<table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f4f7f9"><th align="left" style="padding:6px">Krajevna skupnost / Frazione</th><th style="padding:6px">Nove / Nuove</th><th style="padding:6px">Odprte / Aperte</th><th style="padding:6px">Nevarne odprte / Pericolo aperte</th><th style="padding:6px">Rešene / Risolte</th></tr>{rows}</table>')
    # 9 vegetazione
    H.append(h2(9, 'Vegetacija ob cestah', 'Vegetazione lungo le strade'))
    veg = [p for p in tutte if re.search(r'rastlin|vejevj|grmovj|živ[ao] mej|vegetaz|siep|rami\b', (p['sl'] + ' ' + p['it']).lower())]
    H.append(note('Pregled za spomladansko obvestilo lastnikom zemljišč ob cestah (pred poletjem).', 'Elenco utile per l’avviso primaverile ai proprietari dei fondi lungo le strade (prima dell’estate).'))
    H += [card(p) for p in veg] or [note('Ni prijav.', 'Nessuna segnalazione.')]
    # 10 BP
    H.append(h2(10, 'Participativni proračun', 'Bilancio partecipativo'))
    H.append(note(f'Predlogi za leto {y} v pripravi na spletni strani: {len(bp_rows)}.', f'Proposte {y} in preparazione sul sito: {len(bp_rows)}.'))
    bpa = [a for a in cm.get('albo', []) if a['cat'] == 'bp']
    if bpa:
        H.append('<ul style="font-size:14px;padding-left:20px">' + ''.join(f'<li style="margin:0 0 6px">{E(a["tipo_it"])} {E(a["num"])}: {E(a["it"][:240])}</li>' for a in bpa) + '</ul>')
    # footer
    H.append(f'<div style="margin:26px 0 0;padding:12px 0 0;border-top:1px solid {C_LINE};font-size:12px;color:{C_MUT}">'
             f'Povzetek je pripravljen samodejno s spletne strani <a href="{SITE}" style="color:{C_BRAND}">cfks-dolina.org</a> iz prijav, ki so jih krajani poslali svetom krajevnih skupnosti, in iz aktov z oglasne deske Občine.<br>'
             f'<i>Riepilogo preparato automaticamente dal sito cfks-dolina.org, dalle segnalazioni inviate dai residenti ai Consigli delle frazioni e dagli atti dell’albo pretorio del Comune.</i></div>')
    H.append('</div></div></div>')
    subj = f'Povzetek prijav krajanov – {per[0]} / Riepilogo segnalazioni dei residenti – {per[1]}'
    return subj, '\n'.join(H)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--db'); ap.add_argument('--bp'); ap.add_argument('--mese'); ap.add_argument('--prova', action='store_true'); ap.add_argument('--out')
    a = ap.parse_args()
    oggi = datetime.date.today()
    subj, body = build(a.mese or oggi.strftime('%Y-%m'), a.db, a.bp, a.prova, oggi)
    doc = f'<!doctype html><html><head><meta charset="utf-8"><title>{E(subj)}</title></head><body style="margin:0">{body}</body></html>'
    if a.out:
        open(a.out, 'w', encoding='utf-8').write(doc)
        print(subj)
    else:
        print(doc)
