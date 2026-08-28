-- 0156 — APPLIQUÉE ET VÉRIFIÉE le 28/08/2026.
-- LES SURCOÛTS INTERNES d'un chantier (panne, retard, nettoyage).
-- Coût réel, JAMAIS facturé. Terrain déclare et fige ; bureau corrige.
-- org_id DEFAULT jwt_org() (vérifié) ; 2 policies RLS.

create table if not exists public.surcouts_internes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default jwt_org() references public.organisations(id),
  mission_id uuid not null references public.missions(id),
  motif text not null check (motif in ('panne_retour','retard_equipe','nettoyage',
                                       'materiel_oublie','autre_interne')),
  heures numeric not null check (heures > 0),
  note text not null default '',
  fige boolean not null default false,
  declare_par uuid references public.utilisateurs(id),
  declare_le timestamptz not null default now(),
  corrige_par uuid references public.utilisateurs(id),
  corrige_le timestamptz
);
create index if not exists surcouts_internes_mission_idx
  on public.surcouts_internes (org_id, mission_id);
alter table public.surcouts_internes enable row level security;
drop policy if exists surcouts_lecture on public.surcouts_internes;
create policy surcouts_lecture on public.surcouts_internes
  for select using (org_id = jwt_org());
drop policy if exists surcouts_ecriture on public.surcouts_internes;
create policy surcouts_ecriture on public.surcouts_internes
  for all using (
    org_id = jwt_org()
    and (acteur_a_capacite('pointer_chantier') or acteur_a_capacite('gerer_planning'))
  ) with check (
    org_id = jwt_org()
    and (acteur_a_capacite('pointer_chantier') or acteur_a_capacite('gerer_planning')));
