-- 0150 — APPLIQUÉE ET VÉRIFIÉE le 27/08/2026.
-- L'HISTORIQUE DES RAPPORTS TEXTE DE CENTRE (jour/semaine/mois).
--
-- Le responsable dépôt écrit un rapport texte sur une période. Distinct des KPI
-- (calculés à la volée par cmd_rapport_hebdo) : ici c'est de la prose, conservée
-- en historique, par centre et par cadence.
--
-- org_id porte `default jwt_org()` — le piège documenté : sans ce défaut, toute
-- écriture front échoue en silence. Vérifié après application : défaut présent,
-- 2 policies RLS.

create table if not exists public.centre_rapports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default jwt_org() references public.organisations(id),
  centre_id uuid references public.centres_logistiques(id),  -- null = maison mère
  cadence text not null check (cadence in ('jour','semaine','mois')),
  debut date not null,
  fin date not null,
  texte text not null,
  redige_par uuid references public.utilisateurs(id),
  redige_le timestamptz not null default now()
);

create index if not exists centre_rapports_lecture_idx
  on public.centre_rapports (org_id, centre_id, cadence, debut desc);

alter table public.centre_rapports enable row level security;

drop policy if exists centre_rapports_lecture on public.centre_rapports;
create policy centre_rapports_lecture on public.centre_rapports
  for select using (org_id = jwt_org());

drop policy if exists centre_rapports_ecriture on public.centre_rapports;
create policy centre_rapports_ecriture on public.centre_rapports
  for all using (
    org_id = jwt_org()
    and (acteur_a_capacite('gerer_depot') or acteur_a_capacite('gerer_referentiels'))
  ) with check (
    org_id = jwt_org()
    and (acteur_a_capacite('gerer_depot') or acteur_a_capacite('gerer_referentiels'))
  );
