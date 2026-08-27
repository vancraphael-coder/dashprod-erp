-- 0152 — APPLIQUÉE ET VÉRIFIÉE le 27/08/2026.
-- mon_profil expose le POSTE et le CENTRE de l'acteur.
--
-- La bascule de centre a besoin de savoir qui est l'acteur : son poste décide
-- de la portée, son centre_id décide où il atterrit. Additif : les champs
-- existants (utilisateur_id, org_id, nom, email, actif, capacites) ne bougent
-- pas. Vérifié : poste et centre_id calculés sans erreur (Raphaël = gerant).

create or replace function mon_profil()
returns jsonb language sql security definer set search_path = public
as $$
  select jsonb_build_object(
    'utilisateur_id', u.id, 'org_id', u.org_id, 'nom', u.nom, 'email', u.email,
    'actif', coalesce(u.actif, true),
    'centre_id', u.centre_id,
    'poste', (
      select r.cle from utilisateur_roles ur
        join roles r on r.id = ur.role_id
       where ur.utilisateur_id = u.id
         and (ur.expire_le is null or ur.expire_le > now())
         and r.cle in ('fondateur','gerant','secretaire','responsable_depot',
                       'chef_equipe','livreur','monteur','chauffeur','liftier',
                       'demenageur','interimaire','visite_terrain')
       order by case r.cle
         when 'fondateur' then 0 when 'gerant' then 1 when 'secretaire' then 2
         when 'responsable_depot' then 2 when 'chef_equipe' then 3
         else 4 end
       limit 1),
    'capacites', coalesce((
      select array_agg(distinct c) from (
        select rc.capacite_cle as c from utilisateur_roles ur
          join role_capacites rc on rc.role_id = ur.role_id
         where ur.utilisateur_id = u.id and (ur.expire_le is null or ur.expire_le > now())
        union
        select uc.capacite_cle from utilisateur_capacites uc where uc.utilisateur_id = u.id
      ) t), '{}'))
  from utilisateurs u
  where u.auth_id = auth.uid() and u.org_id = jwt_org();
$$;
