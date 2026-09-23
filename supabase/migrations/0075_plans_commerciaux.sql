-- =============================================================================
-- 0075_plans_commerciaux.sql   — EX-01
--
-- ⚠ RESTAURÉE LE 2026-09-19 depuis le registre de migrations de la base de
--   production (`supabase_migrations.schema_migrations`). Appliquée en
--   production le 2026-08-05, jamais commitée. C'est elle qui crée la colonne
--   `organisations.plan` et la fonction `modules_du_plan()` — sans elle, le
--   rejeu du dépôt s'arrêtait à la migration 0077. Contenu repris tel quel ;
--   les évolutions ultérieures (0110, 0111, 0179) restent à leur place.
--
-- LES TROIS OFFRES, EN CONTRAINTE RÉELLE.
--
-- Principe posé dans le PRODUCT_TRUTH : le prix est une contrainte TECHNIQUE
-- d'accès, pas une page marketing. Masquer un bouton dans l'interface ne vend
-- rien — n'importe qui peut appeler la fonction directement. Le plan doit donc
-- se vérifier EN BASE, au même endroit que les capacités.
--
--   Starter  180 € — 2 utilisateurs — le socle : sortir du papier
--   Regular  360 € — 5 utilisateurs — + signature en ligne, Peppol, compta
--   Pro      720 € — illimité       — + international, multi-dépôts, stockage
--
-- Deux étages qui se composent, et il faut les DEUX :
--   le PLAN dit quels modules existent pour l'organisation ;
--   la CAPACITÉ dit ce que cette personne-là peut y faire.
-- Un chef d'équipe chez un client Starter n'a pas la signature en ligne parce
-- que son entreprise ne l'a pas achetée — pas parce qu'il manque un droit.
--
-- Choix délibéré sur la migration : toutes les organisations existantes
-- passent en `regular`. Restreindre rétroactivement un client qui utilise déjà
-- une fonction serait le meilleur moyen de le perdre.
-- =============================================================================

alter table public.organisations
  add column if not exists plan text not null default 'regular';

alter table public.organisations drop constraint if exists organisations_plan_valide;
alter table public.organisations
  add constraint organisations_plan_valide
  check (plan in ('starter', 'regular', 'pro'));

comment on column public.organisations.plan is
  'Offre souscrite : starter | regular | pro. Détermine les modules ouverts '
  'et la limite d''utilisateurs. Défaut regular — on ne restreint pas '
  'rétroactivement une organisation existante.';

-- ── Quels modules pour quel plan ───────────────────────────────────────────
-- La liste vit ici ET dans packages/domaine/src/commercial/plans.js. C'est une
-- duplication assumée : la base doit pouvoir refuser seule, sans dépendre du
-- code applicatif. Un test compare les deux listes.
create or replace function public.modules_du_plan(p_plan text)
returns text[] language sql immutable set search_path to 'public' as $$
  select case coalesce(p_plan, 'regular')
    when 'starter' then array[
      'crm','releve','devis','offre','planning','terrain','flotte','facturation']
    when 'pro' then array[
      'crm','releve','devis','offre','planning','terrain','flotte','facturation',
      'signature_client','espace_client','peppol','comptabilite',
      'rapport_chantier','paie','journal',
      'international','multi_depots','stockage_3d']
    else array[
      'crm','releve','devis','offre','planning','terrain','flotte','facturation',
      'signature_client','espace_client','peppol','comptabilite',
      'rapport_chantier','paie','journal']
  end;
$$;

/** L'organisation de l'appelant a-t-elle ce module ? */
create or replace function public.org_a_module(p_module text)
returns boolean language sql stable security definer
set search_path to 'public' as $$
  select p_module = any(modules_du_plan(
    (select plan from organisations where id = jwt_org())));
$$;

revoke all on function public.org_a_module(text) from public, anon;
grant execute on function public.org_a_module(text) to authenticated;

/** Limite d'utilisateurs du plan. NULL = illimité. */
create or replace function public.limite_utilisateurs(p_plan text)
returns integer language sql immutable set search_path to 'public' as $$
  select case coalesce(p_plan, 'regular')
    when 'starter' then 2
    when 'pro' then null
    else 5 end;
$$;

/**
 * Refus explicite si le module n'est pas ouvert. Le message NOMME l'offre
 * nécessaire : « accès refusé » sans issue ne vend rien, « disponible à partir
 * de Regular » est une proposition commerciale.
 */
create or replace function public.exiger_module(p_module text, p_quoi text)
returns void language plpgsql stable security definer
set search_path to 'public' as $$
declare v_plan text; v_min text;
begin
  if org_a_module(p_module) then return; end if;
  select plan into v_plan from organisations where id = jwt_org();
  v_min := case
    when p_module = any(modules_du_plan('regular')) then 'Regular'
    else 'Pro' end;
  raise exception '% : disponible à partir de l''offre %. Votre offre actuelle est %.',
    p_quoi, v_min, initcap(coalesce(v_plan, 'regular'))
    using errcode = '42501';
end $$;

revoke all on function public.exiger_module(text, text) from public, anon;
grant execute on function public.exiger_module(text, text) to authenticated;

-- ── Application aux commandes concernées ───────────────────────────────────
-- On ne touche qu'aux points d'ENTRÉE d'un module payant. Le socle reste
-- ouvert partout : un client Starter doit pouvoir travailler complètement.

-- Signature en ligne (Regular+)
create or replace function public.cmd_creer_acces_client(
  p_affaire uuid, p_code text, p_jours integer default 90)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid; v_sel text; v_id uuid; v_propre text;
begin
  perform exiger_module('signature_client', 'La signature en ligne');

  select org_id into v_org from affaires where id = p_affaire;
  if v_org is null or v_org <> jwt_org() then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;
  if not acteur_a_capacite('creer_affaire') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;

  v_propre := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_propre) < 12 then
    raise exception 'Code trop court : 12 caractères minimum' using errcode = '22023';
  end if;

  update acces_client set revoque_le = now()
   where affaire_id = p_affaire and revoque_le is null;

  v_sel := encode(extensions.gen_random_bytes(16), 'hex');

  insert into acces_client (org_id, affaire_id, empreinte, sel, indice,
                            expire_le, cree_par, usage)
  values (v_org, p_affaire, empreinte_code(v_propre, v_sel), v_sel,
          right(v_propre, 4),
          now() + make_interval(days => greatest(1, coalesce(p_jours, 90))),
          (select id from utilisateurs where auth_id = auth.uid() limit 1),
          'signature')
  returning id into v_id;

  perform emettre_evenement(v_org, 'AccesClient.Cree', 'affaire', p_affaire,
                            null, jsonb_build_object('indice', right(v_propre, 4)));
  return jsonb_build_object('acces_id', v_id, 'indice', right(v_propre, 4));
end $$;

revoke all on function public.cmd_creer_acces_client(uuid, text, integer) from public, anon;
grant execute on function public.cmd_creer_acces_client(uuid, text, integer) to authenticated;

-- Espace client (Regular+) : on ferme la RÉSOLUTION, donc tout l'espace.
create or replace function public.cmd_client_moi()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_email text := espace_client_email(); v_nom text; v_dossiers int;
begin
  if v_email is null then return jsonb_build_object('est_client', false); end if;

  -- Le client est rattaché à l'organisation qui détient son dossier : c'est le
  -- plan de CETTE organisation qui décide, pas celui du client.
  select count(distinct af.id), max(c.nom)
    into v_dossiers, v_nom
    from clients c
    join affaires af on af.client_id = c.id
    join organisations o on o.id = af.org_id
   where lower(c.email) = v_email
     and af.archive_le is null
     and 'espace_client' = any(modules_du_plan(o.plan));

  if coalesce(v_dossiers, 0) = 0 then
    return jsonb_build_object('est_client', false);
  end if;
  return jsonb_build_object('est_client', true, 'nom', v_nom,
                            'dossiers', v_dossiers, 'email', v_email);
end $$;

revoke all on function public.cmd_client_moi() from public, anon;
grant execute on function public.cmd_client_moi() to authenticated;

-- Comptabilité (Regular+)
create or replace function public.cmd_verifier_module_comptabilite()
returns void language plpgsql stable security definer
set search_path to 'public' as $$
begin
  perform exiger_module('comptabilite', 'Les exports comptables');
end $$;

grant execute on function public.cmd_verifier_module_comptabilite() to authenticated;

-- Journal (Regular+)
create or replace function public.cmd_noter_decision(
  p_texte text, p_entite_type text default null,
  p_entite_id uuid default null, p_remplace bigint default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_acteur uuid; v_id bigint;
begin
  perform exiger_module('journal', 'Le journal des décisions');
  if not acteur_a_capacite('creer_affaire') then
    raise exception 'Droits insuffisants pour écrire au journal' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_texte, ''))) < 3 then
    raise exception 'La note est vide' using errcode = '22023';
  end if;
  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  insert into evenements (org_id, type, entite_type, entite_id, acteur_id, payload)
  values (v_org, 'Decision.Notee', coalesce(p_entite_type, 'organisation'),
          coalesce(p_entite_id, v_org), v_acteur,
          jsonb_build_object('texte', btrim(p_texte), 'remplace', p_remplace))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

revoke all on function public.cmd_noter_decision(text, text, uuid, bigint) from public, anon;
grant execute on function public.cmd_noter_decision(text, text, uuid, bigint) to authenticated;

-- Rapport de chantier (Regular+)
create or replace function public.cmd_constat_declarer(
  p_mission uuid, p_nature text, p_description text,
  p_minutes integer default 0, p_volume numeric default 0)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_moi uuid; v_aff uuid; v_rapport uuid; v_id uuid;
begin
  perform exiger_module('rapport_chantier', 'Les rapports de chantier');

  select affaire_id into v_aff from missions where id = p_mission and org_id = v_org;
  if not exists (select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;
  if not acteur_a_capacite('gerer_planning')
     and not (acteur_a_capacite('pointer_chantier') and est_affecte_mission(p_mission)) then
    raise exception 'Vous n''êtes pas sur ce chantier' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_description, ''))) < 5 then
    return jsonb_build_object('ok', false,
      'message', 'Décrivez ce que vous avez constaté.');
  end if;

  select id into v_moi from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  insert into rapports_chantier (org_id, mission_id, affaire_id, redige_par)
  values (v_org, p_mission, v_aff, v_moi)
  on conflict (mission_id) do update set mission_id = excluded.mission_id
  returning id into v_rapport;

  insert into constats_chantier (org_id, rapport_id, nature, description,
                                 minutes, volume_m3, declare_par)
  values (v_org, v_rapport, p_nature, btrim(p_description),
          greatest(0, coalesce(p_minutes, 0)),
          greatest(0, coalesce(p_volume, 0)), v_moi)
  returning id into v_id;

  perform emettre_evenement(v_org, 'Constat.Declare', 'mission', p_mission, v_moi,
    jsonb_build_object('nature', p_nature, 'minutes', p_minutes));
  return jsonb_build_object('ok', true, 'constat_id', v_id);
end $$;

revoke all on function public.cmd_constat_declarer(uuid, text, text, integer, numeric)
  from public, anon;
grant execute on function public.cmd_constat_declarer(uuid, text, text, integer, numeric)
  to authenticated;

-- ── Limite d'utilisateurs, à l'invitation ──────────────────────────────────
create or replace function public.cmd_inviter_membre(
  p_email text, p_nom text, p_role_cle text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_org uuid := jwt_org(); v_plan text; v_max integer; v_actuel integer;
  v_id uuid; v_role uuid; v_jeton text;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;

  select plan into v_plan from organisations where id = v_org;
  v_max := limite_utilisateurs(v_plan);
  if v_max is not null then
    select count(*) into v_actuel from utilisateurs
     where org_id = v_org and coalesce(actif, true) = true;
    if v_actuel >= v_max then
      raise exception 'Votre offre % comprend % utilisateurs. Passez à l''offre supérieure pour agrandir votre équipe.',
        initcap(coalesce(v_plan, 'regular')), v_max using errcode = '42501';
    end if;
  end if;

  -- On délègue la création elle-même à la fonction existante.
  return cmd_inviter_membre_interne(p_email, p_nom, p_role_cle);
end $$;

revoke all on function public.cmd_inviter_membre(text, text, text) from public, anon;
grant execute on function public.cmd_inviter_membre(text, text, text) to authenticated;
