-- 0111_pro_ouverte.sql  —  APPLIQUÉE EN LIVE via MCP le 13/08/2026 (stub de référence)
-- Ouvre Pro à la souscription : plan_souscriptible autorise désormais 'pro'.
-- Le verrou du 05/08 (0078) ne vivait que là ; le gating runtime
-- (modules_du_plan / cmd_mon_acces) en était déjà indépendant.
create or replace function public.plan_souscriptible(p_plan text)
returns boolean language sql immutable set search_path to 'public'
as $$ select coalesce(p_plan,'regular') in ('starter','regular','pro'); $$;
