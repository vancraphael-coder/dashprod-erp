-- =============================================================================
-- Migration 0014 — Authentification Google sur invitation
-- Source : Réf. 3 (T3 : parcours de connexion, rôle jamais choisi) ; demande
-- explicite du fondateur (invitation par le master, secteurs = rôles S3).
-- Contenu : provisionnement des rôles standards par organisation (gap comblé —
-- ils n'existaient qu'en JS), réclamation d'invitation par email Google, hook
-- d'enrichissement du JWT (org_id + roles), profil courant pour le front.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- provisionner_roles_standard — crée les 5 rôles S3 et leurs capacités pour une
-- organisation. Miroir SQL exact de packages/domaine/src/noyau/permissions.js
-- (ROLES). À exécuter UNE FOIS après la création de chaque organisation — pas
-- de garde de capacité ici (aucun acteur n'existe encore à cet instant).
-- Idempotent (ON CONFLICT).
-- -----------------------------------------------------------------------------
create or replace function provisionner_roles_standard(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_toutes text[] := array(select cle from capacites);
  v_role uuid;
  r record;
begin
  for r in select * from (values
    ('direction',   v_toutes),
    ('coordination', array['voir_prix','creer_affaire','valider_intake','faire_signer',
                            'gerer_planning','emettre_facture','signaler_materiel',
                            'demander_conge','approuver_conge']),
    ('commercial',  array['voir_prix','creer_affaire','faire_signer',
                           'signaler_materiel','demander_conge']),
    ('chef_equipe', array['signaler_materiel','demander_conge']),
    ('demenageur',  array['signaler_materiel','demander_conge'])
  ) as t(cle, caps)
  loop
    insert into roles (org_id, cle, libelle)
      values (p_org, r.cle, initcap(replace(r.cle, '_', ' ')))
      on conflict (org_id, cle) do nothing
      returning id into v_role;

    if v_role is null then
      select id into v_role from roles where org_id = p_org and cle = r.cle;
    end if;

    insert into role_capacites (role_id, capacite_cle)
      select v_role, unnest(r.caps)
      on conflict do nothing;

    v_role := null;
  end loop;
end; $$;
comment on function provisionner_roles_standard is
  'Crée les 5 rôles standards (S3) pour une organisation. À appeler une fois après création (SQL Editor).';

-- -----------------------------------------------------------------------------
-- mon_profil — identité, organisation et capacités de l'acteur courant.
-- Utilisé par le front juste après connexion (avant même que le JWT enrichi
-- soit rafraîchi) : une seule fonction, un seul appel (S9 : le front projette
-- selon les capacités).
-- -----------------------------------------------------------------------------
create or replace function mon_profil() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'utilisateur_id', u.id,
    'org_id', u.org_id,
    'nom', u.nom,
    'email', u.email,
    'capacites', coalesce((
      select array_agg(distinct rc.capacite_cle)
        from utilisateur_roles ur
        join role_capacites rc on rc.role_id = ur.role_id
       where ur.utilisateur_id = u.id
         and (ur.expire_le is null or ur.expire_le > now())
    ), '{}')
  )
  from utilisateurs u
  where u.auth_id = auth.uid();
$$;
comment on function mon_profil is
  'Identité + capacités de l''acteur courant, en un appel (S9).';

-- -----------------------------------------------------------------------------
-- cmd_reclamer_invitation — lie l'identité Google (auth.uid()) à la ligne
-- utilisateurs créée par l'invitation du master (cmd_inviter_utilisateur),
-- par correspondance d'email. Idempotent. Refuse proprement si aucune
-- invitation ne correspond (l'email Google n'a pas été invité).
-- -----------------------------------------------------------------------------
create or replace function cmd_reclamer_invitation() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_row utilisateurs%rowtype;
begin
  select * into v_row from utilisateurs where auth_id = auth.uid();
  if found then
    return jsonb_build_object('statut', 'deja_lie', 'org_id', v_row.org_id);
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_email = '' then
    raise exception 'Email absent du jeton d''authentification' using errcode = '22023';
  end if;

  select * into v_row from utilisateurs
   where lower(email) = v_email and auth_id is null
   limit 1;

  if not found then
    raise exception 'Aucune invitation trouvée pour %. Contactez votre administrateur.', v_email
      using errcode = '42501';
  end if;

  update utilisateurs set auth_id = auth.uid() where id = v_row.id;

  perform emettre_evenement(v_row.org_id, 'Utilisateur.InvitationReclamee',
    'utilisateur', v_row.id, v_row.id, jsonb_build_object('email', v_email));

  return jsonb_build_object('statut', 'lie', 'org_id', v_row.org_id);
end; $$;
comment on function cmd_reclamer_invitation is
  'Lie auth.uid() à l''invitation par email (Google OAuth). Refus propre si non invité.';

-- -----------------------------------------------------------------------------
-- hook_ajouter_claims — Auth Hook Supabase (« Customize Access Token Claims »).
-- Injecte org_id et roles dans le JWT à chaque émission de jeton — c'est ce
-- dont dépend jwt_org() et donc TOUTE la RLS de tenant (T3). Contrat imposé par
-- Supabase : reçoit {user_id, claims}, renvoie {claims: {...}}.
--
-- ⚠ NE PREND PAS EFFET SANS ÊTRE ENREGISTRÉ CÔTÉ DASHBOARD :
-- Authentication → Hooks → « Customize Access Token (JWT) Claims Hook »
-- → sélectionner cette fonction (schéma public). Aucune ligne SQL ne peut
-- l'activer à la place de ce réglage.
-- -----------------------------------------------------------------------------
create or replace function hook_ajouter_claims(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_user_id uuid := (event->>'user_id')::uuid;
  v_uid uuid;
  v_org uuid;
  v_roles text[];
  v_claims jsonb;
begin
  select id, org_id into v_uid, v_org from utilisateurs where auth_id = v_user_id;

  if v_org is null then
    return event; -- pas encore réclamé : claims standards, inchangés
  end if;

  select coalesce(array_agg(distinct r.cle), '{}') into v_roles
    from utilisateur_roles ur
    join roles r on r.id = ur.role_id
   where ur.utilisateur_id = v_uid
     and (ur.expire_le is null or ur.expire_le > now());

  v_claims := coalesce(event->'claims', '{}'::jsonb);
  v_claims := jsonb_set(v_claims, '{org_id}', to_jsonb(v_org::text));
  v_claims := jsonb_set(v_claims, '{roles}', to_jsonb(v_roles));

  return jsonb_set(event, '{claims}', v_claims);
end; $$;
comment on function hook_ajouter_claims is
  'Auth Hook (à enregistrer côté Dashboard). Injecte org_id+roles → base de jwt_org() (T3).';

-- Permissions requises par le mécanisme d'Auth Hook de Supabase.
revoke execute on function hook_ajouter_claims from public, anon, authenticated;
grant execute on function hook_ajouter_claims to supabase_auth_admin;

grant execute on function cmd_reclamer_invitation to authenticated;
grant execute on function mon_profil to authenticated;
