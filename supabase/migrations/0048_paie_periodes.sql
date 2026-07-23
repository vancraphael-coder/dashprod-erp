-- =============================================================================
-- 0048_paie_periodes.sql — APPLIQUÉE en production le 21/07/2026
-- (ranger dans le dépôt, ne pas rejouer)
--
-- Paie : réglages par membre + décomptes de période.
-- L'ERP calcule le BRUT à partir des heures réellement pointées — sa valeur
-- unique. Le net reste une ESTIMATION tant que le précompte n'est pas fourni :
-- le barème du précompte professionnel dépend de la situation familiale et
-- change chaque année. La fiche officielle relève du secrétariat social.
-- =============================================================================

alter table public.donnees_paie
  add column if not exists statut          text,
  add column if not exists precompte_pct   numeric(5,2),
  add column if not exists majoration_sup  numeric(4,2) default 1.00;

comment on column public.donnees_paie.statut is
  'ouvrier (assiette ONSS 108 %) ou employe (100 %). Les déménageurs sont ouvriers.';
comment on column public.donnees_paie.precompte_pct is
  'Taux de précompte professionnel communiqué par le secrétariat social. '
  'NULL = inconnu : le net n''est alors PAS calculé, jamais deviné.';

-- Décomptes archivés : une période close ne bouge plus, même si un taux change.
create table if not exists public.paie_periodes (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organisations(id),
  periode      text not null,
  cloturee_le  timestamptz,
  cloturee_par uuid references public.utilisateurs(id),
  decompte     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (org_id, periode)
);

alter table public.paie_periodes enable row level security;

drop policy if exists paie_periodes_lecture on public.paie_periodes;
create policy paie_periodes_lecture on public.paie_periodes
  for select to authenticated
  using (org_id = jwt_org() and acteur_a_capacite('voir_paie'));

drop policy if exists paie_periodes_ecriture on public.paie_periodes;
create policy paie_periodes_ecriture on public.paie_periodes
  for all to authenticated
  using      (org_id = jwt_org() and acteur_a_capacite('voir_paie'))
  with check (org_id = jwt_org() and acteur_a_capacite('voir_paie'));

create index if not exists idx_paie_periodes_org on public.paie_periodes (org_id, periode);
