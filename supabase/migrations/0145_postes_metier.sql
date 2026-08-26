-- 0145 — APPLIQUÉE ET VÉRIFIÉE le 25/08/2026.
-- LES POSTES MÉTIER, synchronisés depuis le domaine (rh/postes.js).
--
-- Le mécanisme rôle→capacité existe déjà. Ce qu'il manquait : des postes
-- nommés comme de vrais métiers (fondateur, gérant, secrétaire, chef d'équipe,
-- livreur, monteur, chauffeur, liftier, déménageur, intérimaire, visite
-- terrain), au lieu de 13 capacités à cocher à la main.
--
-- ADDITIVE ET PRUDENTE. Vérifié en base au préalable : 6 membres en
-- « direction », 1 en « demenageur ». On NE SUPPRIME AUCUN rôle existant et on
-- ne touche à AUCUNE affectation : les anciens rôles restent valides le temps
-- que Raphaël réattribue les membres. Détruire « direction » retirerait ses 14
-- capacités à 6 personnes d'un coup.
--
-- IDEMPOTENTE : rejouable. Postes en `on conflict do nothing`, capacités
-- resynchronisées pour que la base suive le domaine.
--
-- Vérifiée après application : les 11 postes existent avec les bons comptes de
-- capacités ; `confier_les_acces` n'est QUE sur fondateur + gérant ; les
-- affectations d'origine (direction, demenageur) sont intactes.

insert into capacites (cle, libelle, description) values
  ('confier_les_acces', 'Confier les accès',
   'Attribuer un poste à un autre membre, le promouvoir ou le rétrograder.')
on conflict (cle) do nothing;

do $$
declare
  v_org uuid; v_role uuid; r record;
begin
  for v_org in select id from organisations loop
    for r in select * from (values
      ('fondateur',  array['pointer_chantier','signaler_materiel','demander_conge',
                            'creer_affaire','voir_prix','faire_signer','valider_intake',
                            'gerer_planning','approuver_conge','emettre_facture',
                            'voir_paie','gerer_referentiels','confier_les_acces']),
      ('gerant',     array['pointer_chantier','signaler_materiel','demander_conge',
                            'creer_affaire','voir_prix','faire_signer','valider_intake',
                            'gerer_planning','approuver_conge','emettre_facture',
                            'voir_paie','gerer_referentiels','confier_les_acces']),
      ('secretaire', array['pointer_chantier','signaler_materiel','demander_conge',
                            'creer_affaire','voir_prix','faire_signer','valider_intake',
                            'gerer_planning','approuver_conge']),
      ('chef_equipe', array['pointer_chantier','signaler_materiel','demander_conge',
                             'cloturer_chantier']),
      ('livreur',    array['pointer_chantier','signaler_materiel','demander_conge']),
      ('monteur',    array['pointer_chantier','signaler_materiel','demander_conge']),
      ('chauffeur',  array['pointer_chantier','signaler_materiel','demander_conge']),
      ('liftier',    array['pointer_chantier','signaler_materiel','demander_conge']),
      ('demenageur', array['pointer_chantier','signaler_materiel','demander_conge']),
      ('interimaire', array['pointer_chantier','signaler_materiel']),
      ('visite_terrain', array[]::text[])
    ) as t(cle, caps)
    loop
      insert into roles (org_id, cle, libelle)
        values (v_org, r.cle, initcap(replace(r.cle, '_', ' ')))
        on conflict (org_id, cle) do nothing;
      select id into v_role from roles where org_id = v_org and cle = r.cle;
      delete from role_capacites
        where role_id = v_role and capacite_cle <> all (r.caps);
      insert into role_capacites (role_id, capacite_cle)
        select v_role, unnest(r.caps) on conflict do nothing;
    end loop;
  end loop;
end $$;
