-- =============================================================================
-- 0067_capacites_terrain.sql   ✅ appliquée le 2026-07-29 — LOT 5
--
-- LE TERRAIN N'ÉTAIT CONTRÔLÉ PAR RIEN.
--
-- Constat de l'audit : aucune commande terrain ne vérifiait de capacité.
--   cmd_pointage_definir, cmd_pause_ajouter, cmd_pause_retirer,
--   cmd_terminer_chantier
-- se contentaient de vérifier que la mission appartenait à l'organisation.
-- Conséquence : n'importe quel membre pouvait déclarer des heures sur une
-- mission où il n'était pas affecté, et clôturer le chantier de quelqu'un
-- d'autre — donc arrêter le décompte de toute une équipe.
--
-- Second constat : `chef_equipe` avait EXACTEMENT les mêmes capacités qu'un
-- déménageur (demander_conge, signaler_materiel). Le rôle existait sans rien
-- signifier.
--
-- Deux capacités nouvelles, et une règle :
--   pointer_chantier   → déclarer SES heures, sur les missions où l'on est
--                        affecté. Tout le monde sur le terrain.
--   cloturer_chantier  → déclarer le chantier terminé POUR L'ÉQUIPE. C'est le
--                        geste du chef : il arrête le décompte de tous.
--
-- La règle : pointer n'est permis que sur une mission où l'on est AFFECTÉ.
-- Le bureau (gerer_planning) garde la main partout — il corrige les oublis.
-- =============================================================================

insert into public.capacites (cle, libelle) values
  ('pointer_chantier',  'Déclarer ses heures de chantier'),
  ('cloturer_chantier', 'Clôturer un chantier pour l''équipe')
on conflict (cle) do nothing;

-- ── Attribution aux rôles, dans chaque organisation ────────────────────────
-- Tout le terrain pointe ; seuls le chef d'équipe, la coordination et la
-- direction clôturent.
insert into public.role_capacites (role_id, capacite_cle)
select r.id, 'pointer_chantier'
  from public.roles r
 where r.cle in ('demenageur', 'chef_equipe', 'coordination', 'direction')
on conflict do nothing;

insert into public.role_capacites (role_id, capacite_cle)
select r.id, 'cloturer_chantier'
  from public.roles r
 where r.cle in ('chef_equipe', 'coordination', 'direction')
on conflict do nothing;

-- ── Le membre est-il affecté à cette mission ? ─────────────────────────────
create or replace function public.est_affecte_mission(p_mission uuid)
returns boolean language sql stable security definer
set search_path to 'public' as $$
  select exists (
    select 1
      from mission_affectations ma
      join utilisateurs u on u.id = ma.utilisateur_id
     where ma.mission_id = p_mission
       and u.auth_id = auth.uid()
       and u.org_id = jwt_org());
$$;

revoke all on function public.est_affecte_mission(uuid) from public, anon;
grant execute on function public.est_affecte_mission(uuid) to authenticated;

-- ── Pointage : capacité + affectation ──────────────────────────────────────
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
  if not exists (select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;

  -- On déclare SES heures, pas celles des autres. Le bureau (gerer_planning)
  -- reste libre de corriger n'importe quelle mission : c'est son métier.
  if not acteur_a_capacite('gerer_planning') then
    if not acteur_a_capacite('pointer_chantier') then
      raise exception 'Vous n''êtes pas autorisé à déclarer des heures'
        using errcode = '42501';
    end if;
    if not est_affecte_mission(p_mission) then
      raise exception 'Vous n''êtes pas affecté à ce chantier'
        using errcode = '42501';
    end if;
  end if;

  if p_depart is not null and p_arrivee is not null and p_arrivee < p_depart then
    return jsonb_build_object('ok', false,
      'message', 'L''heure d''arrivée est antérieure à l''heure de départ.');
  end if;

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

-- ── Pauses : même règle que le pointage ────────────────────────────────────
create or replace function public.cmd_pause_ajouter(
  p_mission uuid, p_debut timestamptz, p_fin timestamptz)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_id uuid;
begin
  if not exists (select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;
  if not acteur_a_capacite('gerer_planning')
     and not (acteur_a_capacite('pointer_chantier') and est_affecte_mission(p_mission)) then
    raise exception 'Vous n''êtes pas autorisé à déclarer une pause sur ce chantier'
      using errcode = '42501';
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

create or replace function public.cmd_pause_retirer(p_session uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_mission uuid;
begin
  select mission_id into v_mission from chrono_sessions
   where id = p_session and org_id = v_org and type = 'pause';
  if v_mission is null then
    raise exception 'Pause introuvable' using errcode = '42501';
  end if;
  if not acteur_a_capacite('gerer_planning')
     and not (acteur_a_capacite('pointer_chantier') and est_affecte_mission(v_mission)) then
    raise exception 'Vous n''êtes pas autorisé à modifier ce chantier'
      using errcode = '42501';
  end if;

  delete from chrono_sessions where id = p_session and org_id = v_org;
  perform emettre_evenement(v_org, 'Pause.Retiree', 'mission', v_mission,
    (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org),
    '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.cmd_pause_retirer(uuid) from public, anon;
grant execute on function public.cmd_pause_retirer(uuid) to authenticated;

-- ── Clôture : le geste du chef d'équipe ────────────────────────────────────
create or replace function public.cmd_terminer_chantier(p_mission uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
  v_affaire uuid;
begin
  if not exists (select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;

  -- Clôturer arrête le décompte de TOUTE l'équipe : ce n'est pas un geste
  -- individuel. Réservé au chef d'équipe (ou au bureau).
  if not acteur_a_capacite('gerer_planning')
     and not acteur_a_capacite('cloturer_chantier') then
    raise exception 'Seul le chef d''équipe peut clôturer le chantier'
      using errcode = '42501';
  end if;

  update chrono_sessions set fin = now()
    where mission_id = p_mission and org_id = v_org and fin is null;

  update missions set etat = 'effectuee'
    where id = p_mission and org_id = v_org and etat in ('planifiee','en_cours');

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Chantier.Termine', 'mission', p_mission, v_acteur, '{}'::jsonb);

  select affaire_id into v_affaire from missions where id = p_mission and org_id = v_org;
  if v_affaire is not null and not exists (
      select 1 from missions
       where affaire_id = v_affaire and org_id = v_org
         and etat in ('planifiee','en_cours')
  ) then
    perform transition_interne(v_affaire, 'planifie');
    perform transition_interne(v_affaire, 'en_cours');
    perform transition_interne(v_affaire, 'effectue');
  end if;
end $$;

revoke all on function public.cmd_terminer_chantier(uuid) from public, anon;
grant execute on function public.cmd_terminer_chantier(uuid) to authenticated;
