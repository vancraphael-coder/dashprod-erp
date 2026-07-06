-- =============================================================================
-- Migration 0004 — Identité & permissions : commandes du noyau
-- Source : Référence 3 (T3 famille 2 « capacités » ; T4 « émission »).
-- Ces fonctions SECURITY DEFINER sont les SEULES portes d'écriture pour les
-- utilisateurs, rôles et référentiels. Chacune : (1) vérifie la capacité de
-- l'acteur, (2) écrit, (3) émet son événement — le tout dans une transaction.
-- La logique d'autorisation reflète packages/domaine/src/noyau/autorisation.js.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- acteur_a_capacite — l'acteur courant (JWT) détient-il une capacité ?
-- Résout les rôles de l'utilisateur via ses affectations non expirées, puis
-- teste la présence de la capacité. Miroir SQL de resoudreCapacites()/aCapacite().
-- -----------------------------------------------------------------------------
create or replace function acteur_a_capacite(p_capacite text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from utilisateurs u
      join utilisateur_roles ur on ur.utilisateur_id = u.id
      join role_capacites rc on rc.role_id = ur.role_id
     where u.org_id = jwt_org()
       and u.auth_id = auth.uid()
       and (ur.expire_le is null or ur.expire_le > now())
       and rc.capacite_cle = p_capacite
  );
$$;
comment on function acteur_a_capacite is
  'Vérifie une capacité pour l''acteur du JWT (T3). Base des commandes du noyau.';

-- -----------------------------------------------------------------------------
-- cmd_inviter_utilisateur — provisionne un utilisateur dans l'organisation.
-- Capacité requise : gerer_referentiels (cf. COMMANDES.INVITER_UTILISATEUR).
-- L'auth_id sera lié ultérieurement lorsque la personne activera son compte.
-- -----------------------------------------------------------------------------
create or replace function cmd_inviter_utilisateur(p_email text, p_nom text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_id  uuid;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise'
      using errcode = '42501'; -- insufficient_privilege
  end if;

  insert into utilisateurs (org_id, email, nom)
    values (v_org, p_email, coalesce(p_nom, ''))
    returning id into v_id;

  perform emettre_evenement(
    v_org, 'Utilisateur.Invite', 'utilisateur', v_id,
    (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org),
    jsonb_build_object('email', p_email)
  );
  return v_id;
end; $$;

-- -----------------------------------------------------------------------------
-- cmd_affecter_role — affecte un rôle à un utilisateur du tenant.
-- Capacité requise : gerer_referentiels. Idempotent (ON CONFLICT).
-- -----------------------------------------------------------------------------
create or replace function cmd_affecter_role(p_utilisateur uuid, p_role_cle text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org  uuid := jwt_org();
  v_role uuid;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise'
      using errcode = '42501';
  end if;

  -- L'utilisateur cible et le rôle doivent appartenir au tenant (I-1).
  if not exists (select 1 from utilisateurs where id = p_utilisateur and org_id = v_org) then
    raise exception 'Utilisateur hors organisation';
  end if;
  select id into v_role from roles where org_id = v_org and cle = p_role_cle;
  if v_role is null then
    raise exception 'Rôle % inconnu pour cette organisation', p_role_cle;
  end if;

  insert into utilisateur_roles (utilisateur_id, role_id)
    values (p_utilisateur, v_role)
    on conflict (utilisateur_id, role_id) do nothing;

  perform emettre_evenement(
    v_org, 'Role.Affecte', 'utilisateur', p_utilisateur,
    (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org),
    jsonb_build_object('role', p_role_cle)
  );
end; $$;

-- -----------------------------------------------------------------------------
-- cmd_publier_referentiel — publie une NOUVELLE version d'un référentiel.
-- Capacité requise : gerer_referentiels. Ne modifie jamais l'existant (C-07) :
-- désactive la version active précédente et insère la suivante.
-- -----------------------------------------------------------------------------
create or replace function cmd_publier_referentiel(
  p_type text, p_cle text, p_valeur jsonb, p_juridiction char(2) default 'BE'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_ver integer;
  v_id  uuid;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise'
      using errcode = '42501';
  end if;

  select coalesce(max(version), 0) + 1 into v_ver
    from referentiels
   where org_id = v_org and type = p_type and cle = p_cle and juridiction = p_juridiction;

  update referentiels set actif = false
   where org_id = v_org and type = p_type and cle = p_cle
     and juridiction = p_juridiction and actif = true;

  insert into referentiels (org_id, type, cle, valeur, version, juridiction, publie_par)
    values (v_org, p_type, p_cle, p_valeur, v_ver, p_juridiction,
            (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org))
    returning id into v_id;

  perform emettre_evenement(
    v_org, 'Bareme.Publie', 'referentiel', v_id,
    (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org),
    jsonb_build_object('type', p_type, 'cle', p_cle, 'version', v_ver)
  );
  return v_id;
end; $$;

comment on function cmd_publier_referentiel is
  'Publie une nouvelle version (C-07). Émet Bareme.Publie → alerte offres ouvertes (S10).';
