-- 0153 — APPLIQUÉE ET VÉRIFIÉE le 27/08/2026.
-- DÉFINIR LE POSTE D'UN MEMBRE (un seul poste à la fois).
--
-- cmd_affecter_role AJOUTE un rôle ; un membre n'a qu'UN poste. Cette commande
-- REMPLACE : retire les postes connus puis pose le nouveau. Gardée par
-- `confier_les_acces` (gérant de plein droit, secrétaire si octroyée), pas
-- seulement gerer_referentiels.

create or replace function cmd_definir_poste(p_utilisateur uuid, p_poste text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_org uuid := jwt_org(); v_role uuid; v_acteur uuid;
  postes_connus text[] := array['fondateur','gerant','secretaire','responsable_depot',
    'chef_equipe','livreur','monteur','chauffeur','liftier','demenageur',
    'interimaire','visite_terrain'];
begin
  if not acteur_a_capacite('confier_les_acces') then
    raise exception 'Refusé : vous ne pouvez pas confier les accès' using errcode = '42501';
  end if;
  if not (p_poste = any(postes_connus)) then
    raise exception 'Poste % inconnu', p_poste using errcode = '22023';
  end if;
  if not exists (select 1 from utilisateurs where id = p_utilisateur and org_id = v_org) then
    raise exception 'Utilisateur hors organisation' using errcode = '42501';
  end if;
  select id into v_role from roles where org_id = v_org and cle = p_poste;
  if v_role is null then
    raise exception 'Poste % non provisionné', p_poste;
  end if;
  delete from utilisateur_roles ur using roles r
   where ur.role_id = r.id and ur.utilisateur_id = p_utilisateur
     and r.org_id = v_org and r.cle = any(postes_connus) and r.cle <> p_poste;
  insert into utilisateur_roles (utilisateur_id, role_id)
    values (p_utilisateur, v_role) on conflict (utilisateur_id, role_id) do nothing;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Poste.Defini', 'utilisateur', p_utilisateur,
    v_acteur, jsonb_build_object('poste', p_poste));
  return jsonb_build_object('ok', true, 'poste', p_poste);
end $$;

grant execute on function cmd_definir_poste(uuid, text) to authenticated;
