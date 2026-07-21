-- =============================================================================
-- 0043_policies_update_manquantes.sql — APPLIQUÉE en production le 21/07/2026
-- (ne pas rejouer dans l'éditeur SQL : ranger dans le dépôt, c'est tout)
--
-- CAUSE RACINE : aucun réglage ne s'enregistrait, depuis toujours.
--
-- `organisations` n'avait qu'une policy FOR SELECT. Tout UPDATE envoyé par
-- l'application (identité, barème, coûts, textes, catalogues) était filtré par
-- la RLS et touchait 0 ligne. PostgREST ne renvoie PAS d'erreur pour un UPDATE
-- à 0 ligne : l'écran affichait « ✓ Enregistré » et rien n'était écrit.
--
-- Prouvé le 21/07/2026 : organisations.updated_at figé au 16/07, et
-- parametres_textes / parametres_facturation / parametres_catalogues à NULL
-- alors que les écrans avaient été utilisés.
--
-- Même problème sur `utilisateurs` : aucune modification de profil possible.
-- =============================================================================

drop policy if exists org_maj on public.organisations;
create policy org_maj on public.organisations
  for update to authenticated
  using      (id = jwt_org() and acteur_a_capacite('gerer_referentiels'))
  with check (id = jwt_org() and acteur_a_capacite('gerer_referentiels'));

-- Pas de policy INSERT ni DELETE : la création d'organisation passe
-- exclusivement par creer_organisation() (SECURITY DEFINER, réservée à
-- l'éditeur), et une organisation ne se supprime pas depuis l'application.

drop policy if exists utilisateurs_maj on public.utilisateurs;
create policy utilisateurs_maj on public.utilisateurs
  for update to authenticated
  using (
    org_id = jwt_org()
    and (auth_id = auth.uid() or acteur_a_capacite('gerer_referentiels'))
  )
  with check (
    org_id = jwt_org()
    and (auth_id = auth.uid() or acteur_a_capacite('gerer_referentiels'))
  );
