-- =============================================================================
-- 0204 — ÉTAPES DE LA JOURNÉE : le chef d'équipe avance, le bureau voit.
--
-- Une ligne par mission : l'étape atteinte (départ, chargement, en route,
-- déchargement, retour, terminé — selon le type) et son journal. C'est un
-- indicateur rapide : ni les heures, ni la paie, ni le décompte n'en
-- dépendent. Reculer est permis.
--
-- LES SÉQUENCES NE SONT PAS ICI. Elles vivent dans le domaine
-- (operations/etapes-journee.js). La base garde le rang et la clé, et refuse
-- deux choses : sauter plus d'une étape, et écraser un déplacement fait par un
-- autre chef entre-temps (on transmet le rang VU ; s'il a changé, rien ne
-- bouge et l'écran se remet à jour). Deux chefs sur la même équipe ne peuvent
-- donc pas se marcher dessus.
--
-- Lecture : toute la société (c'est un indicateur de journée, pas une donnée
-- sensible). Écriture : le chef d'équipe affecté, ou le bureau (correction
-- au téléphone), uniquement par la commande.
--
-- Strictement additive.
-- =============================================================================

create table if not exists public.mission_etapes (
  mission_id  uuid primary key references public.missions(id) on delete cascade,
  org_id      uuid not null default jwt_org() references public.organisations(id),
  etape       text,
  rang        integer not null default 0,
  journal     jsonb not null default '[]'::jsonb,
  maj_le      timestamptz not null default now(),
  maj_par     uuid references public.utilisateurs(id),
  constraint mission_etapes_rang_positif check (rang >= 0 and rang <= 20)
);

alter table public.mission_etapes enable row level security;

drop policy if exists mission_etapes_lecture on public.mission_etapes;
create policy mission_etapes_lecture on public.mission_etapes
  for select to authenticated using (org_id = jwt_org());

create or replace function public.cmd_etape_deplacer(
  p_mission uuid, p_rang_vu integer, p_rang integer, p_etape text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_acteur uuid; v_actuel integer; v_nom text;
begin
  if not exists (select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;
  if not (acteur_a_capacite('gerer_planning')
          or (acteur_a_capacite('cloturer_chantier') and est_affecte_mission(p_mission))) then
    raise exception 'Réservé au chef d''équipe du chantier' using errcode = '42501';
  end if;
  if p_rang is null or p_rang < 0 or abs(p_rang - coalesce(p_rang_vu, 0)) <> 1 then
    return jsonb_build_object('ok', false, 'message', 'Une étape à la fois.');
  end if;

  select rang into v_actuel from mission_etapes where mission_id = p_mission;
  if coalesce(v_actuel, 0) <> coalesce(p_rang_vu, 0) then
    select u.nom into v_nom from mission_etapes e join utilisateurs u on u.id = e.maj_par
     where e.mission_id = p_mission;
    return jsonb_build_object('ok', false, 'conflit', true, 'rang', coalesce(v_actuel, 0),
      'message', 'L''étape vient d''être changée' || coalesce(' par ' || v_nom, '') || '.');
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;

  insert into mission_etapes (mission_id, org_id, etape, rang, journal, maj_le, maj_par)
  values (p_mission, v_org, p_etape, p_rang,
          jsonb_build_array(jsonb_build_object('etape', p_etape, 'rang', p_rang,
                                               'le', now(), 'par', v_acteur)),
          now(), v_acteur)
  on conflict (mission_id) do update set
      etape = excluded.etape, rang = excluded.rang, maj_le = now(), maj_par = v_acteur,
      journal = mission_etapes.journal || jsonb_build_array(jsonb_build_object(
        'etape', p_etape, 'rang', p_rang, 'le', now(), 'par', v_acteur));

  perform emettre_evenement(v_org, 'Mission.Etape', 'mission', p_mission, v_acteur,
    jsonb_build_object('etape', p_etape, 'rang', p_rang));
  return jsonb_build_object('ok', true, 'rang', p_rang, 'etape', p_etape);
end $$;

revoke all on function public.cmd_etape_deplacer(uuid, integer, integer, text) from public, anon;
grant execute on function public.cmd_etape_deplacer(uuid, integer, integer, text) to authenticated;
grant select on public.mission_etapes to authenticated;
