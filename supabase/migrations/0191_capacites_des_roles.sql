-- 0191 — Une organisation redéfinit ce que ses rôles peuvent faire.
--
-- CE QUI MANQUAIT. `provisionner_roles_standard()` pose les rôles et leurs
-- capacités à la création de la société — puis c'est figé.
-- `cmd_definir_capacite` n'agit que sur UN membre, en dérogation
-- individuelle. Aucune commande ne permettait de changer ce que « chef
-- d'équipe » signifie DANS CETTE entreprise.
--
-- Conséquence : toute société voulant un découpage différent accordait des
-- dérogations membre par membre. Le rôle perdait son sens, et la question
-- « qui peut quoi ici » n'avait plus de réponse lisible — alors que c'est
-- exactement le sommet « paramétrage » de la pyramide.
--
-- LE GARDE-FOU QUI COMPTE : L'ANTI-VERROUILLAGE.
--
-- Retirer une capacité à un rôle peut faire disparaître la dernière personne
-- qui la détenait. Pour deux capacités, c'est irréversible depuis
-- l'application : `confier_les_acces` (sans elle, plus personne ne peut
-- redonner de droits) et `gerer_referentiels` (sans elle, plus personne ne
-- peut reparamétrer). Une société pourrait s'enfermer dehors — par erreur, ou
-- par malveillance interne d'un salarié sur le départ.
--
-- La commande refuse donc le retrait qui laisserait ZÉRO détenteur actif, en
-- comptant les deux origines : la capacité portée par un autre rôle ET la
-- dérogation individuelle. Ne regarder que les rôles refuserait des retraits
-- sans danger — c'est le cas réel mesuré chez Roovers, où un détenteur l'a
-- par dérogation.
--
-- Même esprit que la sûreté d'enregistrement des dossiers : on ne compte pas
-- sur la prudence, on rend le geste impossible.
--
-- TRACÉ. Chaque changement s'inscrit dans `evenements`, jamais verrouillé par
-- offre (décision produit : une société doit pouvoir tracer ses actions). Qui
-- a retiré quoi à quel rôle, et quand.

create or replace function public.cmd_capacites_des_roles()
returns table (role_cle text, role_libelle text, capacite_cle text,
               membres_actifs integer)
language sql stable security definer set search_path to 'public'
as $function$
  select r.cle, r.libelle, rc.capacite_cle,
         (select count(*)::integer from utilisateur_roles ur
            join utilisateurs u on u.id = ur.utilisateur_id
           where ur.role_id = r.id
             and coalesce(u.actif, true) and u.retire_le is null)
    from roles r
    -- Jointure EXTERNE : un rôle sans aucune capacité doit apparaître, sinon
    -- `visite_terrain` (zéro capacité) serait invisible et impossible à doter.
    left join role_capacites rc on rc.role_id = r.id
   where r.org_id = jwt_org()
   order by r.cle, rc.capacite_cle;
$function$;

revoke execute on function public.cmd_capacites_des_roles() from public, anon;
grant execute on function public.cmd_capacites_des_roles()
  to authenticated, service_role;

create or replace function public.cmd_definir_capacite_role(
  p_role_cle text, p_capacite text, p_accorder boolean)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org();
  v_role uuid;
  v_restants integer;
  v_acteur uuid;
begin
  if v_org is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  -- Confier des accès est la capacité qui commande toutes les autres : elle
  -- seule permet d'en distribuer.
  if not acteur_a_capacite('confier_les_acces') then
    raise exception 'Capacité « confier_les_acces » requise' using errcode = '42501';
  end if;

  select id into v_role from roles
   where org_id = v_org and cle = p_role_cle;
  if not found then
    return jsonb_build_object('ok', false, 'motif', 'role introuvable');
  end if;
  if not exists (select 1 from capacites c where c.cle = p_capacite) then
    return jsonb_build_object('ok', false, 'motif', 'capacite inconnue');
  end if;

  if p_accorder then
    insert into role_capacites (role_id, capacite_cle)
    values (v_role, p_capacite)
    on conflict do nothing;
  else
    if p_capacite in ('confier_les_acces', 'gerer_referentiels') then
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
      if v_restants = 0 then
        raise exception
          'Refuse : plus personne ne porterait « %s ». Votre societe se '
          'verrouillerait dehors. Accordez-la d''abord a quelqu''un d''autre.',
          p_capacite
          using errcode = '42501';
      end if;
    end if;

    delete from role_capacites
     where role_id = v_role and capacite_cle = p_capacite;
  end if;

  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  insert into evenements (org_id, type, entite_type, entite_id, acteur_id, payload)
  values (v_org,
          case when p_accorder then 'capacite_role_accordee'
               else 'capacite_role_retiree' end,
          'role', v_role, v_acteur,
          jsonb_build_object('role', p_role_cle, 'capacite', p_capacite));

  return jsonb_build_object('ok', true, 'role', p_role_cle,
                            'capacite', p_capacite, 'accordee', p_accorder);
end $function$;

revoke execute on function public.cmd_definir_capacite_role(text, text, boolean)
  from public, anon;
grant execute on function public.cmd_definir_capacite_role(text, text, boolean)
  to authenticated, service_role;
