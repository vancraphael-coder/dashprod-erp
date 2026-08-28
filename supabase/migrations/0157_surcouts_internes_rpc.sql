-- 0157 — APPLIQUÉE ET VÉRIFIÉE le 28/08/2026.
-- RPC surcoûts internes : déclarer (terrain, fige), corriger (bureau), lire.

create or replace function cmd_surcout_declarer(
  p_mission uuid, p_motif text, p_heures numeric, p_note text default '',
  p_fige boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_org uuid := jwt_org(); v_acteur uuid; v_id uuid;
begin
  if not (acteur_a_capacite('pointer_chantier') or acteur_a_capacite('gerer_planning')) then
    raise exception 'Non autorisé à déclarer un surcoût' using errcode = '42501';
  end if;
  if p_motif not in ('panne_retour','retard_equipe','nettoyage','materiel_oublie','autre_interne') then
    raise exception 'Motif inconnu' using errcode = '22023';
  end if;
  if coalesce(p_heures,0) <= 0 then
    return jsonb_build_object('ok', false, 'message', 'Indiquez un temps en heures.');
  end if;
  if p_motif = 'autre_interne' and coalesce(btrim(p_note),'') = '' then
    return jsonb_build_object('ok', false, 'message', 'Précisez le motif « autre ».');
  end if;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  insert into surcouts_internes (org_id, mission_id, motif, heures, note, fige, declare_par)
  values (v_org, p_mission, p_motif, p_heures, coalesce(btrim(p_note),''), coalesce(p_fige,false), v_acteur)
  returning id into v_id;
  perform emettre_evenement(v_org, 'SurcoutInterne.Declare', 'mission', p_mission,
    v_acteur, jsonb_build_object('motif', p_motif, 'heures', p_heures, 'fige', p_fige));
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;
grant execute on function cmd_surcout_declarer(uuid,text,numeric,text,boolean) to authenticated;

create or replace function cmd_surcout_corriger(
  p_id uuid, p_heures numeric default null, p_note text default null,
  p_motif text default null, p_supprimer boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_org uuid := jwt_org(); v_acteur uuid;
begin
  if not acteur_a_capacite('gerer_planning') then
    raise exception 'Seul le bureau corrige un surcoût' using errcode = '42501';
  end if;
  if not exists (select 1 from surcouts_internes where id = p_id and org_id = v_org) then
    raise exception 'Surcoût introuvable' using errcode = '42501';
  end if;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  if coalesce(p_supprimer,false) then
    delete from surcouts_internes where id = p_id and org_id = v_org;
    return jsonb_build_object('ok', true, 'supprime', true);
  end if;
  update surcouts_internes set
     heures = coalesce(p_heures, heures), note = coalesce(p_note, note),
     motif = coalesce(p_motif, motif), corrige_par = v_acteur, corrige_le = now()
   where id = p_id and org_id = v_org;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function cmd_surcout_corriger(uuid,numeric,text,text,boolean) to authenticated;

create or replace function cmd_surcouts_affaire(p_affaire uuid)
returns jsonb language sql security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', si.id, 'mission_id', si.mission_id, 'motif', si.motif,
      'heures', si.heures, 'note', si.note, 'fige', si.fige,
      'declare_par', ud.nom, 'declare_le', si.declare_le,
      'corrige_par', uc.nom, 'corrige_le', si.corrige_le)
    order by si.declare_le), '[]'::jsonb)
  from surcouts_internes si
  join missions m on m.id = si.mission_id
  left join utilisateurs ud on ud.id = si.declare_par
  left join utilisateurs uc on uc.id = si.corrige_par
  where m.affaire_id = p_affaire and si.org_id = jwt_org();
$$;
grant execute on function cmd_surcouts_affaire(uuid) to authenticated;
