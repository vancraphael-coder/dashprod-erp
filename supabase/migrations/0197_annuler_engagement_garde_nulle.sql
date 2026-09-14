-- 0197 — `cmd_annuler_engagement` : une garde qui laissait passer NULL.
--
-- LE DÉFAUT, trouvé en éprouvant 0196. La vérification d'appartenance
-- s'écrivait :
--
--     if v_org not in (v_e.org_donneur, v_e.org_prestataire) then raise ...
--
-- Avec `jwt_org()` nul — un compte authentifié rattaché à aucune organisation,
-- cas qui EXISTE dans Dashprod (branche `nonInvite` de main.jsx) — l'expression
-- rend NULL, la branche `if` n'est pas prise, et la commande continue. La garde
-- ne protégeait que les gens qui avaient une organisation.
--
-- C'est le même piège que la contrainte `check` qui passe quand elle rend NULL
-- (migration 0179), sous une autre forme. Il mérite d'être noté deux fois : en
-- SQL, une comparaison avec NULL n'est pas fausse, elle est INCONNUE — et
-- « inconnu » ne déclenche pas un `if`.
--
-- CE QUI AURAIT ÉTÉ EXPLOITABLE : annuler l'engagement de deux sociétés
-- tierces, en connaissant son identifiant. Un UUID ne se devine pas, mais la
-- sécurité par l'obscurité n'en est pas une.
--
-- LA CORRECTION. Refus explicite quand `jwt_org()` est nul, puis comparaison
-- avec `is distinct from` — c'est déjà la forme employée par
-- `cmd_repondre_engagement` et `cmd_marquer_engagement_realise`, qui ne
-- souffraient donc pas du défaut. Une seule forme partout vaut mieux que deux
-- dont l'une est correcte par hasard.

create or replace function public.cmd_annuler_engagement(
  p_engagement uuid, p_motif text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid := jwt_org(); v_e engagements%rowtype;
begin
  if v_org is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  select * into v_e from engagements where id = p_engagement;
  if not found then
    raise exception 'Engagement introuvable' using errcode = '42501';
  end if;

  -- Les deux parties : un chantier tombe des deux côtés. `is distinct from`
  -- et non `not in` : avec un NULL, `not in` rend NULL et laisse passer.
  if v_org is distinct from v_e.org_donneur
     and v_org is distinct from v_e.org_prestataire then
    raise exception 'Engagement introuvable' using errcode = '42501';
  end if;

  if v_e.etat not in ('proposee', 'acceptee') then
    return jsonb_build_object('ok', false,
      'motif', format('etat %s : trop tard pour annuler', v_e.etat));
  end if;
  if coalesce(btrim(p_motif), '') = '' then
    return jsonb_build_object('ok', false, 'motif', 'une annulation se motive');
  end if;

  update engagements
     set etat = 'annulee', motif_refus = btrim(p_motif),
         adresse_complete = null, contact_sur_place = null
   where id = p_engagement;

  perform engagement_inscrire(p_engagement, 'annulee', v_org,
    jsonb_build_object('motif', btrim(p_motif)));

  return jsonb_build_object('ok', true, 'etat', 'annulee');
end $function$;

revoke execute on function public.cmd_annuler_engagement(uuid, text)
  from public, anon;
grant execute on function public.cmd_annuler_engagement(uuid, text)
  to authenticated, service_role;
