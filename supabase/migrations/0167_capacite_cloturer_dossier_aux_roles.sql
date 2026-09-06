-- 0167 — APPLIQUÉE ET VÉRIFIÉE le 01/09/2026.
-- LA CAPACITÉ « CLÔTURER UN DOSSIER » N'ÉTAIT ATTRIBUÉE À PERSONNE.
-- cmd_cloturer_dossier l'exige, la capacité existe au référentiel, mais
-- role_capacites n'en contenait AUCUNE ligne → personne ne pouvait clôturer,
-- gérant compris. On l'attribue aux rôles qui ont déjà emettre_facture
-- (fondateur, gérant) : qui facture peut clôturer. Idempotent.
-- Vérifié : fondateur/gerant = true, secretaire/chef_equipe = false.

insert into role_capacites (role_id, capacite_cle)
select distinct rc.role_id, 'cloturer_dossier'
from role_capacites rc
where rc.capacite_cle = 'emettre_facture'
  and not exists (select 1 from role_capacites x
    where x.role_id = rc.role_id and x.capacite_cle = 'cloturer_dossier');
