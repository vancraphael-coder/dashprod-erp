-- 0174 — Deux portes ouvertes, fermées.
--
-- Trouvées en auditant la base avant d'ouvrir le parcours d'inscription.
-- Aucune n'était exploitée ; toutes deux le seraient devenues dès que
-- l'inscription publique s'ouvre.

-- =============================================================================
-- 1. `cmd_creer_ma_societe` — la surcharge à 6 arguments contourne le verrou
--    de lancement fermé.
--
--    0081 a créé la variante à 6 arguments (sans code). 0083 a ajouté la
--    variante à 7 arguments qui exige un code d'invitation tant que
--    `reglages_plateforme.inscription_ouverte` est faux — il l'est.
--    La variante à 6 arguments n'a jamais été révoquée : elle reste
--    exécutable par `authenticated`. N'importe quel compte Supabase pouvait
--    donc appeler /rest/v1/rpc/cmd_creer_ma_societe avec six paramètres et
--    créer une organisation pendant un lancement fermé.
--
--    L'application n'appelle que la variante à 7 arguments
--    (apps/web/src/lib/adaptateur.js, `creerMaSociete`). La supprimer ne casse
--    rien : un appel à six paramètres se résout désormais sur la variante à
--    sept, `p_code` valant null, et se voit refusé avec le bon message.
-- =============================================================================

drop function if exists public.cmd_creer_ma_societe(text, text, text, text, text, text);

-- =============================================================================
-- 2. `cmd_emettre_releve_abonnement` — aucune autorisation, exécutable par
--    `anon` et par PUBLIC.
--
--    La fonction est `security definer` et accepte `p_org` en argument sans
--    vérifier qui appelle. Un appelant anonyme connaissant un identifiant
--    d'organisation pouvait donc émettre un relevé d'abonnement — écriture
--    immuable, non supprimable par construction (trigger 0173).
--
--    Règle posée : un relevé ne s'émet que pour sa propre organisation.
--    L'éditeur de la plateforme (`est_editeur()`) et le rôle `service_role`
--    — futur ordonnanceur, question P3 — font exception.
-- =============================================================================

create or replace function public.cmd_emettre_releve_abonnement(p_org uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_role text := coalesce(auth.jwt() ->> 'role', '');
  v_org uuid := coalesce(p_org, jwt_org());
  v_offre offres%rowtype;
  v_plan text; v_periodicite text;
  v_membres integer; v_centres integer;
  v_calc jsonb; v_id uuid; v_acteur uuid;
begin
  -- Garde-fou d'autorisation.
  if v_role <> 'service_role' then
    if auth.uid() is null then
      raise exception 'Authentification requise' using errcode = '42501';
    end if;
    if p_org is not null and p_org is distinct from jwt_org() and not est_editeur() then
      raise exception 'Refuse : un releve ne s''emet que pour sa propre organisation'
        using errcode = '42501';
    end if;
  end if;

  if v_org is null then
    return jsonb_build_object('ok', false, 'motif', 'organisation introuvable');
  end if;

  select o.plan, o.periodicite into v_plan, v_periodicite
    from organisations o where o.id = v_org;
  if not found then
    return jsonb_build_object('ok', false, 'motif', 'organisation introuvable');
  end if;

  select * into v_offre from offre_en_vigueur(v_plan, now());
  if v_offre.code is null then
    return jsonb_build_object('ok', false,
      'motif', format('aucun bareme publie pour l''offre %s', v_plan));
  end if;

  v_membres := compter_membres_factures(v_org);
  v_centres := compter_centres_factures(v_org);

  v_calc := calculer_supplements(
    v_membres, v_offre.membres_inclus, v_offre.prix_membre_supp_htva,
    v_centres, v_offre.centres_inclus, v_offre.prix_centre_supp_htva);

  -- Un depassement non tarife ne produit pas de releve : mieux vaut ne rien
  -- emettre qu'emettre une facture qu'on ne saurait pas justifier.
  if not (v_calc->>'ok')::boolean then
    return jsonb_build_object('ok', false, 'motif', v_calc->>'motif');
  end if;

  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  insert into releves_abonnement (
    org_id, emis_par, offre_code, offre_publie_le, periodicite,
    membres_factures, membres_inclus, centres_factures, centres_inclus,
    supplements, montant_supp_htva)
  values (
    v_org, v_acteur, v_offre.code, v_offre.publie_le, v_periodicite,
    v_membres, v_offre.membres_inclus, v_centres, v_offre.centres_inclus,
    v_calc, (v_calc->>'montant_total_htva')::numeric)
  returning id into v_id;

  return jsonb_build_object(
    'ok', true, 'motif', 'releve emis',
    'releve_id', v_id, 'offre', v_offre.code, 'periodicite', v_periodicite,
    'membres_factures', v_membres, 'centres_factures', v_centres,
    'montant_supp_htva', (v_calc->>'montant_total_htva')::numeric);
end $function$;

revoke execute on function public.cmd_emettre_releve_abonnement(uuid) from public, anon;
grant  execute on function public.cmd_emettre_releve_abonnement(uuid) to authenticated, service_role;
