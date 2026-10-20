-- ============================================================
-- Sveti krajevnih skupnosti Občine Dolina / Consigli delle frazioni
-- Supabase schema: prijave (segnalazioni/proposte), kontakti, administratorji
-- Esegui tutto questo file in: Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1. Consigli delle frazioni (delibera C.C. 19/2025, art. 2)
create table if not exists public.consigli (
  id        text primary key,            -- 'a'..'g'
  slug      text unique not null,
  ime_sl    text not null,
  ime_it    text not null,
  vasi      text[] not null              -- frazioni (sl / it)
);

insert into public.consigli (id, slug, ime_sl, ime_it, vasi) values
 ('a','dolina','Dolina in Kroglje','Dolina e Crogole', array['Dolina','Kroglje / Crogole']),
 ('b','boljunec','Boljunec in Gornji konec','Bagnoli della Rosandra e Bagnoli Superiore', array['Boljunec / Bagnoli della Rosandra','Gornji konec / Bagnoli Superiore']),
 ('c','borst','Boršt, Hrvati, Zabrežec, Jezero, Botač, Gročana, Draga in Pesek','Sant''Antonio in Bosco, Hervati, Moccò, San Lorenzo, Botazzo, Grozzana, Draga e Pesek', array['Boršt / Sant''Antonio in Bosco','Hrvati / Hervati','Zabrežec / Moccò','Jezero / San Lorenzo','Botač / Botazzo','Gročana / Grozzana','Draga','Pesek']),
 ('d','ricmanje','Ricmanje in Log','San Giuseppe della Chiusa e Log', array['Ricmanje / San Giuseppe della Chiusa','Log']),
 ('e','domjo','Domjo, Pulje, Lakotišče in Krmenka','Domio, Puglie, Lacotisce e Mattonaia', array['Domjo / Domio','Pulje / Puglie','Lakotišče / Lacotisce','Krmenka / Mattonaia']),
 ('f','mackolje','Mačkolje, Prebeneg, Križpot in Mont','Caresana, Prebeneg, Crociata e Monte d''Oro', array['Mačkolje / Caresana','Prebeneg','Križpot / Crociata','Mont / Monte d''Oro']),
 ('g','zavlje','Žavlje in Frankovec','Aquilinia e Francovez', array['Žavlje / Aquilinia','Frankovec / Francovez'])
on conflict (id) do nothing;

-- 2. Amministratori: presidente + vicepresidente di ogni Consiglio; consiglio_id NULL = amministratore generale
create table if not exists public.admini (
  email       text primary key,
  consiglio_id text references public.consigli(id),
  vloga       text not null default 'predsednik'   -- predsednik / podpredsednik / admin
);
-- Amministratore generale (sostituire/aggiungere le email reali dei presidenti e vice)
insert into public.admini (email, consiglio_id, vloga) values
 ('cfks.borst@gmail.com', null, 'admin'),
 ('samuelcorbatto@gmail.com', null, 'admin')
on conflict (email) do nothing;

-- 3. Prijave (contenuto pubblicabile – NIENTE dati personali qui)
create table if not exists public.prijave (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  consiglio_id  text not null references public.consigli(id),
  vas           text not null,
  vrsta         text not null check (vrsta in ('cesta','pripomba','predlog','vprasanje','ideja','projekt')),
  kategorija    text,                     -- es. buche, illuminazione, caditoie…
  kje           text,                     -- dove esattamente
  opis          text not null check (char_length(opis) between 5 and 4000),
  predlog       text check (char_length(predlog) <= 4000),
  resnost       smallint check (resnost between 1 and 3),   -- 3 pericolo, 2 disagio, 1 fastidio
  ze_prijavljeno text check (ze_prijavljeno in ('da','ne','ne vem')),
  lat           double precision,
  lon           double precision,
  fotografije   text[] not null default '{}',  -- percorsi nello storage 'fotografije'
  status        text not null default 'novo' check (status in ('novo','objavljeno','zavrnjeno')),
  napredek      text not null default 'zbrano' check (napredek in ('zbrano','posredovano','v_obravnavi','v_izvajanju','reseno','ni_izvedljivo')),
  odgovor       text,                     -- risposta pubblica del Consiglio
  oznaka        text,                     -- codice scheda (es. B1, P3)
  pregledal     text,                     -- email di chi ha approvato
  pregledano_at timestamptz
);
create index if not exists prijave_consiglio_status on public.prijave (consiglio_id, status, created_at desc);

-- 4. Contatti del segnalante (visibili SOLO agli amministratori)
create table if not exists public.kontakti (
  prijava_id uuid primary key references public.prijave(id) on delete cascade,
  ime        text,
  email      text,
  telefon    text
);

-- 5. Funzioni di controllo ruoli
create or replace function public.je_admin(c text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admini a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
      and (a.consiglio_id is null or a.consiglio_id = c)
  );
$$;
create or replace function public.je_katerikoli_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admini a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email','')));
$$;

-- 6. Row Level Security
alter table public.consigli enable row level security;
alter table public.admini   enable row level security;
alter table public.prijave  enable row level security;
alter table public.kontakti enable row level security;

drop policy if exists consigli_read on public.consigli;
create policy consigli_read on public.consigli for select using (true);

drop policy if exists admini_self on public.admini;
create policy admini_self on public.admini for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email','')) or public.je_admin(consiglio_id));

-- chiunque legge SOLO le prijave pubblicate; gli admin leggono tutte quelle del proprio Consiglio
drop policy if exists prijave_read on public.prijave;
create policy prijave_read on public.prijave for select
  using (status = 'objavljeno' or public.je_admin(consiglio_id));

-- chiunque può inviare, ma solo come 'novo' e senza campi riservati
drop policy if exists prijave_insert on public.prijave;
create policy prijave_insert on public.prijave for insert
  with check (status = 'novo' and napredek = 'zbrano' and odgovor is null and pregledal is null and oznaka is null);

drop policy if exists prijave_update on public.prijave;
create policy prijave_update on public.prijave for update
  using (public.je_admin(consiglio_id)) with check (public.je_admin(consiglio_id));

drop policy if exists prijave_delete on public.prijave;
create policy prijave_delete on public.prijave for delete using (public.je_admin(consiglio_id));

drop policy if exists kontakti_insert on public.kontakti;
create policy kontakti_insert on public.kontakti for insert with check (true);
drop policy if exists kontakti_read on public.kontakti;
create policy kontakti_read on public.kontakti for select
  using (exists (select 1 from public.prijave p where p.id = prijava_id and public.je_admin(p.consiglio_id)));
drop policy if exists kontakti_delete on public.kontakti;
create policy kontakti_delete on public.kontakti for delete
  using (exists (select 1 from public.prijave p where p.id = prijava_id and public.je_admin(p.consiglio_id)));

-- updated_at automatico
create or replace function public.touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists prijave_touch on public.prijave;
create trigger prijave_touch before update on public.prijave for each row execute function public.touch();

-- Permessi di base
grant select on public.consigli to anon, authenticated;
grant select, insert on public.prijave to anon, authenticated;
grant update, delete on public.prijave to authenticated;
grant insert on public.kontakti to anon, authenticated;
grant select, delete on public.kontakti to authenticated;
grant select on public.admini to authenticated;

-- 7. Storage per le fotografie (bucket pubblico, nomi file casuali)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotografije','fotografije', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists foto_upload on storage.objects;
create policy foto_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'fotografije' and (storage.foldername(name))[1] = 'novo');
drop policy if exists foto_read on storage.objects;
create policy foto_read on storage.objects for select using (bucket_id = 'fotografije');
drop policy if exists foto_delete on storage.objects;
create policy foto_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fotografije' and public.je_katerikoli_admin());

-- ============================================================
-- 8. Proposte per il Bilancio partecipativo (valutazione preventiva prima dell'invio al Comune)
--    Tabella interamente riservata: i cittadini inviano, solo presidenti/vice del Consiglio leggono.
-- ============================================================
create table if not exists public.bp_predlogi (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  leto          int not null default extract(year from now()),
  consiglio_id  text not null references public.consigli(id),
  naslov        text not null check (char_length(naslov) between 5 and 200),
  zakaj         text not null,            -- 1. perché / tema / sfida
  kje           text not null,            -- 2. dove
  izboljsave    text not null,            -- 3. migliorie
  vrednost      numeric(10,2),            -- 4. valore (EUR IVA incl.)
  stroski       jsonb not null default '[]',  -- 5. voci di spesa [{postavka, znesek}]
  podrocje      text,                     -- area tematica
  merila        jsonb not null default '{}',  -- autovalutazione art. 9
  lat           double precision,
  lon           double precision,
  priloge       text[] not null default '{}',
  ime           text not null,
  email         text not null,
  telefon       text,
  status        text not null default 'novo' check (status in ('novo','v_pregledu','dopolniti','poslano','zavrnjeno')),
  opomba_sveta  text,
  poslano_at    timestamptz,
  pregledal     text
);
alter table public.bp_predlogi enable row level security;
drop policy if exists bp_insert on public.bp_predlogi;
create policy bp_insert on public.bp_predlogi for insert
  with check (status = 'novo' and opomba_sveta is null and poslano_at is null and pregledal is null);
drop policy if exists bp_read on public.bp_predlogi;
create policy bp_read on public.bp_predlogi for select using (public.je_admin(consiglio_id));
drop policy if exists bp_update on public.bp_predlogi;
create policy bp_update on public.bp_predlogi for update using (public.je_admin(consiglio_id)) with check (public.je_admin(consiglio_id));
drop policy if exists bp_delete on public.bp_predlogi;
create policy bp_delete on public.bp_predlogi for delete using (public.je_admin(consiglio_id));
drop trigger if exists bp_touch on public.bp_predlogi;
create trigger bp_touch before update on public.bp_predlogi for each row execute function public.touch();
grant insert on public.bp_predlogi to anon, authenticated;
grant select, update, delete on public.bp_predlogi to authenticated;
