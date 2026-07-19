-- =============================================================================
-- 0038c_verrouiller_fonctions_internes.sql — APPLIQUÉE le 19/07/2026
--
-- Le linter Supabase a révélé 11 fonctions SECURITY DEFINER internes encore
-- appelables en RPC par `anon` via PUBLIC :
--   annuler_missions_affaire, avancer_paye_si_solde,
--   creer_missions_a_la_confirmation, planifier_apres_confirmation,
--   recalculer_totaux_facture, reprendre_affaire_reportee,
--   reprendre_apres_report, sync_date_vers_missions,
--   sync_dossier_vers_missions, sync_mission_vers_dossier, transition_interne
--
-- transition_interne(p_affaire, p_cible) est la plus sensible : elle force une
-- transition d'état en CONTOURNANT les contrôles de cmd_transition_affaire.
--
-- Ces fonctions sont appelées par des triggers (qui n'exigent pas EXECUTE) ou
-- depuis les cmd_* (SECURITY DEFINER, exécutées avec les droits du
-- propriétaire) : les fermer n'affecte aucun chemin légitime.
--
-- API destinée au client, et elle seule : cmd_*, mon_profil,
-- acteur_a_capacite, version_modele_active.
-- =============================================================================

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and (p.prosecdef or p.prorettype = 'trigger'::regtype)
       and p.proname not like 'cmd\_%'
       and p.proname not in ('mon_profil','acteur_a_capacite','version_modele_active')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

grant execute on function public.hook_ajouter_claims(jsonb) to supabase_auth_admin;
