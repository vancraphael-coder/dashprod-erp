-- 0180 — Publication du 10/09/2026 (2) : les modules de l'offre indépendant.
--
-- CE QUI CHANGE. `independant_manutention` portait `modules: []`. Ses modules
-- sont désormais posés : crm, planning, terrain, facturation,
-- signature_client, rapport_chantier.
--
-- COMMENT ILS ONT ÉTÉ CHOISIS. En dérivant les écrans de son parcours (voir
-- packages/domaine/src/commercial/parcours-offres.js), pas en découpant le
-- catalogue déménageur au hasard. Un indépendant doit être trouvé, recevoir
-- une mission, pointer, prouver, facturer, suivre ses encours. Il n'a pas
-- besoin de relever un volume, d'établir un devis de déménagement, de gérer
-- une flotte ni de faire une paie : il est seul.
--
-- L'OFFRE RESTE NON SOUSCRIPTIBLE, statut `bientot`. Les modules existent et
-- fonctionnent ; le parcours propre à l'indépendant — poser ses
-- disponibilités, recevoir les missions d'un donneur d'ordre — n'est pas
-- construit. On pose les modules pour pouvoir le construire, on n'ouvre pas la
-- vente. La contrainte `offres_souscriptible_si_disponible` continue de
-- l'interdire.
--
-- Bloc DÉRIVÉ du référentiel. Ne pas éditer : régénérer par
--   node packages/domaine/outils/publier-offres.mjs 2026-09-10T12:00:00+00:00

insert into public.offres (
  code, publie_le, libelle, rang,
  souscriptible, statut, secteur, unite,
  prix_base_htva_mensuel,
  prix_base_htva_annuel,
  membres_limite, membres_inclus, prix_membre_supp_htva,
  centres_limite, centres_inclus, prix_centre_supp_htva,
  modules,
  prix_membre_supp_htva_annuel,
  prix_centre_supp_htva_annuel,
  remise_annuelle_pct)
values
  ('starter', '2026-09-10T12:00:00+00:00', 'Basique', 1,
   true, 'disponible', null, 'par mois',
   180,
   2052,
   null, 2, 13,
   0, 0, null,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client'],
   148.2,
   null,
   5),
  ('regular', '2026-09-10T12:00:00+00:00', 'Regular', 2,
   true, 'disponible', null, 'par mois',
   360,
   4104,
   null, 5, 13,
   0, 0, null,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client','peppol','comptabilite','rapport_chantier','paie','journal','international'],
   148.2,
   null,
   5),
  ('pro', '2026-09-10T12:00:00+00:00', 'Pro', 3,
   true, 'disponible', null, 'par mois',
   720,
   8208,
   null, 30, 13,
   null, 1, 50,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client','peppol','comptabilite','rapport_chantier','paie','journal','international','multi_depots','gestionnaire_depot','stockage_3d'],
   148.2,
   570,
   5),
  ('donneur_ordre', '2026-09-10T12:00:00+00:00', 'Donneur d''ordre', 10,
   false, 'bientot', 'Cuisiniste, mobilier, industrie', 'gratuit',
   0,
   null,
   0, 0, null,
   0, 0, null,
   '{}'::text[],
   null,
   null,
   null),
  ('independant_manutention', '2026-09-10T12:00:00+00:00', 'Indépendant manutention', 11,
   false, 'bientot', 'Manutention et services', 'par mois',
   60,
   null,
   1, 1, null,
   0, 0, null,
   array['crm','planning','terrain','facturation','signature_client','rapport_chantier'],
   null,
   null,
   null),
  ('garde_meubles', '2026-09-10T12:00:00+00:00', 'Garde-meubles', 12,
   false, 'bientot', 'Self-storage', 'par mois',
   240,
   null,
   5, 5, null,
   1, 1, null,
   '{}'::text[],
   null,
   null,
   null),
  ('groupe_liftier', '2026-09-10T12:00:00+00:00', 'Groupe liftier', 13,
   false, 'bientot', 'Levage et monte-meubles', 'par mois, 5 accès bureau',
   450,
   null,
   15, 5, 30,
   0, 0, null,
   '{}'::text[],
   null,
   null,
   null),
  ('logistique_mobilier', '2026-09-10T12:00:00+00:00', 'Logistique mobilier', 14,
   false, 'etude', 'Débit industriel', 'par mois, 1 dépôt',
   900,
   null,
   5, 5, null,
   1, 1, null,
   '{}'::text[],
   null,
   null,
   null)
on conflict (code, publie_le) do nothing;
