-- =============================================================================
-- 0062_trajet_mission.sql   ✅ appliquée le 2026-07-28
--
-- Temps de trajet dépôt → premier chantier, porté par la mission.
--
-- Pourquoi une colonne dédiée plutôt que réutiliser le km du devis : le km du
-- devis est l'ALLER-RETOUR complet (dépôt → chargement → déchargement →
-- dépôt). S'en servir pour « dépôt → première adresse » donnerait un chiffre
-- deux à trois fois trop grand, et donc une heure de départ fausse. Une
-- équipe qui part trop tôt attend devant une porte ; trop tard, elle est en
-- retard chez le client. On stocke donc la bonne grandeur, séparément.
--
-- `trajet_source` dit d'où vient le chiffre, et l'écran le répète :
--   'mesure'  → renvoyé par un service de routage
--   'estime'  → déduit d'une distance et d'une vitesse moyenne
--   'manuel'  → saisi par le bureau
-- Sans valeur, aucune heure de départ n'est conseillée : mieux vaut ne rien
-- dire que d'inventer un horaire.
-- =============================================================================

alter table public.missions
  add column if not exists trajet_minutes integer,
  add column if not exists trajet_km      numeric(8,2),
  add column if not exists trajet_source  text;

comment on column public.missions.trajet_minutes is
  'Durée dépôt → première adresse du chantier, en minutes. NULL = inconnue : '
  'aucune heure de départ n''est alors conseillée.';
comment on column public.missions.trajet_source is
  'mesure (routage) | estime (vitesse moyenne) | manuel (bureau). Affiché à '
  'l''utilisateur : une estimation ne doit pas se lire comme un horaire garanti.';

alter table public.missions
  drop constraint if exists missions_trajet_source_valide;
alter table public.missions
  add constraint missions_trajet_source_valide
  check (trajet_source is null or trajet_source in ('mesure','estime','manuel'));

create or replace function public.cmd_trajet_definir(
  p_mission uuid,
  p_minutes integer default null,
  p_km      numeric default null,
  p_source  text default 'manuel')
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org();
begin
  if not exists (select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;
  if p_minutes is not null and (p_minutes < 0 or p_minutes > 24 * 60) then
    return jsonb_build_object('ok', false, 'message', 'Durée de trajet invalide.');
  end if;

  update missions
     set trajet_minutes = coalesce(p_minutes, trajet_minutes),
         trajet_km      = coalesce(p_km, trajet_km),
         trajet_source  = case
           when p_minutes is not null or p_km is not null
             then coalesce(nullif(btrim(p_source), ''), 'manuel')
           else trajet_source end
   where id = p_mission and org_id = v_org;

  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.cmd_trajet_definir(uuid, integer, numeric, text)
  from public, anon;
grant execute on function public.cmd_trajet_definir(uuid, integer, numeric, text)
  to authenticated;
