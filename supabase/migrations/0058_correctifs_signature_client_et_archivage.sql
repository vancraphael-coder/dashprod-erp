-- =============================================================================
-- 0058_correctifs_signature_client_et_archivage.sql
--
-- ✅ APPLIQUÉE en production le 2026-07-28 via le connecteur, et testée de
--    bout en bout (aperçu → refus sans mention → signature → état confirmé →
--    document scellé → code consommé).
--
-- Corrige trois bugs P0 de la signature client, invisibles sans accès à la
-- base, et archive une fonction qui n'existait que dans la base.
--
-- BUG 1 — cmd_offre_apercu triait par `di.created_at` : cette colonne
--   N'EXISTE PAS (documents_instances a `genere_le`). La fonction levait donc
--   une erreur : le client ne pouvait même pas VOIR l'offre à signer.
--
-- BUG 2 — cmd_offre_signer appelait
--   `transition_interne(affaire, 'confirmee', jsonb)` :
--     a) l'état valide est `confirme` (sans e final) ;
--     b) transition_interne ne prend que DEUX arguments.
--   L'appel échouait, et le `exception when others` renvoyait un message
--   trompeur (« pas dans un état permettant la signature »). La signature
--   client échouait donc À TOUS LES COUPS, avec une explication fausse.
--
-- BUG 3 (INC-03) — la signature ne marquait pas le document : le badge
--   « ✓ Offre signée » ne s'allumait jamais. On aligne désormais la signature
--   client sur le mécanisme existant de cmd_signer_instance : statut='signee',
--   gele=true, et une ligne dans `signatures` (canal 'client_en_ligne').
--
-- INC-02 — cmd_terminer_chantier existait en base sans fichier au dépôt.
--   Elle est ré-affirmée ici à l'identique pour que le repo redevienne la
--   source de vérité. Aucun changement de comportement.
--
-- INC-07 — peppol_id avait deux sources (colonne + JSON). Les deux sont vides
--   en production : on tranche pour le JSON parametres_facturation (ce que
--   l'écran écrit) et on retire la colonne morte.
-- =============================================================================

-- ── BUG 1 : aperçu de l'offre, sur la vraie colonne ────────────────────────
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

  -- documents_instances est horodatée par `genere_le`, pas `created_at`.
  -- On privilégie une instance gelée : c'est le document opposable.
  select di.contenu, di.empreinte_sha256 into v_doc, v_emp
    from documents_instances di
   where di.affaire_id = a.affaire_id
   order by (di.gele is not true), di.genere_le desc
   limit 1;

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

-- ── BUGS 2 et 3 : signature client réellement opérante ─────────────────────
create or replace function public.cmd_offre_signer(
  p_code text, p_nom text default null, p_mention text default null,
  p_empreinte text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  a public.acces_client;
  v_etat etat_affaire;
  v_instance uuid;
  v_empreinte text;
  v_ok boolean;
begin
  a := resoudre_acces(p_code);
  if a.id is null then
    return jsonb_build_object('ok', false,
      'message', 'Lien invalide, expiré ou déjà utilisé.');
  end if;
  if a.signe_le is not null then
    return jsonb_build_object('ok', false, 'deja_signee', true,
      'message', 'Offre déjà signée.');
  end if;

  -- Consentement éclairé : sans la mention recopiée, pas de signature.
  if not mention_conforme(p_mention) then
    return jsonb_build_object('ok', false,
      'message', 'Recopiez la mention « Lu et approuvé » pour signer.');
  end if;
  if length(btrim(coalesce(p_nom, ''))) < 3 then
    return jsonb_build_object('ok', false,
      'message', 'Indiquez vos nom et prénom pour signer.');
  end if;

  select etat into v_etat from affaires where id = a.affaire_id;
  if v_etat is null then
    return jsonb_build_object('ok', false, 'message', 'Dossier introuvable.');
  end if;

  -- Le document approuvé : instance gelée en priorité.
  select di.id, di.empreinte_sha256 into v_instance, v_empreinte
    from documents_instances di
   where di.affaire_id = a.affaire_id
   order by (di.gele is not true), di.genere_le desc
   limit 1;

  -- Transition d'état par la garde S4. Deux arguments, état `confirme`.
  -- transition_interne est tolérante (renvoie false sans lever) : on lit donc
  -- son verdict au lieu de supposer que ça a marché.
  v_ok := transition_interne(a.affaire_id, 'confirme'::etat_affaire);
  if not v_ok and v_etat <> 'confirme' then
    return jsonb_build_object('ok', false,
      'message', 'Cette offre doit d''abord être envoyée par votre déménageur '
               || 'avant de pouvoir être signée.');
  end if;

  -- Le document devient signé et scellé — c'est ce qui allume le badge
  -- « Offre signée » côté bureau comme côté espace client.
  if v_instance is not null then
    update documents_instances
       set statut = 'signee', gele = true
     where id = v_instance;

    -- Même registre que la signature recueillie au bureau, canal distinct.
    insert into signatures (org_id, instance_id, signataire_nom, canal,
                            empreinte_doc, recueilli_par)
    values (a.org_id, v_instance, btrim(p_nom), 'client_en_ligne',
            coalesce(p_empreinte, v_empreinte), null);
  end if;

  update acces_client
     set signe_le = now(),
         revoque_le = now(),          -- le code est consommé
         mention_saisie = btrim(p_mention),
         signataire_nom = btrim(p_nom),
         document_empreinte = coalesce(p_empreinte, v_empreinte)
   where id = a.id;

  perform emettre_evenement(a.org_id, 'Offre.SigneeParClient', 'affaire',
    a.affaire_id, null,
    jsonb_build_object('signataire', btrim(p_nom),
                       'mention', btrim(p_mention),
                       'document_empreinte', coalesce(p_empreinte, v_empreinte)));

  return jsonb_build_object('ok', true, 'affaire_id', a.affaire_id,
    'message', 'Merci, votre signature est enregistrée.');
end $$;

grant execute on function public.cmd_offre_signer(text, text, text, text) to anon, authenticated;

-- ── INC-02 : archivage de cmd_terminer_chantier (comportement inchangé) ────
create or replace function public.cmd_terminer_chantier(p_mission uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
  v_affaire uuid;
begin
  update chrono_sessions set fin = now()
    where mission_id = p_mission and org_id = v_org and fin is null;

  update missions set etat = 'effectuee'
    where id = p_mission and org_id = v_org and etat in ('planifiee','en_cours');

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Chantier.Termine', 'mission', p_mission, v_acteur, '{}'::jsonb);

  select affaire_id into v_affaire from missions where id = p_mission and org_id = v_org;
  if v_affaire is not null and not exists (
      select 1 from missions
       where affaire_id = v_affaire and org_id = v_org
         and etat in ('planifiee','en_cours')
  ) then
    perform transition_interne(v_affaire, 'planifie');
    perform transition_interne(v_affaire, 'en_cours');
    perform transition_interne(v_affaire, 'effectue');
  end if;
end; $$;

-- ── INC-07 : une seule source pour l'identifiant Peppol ────────────────────
-- Les deux sources étaient vides ; l'écran Paramètres écrit dans le JSON.
alter table public.organisations drop column if exists peppol_id;

-- Vérification après application :
--   select cmd_offre_apercu('CODE-INVA-LIDE') ->> 'message';  -- message clair
--   select count(*) from pg_proc where proname='cmd_terminer_chantier';  -- 1
--   select count(*) from information_schema.columns
--    where table_name='organisations' and column_name='peppol_id';       -- 0
