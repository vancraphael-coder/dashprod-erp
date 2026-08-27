-- 0148 — APPLIQUÉE ET VÉRIFIÉE le 27/08/2026.
-- cmd_pointage_definir cible la session DE L'ACTEUR ; + cmd_heures_membres_affaire.
--
-- Même signature que l'ancienne cmd_pointage_definir (l'app terrain n'a pas à
-- changer d'appel) : mais elle ne touche plus « la » session du chantier, elle
-- touche celle de la personne qui pointe. Le pointage est un geste personnel ;
-- le bureau CORRIGE via cmd_valider_heures.

create or replace function cmd_pointage_definir(
  p_mission uuid,
  p_depart timestamptz default null,
  p_arrivee timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_org uuid := jwt_org(); v_acteur uuid; v_session uuid;
  v_debut timestamptz; v_fin timestamptz;
begin
  if not exists (select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  if v_acteur is null then
    raise exception 'Acteur introuvable' using errcode = '42501';
  end if;

  if not acteur_a_capacite('gerer_planning') then
    if not acteur_a_capacite('pointer_chantier') then
      raise exception 'Vous n''êtes pas autorisé à déclarer des heures' using errcode = '42501';
    end if;
    if not est_affecte_mission(p_mission) then
      raise exception 'Vous n''êtes pas affecté à ce chantier' using errcode = '42501';
    end if;
  end if;

  if p_depart is not null and p_arrivee is not null and p_arrivee < p_depart then
    return jsonb_build_object('ok', false,
      'message', 'L''heure d''arrivée est antérieure à l''heure de départ.');
  end if;

  select id, debut, fin into v_session, v_debut, v_fin
    from chrono_sessions
   where mission_id = p_mission and org_id = v_org
     and coalesce(type, 'travail') = 'travail'
     and utilisateur_id = v_acteur
   order by debut limit 1;

  if v_session is null then
    if p_depart is null then
      return jsonb_build_object('ok', false, 'message', 'Indiquez d''abord l''heure de départ.');
    end if;
    insert into chrono_sessions (org_id, mission_id, utilisateur_id, debut, fin, type)
    values (v_org, p_mission, v_acteur, p_depart, p_arrivee, 'travail')
    returning id, debut, fin into v_session, v_debut, v_fin;
  else
    update chrono_sessions
       set debut = coalesce(p_depart, debut),
           fin   = case when p_arrivee is not null then p_arrivee else fin end
     where id = v_session
    returning debut, fin into v_debut, v_fin;
  end if;

  update missions set etat = 'en_cours'
   where id = p_mission and org_id = v_org and etat = 'planifiee';

  perform emettre_evenement(v_org, 'Pointage.Declare', 'mission', p_mission,
    v_acteur, jsonb_build_object('depart', v_debut, 'arrivee', v_fin));

  return jsonb_build_object('ok', true, 'depart', v_debut, 'arrivee', v_fin);
end $$;

-- Les heures PAR MEMBRE d'une affaire : ce que le circuit lit pour valoriser au
-- coût interne. Une ligne par (mission, membre) qui a pointé.
create or replace function cmd_heures_membres_affaire(p_affaire uuid)
returns jsonb language sql security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'mission_id', m.id, 'type', m.type, 'date', m.date, 'etat', m.etat,
      'utilisateur_id', cs.utilisateur_id,
      'depart', cs.debut, 'arrivee', cs.fin)
    order by m.date, cs.utilisateur_id), '[]'::jsonb)
  from missions m
  join chrono_sessions cs
    on cs.mission_id = m.id and coalesce(cs.type,'travail')='travail'
  where m.affaire_id = p_affaire and m.org_id = jwt_org() and m.etat <> 'annulee';
$$;

grant execute on function cmd_heures_membres_affaire(uuid) to authenticated;
