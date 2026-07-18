-- =============================================================================
-- Migration 0033 — Corrections : org_id des signalements, récupération d'archives
--
-- BUG 1 : vehicule_signalements.org_id est NOT NULL sans DEFAULT (oubli 0032).
--   L'insert du front (qui ne fournit pas org_id) était donc TOUJOURS rejeté
--   par la RLS → le signalement ne partait jamais au bureau. On aligne sur les
--   autres tables : DEFAULT jwt_org().
--
-- BUG 2 : impossible de récupérer un membre archivé. On ajoute la commande
--   inverse de cmd_archiver_utilisateur.
-- =============================================================================

-- BUG 1 — défaut manquant.
alter table vehicule_signalements alter column org_id set default jwt_org();

-- BUG 2 — désarchiver un membre (réactiver le compte).
create or replace function cmd_desarchiver_utilisateur(p_utilisateur uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise' using errcode = '42501';
  end if;
  update utilisateurs set actif = true where id = p_utilisateur and org_id = v_org;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Utilisateur.Desarchive',
    'utilisateur', p_utilisateur, v_acteur, '{}'::jsonb);
end; $$;
comment on function cmd_desarchiver_utilisateur is
  'Réactive un membre archivé (actif = true). Capacité gerer_referentiels requise.';

-- BUG 3 — retrait d'un membre au planning : cmd_affecter_membre n'affectait
-- que dans un sens. On ajoute la désaffectation (inverse).
create or replace function cmd_desaffecter_membre(p_mission uuid, p_utilisateur uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
begin
  if not acteur_a_capacite('gerer_planning') then
    raise exception 'Refusé : capacité gerer_planning requise' using errcode = '42501';
  end if;
  delete from mission_affectations
   where mission_id = p_mission and utilisateur_id = p_utilisateur and org_id = v_org;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Membre.Desaffecte', 'mission', p_mission, v_acteur,
    jsonb_build_object('utilisateur', p_utilisateur));
end; $$;
