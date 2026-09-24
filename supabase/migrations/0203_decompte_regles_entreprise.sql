-- =============================================================================
-- 0203 — Les règles du décompte deviennent des PARAMÈTRES DE L'ENTREPRISE.
--
-- Pas d'arrondi (quart d'heure / demi-heure / heure entamée / minute), minimum
-- facturé, temps de retour au dépôt habituel. Réglés dans Barème → « Décompte
-- de fin de chantier », stockés dans organisations.parametres_prix.decompte :
-- aucun schéma ne change.
--
-- Seule modification : le contexte transmis au chef d'équipe inclut désormais
-- ces règles, pour que le terrain arrondisse EXACTEMENT comme l'entreprise l'a
-- décidé. Le reste de cmd_decompte_contexte (0202) est inchangé.
-- =============================================================================

create or replace function public.cmd_decompte_contexte(p_mission uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_aff uuid; v_res jsonb;
begin
  if not decompte_acces_chef(p_mission) then
    raise exception 'Réservé au chef d''équipe du chantier ou au bureau' using errcode = '42501';
  end if;
  select affaire_id into v_aff from missions where id = p_mission and org_id = v_org;

  select jsonb_build_object(
    'mission', (select jsonb_build_object('id', m.id, 'date', m.date, 'type', m.type,
                  'etat', m.etat, 'affaire_id', m.affaire_id)
                  from missions m where m.id = p_mission),
    'client', (select c.nom from affaires a left join clients c on c.id = a.client_id
                where a.id = v_aff),
    'depart', (select min(cs.debut) from chrono_sessions cs
                where cs.mission_id = p_mission and cs.org_id = v_org
                  and coalesce(cs.type, 'travail') = 'travail'),
    'pauses', coalesce((select jsonb_agg(jsonb_build_object('debut', cs.debut, 'fin', cs.fin))
                from (select distinct on (cs2.debut, cs2.fin) cs2.debut, cs2.fin
                        from chrono_sessions cs2
                       where cs2.mission_id = p_mission and cs2.org_id = v_org
                         and cs2.type = 'pause' and cs2.fin is not null) cs), '[]'::jsonb),
    'entrees', (select s.entrees from scenarios s
                 where s.affaire_id = v_aff and s.retenu limit 1),
    'parametres_prix', (select jsonb_build_object(
                  'bareme_horaire', o.parametres_prix -> 'bareme_horaire',
                  'tarifs', o.parametres_prix -> 'tarifs',
                  'decompte', o.parametres_prix -> 'decompte')
                  from organisations o where o.id = v_org),
    'decompte', (select to_jsonb(d) from decomptes_chantier d
                  where d.mission_id = p_mission and d.org_id = v_org)
  ) into v_res;
  return v_res;
end $$;
