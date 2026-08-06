-- =============================================================================
-- 0078_pro_verrouillee.sql   ✅ appliquée le 2026-08-05
--
-- L'OFFRE PRO EST VERROUILLÉE, ET L'INTERNATIONAL REDESCEND EN REGULAR.
--
-- Décision de Raphaël (05/08/2026) : Pro sera l'offre de la LOGISTIQUE
-- MULTI-SITES — plusieurs centres, chacun avec ses équipes et son
-- gestionnaire de dépôt. Rien de tout cela n'est construit : l'offre est donc
-- annoncée mais pas souscriptible. Encaisser pour une promesse est le plus sûr
-- moyen de perdre un client au premier mois.
--
-- Conséquence qu'il faut traiter, sinon on perd de la valeur : le module
-- `international` était dans Pro. Il est LIVRÉ et testé (colisage, douane,
-- poids taxable maritime et aérien). Le laisser dans une offre qu'on ne peut
-- pas souscrire le rendrait invendable. Il rejoint donc Regular. Il pourra
-- remonter si Pro s'ouvre — sa valeur propre, la logistique multi-sites, se
-- suffit à elle-même.
--
-- Le verrou est posé EN BASE, pas seulement dans l'interface : une offre
-- qu'on ne peut pas honorer ne doit pas pouvoir être souscrite par un appel
-- direct. `plan_souscriptible()` est le SEUL endroit à modifier pour l'ouvrir.
-- =============================================================================

create or replace function public.modules_du_plan(p_plan text)
returns text[] language sql immutable set search_path to 'public' as $$
  select case coalesce(p_plan, 'regular')
    when 'starter' then array[
      'crm','releve','devis','offre','planning','terrain','flotte','facturation']
    when 'pro' then array[
      'crm','releve','devis','offre','planning','terrain','flotte','facturation',
      'signature_client','espace_client','peppol','comptabilite',
      'rapport_chantier','paie','journal','international',
      'multi_depots','gestionnaire_depot','stockage_3d']
    else array[
      'crm','releve','devis','offre','planning','terrain','flotte','facturation',
      'signature_client','espace_client','peppol','comptabilite',
      'rapport_chantier','paie','journal','international']
  end;
$$;

create or replace function public.plan_souscriptible(p_plan text)
returns boolean language sql immutable set search_path to 'public' as $$
  select coalesce(p_plan, 'regular') in ('starter', 'regular');
$$;

revoke all on function public.plan_souscriptible(text) from public, anon;
grant execute on function public.plan_souscriptible(text) to authenticated;

-- ── Le changement d'offre refuse une offre verrouillée ─────────────────────
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

  -- Le verrou vit ici, pas seulement dans l'écran.
  if not plan_souscriptible(p_cible) then
    raise exception 'L''offre % n''est pas encore ouverte : les centres logistiques et les gestionnaires de dépôt sont en construction.',
      initcap(p_cible) using errcode = '22023';
  end if;

  select plan into v_actuel from organisations where id = v_org;
  select id into v_moi from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  v_max := limite_utilisateurs(p_cible);
  select count(*) into v_actifs from utilisateurs
   where org_id = v_org and coalesce(actif, true) = true;

  if v_max is not null and v_actifs > v_max then
    if p_conserver is null or array_length(p_conserver, 1) is null then
      raise exception 'Cette offre comprend % utilisateur(s) et vous en avez % : désignez qui conserve son accès.',
        v_max, v_actifs using errcode = '22023';
    end if;
    if array_length(p_conserver, 1) > v_max then
      raise exception 'Vous avez désigné % personnes pour % place(s).',
        array_length(p_conserver, 1), v_max using errcode = '22023';
    end if;
    if v_moi is not null and not (v_moi = any(p_conserver)) then
      raise exception 'Vous devez conserver votre propre accès pour pouvoir gérer l''abonnement.'
        using errcode = '22023';
    end if;

    -- ARCHIVAGE, jamais suppression : réactiver suffit pour remonter.
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

-- ── L'essai porte sur la meilleure offre SOUSCRIPTIBLE ─────────────────────
-- Faire essayer une offre qu'on ne pourra pas souscrire ensuite ne crée que de
-- la frustration.
create or replace function public.plan_effectif(p_org uuid default null)
returns text language sql stable security definer
set search_path to 'public' as $$
  select case
    when o.essai_fin is not null and o.essai_fin > now() then 'regular'
    else o.plan end
  from organisations o
  where o.id = coalesce(p_org, jwt_org());
$$;

revoke all on function public.plan_effectif(uuid) from public, anon;
grant execute on function public.plan_effectif(uuid) to authenticated;
