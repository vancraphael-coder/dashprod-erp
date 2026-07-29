-- =============================================================================
-- 0060_pointage_depart_arrivee.sql   ✅ appliquée le 2026-07-28
--
-- Le chronomètre devient un DOUBLE MINUTEUR : départ et arrivée.
--
-- Pourquoi ce changement (EX-02 du PRODUCT_TRUTH, décision de Raphaël) :
-- un chronomètre suppose que le système mesure. Dans la réalité d'un
-- déménagement, le téléphone est oublié dans le camion, le travail commence
-- avant que quiconque ouvre l'application, une pause s'étire. Le chef
-- d'équipe, lui, SAIT à quelle heure on est parti et à quelle heure on est
-- rentré. On enregistre donc deux instants déclarés, pas une mesure.
--
-- Compatibilité — point important : le STOCKAGE ne change pas. Le départ
-- ouvre une session `travail` (debut) et l'arrivée la ferme (fin), dans
-- chrono_sessions. La paie, qui calcule le brut depuis ces sessions, continue
-- de fonctionner sans la moindre modification. Les pauses restent des
-- sessions de type `pause`.
--
-- Ce que cette migration ajoute : la possibilité de POSER ou CORRIGER ces
-- deux instants, ce que les cmd_chrono_* ne permettaient pas (elles ne
-- savaient qu'horodater l'instant présent). Les cmd_chrono_* restent en base
-- mais n'ont plus d'appelant.
-- =============================================================================

create or replace function public.cmd_pointage_definir(
  p_mission uuid,
  p_depart  timestamptz default null,
  p_arrivee timestamptz default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
  v_session uuid;
  v_debut timestamptz;
  v_fin timestamptz;
begin
  -- Le terrain déclare ses propres heures : appartenir à l'organisation suffit,
  -- pas besoin des droits du bureau.
  if not exists (select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;

  -- Cohérence : une arrivée avant le départ n'existe pas. On refuse plutôt
  -- que d'enregistrer une durée négative qui fausserait la paie.
  if p_depart is not null and p_arrivee is not null and p_arrivee < p_depart then
    return jsonb_build_object('ok', false,
      'message', 'L''heure d''arrivée est antérieure à l''heure de départ.');
  end if;

  -- Une seule session de travail par mission : on reprend celle qui existe.
  select id, debut, fin into v_session, v_debut, v_fin
    from chrono_sessions
   where mission_id = p_mission and org_id = v_org
     and coalesce(type, 'travail') = 'travail'
   order by debut limit 1;

  if v_session is null then
    if p_depart is null then
      return jsonb_build_object('ok', false,
        'message', 'Indiquez d''abord l''heure de départ.');
    end if;
    insert into chrono_sessions (org_id, mission_id, debut, fin, type)
    values (v_org, p_mission, p_depart, p_arrivee, 'travail')
    returning id, debut, fin into v_session, v_debut, v_fin;
  else
    update chrono_sessions
       set debut = coalesce(p_depart, debut),
           fin   = case when p_arrivee is not null then p_arrivee else fin end
     where id = v_session
    returning debut, fin into v_debut, v_fin;
  end if;

  -- La mission suit l'état réel du terrain.
  update missions
     set etat = case when v_fin is not null then 'effectuee' else 'en_cours' end
   where id = p_mission and org_id = v_org
     and etat in ('planifiee', 'en_cours');

  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  perform emettre_evenement(v_org, 'Pointage.Declare', 'mission', p_mission,
    v_acteur, jsonb_build_object('depart', v_debut, 'arrivee', v_fin));

  return jsonb_build_object('ok', true, 'depart', v_debut, 'arrivee', v_fin);
end $$;

revoke all on function public.cmd_pointage_definir(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.cmd_pointage_definir(uuid, timestamptz, timestamptz)
  to authenticated;

-- ── Pause déclarée (début et fin fournis, pas mesurés) ─────────────────────
create or replace function public.cmd_pause_ajouter(
  p_mission uuid, p_debut timestamptz, p_fin timestamptz)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_id uuid;
begin
  if not exists (select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;
  if p_debut is null or p_fin is null or p_fin <= p_debut then
    return jsonb_build_object('ok', false,
      'message', 'La fin de pause doit suivre son début.');
  end if;

  insert into chrono_sessions (org_id, mission_id, debut, fin, type)
  values (v_org, p_mission, p_debut, p_fin, 'pause')
  returning id into v_id;

  perform emettre_evenement(v_org, 'Pause.Declaree', 'mission', p_mission,
    (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org),
    jsonb_build_object('debut', p_debut, 'fin', p_fin));
  return jsonb_build_object('ok', true, 'pause_id', v_id);
end $$;

revoke all on function public.cmd_pause_ajouter(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.cmd_pause_ajouter(uuid, timestamptz, timestamptz)
  to authenticated;

-- ── Retirer une pause saisie par erreur ────────────────────────────────────
create or replace function public.cmd_pause_retirer(p_session uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_mission uuid;
begin
  select mission_id into v_mission from chrono_sessions
   where id = p_session and org_id = v_org and type = 'pause';
  if v_mission is null then
    raise exception 'Pause introuvable' using errcode = '42501';
  end if;
  delete from chrono_sessions where id = p_session and org_id = v_org;
  perform emettre_evenement(v_org, 'Pause.Retiree', 'mission', v_mission,
    (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org),
    '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.cmd_pause_retirer(uuid) from public, anon;
grant execute on function public.cmd_pause_retirer(uuid) to authenticated;
