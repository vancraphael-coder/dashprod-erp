-- =============================================================================
-- Migration 0015 — Documents : templates et fermeture du gap scenario_id
-- Source : Réf. 2 (S6) et Réf. 3 (T2, T5). cmd_instancier_offre (0008) cherchait
-- une version de modèle active sans qu'aucune n'ait jamais été semée : gap
-- comblé ici. Les gabarits sont des métadonnées STRUCTURELLES (sections,
-- champs calculés) — pas le texte juridique lui-même, qui reste un fichier
-- déposé (C.B.D.) ou généré côté serveur (T5, D-2), jamais fabriqué ici.
-- =============================================================================

-- Modèles d'offre : org_id NULL = modèle système, réutilisable par toute
-- organisation (I-6). Le gabarit décrit la structure, pas le texte légal.
insert into documents_modele_versions (org_id, type, version, langue, juridiction, gabarit, actif)
values
  (null, 'offre_tarifaire', 1, 'fr', 'BE',
   '{"sections": ["identite_client", "adresses", "prestations", "tableau_synthese", "conditions", "signature"]}'::jsonb, true),
  (null, 'offre_emballage', 1, 'fr', 'BE',
   '{"sections": ["identite_client", "adresses", "prestations", "emballage", "tableau_synthese", "conditions", "signature"]}'::jsonb, true),
  (null, 'offre_forfait', 1, 'fr', 'BE',
   '{"sections": ["identite_client", "adresses", "prestation_forfaitaire", "conditions_forfait", "tableau_synthese", "conditions", "signature"]}'::jsonb, true)
on conflict do nothing;

-- C.B.D. : NON NÉGOCIABLE (S6), spécifique à l'organisation. Le fichier réel
-- (texte validé) doit être déposé par le fondateur dans Supabase Storage —
-- fichier_ref est un chemin, jamais un contenu inventé ici. Nécessite l'org_id
-- réel : remplacer :'org_id' à l'application, comme pour le seed du barème.
-- Pour Roovers, utiliser org_id = '893d9c67-9d07-4408-a484-13fa31aec500' et
-- fichier_ref = 'cbd/roovers-v1.pdf'.
insert into documents_modele_versions (org_id, type, version, langue, juridiction, fichier_ref, actif)
values ('893d9c67-9d07-4408-a484-13fa31aec500', 'cbd', 1, 'fr', 'BE', 'cbd/roovers-v1.pdf', true)
on conflict do nothing;
comment on table documents_modele_versions is
  'Modèles versionnés (I-6). type=cbd : fichier_ref pointe un document déposé en Storage — à uploader par le fondateur, jamais généré ni inventé.';

-- Ferme le gap ouvert depuis le Module 6 : scenario_id référence enfin
-- scenarios(id), disponible depuis l'ajout de cette table (0013).
alter table documents_instances
  add constraint fk_instances_scenario
  foreign key (scenario_id) references scenarios(id);
