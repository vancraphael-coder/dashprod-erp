-- =============================================================================
-- 0061_ma_paie_terrain.sql   ✅ appliquée le 2026-07-28
--
-- Le déménageur lit SA propre paie.
--
-- Jusqu'ici, tout ce qui touchait à la paie était derrière la capacité
-- `voir_paie` — une capacité de bureau, qui donne accès aux salaires de TOUTE
-- l'équipe. Un déménageur ne pouvait donc pas vérifier ses propres heures, ce
-- qui est le premier motif de litige sur un chantier.
--
-- On n'ouvre PAS `voir_paie` au terrain : ce serait exposer les salaires des
-- collègues. On ajoute une fonction qui ne sait répondre que sur l'appelant —
-- son périmètre est `auth.uid()`, non falsifiable, et elle ne prend aucun
-- paramètre d'identité. Il n'existe aucun moyen de lui faire dire autre chose
-- que « vos heures à vous ».
--
-- Honnêteté du calcul, comme partout ailleurs dans la paie :
--   - le BRUT est calculé (heures réelles x taux) ;
--   - le NET n'est JAMAIS inventé : sans précompte connu, on répond
--     « à déterminer » plutôt qu'un chiffre qui deviendrait une promesse ;
--   - un taux absent n'est pas zéro : sans taux, pas de brut affiché du tout.
-- =============================================================================

create or replace function public.cmd_ma_paie(p_periode text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_org uuid := jwt_org();
  v_moi uuid;
  v_periode text := coalesce(nullif(btrim(p_periode), ''), to_char(now(), 'YYYY-MM'));
  v_debut date;
  v_fin date;
  v_secondes numeric := 0;
  v_heures numeric;
  v_taux numeric;
  v_majoration numeric;
  v_precompte numeric;
  v_brut_centimes bigint;
  v_missions jsonb;
begin
  select id into v_moi from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;
  if v_moi is null then
    raise exception 'Profil introuvable' using errcode = '42501';
  end if;

  v_debut := to_date(v_periode || '-01', 'YYYY-MM-DD');
  v_fin   := (v_debut + interval '1 month')::date;

  -- Heures de l'appelant : les sessions de travail des missions où il est
  -- affecté, diminuées des pauses de ces mêmes missions.
  with mes_missions as (
    select m.id, m.date
      from missions m
      join mission_affectations ma
        on ma.mission_id = m.id and ma.utilisateur_id = v_moi
     where m.org_id = v_org
       and m.date >= v_debut and m.date < v_fin
       and m.etat <> 'annulee'
  ),
  travail as (
    select mm.id as mission_id, mm.date,
           sum(extract(epoch from (cs.fin - cs.debut))) as sec
      from mes_missions mm
      join chrono_sessions cs on cs.mission_id = mm.id
     where coalesce(cs.type, 'travail') = 'travail'
       and cs.debut is not null and cs.fin is not null
     group by mm.id, mm.date
  ),
  pauses as (
    select mm.id as mission_id,
           coalesce(sum(extract(epoch from (cs.fin - cs.debut))), 0) as sec
      from mes_missions mm
      left join chrono_sessions cs
        on cs.mission_id = mm.id and cs.type = 'pause'
       and cs.debut is not null and cs.fin is not null
     group by mm.id
  )
  select coalesce(sum(greatest(0, t.sec - coalesce(p.sec, 0))), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'date', t.date,
           'secondes', greatest(0, t.sec - coalesce(p.sec, 0))
         ) order by t.date), '[]'::jsonb)
    into v_secondes, v_missions
    from travail t left join pauses p on p.mission_id = t.mission_id;

  v_heures := round((v_secondes / 3600.0)::numeric, 2);

  select taux_horaire, coalesce(majoration_sup, 1.00), precompte_pct
    into v_taux, v_majoration, v_precompte
    from donnees_paie where utilisateur_id = v_moi and org_id = v_org;

  -- Un taux absent n'est PAS zéro : sans taux, pas de brut affiché.
  if v_taux is not null and v_taux > 0 then
    v_brut_centimes := round(v_heures * v_taux * 100);
  else
    v_brut_centimes := null;
  end if;

  return jsonb_build_object(
    'periode', v_periode,
    'heures', v_heures,
    'jours_travailles', jsonb_array_length(v_missions),
    'detail', v_missions,
    'taux_horaire', v_taux,
    'brut_centimes', v_brut_centimes,
    'net_calculable', (v_precompte is not null),
    'message_net', case when v_precompte is null
      then 'Net à déterminer par le secrétariat social.'
      else null end,
    'avertissement', case when v_taux is null or v_taux = 0
      then 'Votre taux horaire n''est pas encore renseigné : demandez-le au bureau.'
      else null end);
end $$;

revoke all on function public.cmd_ma_paie(text) from public, anon;
grant execute on function public.cmd_ma_paie(text) to authenticated;
