-- 0151 — APPLIQUÉE ET VÉRIFIÉE le 27/08/2026.
-- RPC d'écriture et de lecture des rapports texte de centre.

create or replace function cmd_centre_rapport_ecrire(
  p_centre uuid, p_cadence text, p_debut date, p_fin date, p_texte text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_org uuid := jwt_org(); v_acteur uuid; v_id uuid;
begin
  if not (acteur_a_capacite('gerer_depot') or acteur_a_capacite('gerer_referentiels')) then
    raise exception 'Vous n''êtes pas autorisé à rédiger un rapport de centre'
      using errcode = '42501';
  end if;
  if p_cadence not in ('jour','semaine','mois') then
    raise exception 'Cadence invalide' using errcode = '22023';
  end if;
  if coalesce(btrim(p_texte),'') = '' then
    return jsonb_build_object('ok', false, 'message', 'Le rapport est vide.');
  end if;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  insert into centre_rapports (org_id, centre_id, cadence, debut, fin, texte, redige_par)
  values (v_org, p_centre, p_cadence, p_debut, p_fin, btrim(p_texte), v_acteur)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

grant execute on function cmd_centre_rapport_ecrire(uuid,text,date,date,text) to authenticated;

create or replace function cmd_centre_rapports(p_centre uuid)
returns jsonb language sql security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'cadence', r.cadence, 'debut', r.debut, 'fin', r.fin,
      'texte', r.texte, 'redige_le', r.redige_le, 'redige_par', u.nom)
    order by r.redige_le desc), '[]'::jsonb)
  from centre_rapports r
  left join utilisateurs u on u.id = r.redige_par
  where r.org_id = jwt_org() and r.centre_id is not distinct from p_centre;
$$;

grant execute on function cmd_centre_rapports(uuid) to authenticated;
