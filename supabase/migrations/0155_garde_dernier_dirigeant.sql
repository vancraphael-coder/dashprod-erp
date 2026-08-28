-- 0155 — APPLIQUÉE ET VÉRIFIÉE le 28/08/2026.
-- GARDE : ne pas se rétrograder soi-même, ne pas retirer le dernier dirigeant.
--
-- Incident réel : un compte gérant s'est retrouvé secrétaire et a perdu l'accès
-- aux réglages. Pire cas : le dernier fondateur/gérant se retire ses droits et
-- verrouille toute l'organisation dehors. Deux verrous dans cmd_definir_poste :
--   1. on ne modifie jamais son propre poste (qu'un autre dirigeant le fasse) ;
--   2. on ne retire pas le dernier fondateur/gérant d'une organisation.

create or replace function cmd_definir_poste(p_utilisateur uuid, p_poste text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_org uuid := jwt_org(); v_role uuid; v_acteur uuid;
  v_est_dirigeant_cible boolean; v_autres_dirigeants int;
  postes_connus text[] := array['fondateur','gerant','secretaire','responsable_depot',
    'chef_equipe','livreur','monteur','chauffeur','liftier','demenageur',
    'interimaire','visite_terrain'];
  direction text[] := array['fondateur','gerant'];
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

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;

  if v_acteur is not null and v_acteur = p_utilisateur then
    return jsonb_build_object('ok', false,
      'message', 'Vous ne pouvez pas modifier votre propre poste. '
              || 'Demandez à un autre gérant ou fondateur.');
  end if;

  if not (p_poste = any(direction)) then
    select exists (
      select 1 from utilisateur_roles ur join roles r on r.id = ur.role_id
       where ur.utilisateur_id = p_utilisateur and r.org_id = v_org
         and r.cle = any(direction)) into v_est_dirigeant_cible;
    if v_est_dirigeant_cible then
      select count(distinct ur.utilisateur_id) into v_autres_dirigeants
        from utilisateur_roles ur join roles r on r.id = ur.role_id
       where r.org_id = v_org and r.cle = any(direction)
         and ur.utilisateur_id <> p_utilisateur;
      if v_autres_dirigeants = 0 then
        return jsonb_build_object('ok', false,
          'message', 'Impossible : ce serait le dernier fondateur ou gérant. '
                  || 'Nommez d''abord un autre dirigeant.');
      end if;
    end if;
  end if;

  select id into v_role from roles where org_id = v_org and cle = p_poste;
  if v_role is null then raise exception 'Poste % non provisionné', p_poste; end if;

  delete from utilisateur_roles ur using roles r
   where ur.role_id = r.id and ur.utilisateur_id = p_utilisateur
     and r.org_id = v_org and r.cle = any(postes_connus) and r.cle <> p_poste;
  insert into utilisateur_roles (utilisateur_id, role_id)
    values (p_utilisateur, v_role) on conflict (utilisateur_id, role_id) do nothing;

  perform emettre_evenement(v_org, 'Poste.Defini', 'utilisateur', p_utilisateur,
    v_acteur, jsonb_build_object('poste', p_poste));
  return jsonb_build_object('ok', true, 'poste', p_poste);
end $$;

grant execute on function cmd_definir_poste(uuid, text) to authenticated;
