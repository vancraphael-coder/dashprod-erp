-- 0172 — APPLIQUÉE ET VÉRIFIÉE le 01/09/2026.
-- 0171 exigeait 'gerer_comptabilite' (capacité jamais déclarée, même piège que
-- la clôture). Remplacée par 'emettre_facture', déjà attribuée aux rôles de
-- direction. Qui pilote les recettes pilote les dépenses.
drop policy if exists depenses_ecriture on public.depenses;
create policy depenses_ecriture on public.depenses
  for all using (org_id = jwt_org() and acteur_a_capacite('emettre_facture'))
  with check (org_id = jwt_org() and acteur_a_capacite('emettre_facture'));
