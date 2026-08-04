-- =============================================================================
-- 0068_gestion_capacites_membre.sql   ✅ appliquée le 2026-07-29 — LOT 5
--
-- Rendre les autorisations LISIBLES et RÉGLABLES depuis la fiche d'un membre.
--
-- Jusqu'ici les rôles n'étaient qu'informatifs à l'écran : on choisissait un
-- rôle à l'invitation, et plus rien ensuite. Un patron qui voulait qu'un
-- déménageur puisse clôturer les chantiers n'avait aucun moyen de le faire.
--
-- Ce qu'on ajoute :
--   - la LECTURE de ce qu'un membre peut faire, en distinguant ce qui vient de
--     son rôle de ce qui lui a été accordé personnellement ;
--   - l'OCTROI et le RETRAIT d'une capacité individuelle.
--
-- Deux garde-fous délibérés :
--   1. on ne touche qu'aux capacités INDIVIDUELLES. Retirer une capacité de
--      rôle demande de changer le rôle — un autre geste, plus lourd, qui doit
--      rester explicite.
--   2. personne ne peut modifier ses PROPRES droits. Sans cette règle, un
--      compte compromis s'auto-promeut, et un administrateur peut se retirer
--      seul l'accès aux paramètres sans plus pouvoir revenir en arrière.
-- =============================================================================

create or replace function public.cmd_capacites_membre(p_membre uuid)
returns jsonb language plpgsql stable security definer
set search_path to 'public' as $$
declare v_org uuid := jwt_org();
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if not exists (select 1 from utilisateurs where id = p_membre and org_id = v_org) then
    raise exception 'Membre introuvable' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'membre_id', p_membre,
    'roles', coalesce((
      select jsonb_agg(r.cle order by r.cle)
        from utilisateur_roles ur join roles r on r.id = ur.role_id
       where ur.utilisateur_id = p_membre
         and (ur.expire_le is null or ur.expire_le > now())), '[]'::jsonb),
    'capacites_des_roles', coalesce((
      select jsonb_agg(distinct rc.capacite_cle)
        from utilisateur_roles ur
        join role_capacites rc on rc.role_id = ur.role_id
       where ur.utilisateur_id = p_membre
         and (ur.expire_le is null or ur.expire_le > now())), '[]'::jsonb),
    'capacites_individuelles', coalesce((
      select jsonb_agg(uc.capacite_cle order by uc.capacite_cle)
        from utilisateur_capacites uc
       where uc.utilisateur_id = p_membre and uc.org_id = v_org), '[]'::jsonb));
end $$;

revoke all on function public.cmd_capacites_membre(uuid) from public, anon;
grant execute on function public.cmd_capacites_membre(uuid) to authenticated;

-- ── Accorder ou retirer une capacité individuelle ──────────────────────────
create or replace function public.cmd_definir_capacite(
  p_membre uuid, p_capacite text, p_accorder boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_moi uuid;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if not exists (select 1 from utilisateurs where id = p_membre and org_id = v_org) then
    raise exception 'Membre introuvable' using errcode = '42501';
  end if;
  if not exists (select 1 from capacites where cle = p_capacite) then
    raise exception 'Capacité inconnue : %', p_capacite using errcode = '22023';
  end if;

  -- On ne modifie pas ses propres droits : un compte compromis s'auto-
  -- promouvrait, et un administrateur pourrait se verrouiller dehors.
  select id into v_moi from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;
  if v_moi = p_membre then
    raise exception 'Vous ne pouvez pas modifier vos propres autorisations'
      using errcode = '42501';
  end if;

  if p_accorder then
    insert into utilisateur_capacites (org_id, utilisateur_id, capacite_cle)
    values (v_org, p_membre, p_capacite)
    on conflict do nothing;
  else
    delete from utilisateur_capacites
     where org_id = v_org and utilisateur_id = p_membre and capacite_cle = p_capacite;
  end if;

  perform emettre_evenement(v_org,
    case when p_accorder then 'Membre.CapaciteAccordee' else 'Membre.CapaciteRetiree' end,
    'utilisateur', p_membre,
    (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org),
    jsonb_build_object('capacite', p_capacite));

  return jsonb_build_object('ok', true, 'capacite', p_capacite, 'accordee', p_accorder);
end $$;

revoke all on function public.cmd_definir_capacite(uuid, text, boolean) from public, anon;
grant execute on function public.cmd_definir_capacite(uuid, text, boolean) to authenticated;
