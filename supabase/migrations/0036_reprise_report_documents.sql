-- =============================================================================
-- Migration 0036 — Reprise après report + stockage documentaire (C.B.D.)
-- DÉJÀ APPLIQUÉE EN BASE via MCP (volets 0036 et 0036b). Traçabilité.
--
-- TROU COMBLÉ : reporter annulait les missions (0035) mais rien ne les
-- réactivait quand le client redonnait une date → dossier bloqué en « reporté »,
-- invisible au planning.
--
-- BUG ATTRAPÉ AU TEST : « after update OF colonne » se déclenche dès que la
-- colonne figure dans le SET, MÊME sans changement de valeur. Le trigger de
-- reprise se déclenchait donc sur le report lui-même : un dossier ne pouvait
-- jamais RESTER reporté. D'où la séparation ci-dessous entre une fonction
-- appelable et un trigger strictement conditionné à old.etat = 'reporte'.
-- =============================================================================

create or replace function reprendre_affaire_reportee(p_affaire uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare a record; v_mission uuid;
begin
  select * into a from affaires where id = p_affaire;
  if a is null or a.etat <> 'reporte' or a.date_souhaitee is null then return false; end if;

  select id into v_mission from missions
   where affaire_id = a.id and org_id = a.org_id and type = 'demenagement' limit 1;
  if v_mission is null then
    insert into missions (org_id, affaire_id, type, date, heure, etat)
    values (a.org_id, a.id, 'demenagement', a.date_souhaitee,
            coalesce(a.heure_souhaitee, '08:00'::time), 'planifiee')
    returning id into v_mission;
  else
    update missions set etat = 'planifiee', date = a.date_souhaitee,
           heure = coalesce(a.heure_souhaitee, '08:00'::time)
     where id = v_mission;
  end if;

  insert into mission_affectations (mission_id, utilisateur_id, org_id, role_mission)
    select v_mission, x::uuid, a.org_id, 'demenageur'
      from jsonb_array_elements_text(coalesce(a.equipe, '[]'::jsonb)) as x
    on conflict do nothing;
  insert into mission_vehicules (mission_id, vehicule_id, org_id)
    select v_mission, x::uuid, a.org_id
      from jsonb_array_elements_text(coalesce(a.camions, '[]'::jsonb)) as x
    on conflict do nothing;

  if a.date_emballage is not null then
    if exists (select 1 from missions
                where affaire_id = a.id and org_id = a.org_id and type = 'emballage') then
      update missions set etat = 'planifiee', date = a.date_emballage,
             heure = coalesce(a.heure_emballage, '08:00'::time)
       where affaire_id = a.id and org_id = a.org_id and type = 'emballage';
    else
      insert into missions (org_id, affaire_id, type, date, heure, etat)
      values (a.org_id, a.id, 'emballage', a.date_emballage,
              coalesce(a.heure_emballage, '08:00'::time), 'planifiee');
    end if;
  end if;

  if jsonb_array_length(coalesce(a.equipe, '[]'::jsonb)) > 0
     and jsonb_array_length(coalesce(a.camions, '[]'::jsonb)) > 0 then
    return transition_interne(a.id, 'planifie');
  end if;
  return false;
end; $$;

create or replace function reprendre_apres_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  perform reprendre_affaire_reportee(new.id);
  return new;
end; $$;

drop trigger if exists trg_reprise_report on affaires;
create trigger trg_reprise_report
  after update of date_souhaitee, date_emballage, equipe, camions on affaires
  for each row when (old.etat = 'reporte' and new.etat = 'reporte')
  execute function reprendre_apres_report();

-- Reporter AVEC une date = replanification immédiate ; SANS date = le dossier
-- reste « reporté » en attente du client.
create or replace function cmd_reporter_affaire(
  p_affaire uuid, p_nouvelle_date date default null, p_motif text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid := jwt_org(); v_acteur uuid; v_source etat_affaire;
begin
  if not acteur_a_capacite('creer_affaire') then
    raise exception 'Refusé : capacité creer_affaire requise' using errcode = '42501';
  end if;
  select etat into v_source from affaires where id = p_affaire and org_id = v_org;
  if v_source is null then raise exception 'Affaire introuvable'; end if;
  if not transition_permise(v_source, 'reporte') then
    raise exception 'Report impossible depuis l''état %', v_source using errcode = '23514';
  end if;
  perform set_config('app.transition_ok', 'true', true);
  update affaires set etat = 'reporte',
    date_souhaitee = coalesce(p_nouvelle_date, date_souhaitee) where id = p_affaire;
  perform set_config('app.transition_ok', 'false', true);
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Affaire.Reportee', 'affaire', p_affaire, v_acteur,
    jsonb_build_object('de', v_source, 'nouvelle_date', p_nouvelle_date,
                       'motif', coalesce(p_motif, '')));
  if p_nouvelle_date is not null then perform reprendre_affaire_reportee(p_affaire); end if;
end; $$;

-- Conditions générales C.B.D. : bucket public en lecture, écriture au bureau.
insert into storage.buckets (id, name, public) values ('documents','documents',true)
on conflict (id) do nothing;
drop policy if exists documents_lecture on storage.objects;
create policy documents_lecture on storage.objects
  for select using (bucket_id = 'documents');
drop policy if exists documents_ecriture on storage.objects;
create policy documents_ecriture on storage.objects for all to authenticated
  using (bucket_id = 'documents' and acteur_a_capacite('gerer_referentiels'))
  with check (bucket_id = 'documents' and acteur_a_capacite('gerer_referentiels'));
