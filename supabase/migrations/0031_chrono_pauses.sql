-- =============================================================================
-- Migration 0031 — Pauses du chrono chantier
-- Source : demande fondateur (app terrain). Le chrono du chantier tourne en
-- continu (temps total de mobilisation de l'équipe) ; on marque des PAUSES
-- (déjeuner, attente) qui sont enregistrées pour information, sans arrêter le
-- compteur principal. Un stop final clôt le chantier.
--
-- Modèle : une colonne `type` sur chrono_sessions. La session 'travail' est le
-- compteur principal (une seule ouverte à la fois, comme avant). Les pauses
-- sont des sessions 'pause' qui s'ouvrent et se ferment en parallèle, sans
-- toucher au compteur principal.
-- =============================================================================

alter table chrono_sessions add column if not exists type text not null default 'travail';
comment on column chrono_sessions.type is
  'travail = compteur principal du chantier ; pause = arrêt de l''équipe (informatif, ne stoppe pas le compteur).';

-- Commande : ouvrir/fermer une pause sur la mission, sans toucher au travail.
create or replace function cmd_chrono_pause(p_mission uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_pause_ouverte uuid;
begin
  -- Une pause ouverte ? On la ferme. Sinon on en ouvre une.
  select id into v_pause_ouverte from chrono_sessions
   where mission_id = p_mission and org_id = v_org and type = 'pause' and fin is null
   limit 1;

  if v_pause_ouverte is not null then
    update chrono_sessions set fin = now() where id = v_pause_ouverte;
    perform emettre_evenement(v_org, 'Chrono.PauseTerminee', 'mission', p_mission, null, '{}'::jsonb);
  else
    insert into chrono_sessions (org_id, mission_id, type, debut)
    values (v_org, p_mission, 'pause', now());
    perform emettre_evenement(v_org, 'Chrono.PauseDebut', 'mission', p_mission, null, '{}'::jsonb);
  end if;
end; $$;
comment on function cmd_chrono_pause is
  'Bascule une pause d''équipe (informatif). N''affecte pas le compteur principal (type travail).';
