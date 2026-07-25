-- =============================================================================
-- 0052_espace_client_oauth.sql
--
-- ⚠️  À APPLIQUER — colle ce fichier ENTIER dans l'éditeur SQL Supabase,
--     lignes « -- » comprises, puis range-le dans supabase/migrations/.
--     À appliquer APRÈS 0050 et 0051.
--
-- =============================================================================
-- ESPACE CLIENT PAR OAUTH — trois portes séparées.
--
-- Modèle d'accès repensé :
--   - Le code 12 caractères NE sert plus à ouvrir un espace : c'est la
--     signature d'UNE offre, usage ciblé (voir 0053).
--   - Le client accède à son espace par OAuth (Google), comme le déménageur.
--
-- Ce qui distingue un « client » d'un « déménageur » après connexion Google,
-- c'est UNIQUEMENT ceci : l'e-mail authentifié correspond-il à un dossier
-- client existant ? Le déménageur crée le dossier avec l'e-mail du client ;
-- cet e-mail, vérifié par Google, devient la clé d'accès.
--
--   auth.uid() a une organisation           → déménageur (app métier)
--   auth.email() = e-mail d'un client        → espace client
--   ni l'un ni l'autre                       → proposition « créer ma société »
--
-- Enjeu commercial : l'abonnement déménageur est payant (360 €/mois HTVA). Un
-- client ne doit JAMAIS tomber dans le tunnel de création de société. La
-- distinction est donc stricte, et tranchée en base, pas dans l'interface.
--
-- Aucune table exposée à l'espace client : tout passe par des fonctions
-- security definer qui filtrent sur l'e-mail authentifié. Le client ne choisit
-- pas son périmètre, la base le lui impose.
-- =============================================================================

-- Un e-mail peut apparaître sur les dossiers de PLUSIEURS déménageurs : c'est
-- justement l'intérêt (offres multi-entreprises). Cette vue rassemble, pour
-- l'e-mail authentifié, tous les dossiers qui le concernent.

create or replace function public.espace_client_email()
returns text language sql stable set search_path to 'public' as $$
  select lower(nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), ''));
$$;

revoke all on function public.espace_client_email() from public, anon;
grant execute on function public.espace_client_email() to authenticated;

-- ── Suis-je un client ? ────────────────────────────────────────────────────
-- Renvoie l'identité client si l'e-mail authentifié figure sur au moins un
-- dossier, sinon null. C'est ce que l'application interroge pour router.
create or replace function public.cmd_client_moi()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_email text := espace_client_email(); v_nom text; v_dossiers int;
begin
  if v_email is null then return jsonb_build_object('est_client', false); end if;

  select count(distinct af.id),
         max(c.nom)
    into v_dossiers, v_nom
    from clients c
    join affaires af on af.client_id = c.id
   where lower(c.email) = v_email
     and af.archive_le is null;

  if coalesce(v_dossiers, 0) = 0 then
    return jsonb_build_object('est_client', false);
  end if;
  return jsonb_build_object('est_client', true, 'nom', v_nom,
                            'dossiers', v_dossiers, 'email', v_email);
end $$;

revoke all on function public.cmd_client_moi() from public, anon;
grant execute on function public.cmd_client_moi() to authenticated;

-- ── Les pages de l'espace client, filtrées sur l'e-mail authentifié ────────
-- Aucune n'accepte de paramètre : le périmètre EST l'e-mail vérifié par Google,
-- il ne peut pas être falsifié côté client.

-- Dossier(s) : données personnelles uniquement, jamais les coûts du déménageur.
create or replace function public.cmd_client_dossiers()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_email text := espace_client_email();
begin
  if v_email is null then raise exception 'Non authentifié' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'affaire_id', af.id,
      'reference', af.reference,
      'etat', af.etat,
      'date_souhaitee', af.date_souhaitee,
      'date_visite', af.date_visite,
      'entreprise', jsonb_build_object('nom', o.nom, 'tel', o.tel, 'email', o.email),
      'adresses', coalesce((
        select jsonb_agg(jsonb_build_object(
          'role', ad.role, 'adresse', ad.adresse,
          'code_postal', ad.code_postal, 'ville', ad.ville, 'etage', ad.etage))
          from adresses ad where ad.affaire_id = af.id), '[]'::jsonb))
      order by af.created_at desc)
    from affaires af
    join clients c on c.id = af.client_id
    join organisations o on o.id = af.org_id
   where lower(c.email) = v_email and af.archive_le is null), '[]'::jsonb);
end $$;

grant execute on function public.cmd_client_dossiers() to authenticated;
revoke all on function public.cmd_client_dossiers() from public, anon;

-- Coordonnées du client (son profil, modifiable côté déménageur seulement).
create or replace function public.cmd_client_profil()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_email text := espace_client_email();
begin
  if v_email is null then raise exception 'Non authentifié' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_build_object('nom', c.nom, 'email', c.email, 'tel', c.tel)
      from clients c where lower(c.email) = v_email limit 1), '{}'::jsonb);
end $$;

grant execute on function public.cmd_client_profil() to authenticated;
revoke all on function public.cmd_client_profil() from public, anon;

-- Relevé / inventaire, tous dossiers du client confondus.
create or replace function public.cmd_client_inventaire()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_email text := espace_client_email();
begin
  if v_email is null then raise exception 'Non authentifié' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'affaire_id', af.id, 'reference', af.reference,
      'piece', r.piece, 'designation', r.designation,
      'quantite', r.quantite, 'volume_m3', r.volume_m3,
      'demont', r.demont, 'remarque', r.remarque)
      order by af.reference, r.piece, r.designation)
    from releve r
    join affaires af on af.id = r.affaire_id
    join clients c on c.id = af.client_id
   where lower(c.email) = v_email and af.archive_le is null), '[]'::jsonb);
end $$;

grant execute on function public.cmd_client_inventaire() to authenticated;
revoke all on function public.cmd_client_inventaire() from public, anon;

-- Offres reçues, toutes entreprises.
create or replace function public.cmd_client_offres()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_email text := espace_client_email();
begin
  if v_email is null then raise exception 'Non authentifié' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'affaire_id', af.id, 'reference', af.reference,
      'entreprise', o.nom, 'entreprise_tel', o.tel,
      'etat', af.etat, 'date_souhaitee', af.date_souhaitee,
      'montant_tvac_centimes', af.tvac_centimes,
      'signee', exists (select 1 from documents_instances di
                         where di.affaire_id = af.id and di.statut = 'signee'))
      order by af.created_at desc)
    from affaires af
    join organisations o on o.id = af.org_id
    join clients c on c.id = af.client_id
   where lower(c.email) = v_email
     and af.archive_le is null and af.etat <> 'annule'), '[]'::jsonb);
end $$;

grant execute on function public.cmd_client_offres() to authenticated;
revoke all on function public.cmd_client_offres() from public, anon;

-- Factures reçues, toutes entreprises.
create or replace function public.cmd_client_factures()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_email text := espace_client_email();
begin
  if v_email is null then raise exception 'Non authentifié' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'numero', f.numero, 'entreprise', o.nom,
      'date_emission', f.date_emission, 'echeance', f.echeance,
      'total_tvac_centimes', f.tvac_centimes,
      'communication', f.communication, 'devise', f.devise)
      order by f.date_emission desc)
    from factures f
    join affaires af on af.id = f.affaire_id
    join organisations o on o.id = f.org_id
    join clients c on c.id = af.client_id
   where lower(c.email) = v_email and f.emise = true), '[]'::jsonb);
end $$;

grant execute on function public.cmd_client_factures() to authenticated;
revoke all on function public.cmd_client_factures() from public, anon;

-- L'annuaire réseau (cmd_reseau_demenageurs) existe déjà depuis 0051 et reste
-- ouvert à anon comme à authenticated : rien à recréer.

-- Vérification après application :
--   select proname, has_function_privilege('authenticated', oid, 'EXECUTE') as ok
--     from pg_proc where proname like 'cmd_client_%';
--   -- 6 fonctions, toutes à true, et AUCUNE ouverte à anon :
--   select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and proname like 'cmd_client_%'
--      and has_function_privilege('anon', p.oid, 'EXECUTE');
--   -- doit renvoyer 0 ligne
