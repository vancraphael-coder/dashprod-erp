-- 0158 — APPLIQUÉE ET VÉRIFIÉE le 28/08/2026.
-- LES PHOTOS D'UN CONSTAT. Le fichier vit dans le bucket privé `documents`
-- (chemin org/{org_id}/constats/... — couvert par la policy doc_ecriture_org) ;
-- ici on garde le lien. org_id DEFAULT jwt_org() (vérifié) ; 2 policies.

create table if not exists public.constat_photos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default jwt_org() references public.organisations(id),
  constat_id uuid not null references public.constats_chantier(id) on delete cascade,
  chemin text not null,
  nom text not null default '',
  ajoute_par uuid references public.utilisateurs(id),
  ajoute_le timestamptz not null default now()
);
create index if not exists constat_photos_constat_idx
  on public.constat_photos (org_id, constat_id);
alter table public.constat_photos enable row level security;
drop policy if exists constat_photos_lecture on public.constat_photos;
create policy constat_photos_lecture on public.constat_photos
  for select using (org_id = jwt_org());
drop policy if exists constat_photos_ecriture on public.constat_photos;
create policy constat_photos_ecriture on public.constat_photos
  for all using (
    org_id = jwt_org()
    and (acteur_a_capacite('pointer_chantier') or acteur_a_capacite('gerer_planning'))
  ) with check (
    org_id = jwt_org()
    and (acteur_a_capacite('pointer_chantier') or acteur_a_capacite('gerer_planning')));
