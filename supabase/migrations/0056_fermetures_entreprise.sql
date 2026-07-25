-- =============================================================================
-- 0056_fermetures_entreprise.sql
--
-- ⚠️  À APPLIQUER — colle ce fichier ENTIER dans l'éditeur SQL Supabase,
--     lignes « -- » comprises, puis range-le dans supabase/migrations/.
--
-- =============================================================================
-- FERMETURES DE L'ENTREPRISE — congé annuel collectif, ponts.
--
-- Trois couches se superposent sur le planning :
--   1. congés des membres        → déjà en base (table conges)
--   2. jours fériés légaux belges → calculés (packages/domaine/planning)
--   3. fermetures de l'entreprise → CE paramètre, réglé par le déménageur
--
-- Une fermeture est une période : le congé annuel de juillet, un pont de
-- l'Ascension. Le planning grise ces jours et affiche le motif.
-- =============================================================================

create table if not exists public.fermetures_entreprise (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organisations(id),
  debut      date not null,
  fin        date not null,
  motif      text,
  cree_le    timestamptz not null default now(),
  constraint fermeture_periode_valide check (fin >= debut)
);

comment on table public.fermetures_entreprise is
  'Périodes de fermeture de l''entreprise (congé annuel collectif, ponts). '
  'Superposées aux congés membres et aux fériés légaux sur le planning.';

create index if not exists idx_fermetures_org
  on public.fermetures_entreprise (org_id, debut);

alter table public.fermetures_entreprise enable row level security;

drop policy if exists fermetures_lecture on public.fermetures_entreprise;
create policy fermetures_lecture on public.fermetures_entreprise
  for select to authenticated using (org_id = jwt_org());

drop policy if exists fermetures_ecriture on public.fermetures_entreprise;
create policy fermetures_ecriture on public.fermetures_entreprise
  for all to authenticated
  using      (org_id = jwt_org() and acteur_a_capacite('gerer_referentiels'))
  with check (org_id = jwt_org() and acteur_a_capacite('gerer_referentiels'));

-- Vérification :
--   insert into fermetures_entreprise (org_id, debut, fin, motif)
--   values (jwt_org(), '2026-07-20', '2026-08-03', 'Congé annuel');
--   select * from fermetures_entreprise where org_id = jwt_org();
