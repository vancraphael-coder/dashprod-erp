
-- =============================================================================
-- 0042_identite_organisation.sql — APPLIQUÉE en production le 21/07/2026
-- (ne pas rejouer dans l'éditeur SQL : ranger dans le dépôt, c'est tout)
--
-- Couche « source de vérité » : l'organisation porte l'identité complète de
-- l'entreprise, dont tous les modules héritent (devis, PDF, email, facture,
-- Peppol). Jusqu'ici ces champs n'existaient pas ou n'étaient pas modifiables.
-- =============================================================================
 
alter table public.organisations
  add column if not exists nom_commercial   text,
  add column if not exists forme_juridique  text,
  add column if not exists site_web         text,
  add column if not exists parametres_facturation jsonb;
 
comment on column public.organisations.nom_commercial is
  'Nom d''enseigne si différent du nom légal. Affiché sur les documents.';
comment on column public.organisations.parametres_facturation is
  'Réglages hérités par la facturation : {tva_taux, echeance_jours, '
  'mention_legale, prefixe_numero, communication_structuree}. '
  'Clé absente = défaut du domaine.';
 
-- Les colonnes adresse_lignes / adresse_cp / adresse_ville / adresse_subdiv /
-- adresse_pays sont mortes : aucun code ne les lit, tout passe par
-- adresse / cp / ville. On les documente plutôt que de les supprimer —
-- une suppression se fait après vérification, pas dans la même migration.
comment on column public.organisations.adresse_lignes is
  'OBSOLÈTE — non lue par l''application. Utiliser adresse / cp / ville.';
 
