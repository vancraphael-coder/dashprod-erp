-- =============================================================================
-- 0077_abonnement_transition.sql   ✅ appliquée le 2026-08-05
--
-- PÉRIODICITÉ, ESSAI, ET CHANGEMENT D'OFFRE.
--
-- Décisions de Raphaël (05/08/2026) :
--   - facturation mensuelle ou annuelle, l'annuel remisé de 5 % ;
--   - 5 jours d'essai, sur l'offre Pro — on montre le meilleur, pas le socle ;
--   - en cas de descente d'offre avec dépassement, une page impose les
--     arbitrages nécessaires.
--
-- LE PRINCIPE QUI STRUCTURE LA DESCENTE, et il vient de lui :
--
--     « ne supprime jamais les données, c'est ce qui aide à remonter »
--
-- Une entreprise qui redescend garde TOUT. Ce qui dépasse la nouvelle limite
-- est ARCHIVÉ (`actif = false`), jamais effacé. Si elle remonte, il suffit de
-- réactiver. Un logiciel qui punit la descente en détruisant des données perd
-- le client deux fois : à la descente, et à la remontée qu'il ne fera pas.
--
-- Conséquence technique : `cmd_changer_offre` REFUSE tant que les arbitrages
-- ne sont pas faits, plutôt que de trancher seule. Choisir à la place du
-- client qui garde son compte serait la pire des automatisations.
-- =============================================================================

alter table public.organisations
  add column if not exists periodicite text not null default 'mensuel',
  add column if not exists essai_fin timestamptz,
  add column if not exists offre_changee_le timestamptz;

alter table public.organisations drop constraint if exists organisations_periodicite_valide;
alter table public.organisations
  add constraint organisations_periodicite_valide
  check (periodicite in ('mensuel', 'annuel'));

comment on column public.organisations.essai_fin is
  'Fin de la période d''essai (5 jours sur Pro). NULL = pas d''essai en cours.';

-- ── Le plan EFFECTIF : l'essai donne accès à Pro sans changer l'offre ──────
-- On ne modifie pas `plan` pendant l'essai : à l'expiration, l'organisation
-- retrouve son offre réelle sans qu'aucune écriture n'ait à être défaite.
create or replace function public.plan_effectif(p_org uuid default null)
returns text language sql stable security definer
set search_path to 'public' as $$
  select case
    when o.essai_fin is not null and o.essai_fin > now() then 'pro'
    else o.plan end
  from organisations o
  where o.id = coalesce(p_org, jwt_org());
$$;

revoke all on function public.plan_effectif(uuid) from public, anon;
grant execute on function public.plan_effectif(uuid) to authenticated;

create or replace function public.org_a_module(p_module text)
returns boolean language sql stable security definer
set search_path to 'public' as $$
  select p_module = any(modules_du_plan(plan_effectif()));
$$;

revoke all on function public.org_a_module(text) from public, anon;
grant execute on function public.org_a_module(text) to authenticated;

-- ── Ce qu'un changement d'offre exige, AVANT de l'appliquer ────────────────
create or replace function public.cmd_exigences_offre(p_cible text)
returns jsonb language plpgsql stable security definer
set search_path to 'public' as $$
declare
  v_org uuid := jwt_org();
  v_actuel text; v_max integer; v_actifs integer; v_perdus text[];
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if p_cible not in ('starter', 'regular', 'pro') then
    raise exception 'Offre inconnue : %', p_cible using errcode = '22023';
  end if;

  select plan into v_actuel from organisations where id = v_org;
  v_max := limite_utilisateurs(p_cible);
  select count(*) into v_actifs from utilisateurs
   where org_id = v_org and coalesce(actif, true) = true;

  -- Modules perdus : annoncés, mais SANS arbitrage. Leurs données restent en
  -- base, simplement inaccessibles — elles reviennent si l'entreprise remonte.
  select array_agg(m) into v_perdus from (
    select unnest(modules_du_plan(v_actuel)) as m
    except
    select unnest(modules_du_plan(p_cible))) x;

  return jsonb_build_object(
    'plan_actuel', v_actuel,
    'plan_cible', p_cible,
    'utilisateurs_actifs', v_actifs,
    'limite_cible', v_max,
    'a_archiver', case when v_max is null then 0
                       else greatest(0, v_actifs - v_max) end,
    'modules_perdus', coalesce(to_jsonb(v_perdus), '[]'::jsonb),
    'immediat', (v_max is null or v_actifs <= v_max));
end $$;

revoke all on function public.cmd_exigences_offre(text) from public, anon;
grant execute on function public.cmd_exigences_offre(text) to authenticated;

-- ── Appliquer le changement ────────────────────────────────────────────────
-- `p_conserver` : les utilisateurs à garder actifs. Les autres sont ARCHIVÉS.
create or replace function public.cmd_changer_offre(
  p_cible text,
  p_periodicite text default null,
  p_conserver uuid[] default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_org uuid := jwt_org();
  v_actuel text; v_max integer; v_actifs integer; v_archives integer := 0;
  v_moi uuid;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if p_cible not in ('starter', 'regular', 'pro') then
    raise exception 'Offre inconnue : %', p_cible using errcode = '22023';
  end if;

  select plan into v_actuel from organisations where id = v_org;
  select id into v_moi from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  v_max := limite_utilisateurs(p_cible);
  select count(*) into v_actifs from utilisateurs
   where org_id = v_org and coalesce(actif, true) = true;

  if v_max is not null and v_actifs > v_max then
    -- On REFUSE tant que le choix n'est pas fait : trancher soi-même qui perd
    -- son accès serait la pire des automatisations.
    if p_conserver is null or array_length(p_conserver, 1) is null then
      raise exception 'Cette offre comprend % utilisateur(s) et vous en avez % : désignez qui conserve son accès.',
        v_max, v_actifs using errcode = '22023';
    end if;
    if array_length(p_conserver, 1) > v_max then
      raise exception 'Vous avez désigné % personnes pour % place(s).',
        array_length(p_conserver, 1), v_max using errcode = '22023';
    end if;
    -- L'administrateur qui pilote la transition ne peut pas se retirer
    -- lui-même : plus personne ne pourrait remonter d'offre ensuite.
    if v_moi is not null and not (v_moi = any(p_conserver)) then
      raise exception 'Vous devez conserver votre propre accès pour pouvoir gérer l''abonnement.'
        using errcode = '22023';
    end if;

    -- ARCHIVAGE, jamais suppression. Les comptes, leurs heures, leurs
    -- affectations et leur historique restent intacts : réactiver suffit.
    update utilisateurs
       set actif = false
     where org_id = v_org
       and coalesce(actif, true) = true
       and not (id = any(p_conserver));
    get diagnostics v_archives = row_count;
  end if;

  update organisations
     set plan = p_cible,
         periodicite = coalesce(nullif(btrim(p_periodicite), ''), periodicite),
         offre_changee_le = now()
   where id = v_org;

  perform emettre_evenement(v_org, 'Offre.Changee', 'organisation', v_org, v_moi,
    jsonb_build_object('de', v_actuel, 'vers', p_cible,
                       'utilisateurs_archives', v_archives,
                       'periodicite', p_periodicite));

  return jsonb_build_object('ok', true, 'plan', p_cible,
    'utilisateurs_archives', v_archives);
end $$;

revoke all on function public.cmd_changer_offre(text, text, uuid[]) from public, anon;
grant execute on function public.cmd_changer_offre(text, text, uuid[]) to authenticated;

-- ── Réactiver un accès archivé — la remontée ───────────────────────────────
create or replace function public.cmd_reactiver_membre(p_membre uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_max integer; v_actifs integer;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;

  v_max := limite_utilisateurs(plan_effectif());
  select count(*) into v_actifs from utilisateurs
   where org_id = v_org and coalesce(actif, true) = true;
  if v_max is not null and v_actifs >= v_max then
    raise exception 'Votre offre comprend % utilisateur(s). Passez à l''offre supérieure pour réactiver cet accès.',
      v_max using errcode = '42501';
  end if;

  update utilisateurs set actif = true
   where id = p_membre and org_id = v_org;

  perform emettre_evenement(v_org, 'Membre.Reactive', 'utilisateur', p_membre,
    (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org),
    '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.cmd_reactiver_membre(uuid) from public, anon;
grant execute on function public.cmd_reactiver_membre(uuid) to authenticated;

-- Vérification :
--   select plan_effectif();                    -- 'pro' pendant l'essai
--   select cmd_exigences_offre('starter');     -- a_archiver > 0 si dépassement
