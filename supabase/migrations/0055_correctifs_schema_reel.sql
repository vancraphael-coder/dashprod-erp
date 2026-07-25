-- =============================================================================
-- 0055_correctifs_schema_reel.sql
--
-- ⚠️  À APPLIQUER — colle ce fichier ENTIER dans l'éditeur SQL Supabase,
--     lignes « -- » comprises, puis range-le dans supabase/migrations/.
--     À appliquer APRÈS 0051–0054. Il les CORRIGE.
--
-- =============================================================================
-- CORRECTIFS — les fonctions client/portail/signature avaient été écrites sur
-- un schéma supposé, pas sur le schéma réel. Erreurs corrigées :
--
--   1. gen_random_bytes() → extension pgcrypto non activée.
--   2. affaires.reference → cette colonne n'existe pas. L'affaire s'identifie
--      par son id ; il n'y a pas de référence lisible en base.
--   3. table "releve" → l'inventaire est une colonne JSON affaires.releve.
--   4. affaires.tvac_centimes → le montant vit dans scenarios.resultats
--      (scénario retenu), pas sur l'affaire.
--   5. table "adresses" → c'est affaire_adresses, avec la colonne "sens"
--      (chargement / dechargement) et code_postal / type_lieu.
--   6. factures : les colonnes réelles sont numero, date_emission, echeance,
--      tvac_centimes, communication, devise, emise.
--
-- On réécrit chaque fonction concernée en s'appuyant sur ces vrais noms.
-- =============================================================================

-- 1. pgcrypto pour gen_random_bytes (sel d'accès) et sha256.
create extension if not exists pgcrypto;

-- ── Helper : montant TVAC d'une affaire, depuis le scénario retenu ─────────
-- Le montant n'est pas sur l'affaire : il est dans le résultat du scénario
-- retenu (ou, à défaut, du premier). On le lit là, une fois pour toutes.
create or replace function public.affaire_tvac(p_affaire uuid)
returns integer language sql stable set search_path to 'public' as $$
  select coalesce((
    select (sc.resultats ->> 'tvac_centimes')::numeric::integer
      from scenarios sc
     where sc.affaire_id = p_affaire
     order by (sc.retenu is not true), sc.created_at
     limit 1), 0);
$$;
revoke all on function public.affaire_tvac(uuid) from public, anon, authenticated;

-- ── Adresses d'une affaire, au format attendu par le portail ───────────────
create or replace function public.affaire_adresses_json(p_affaire uuid)
returns jsonb language sql stable set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'role', case when a.sens = 'chargement' then 'charge' else 'decharge' end,
    'adresse', a.adresse, 'code_postal', a.code_postal,
    'ville', a.ville, 'etage', a.etage) order by a.ordre), '[]'::jsonb)
  from affaire_adresses a where a.affaire_id = p_affaire;
$$;
revoke all on function public.affaire_adresses_json(uuid) from public, anon, authenticated;

-- =============================================================================
-- 2. Création d'un accès : gen_random_bytes vient maintenant de pgcrypto, donc
--    cmd_creer_acces_client fonctionne. On la recrée à l'identique pour être sûr
--    qu'elle est bien en place (elle référence empreinte_code de 0051).
-- =============================================================================
create or replace function public.cmd_creer_acces_client(
  p_affaire uuid, p_code text, p_jours integer default 90)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid; v_sel text; v_id uuid; v_propre text;
begin
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

  v_sel := encode(gen_random_bytes(16), 'hex');
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

-- =============================================================================
-- 3. Aperçu d'offre — sans affaires.reference ni affaires.tvac_centimes.
-- =============================================================================
create or replace function public.cmd_offre_apercu(p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a public.acces_client; r jsonb; v_doc jsonb; v_emp text;
begin
  a := resoudre_acces(p_code);
  if a.id is null then
    update acces_client set essais_rates = essais_rates + 1
     where revoque_le is null
       and indice = right(upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g')),4);
    return jsonb_build_object('ok', false, 'message', 'Lien invalide, expiré ou déjà utilisé.');
  end if;
  if a.signe_le is not null then
    return jsonb_build_object('ok', false, 'deja_signee', true,
      'message', 'Cette offre a déjà été signée le '
               || to_char(a.signe_le, 'DD/MM/YYYY') || '.');
  end if;

  select di.contenu, di.empreinte_sha256 into v_doc, v_emp
    from documents_instances di
   where di.affaire_id = a.affaire_id
   order by di.created_at desc limit 1;

  select jsonb_build_object(
    'ok', true,
    'affaire_id', af.id,
    'entreprise', o.nom,
    'client', c.nom,
    'date_souhaitee', af.date_souhaitee,
    'montant_tvac_centimes', affaire_tvac(af.id),
    'expire_le', a.expire_le,
    'document', v_doc,
    'document_empreinte', v_emp)
    into r
    from affaires af
    join organisations o on o.id = af.org_id
    left join clients c on c.id = af.client_id
   where af.id = a.affaire_id;
  return r;
end $$;

grant execute on function public.cmd_offre_apercu(text) to anon, authenticated;

-- =============================================================================
-- 4. Espace client (OAuth) — dossiers, inventaire, offres, factures.
--    Réécrits sur le schéma réel.
-- =============================================================================

-- Dossiers : pas de reference ; l'inventaire n'est pas ici. Adresses via helper.
create or replace function public.cmd_client_dossiers()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_email text := espace_client_email();
begin
  if v_email is null then raise exception 'Non authentifié' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'affaire_id', af.id,
      'etat', af.etat,
      'date_souhaitee', af.date_souhaitee,
      'date_visite', af.date_visite,
      'entreprise', jsonb_build_object('nom', o.nom, 'tel', o.tel, 'email', o.email),
      'adresses', affaire_adresses_json(af.id))
      order by af.created_at desc)
    from affaires af
    join clients c on c.id = af.client_id
    join organisations o on o.id = af.org_id
   where lower(c.email) = v_email and af.archive_le is null), '[]'::jsonb);
end $$;
grant execute on function public.cmd_client_dossiers() to authenticated;
revoke all on function public.cmd_client_dossiers() from public, anon;

-- Inventaire : colonne JSON affaires.releve, une entrée par ligne de relevé.
-- Structure d'une ligne : { piece, designation, quantite, volume_m3, demont,
-- remarque } — on tolère l'absence de champ.
create or replace function public.cmd_client_inventaire()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_email text := espace_client_email();
begin
  if v_email is null then raise exception 'Non authentifié' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'affaire_id', af.id,
      'piece', ligne ->> 'piece',
      'designation', ligne ->> 'designation',
      'quantite', coalesce((ligne ->> 'quantite')::numeric, 1),
      'volume_m3', (ligne ->> 'volume_m3')::numeric,
      'demont', coalesce((ligne ->> 'demont')::boolean, false),
      'remarque', ligne ->> 'remarque'))
    from affaires af
    join clients c on c.id = af.client_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(af.releve) = 'array' then af.releve else '[]'::jsonb end
    ) as ligne
   where lower(c.email) = v_email and af.archive_le is null), '[]'::jsonb);
end $$;
grant execute on function public.cmd_client_inventaire() to authenticated;
revoke all on function public.cmd_client_inventaire() from public, anon;

-- Offres : montant via helper, pas de reference.
create or replace function public.cmd_client_offres()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_email text := espace_client_email();
begin
  if v_email is null then raise exception 'Non authentifié' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'affaire_id', af.id,
      'entreprise', o.nom, 'entreprise_tel', o.tel,
      'etat', af.etat, 'date_souhaitee', af.date_souhaitee,
      'montant_tvac_centimes', affaire_tvac(af.id),
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

-- Factures : colonnes réelles (numero, date_emission, echeance, tvac_centimes,
-- communication, devise, emise).
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

-- Vérification après application :
--   select affaire_tvac(id) from affaires limit 1;         -- un entier, pas d'erreur
--   select cmd_reseau_demenageurs();                        -- '[]' au minimum
--   -- pour peupler l'annuaire, une organisation doit s'y inscrire :
--   --   update organisations set visible_reseau = true where id = jwt_org();
