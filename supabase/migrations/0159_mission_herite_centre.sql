-- 0159 — APPLIQUÉE ET VÉRIFIÉE le 28/08/2026.
-- LA MISSION HÉRITE DU CENTRE DE SON AFFAIRE (Option A).
-- Une mission d'un dossier d'Anvers vit dans le planning d'Anvers.

create or replace function cmd_creer_mission(
  p_affaire uuid, p_type text, p_date date, p_heure time)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_org uuid := jwt_org(); v_id uuid; v_acteur uuid; v_centre uuid;
begin
  if not acteur_a_capacite('gerer_planning') then
    raise exception 'Refusé : capacité gerer_planning requise' using errcode = '42501';
  end if;
  if not exists (select 1 from affaires where id = p_affaire and org_id = v_org) then
    raise exception 'Affaire introuvable dans cette organisation';
  end if;
  select centre_id into v_centre from affaires where id = p_affaire and org_id = v_org;
  insert into missions (org_id, affaire_id, type, date, heure, centre_id)
    values (v_org, p_affaire, coalesce(p_type,'demenagement'), p_date, p_heure, v_centre)
    returning id into v_id;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Mission.Creee', 'mission', v_id, v_acteur,
    jsonb_build_object('affaire', p_affaire, 'type', p_type, 'date', p_date));
  return v_id;
end; $$;
