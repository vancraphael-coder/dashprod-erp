-- 0192 — Savoir AVANT de tenter : le retrait est-il permis ?
--
-- POURQUOI. La commande de retrait refuse déjà ce qui verrouillerait la
-- société dehors (0191). Mais un refus qu'on pouvait annoncer est un refus de
-- trop : l'écran doit prévenir avant le clic.
--
-- Reconstituer la réponse côté interface demandait un appel par membre pour
-- connaître ses dérogations individuelles — N+1 requêtes pour une question à
-- une réponse. Une fonction unique fait le compte en une passe.
--
-- La règle est la MÊME que celle de 0191 et que celle du domaine
-- (`retraitPermis` dans rh/capacites.js). Ce n'est pas une troisième
-- implémentation : la base tranche, le domaine sert de référence éprouvable
-- sans base, et cette fonction ne fait que lire à l'avance ce que 0191
-- déciderait.

create or replace function public.cmd_peut_retirer_capacite_role(
  p_role_cle text, p_capacite text)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org();
  v_role uuid;
  v_restants integer;
begin
  if v_org is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  select id into v_role from roles where org_id = v_org and cle = p_role_cle;
  if not found then
    return jsonb_build_object('permis', false, 'motif', 'role introuvable');
  end if;

  -- Une capacité ordinaire se retire librement : on peut toujours la redonner.
  if p_capacite not in ('confier_les_acces', 'gerer_referentiels') then
    return jsonb_build_object('permis', true);
  end if;

  select count(*)::integer into v_restants
    from utilisateurs u
   where u.org_id = v_org
     and coalesce(u.actif, true) and u.retire_le is null
     and (
       exists (select 1 from utilisateur_capacites uc
                where uc.utilisateur_id = u.id
                  and uc.capacite_cle = p_capacite)
       or exists (select 1 from utilisateur_roles ur
                   join role_capacites rc on rc.role_id = ur.role_id
                  where ur.utilisateur_id = u.id
                    and rc.capacite_cle = p_capacite
                    and ur.role_id <> v_role)
     );

  if v_restants > 0 then
    return jsonb_build_object('permis', true, 'restants', v_restants);
  end if;
  return jsonb_build_object('permis', false, 'restants', 0,
    'motif', format('Plus personne ne porterait « %s ». Votre société se '
                    || 'verrouillerait dehors : accordez-la d''abord à '
                    || 'quelqu''un d''autre.', p_capacite));
end $function$;

revoke execute on function public.cmd_peut_retirer_capacite_role(text, text)
  from public, anon;
grant execute on function public.cmd_peut_retirer_capacite_role(text, text)
  to authenticated, service_role;
