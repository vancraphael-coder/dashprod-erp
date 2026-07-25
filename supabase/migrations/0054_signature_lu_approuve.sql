-- =============================================================================
-- 0054_signature_lu_approuve.sql
--
-- ⚠️  À APPLIQUER — colle ce fichier ENTIER dans l'éditeur SQL Supabase,
--     lignes « -- » comprises, puis range-le dans supabase/migrations/.
--     À appliquer APRÈS 0053.
--
-- =============================================================================
-- SIGNATURE CÔTÉ CLIENT — « lu et approuvé » + nom et prénom.
--
-- L'offre et les CGV ne s'envoient plus par e-mail. Le bureau prépare le
-- document (comme aujourd'hui) et génère un code ; le client lit le document
-- en ligne et l'approuve lui-même.
--
-- La signature vaut consentement écrit. En droit belge, une signature
-- électronique — ici la mention « lu et approuvé » recopiée, avec nom et
-- prénom, horodatée et liée au contenu figé du document — engage son auteur.
-- On enregistre donc de quoi la rendre opposable :
--   - la mention exacte recopiée par le client ;
--   - ses nom et prénom ;
--   - l'empreinte du document approuvé (le contenu ne doit pas changer après) ;
--   - l'horodatage.
--
-- Le rôle du bureau se réduit à 10 % : préparer le document et envoyer le code.
-- Les 90 % — lire, recopier la mention, signer — sont côté client.
-- =============================================================================

alter table public.acces_client
  add column if not exists mention_saisie   text,
  add column if not exists signataire_nom   text,
  add column if not exists document_empreinte text;

-- Mention attendue. On la compare de façon tolérante (casse, accents, espaces),
-- mais elle DOIT être présente : un simple clic ne suffit pas à engager.
-- unaccent n'est pas garanti installé : on fait un remplacement minimal, sans
-- dépendre d'une extension. DÉFINIE EN PREMIER car mention_conforme l'appelle
-- (PostgreSQL résout les dépendances dans l'ordre du fichier).
create or replace function public.unaccent_simple(p text)
returns text language sql immutable set search_path to 'public' as $$
  select translate(coalesce(p,''),
    'àâäáãéèêëíìîïóòôöõúùûüçÀÂÄÁÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC');
$$;

create or replace function public.mention_conforme(p_saisie text)
returns boolean language sql immutable set search_path to 'public' as $$
  select lower(regexp_replace(unaccent_simple(coalesce(p_saisie,'')), '\s+', ' ', 'g'))
         like '%lu et approuve%';
$$;

revoke all on function public.mention_conforme(text) from public, anon, authenticated;
revoke all on function public.unaccent_simple(text) from public, anon, authenticated;

-- ── Signature : on remplace cmd_offre_signer par une version qui EXIGE la
--    mention et le nom, et qui lie la signature au document lu. ──────────────
create or replace function public.cmd_offre_signer(
  p_code text, p_nom text default null, p_mention text default null,
  p_empreinte text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a public.acces_client; v_etat text;
begin
  a := resoudre_acces(p_code);
  if a.id is null then raise exception 'Lien invalide ou expiré' using errcode = '42501'; end if;
  if a.signe_le is not null then
    return jsonb_build_object('ok', false, 'deja_signee', true,
      'message', 'Offre déjà signée.');
  end if;

  -- Consentement éclairé : sans la mention manuscrite recopiée, pas de
  -- signature. Un bouton seul n'engage pas.
  if not mention_conforme(p_mention) then
    return jsonb_build_object('ok', false,
      'message', 'Recopiez la mention « Lu et approuvé » pour signer.');
  end if;
  if length(btrim(coalesce(p_nom, ''))) < 3 then
    return jsonb_build_object('ok', false,
      'message', 'Indiquez vos nom et prénom pour signer.');
  end if;

  select etat into v_etat from affaires where id = a.affaire_id;
  if v_etat is null then raise exception 'Dossier introuvable' using errcode = '42501'; end if;

  perform transition_interne(a.affaire_id, 'confirmee',
    jsonb_build_object('canal', 'signature_client',
                       'signataire', btrim(p_nom),
                       'mention', btrim(p_mention)));

  update acces_client
     set signe_le = now(),
         revoque_le = now(),
         mention_saisie = btrim(p_mention),
         signataire_nom = btrim(p_nom),
         document_empreinte = p_empreinte
   where id = a.id;

  perform emettre_evenement(a.org_id, 'Offre.SigneeParClient', 'affaire',
    a.affaire_id, null,
    jsonb_build_object('signataire', btrim(p_nom),
                       'mention', btrim(p_mention),
                       'document_empreinte', p_empreinte));

  return jsonb_build_object('ok', true, 'affaire_id', a.affaire_id,
    'message', 'Merci, votre signature est enregistrée.');
exception when others then
  return jsonb_build_object('ok', false,
    'message', 'Cette offre n''est pas dans un état permettant la signature. '
             || 'Contactez votre déménageur.');
end $$;

grant execute on function public.cmd_offre_signer(text, text, text, text) to anon, authenticated;

-- L'ancienne signature à 2 arguments est remplacée : on la retire pour éviter
-- qu'un appel oublie la mention et signe sans consentement écrit.
drop function if exists public.cmd_offre_signer(text, text);

-- ── L'aperçu doit renvoyer le CONTENU du document, pas seulement un résumé ──
-- Le client lit ce qu'il approuve : lignes, montants, CGV figées.
create or replace function public.cmd_offre_apercu(p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a public.acces_client; r jsonb; d jsonb;
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

  -- Dernier document préparé par le bureau pour cette affaire : c'est LUI que
  -- le client approuve. Son empreinte servira à prouver qu'il n'a pas changé.
  select di.contenu, di.empreinte_sha256
    into d, r
    from documents_instances di
   where di.affaire_id = a.affaire_id
   order by di.created_at desc limit 1;

  select jsonb_build_object(
    'ok', true,
    'affaire_id', af.id,
    'reference', af.reference,
    'entreprise', o.nom,
    'client', c.nom,
    'date_souhaitee', af.date_souhaitee,
    'montant_tvac_centimes', af.tvac_centimes,
    'expire_le', a.expire_le,
    'document', d,
    'document_empreinte', r)
    into r
    from affaires af
    join organisations o on o.id = af.org_id
    left join clients c on c.id = af.client_id
   where af.id = a.affaire_id;
  return r;
end $$;

grant execute on function public.cmd_offre_apercu(text) to anon, authenticated;

-- Vérification après application :
--   select mention_conforme('Lu et approuvé') as doit_etre_true,
--          mention_conforme('  LU ET APPROUVE  ') as tolere_casse_espaces,
--          mention_conforme('ok') as doit_etre_false;