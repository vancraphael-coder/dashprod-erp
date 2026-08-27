-- 0146 — APPLIQUÉE ET VÉRIFIÉE le 27/08/2026.
-- NE GARDER QUE LES 11 POSTES TRANSMIS.
--
-- Décision de Raphaël : supprimer les anciens rôles (direction, coordination,
-- commercial, gestion_depot) et ne conserver que fondateur, gérant, secrétaire,
-- chef d'équipe, livreur, monteur, chauffeur, liftier, déménageur, intérimaire,
-- visite_terrain.
--
-- PRUDENCE SUR DONNÉES DE PRODUCTION. Un ancien rôle peut porter des membres
-- (« direction » en avait 6). On ne détruit JAMAIS un rôle occupé sans d'abord
-- REMETTRE ses membres sur un poste neuf. « direction » → « gerant » : mêmes
-- capacités opérationnelles ; Raphaël désignera ensuite le(s) fondateur(s),
-- fondateur et gérant partageant les mêmes droits.
--
-- IDEMPOTENTE : si le remappage a déjà eu lieu, les étapes ne trouvent rien à
-- faire. Rejouable sans dégât.
--
-- Vérifiée après application : 0 ancien poste, 0 lien orphelin, les 11 postes
-- attendus, 8 membres conservent un poste.

do $$
declare
  v_org uuid; v_ancien uuid; v_cible uuid; r_cle text;
  anciens text[] := array['direction','coordination','commercial','gestion_depot'];
begin
  for v_org in select id from organisations loop
    select id into v_cible from roles where org_id = v_org and cle = 'gerant';
    if v_cible is null then continue; end if;

    foreach r_cle in array anciens loop
      select id into v_ancien from roles where org_id = v_org and cle = r_cle;
      if v_ancien is null then continue; end if;

      update utilisateur_roles ur
        set role_id = v_cible
        where ur.role_id = v_ancien
          and not exists (
            select 1 from utilisateur_roles u2
            where u2.utilisateur_id = ur.utilisateur_id and u2.role_id = v_cible);
      delete from utilisateur_roles where role_id = v_ancien;
      delete from role_capacites where role_id = v_ancien;
      delete from roles where id = v_ancien;
    end loop;
  end loop;
end $$;
