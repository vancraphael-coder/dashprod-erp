-- =============================================================================
-- Migration 0010 — Opérations : commandes
-- Source : Réf. 2 (cascade S10-2, chrono) et Réf. 3 (T4).
-- cmd_creer_mission (déclenchée à la confirmation d'affaire), cmd_affecter_membre
-- (gardée par gerer_planning), cmd_chrono_demarrer / cmd_chrono_arreter.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- cmd_creer_mission — crée une mission pour une affaire confirmée. Capacité :
-- gerer_planning. Émet Mission.Creee.
-- -----------------------------------------------------------------------------
create or replace function cmd_creer_mission(
  p_affaire uuid, p_type text, p_date date, p_heure time
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_id  uuid;
  v_acteur uuid;
begin
  if not acteur_a_capacite('gerer_planning') then
    raise exception 'Refusé : capacité gerer_planning requise' using errcode = '42501';
  end if;
  if not exists (select 1 from affaires where id = p_affaire and org_id = v_org) then
    raise exception 'Affaire introuvable dans cette organisation';
  end if;

  insert into missions (org_id, affaire_id, type, date, heure)
    values (v_org, p_affaire, coalesce(p_type,'demenagement'), p_date, p_heure)
    returning id into v_id;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Mission.Creee', 'mission', v_id, v_acteur,
    jsonb_build_object('affaire', p_affaire, 'type', p_type, 'date', p_date));
  return v_id;
end; $$;

-- -----------------------------------------------------------------------------
-- cmd_affecter_membre — affecte une personne à une mission (source unique de
-- l'effectif, C-13). Capacité : gerer_planning. Idempotent. Émet Membre.Affecte.
-- -----------------------------------------------------------------------------
create or replace function cmd_affecter_membre(
  p_mission uuid, p_utilisateur uuid, p_role text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
begin
  if not acteur_a_capacite('gerer_planning') then
    raise exception 'Refusé : capacité gerer_planning requise' using errcode = '42501';
  end if;
  if not exists (select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable';
  end if;
  if not exists (select 1 from utilisateurs where id = p_utilisateur and org_id = v_org) then
    raise exception 'Utilisateur hors organisation';
  end if;

  insert into mission_affectations (mission_id, utilisateur_id, org_id, role_mission)
    values (p_mission, p_utilisateur, v_org, p_role)
    on conflict (mission_id, utilisateur_id) do update set role_mission = excluded.role_mission;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Membre.Affecte', 'mission', p_mission, v_acteur,
    jsonb_build_object('utilisateur', p_utilisateur, 'role', p_role));
end; $$;

-- -----------------------------------------------------------------------------
-- cmd_chrono_demarrer — ouvre une session de chrono. Refuse s'il y en a déjà
-- une ouverte pour la mission (une seule session en cours à la fois).
-- -----------------------------------------------------------------------------
create or replace function cmd_chrono_demarrer(p_mission uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_id  uuid;
  v_acteur uuid;
begin
  if exists (select 1 from chrono_sessions
             where mission_id = p_mission and org_id = v_org and fin is null) then
    raise exception 'Une session de chrono est déjà en cours pour cette mission';
  end if;

  insert into chrono_sessions (org_id, mission_id, debut)
    values (v_org, p_mission, now())
    returning id into v_id;

  -- Bascule la mission en cours si elle était planifiée.
  update missions set etat = 'en_cours'
    where id = p_mission and org_id = v_org and etat = 'planifiee';

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Chrono.Demarre', 'mission', p_mission, v_acteur, '{}'::jsonb);
  return v_id;
end; $$;

-- -----------------------------------------------------------------------------
-- cmd_chrono_arreter — ferme la session ouverte. Émet Chrono.Arrete, qui
-- propose (côté consommateur) le passage de la mission à « effectuée ».
-- -----------------------------------------------------------------------------
create or replace function cmd_chrono_arreter(p_mission uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
begin
  update chrono_sessions set fin = now()
    where mission_id = p_mission and org_id = v_org and fin is null;
  if not found then
    raise exception 'Aucune session de chrono en cours pour cette mission';
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Chrono.Arrete', 'mission', p_mission, v_acteur, '{}'::jsonb);
end; $$;
comment on function cmd_chrono_arreter is
  'Ferme la session. Émet Chrono.Arrete → proposition de passage à effectuée (S4).';
