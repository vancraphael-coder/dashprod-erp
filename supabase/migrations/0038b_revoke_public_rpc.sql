-- =============================================================================
-- 0038b_revoke_public_rpc.sql — APPLIQUÉE le 19/07/2026
-- Correctif de 0038 section 4 : le REVOKE sur `anon` était sans effet.
-- Les fonctions héritaient d'EXECUTE via le pseudo-rôle PUBLIC. On révoque sur
-- PUBLIC, puis on rend explicitement le droit à `authenticated`.
-- =============================================================================

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef
       and (p.proname like 'cmd\_%'
            or p.proname in ('acteur_a_capacite','mon_profil','version_modele_active'))
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant  execute on function %s to authenticated',  f.sig);
  end loop;
end $$;

-- Amorçage : réservé au service_role.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname='public' and p.proname='provisionner_roles_standard'
  loop execute format('revoke execute on function %s from public, anon, authenticated', f.sig); end loop;
end $$;

-- Hook d'authentification : supabase_auth_admin uniquement.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname='public' and p.proname='hook_ajouter_claims'
  loop execute format('revoke execute on function %s from public, anon, authenticated', f.sig); end loop;
end $$;
