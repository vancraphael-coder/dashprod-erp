-- =============================================================================
-- 0070_fix_journal_diff_champs.sql   ✅ appliquée le 2026-07-29 — correctif de 0069
--
-- BUG : le trigger de journalisation ne journalisait RIEN sur les UPDATE.
--
-- La détection des champs modifiés s'écrivait :
--     select key from jsonb_each(to_jsonb(new))
--     except
--     select key from jsonb_each(to_jsonb(old))
--
-- En ne sélectionnant que `key`, l'EXCEPT comparait les NOMS de colonnes —
-- identiques des deux côtés par construction. L'ensemble était donc toujours
-- vide, le trigger sortait par son retour anticipé, et aucune trace n'était
-- écrite. Symptôme trompeur : le trigger était bien installé et ne levait
-- aucune erreur — seul un test réel le révèle.
--
-- Correctif : comparer la PAIRE (clé, valeur), puis n'extraire que la clé.
-- `is distinct from` pour que vider un champ (valeur → NULL) compte comme une
-- modification, et `updated_at` exclu pour ne pas noyer le journal.
-- =============================================================================

create or replace function public.journaliser_mouvement()
returns trigger language plpgsql security definer
set search_path to 'public' as $$
declare
  v_org uuid; v_acteur uuid; v_id uuid; v_type text;
  v_details jsonb := '{}'::jsonb; v_champs text[];
begin
  v_org := coalesce(
    case when tg_op = 'DELETE' then old.org_id else new.org_id end, jwt_org());
  v_id := case when tg_op = 'DELETE' then old.id else new.id end;
  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  v_type := case tg_table_name
    when 'affaires'  then 'Dossier'   when 'clients'   then 'Client'
    when 'scenarios' then 'Devis'     when 'paiements' then 'Paiement'
    when 'vehicules' then 'Véhicule'  when 'conges'    then 'Congé'
    else initcap(tg_table_name) end
    || '.' || case tg_op when 'INSERT' then 'Cree'
                         when 'UPDATE' then 'Modifie' else 'Supprime' end;

  if tg_op = 'UPDATE' then
    -- Comparaison sur la PAIRE clé/valeur, et `is distinct from` pour que
    -- vider un champ (valeur → NULL) compte comme une modification.
    -- `updated_at` change à chaque écriture : le citer noierait le journal.
    select array_agg(n.key order by n.key) into v_champs
      from jsonb_each(to_jsonb(new)) n
      full join jsonb_each(to_jsonb(old)) o on o.key = n.key
     where n.value is distinct from o.value
       and coalesce(n.key, o.key) <> 'updated_at';

    if v_champs is null or array_length(v_champs, 1) is null then
      return null;   -- rien de significatif n'a changé
    end if;
    v_details := jsonb_build_object('champs', to_jsonb(v_champs));
  end if;

  insert into evenements (org_id, type, entite_type, entite_id, acteur_id, payload)
  values (v_org, v_type, tg_table_name, v_id, v_acteur, v_details);
  return null;
end $$;

-- Vérification :
--   update affaires set heure_souhaitee = '08:00' where id = '<uuid>';
--   select type, payload->>'champs' from evenements
--    where entite_type='affaires' order by id desc limit 1;
--   -- attendu : Dossier.Modifie / ["heure_souhaitee"]
