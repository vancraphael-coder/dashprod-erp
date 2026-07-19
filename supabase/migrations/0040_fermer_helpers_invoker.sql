-- =============================================================================
-- 0040_fermer_helpers_invoker.sql — APPLIQUÉE en production le 19/07/2026
--
-- sequence_suivante() est SECURITY INVOKER et écrit dans `sequences`, qui n'a
-- qu'une policy SELECT. Appelée directement par un utilisateur authentifié,
-- elle échoue en 42501 :
--   "new row violates row-level security policy for table sequences"
-- Prouvé en test le 19/07/2026.
--
-- Elle ne fonctionne que depuis cmd_emettre_facture, SECURITY DEFINER, qui
-- s'exécute avec les droits de son propriétaire.
--
-- On ne la passe PAS en SECURITY DEFINER : cela permettrait à un appelant
-- d'incrémenter le compteur d'une autre organisation. On la ferme — c'est un
-- helper interne, seules les cmd_* doivent l'appeler.
-- =============================================================================
revoke execute on function public.sequence_suivante(uuid, text, integer)
  from public, anon, authenticated;

revoke execute on function public.transition_permise(etat_affaire, etat_affaire)
  from public, anon, authenticated;
