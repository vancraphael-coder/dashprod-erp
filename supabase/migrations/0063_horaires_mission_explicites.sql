-- =============================================================================
-- 0063_horaires_mission_explicites.sql   ✅ appliquée le 2026-07-28
--
-- On RETIRE le calcul de trajet et on le remplace par trois heures posées
-- explicitement par le bureau. Décision de Raphaël, et elle est meilleure :
--
--   - un temps de trajet « calculé » n'est jamais qu'une estimation ; le
--     bureau, lui, SAIT à quelle heure il fait partir ses hommes ;
--   - trois heures lisibles valent mieux qu'une durée dont il faut déduire
--     l'horaire ;
--   - plus aucune dépendance à un service de routage externe (ni clé, ni coût,
--     ni panne d'un tiers un lundi matin).
--
-- Les trois heures d'une mission :
--   heure_depart_prevue  → départ des hommes DU DÉPÔT
--   heure                → heure prévue du déménagement (souvent 08:00),
--                          celle qui est liée à la date et qui fait foi
--                          vis-à-vis du client  [colonne existante]
--   heure_arrivee_prevue → arrivée prévue à la PREMIÈRE adresse (chargement)
--
-- Le temps de route n'est donc plus stocké : il se déduit du départ et de
-- l'arrivée. Une donnée dérivable ne se stocke pas — sinon les deux finissent
-- par se contredire.
-- =============================================================================

alter table public.missions
  add column if not exists heure_depart_prevue  time,
  add column if not exists heure_arrivee_prevue time;

comment on column public.missions.heure_depart_prevue is
  'Heure à laquelle les hommes quittent le dépôt.';
comment on column public.missions.heure_arrivee_prevue is
  'Heure prévue d''arrivée à la première adresse du client (chargement).';
comment on column public.missions.heure is
  'Heure prévue du déménagement, liée à la date (généralement 08:00). '
  'C''est l''heure de référence vis-à-vis du client.';

-- Le calcul automatique de trajet (0062) est abandonné : on retire ce qu'il a
-- laissé, plutôt que de garder des colonnes que plus personne n'alimente.
alter table public.missions drop constraint if exists missions_trajet_source_valide;
alter table public.missions
  drop column if exists trajet_minutes,
  drop column if exists trajet_km,
  drop column if exists trajet_source;

drop function if exists public.cmd_trajet_definir(uuid, integer, numeric, text);

-- ── Poser les horaires d'une mission ───────────────────────────────────────
-- Les trois heures se règlent ensemble : les séparer ferait perdre la
-- cohérence (une arrivée avant le départ, par exemple).
create or replace function public.cmd_horaires_mission(
  p_mission uuid,
  p_depart  time default null,
  p_heure   time default null,
  p_arrivee time default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_d time; v_a time;
begin
  if not exists (select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;
  if not acteur_a_capacite('gerer_planning') and not acteur_a_capacite('creer_affaire') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;

  -- Cohérence : on refuse une arrivée avant le départ. Le franchissement de
  -- minuit n'est pas géré ici volontairement — un déménagement qui part la
  -- veille au soir se planifie sur deux missions, pas sur une heure ambiguë.
  v_d := coalesce(p_depart, (select heure_depart_prevue from missions where id = p_mission));
  v_a := coalesce(p_arrivee, (select heure_arrivee_prevue from missions where id = p_mission));
  if v_d is not null and v_a is not null and v_a < v_d then
    return jsonb_build_object('ok', false,
      'message', 'L''arrivée prévue est antérieure au départ.');
  end if;

  update missions
     set heure_depart_prevue  = coalesce(p_depart,  heure_depart_prevue),
         heure                = coalesce(p_heure,   heure),
         heure_arrivee_prevue = coalesce(p_arrivee, heure_arrivee_prevue)
   where id = p_mission and org_id = v_org;

  perform emettre_evenement(v_org, 'Mission.HorairesDefinis', 'mission', p_mission,
    (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org),
    jsonb_build_object('depart', p_depart, 'heure', p_heure, 'arrivee', p_arrivee));

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.cmd_horaires_mission(uuid, time, time, time)
  from public, anon;
grant execute on function public.cmd_horaires_mission(uuid, time, time, time)
  to authenticated;
