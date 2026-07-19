-- =============================================================================
-- 0039_creer_organisation.sql — APPLIQUÉE en production le 19/07/2026
--
-- Crée une entreprise cliente sur base vierge.
-- Structure complète, ZÉRO donnée métier : ni client, ni affaire, ni véhicule,
-- ni facture, ni barème. État de sortie : PRET_A_CONFIGURER.
--
-- Réservée à l'éditeur : aucun GRANT à anon/authenticated. À appeler depuis
-- une Edge Function en service_role, ou depuis l'éditeur SQL.
-- =============================================================================
create or replace function public.creer_organisation(
  p_nom         text,
  p_email_admin text,
  p_nom_admin   text,
  p_bce         text default null,
  p_tva         text default null,
  p_adresse     text default null,
  p_cp          text default null,
  p_ville       text default null,
  p_tel         text default null,
  p_email       text default null,
  p_iban        text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org   uuid;
  v_admin uuid;
  v_role  uuid;
  v_annee int := extract(year from now())::int;
begin
  if p_nom is null or btrim(p_nom) = '' then
    raise exception 'Le nom de l''entreprise est obligatoire' using errcode = '22023';
  end if;
  if p_email_admin is null or position('@' in p_email_admin) = 0 then
    raise exception 'E-mail administrateur invalide' using errcode = '22023';
  end if;

  insert into organisations (nom, bce, tva, adresse, cp, ville, tel, email, iban)
  values (btrim(p_nom), p_bce, p_tva, p_adresse, p_cp, p_ville, p_tel,
          lower(nullif(btrim(coalesce(p_email, '')), '')), p_iban)
  returning id into v_org;

  -- 5 rôles standards + capacités (direction, coordination, commercial,
  -- chef_equipe, demenageur).
  perform provisionner_roles_standard(v_org);

  -- Administrateur : ligne d'invitation. auth_id reste NULL jusqu'à sa première
  -- connexion Google, où cmd_reclamer_invitation la rattache par e-mail.
  -- metier reste NULL : profil bureau, pas terrain.
  insert into utilisateurs (org_id, email, nom, actif)
  values (v_org, lower(btrim(p_email_admin)), btrim(coalesce(p_nom_admin, p_email_admin)), true)
  returning id into v_admin;

  select id into v_role from roles where org_id = v_org and cle = 'direction';
  if v_role is null then
    raise exception 'Rôle direction absent après provisionnement (org %)', v_org
      using errcode = 'internal_error';
  end if;
  insert into utilisateur_roles (utilisateur_id, role_id) values (v_admin, v_role);

  -- Compteur : la première facture portera <annee>-000001.
  insert into sequences (org_id, type, annee, prochain)
  values (v_org, 'facture', v_annee, 1)
  on conflict (org_id, type, annee) do nothing;

  perform emettre_evenement(v_org, 'Organisation.Creee', 'organisation', v_org, v_admin,
                            jsonb_build_object('nom', btrim(p_nom),
                                               'admin', lower(btrim(p_email_admin))));

  return jsonb_build_object('org_id', v_org, 'admin_id', v_admin,
                            'statut', 'PRET_A_CONFIGURER');
end $$;

revoke all on function public.creer_organisation(
  text,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;

-- Usage :
--   select creer_organisation('Déménagements Dupont SPRL',
--                             'patron@dupont.be', 'Jean Dupont');
