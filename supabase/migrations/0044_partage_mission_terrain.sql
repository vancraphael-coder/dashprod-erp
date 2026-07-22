-- =============================================================================
-- 0044_partage_mission_terrain.sql — APPLIQUÉE en production le 21/07/2026
-- (ne pas rejouer dans l'éditeur SQL : ranger dans le dépôt, c'est tout)
--
-- Partage explicite bureau → terrain.
--
-- Avant : un déménageur voyait une mission dès qu'il y était AFFECTÉ. Le bureau
-- ne pouvait donc pas préparer un planning sans que le terrain le voie aussitôt.
-- Après : l'affectation prépare, le PARTAGE publie. Deux gestes distincts.
--
-- Le planning bureau reste indépendant de la signature : une mission naît à la
-- confirmation du dossier (trigger trg_missions_confirmation) et vit sa vie.
-- Aucun lien entre l'état d'un document signé et la visibilité au planning.
-- =============================================================================

alter table public.missions
  add column if not exists partagee_le  timestamptz,
  add column if not exists partagee_par uuid references public.utilisateurs(id);

comment on column public.missions.partagee_le is
  'Horodatage du partage au terrain. NULL = préparée par le bureau, invisible '
  'du terrain. Non NULL = publiée, visible des membres affectés.';

create index if not exists idx_missions_partagees
  on public.missions (org_id, partagee_le)
  where partagee_le is not null;

-- Reprise : les missions déjà planifiées ou en cours étaient de fait visibles
-- du terrain avant ce changement. On les marque partagées pour ne rien retirer
-- à personne du jour au lendemain. Les futures naissent non partagées.
update public.missions
   set partagee_le = coalesce(partagee_le, now())
 where etat in ('planifiee', 'en_cours', 'effectuee')
   and partagee_le is null;
