-- =============================================================================
-- 0076_fix_inviter_membre.sql   ✅ appliquée le 2026-08-05 — correctif de 0075
--
-- BUG introduit par 0075 : en ajoutant le contrôle de limite d'utilisateurs,
-- `cmd_inviter_membre` a été réécrite en déléguant la création à
-- `cmd_inviter_membre_interne`… qui n'existe pas. L'invitation d'un membre
-- aurait échoué à chaque appel.
--
-- Leçon, à ranger avec les autres : `create or replace` sur une fonction dont
-- on n'a pas relu le corps ÉCRASE l'implémentation. Avant de remplacer, lire —
-- ou n'ajouter le contrôle qu'en tête, sans toucher au reste.
-- =============================================================================

create or replace function public.cmd_inviter_membre(
  p_email text, p_nom text, p_role_cle text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_org uuid := jwt_org();
  v_plan text; v_max integer; v_actuel integer;
  v_id uuid; v_role uuid; v_acteur uuid;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise'
      using errcode = '42501';
  end if;

  -- Limite du plan. Vérifiée AVANT toute création : refuser après avoir inséré
  -- laisserait un utilisateur orphelin.
  select plan into v_plan from organisations where id = v_org;
  v_max := limite_utilisateurs(v_plan);
  if v_max is not null then
    select count(*) into v_actuel from utilisateurs
     where org_id = v_org and coalesce(actif, true) = true;
    if v_actuel >= v_max then
      raise exception 'Votre offre % comprend % utilisateur(s). Passez à l''offre supérieure pour agrandir votre équipe.',
        initcap(coalesce(v_plan, 'regular')), v_max using errcode = '42501';
    end if;
  end if;

  if p_email is null or btrim(p_email) = '' then
    raise exception 'E-mail requis' using errcode = '22023';
  end if;
  if exists (select 1 from utilisateurs where email = lower(btrim(p_email))) then
    raise exception 'Cet e-mail est déjà rattaché à une société'
      using errcode = '23505';
  end if;

  insert into utilisateurs (org_id, email, nom)
    values (v_org, lower(btrim(p_email)), coalesce(nullif(btrim(p_nom), ''), p_email))
    returning id into v_id;

  select id into v_role from roles
   where org_id = v_org and cle = coalesce(nullif(btrim(p_role_cle), ''), 'demenageur')
   limit 1;
  if v_role is not null then
    insert into utilisateur_roles (utilisateur_id, role_id)
    values (v_id, v_role) on conflict do nothing;
  end if;

  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Utilisateur.Invite', 'utilisateur', v_id,
    v_acteur, jsonb_build_object('email', p_email, 'role', p_role_cle));

  return jsonb_build_object('utilisateur_id', v_id, 'role', p_role_cle);
end $$;

revoke all on function public.cmd_inviter_membre(text, text, text) from public, anon;
grant execute on function public.cmd_inviter_membre(text, text, text) to authenticated;
