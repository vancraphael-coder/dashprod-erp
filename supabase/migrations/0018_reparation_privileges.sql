-- =============================================================================
-- Migration 0018 — Réparation : privilèges du schéma et org_id par défaut
--
-- CONTEXTE (incident) : le reset « drop schema public cascade » utilisé avant
-- de rejouer les migrations a AUSSI effacé les privilèges par défaut que
-- Supabase installe sur le schéma public. Les tables recréées par 0001-0017
-- n'accordaient donc AUCUN droit au rôle authenticated → erreurs 403/42501
-- (« permission denied for table clients ») sur toute l'app.
--
-- Modèle de sécurité Supabase (rappel) : les GRANTs sont larges, c'est la RLS
-- qui restreint. Toutes nos tables ont la RLS activée avec isolation de tenant
-- (org_id = jwt_org()) — rétablir les grants standard est donc sûr : un anon
-- sans org dans son jeton ne voit aucune ligne.
--
-- Ce fichier corrige AUSSI un second bug qui se serait révélé juste après :
-- l'adaptateur insère (clients, affaires, scenarios, factures, paiements…)
-- sans fournir org_id, colonne NOT NULL. On pose un DEFAULT jwt_org() sur
-- toutes les colonnes org_id du schéma : l'organisation vient du jeton, et la
-- politique RLS (with check org_id = jwt_org()) reste le garde-fou final.
-- =============================================================================

-- 1) Rétablir les privilèges standard (état d'un projet Supabase neuf).
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Et pour les objets créés par les MIGRATIONS FUTURES (sinon même piège) :
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- 2) Re-verrouiller le hook JWT (le grant global ci-dessus l'a réexposé) :
-- il ne doit être appelable QUE par le service d'authentification.
revoke execute on function hook_ajouter_claims(jsonb) from public, anon, authenticated;
grant  execute on function hook_ajouter_claims(jsonb) to supabase_auth_admin;

-- 3) org_id par défaut depuis le jeton, sur toutes les tables qui le portent.
-- Un INSERT explicite (seed avec org_id, ou NULL volontaire pour un modèle
-- système) prime toujours sur le défaut.
do $$
declare r record;
begin
  for r in
    select table_name
      from information_schema.columns
     where table_schema = 'public' and column_name = 'org_id'
  loop
    execute format(
      'alter table public.%I alter column org_id set default jwt_org();',
      r.table_name
    );
  end loop;
end $$;

-- 4) Vérifications rapides (à lire dans le résultat) :
-- select has_table_privilege('authenticated', 'clients', 'select');       -- true
-- select column_default from information_schema.columns
--   where table_name = 'clients' and column_name = 'org_id';              -- jwt_org()
