-- =============================================================================
-- 0053_signature_offre_par_code.sql
--
-- ⚠️  À APPLIQUER — colle ce fichier ENTIER dans l'éditeur SQL Supabase,
--     lignes « -- » comprises, puis range-le dans supabase/migrations/.
--     À appliquer APRÈS 0051 (qui a créé acces_client, empreinte_code,
--     resoudre_acces).
--
-- =============================================================================
-- SIGNATURE D'OFFRE PAR CODE — le code redevient ce qu'il aurait dû être.
--
-- Correction de conception : le code 12 caractères n'ouvre PAS un espace client
-- (l'espace passe désormais par OAuth, voir 0052). Le code sert à SIGNER une
-- offre précise, depuis un lien que le déménageur envoie au client.
--
-- Un lien de signature vaut engagement : on durcit en conséquence.
--   - le code cible UNE affaire, pas un compte ;
--   - signer consomme le code : il ne rejoue pas ;
--   - la signature passe par la transition d'état existante (garde S4), jamais
--     par un UPDATE direct sur affaires.etat ;
--   - l'acte est horodaté et journalisé — une signature est opposable.
--
-- On réutilise l'infrastructure de 0051 : acces_client stocke déjà une
-- empreinte salée du code, resoudre_acces() la vérifie et compte les échecs.
-- On y ajoute juste de quoi marquer une signature.
-- =============================================================================

alter table public.acces_client
  add column if not exists usage       text not null default 'signature',
  add column if not exists signe_le    timestamptz,
  add column if not exists signe_par_ip text;

comment on column public.acces_client.usage is
  'signature = code de signature d''une offre (usage unique). Le portail par '
  'code est remplacé par l''accès OAuth ; ce type reste pour signer.';

-- ── Aperçu de l'offre à signer (appelable par anon) ────────────────────────
-- Le client clique le lien, voit ce qu'il s'apprête à signer AVANT de signer.
-- Montant, entreprise, dates : de quoi consentir en connaissance de cause.
create or replace function public.cmd_offre_apercu(p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a public.acces_client; r jsonb;
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

  select jsonb_build_object(
    'ok', true,
    'affaire_id', af.id,
    'reference', af.reference,
    'entreprise', o.nom,
    'client', c.nom,
    'date_souhaitee', af.date_souhaitee,
    'montant_tvac_centimes', af.tvac_centimes,
    'expire_le', a.expire_le)
    into r
    from affaires af
    join organisations o on o.id = af.org_id
    left join clients c on c.id = af.client_id
   where af.id = a.affaire_id;
  return r;
end $$;

grant execute on function public.cmd_offre_apercu(text) to anon, authenticated;

-- ── Signature (appelable par anon) ─────────────────────────────────────────
create or replace function public.cmd_offre_signer(p_code text, p_nom text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a public.acces_client; v_etat text;
begin
  a := resoudre_acces(p_code);
  if a.id is null then raise exception 'Lien invalide ou expiré' using errcode = '42501'; end if;
  if a.signe_le is not null then
    return jsonb_build_object('ok', false, 'deja_signee', true,
      'message', 'Offre déjà signée.');
  end if;

  select etat into v_etat from affaires where id = a.affaire_id;
  if v_etat is null then raise exception 'Dossier introuvable' using errcode = '42501'; end if;

  -- La confirmation passe par la transition interne : elle respecte la garde S4
  -- (aucun UPDATE direct sur affaires.etat n'est permis). Si l'affaire n'est
  -- pas dans un état signable, transition_interne lève l'erreur — on ne force
  -- rien.
  perform transition_interne(a.affaire_id, 'confirmee',
    jsonb_build_object('canal', 'signature_client',
                       'signataire', coalesce(nullif(btrim(p_nom), ''), 'client')));

  update acces_client
     set signe_le = now(),
         revoque_le = now()   -- le code est consommé : il ne ressignera pas
   where id = a.id;

  perform emettre_evenement(a.org_id, 'Offre.SigneeParClient', 'affaire',
    a.affaire_id, null,
    jsonb_build_object('signataire', coalesce(nullif(btrim(p_nom), ''), 'client')));

  return jsonb_build_object('ok', true, 'affaire_id', a.affaire_id,
    'message', 'Merci, votre signature est enregistrée.');
exception when others then
  -- Une transition refusée ne doit pas laisser croire à une signature.
  return jsonb_build_object('ok', false,
    'message', 'Cette offre n''est pas dans un état permettant la signature. '
             || 'Contactez votre déménageur.');
end $$;

grant execute on function public.cmd_offre_signer(text, text) to anon, authenticated;

-- On renomme l'intention côté déménageur : « créer un accès » devient « créer
-- un lien de signature ». La fonction 0051 reste, on l'habille.
create or replace function public.cmd_creer_lien_signature(
  p_affaire uuid, p_code text, p_jours integer default 30)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  -- Délai plus court par défaut qu'un ancien accès : un lien de signature est
  -- une invitation à agir, pas un accès permanent.
  return cmd_creer_acces_client(p_affaire, p_code, p_jours);
end $$;

revoke all on function public.cmd_creer_lien_signature(uuid, text, integer) from public, anon;
grant execute on function public.cmd_creer_lien_signature(uuid, text, integer) to authenticated;

-- ── Retrait de l'ancien portail par code ───────────────────────────────────
-- L'espace client passe par OAuth (0052). Les fonctions de portail par code de
-- 0051 qui exposaient dossier/offres/factures À anon n'ont plus lieu d'être :
-- un accès anonyme large est une surface de risque qu'on referme dès qu'elle
-- devient inutile. On garde uniquement l'annuaire réseau (public par nature).
drop function if exists public.cmd_portail_dossier(text);
drop function if exists public.cmd_portail_offres(text);
drop function if exists public.cmd_portail_factures(text);
drop function if exists public.cmd_portail_inventaire(text);
drop function if exists public.cmd_portail_ouvrir(text);

-- Vérification après application :
--   -- l'espace client (OAuth) n'expose RIEN à anon :
--   select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and has_function_privilege('anon', p.oid,'EXECUTE')
--      and proname like 'cmd_client_%';   -- 0 ligne
--   -- ce qui reste ouvert à anon : signature d'offre + annuaire, rien d'autre :
--   select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and has_function_privilege('anon', p.oid,'EXECUTE')
--      and proname like 'cmd_%' order by proname;
--   -- attendu : cmd_offre_apercu, cmd_offre_signer, cmd_reseau_demenageurs
