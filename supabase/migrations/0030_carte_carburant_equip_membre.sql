-- =============================================================================
-- Migration 0030 — Carte carburant (camion) + le membre modifie son équipement
-- Source : demandes fondateur (Ressources).
-- =============================================================================

-- Code de la carte carburant, sur le véhicule.
alter table vehicules add column if not exists carte_carburant text;
comment on column vehicules.carte_carburant is
  'Code / numéro de la carte carburant associée au véhicule.';

-- Le membre modifie l'état de SON équipement quand il veut ; le bureau voit
-- tout. La politique tenant (0011) autorise déjà la lecture ; on ajoute une
-- politique d'UPDATE pour que le membre change l'état de ses propres articles.
-- (Le bureau garde l'accès complet via gerer_referentiels / direction.)
drop policy if exists equip_membre_maj on equipements_rh;
create policy equip_membre_maj on equipements_rh
  for update using (
    org_id = jwt_org()
    and utilisateur_id = (select id from utilisateurs where auth_id = auth.uid() and org_id = jwt_org())
  )
  with check (
    org_id = jwt_org()
    and utilisateur_id = (select id from utilisateurs where auth_id = auth.uid() and org_id = jwt_org())
  );
