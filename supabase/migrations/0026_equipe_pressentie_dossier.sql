-- =============================================================================
-- Migration 0026 — Équipe pressentie sur le dossier (comme les camions)
-- Source : demande fondateur — « les hommes sélectionnables dans le dossier au
-- même titre que les camions ». Alignement page 02 §5.
--
-- Symétrie avec les camions (0022) : l'équipe se compose au stade COMMERCIAL
-- (dans le dossier, avant toute mission), stockée en jsonb d'identifiants sur
-- l'affaire, puis reportée dans affectations à la confirmation par le même
-- trigger. Cohérent avec la séparation vente/exécution (C-04).
-- =============================================================================

alter table affaires add column if not exists equipe jsonb not null default '[]'::jsonb;
comment on column affaires.equipe is
  'Identifiants des membres pressentis (stade commercial). Reportés dans affectations à la confirmation.';

-- Étend le trigger de confirmation : reporter l'équipe pressentie sur la
-- mission de déménagement créée (comme les camions).
create or replace function creer_missions_a_la_confirmation() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_mission uuid;
  v_camion text;
  v_membre text;
begin
  if new.etat = 'confirme' and (old.etat is distinct from 'confirme') then

    select id into v_mission from missions
     where affaire_id = new.id and type = 'demenagement';
    if v_mission is null then
      insert into missions (org_id, affaire_id, type, date, heure, etat)
      values (new.org_id, new.id, 'demenagement',
              new.date_souhaitee, coalesce(new.heure_souhaitee, '08:00'::time), 'planifiee')
      returning id into v_mission;
      perform emettre_evenement(new.org_id, 'Mission.CreeeALaConfirmation',
        'affaire', new.id, null,
        jsonb_build_object('type', 'demenagement', 'date', new.date_souhaitee));
    end if;

    -- Report des camions pressentis.
    if v_mission is not null then
      for v_camion in select jsonb_array_elements_text(coalesce(new.camions, '[]'::jsonb))
      loop
        insert into mission_vehicules (mission_id, vehicule_id, org_id)
        values (v_mission, v_camion::uuid, new.org_id)
        on conflict do nothing;
      end loop;

      -- Report de l'équipe pressentie (mission_affectations).
      for v_membre in select jsonb_array_elements_text(coalesce(new.equipe, '[]'::jsonb))
      loop
        insert into mission_affectations (mission_id, utilisateur_id, org_id, role_mission)
        values (v_mission, v_membre::uuid, new.org_id, 'demenageur')
        on conflict do nothing;
      end loop;
    end if;

    -- Mission d'emballage si une date est prévue.
    if new.date_emballage is not null and not exists (
      select 1 from missions where affaire_id = new.id and type = 'emballage'
    ) then
      insert into missions (org_id, affaire_id, type, date, heure, etat)
      values (new.org_id, new.id, 'emballage',
              new.date_emballage, coalesce(new.heure_emballage, '08:00'::time), 'planifiee');
      perform emettre_evenement(new.org_id, 'Mission.CreeeALaConfirmation',
        'affaire', new.id, null,
        jsonb_build_object('type', 'emballage', 'date', new.date_emballage));
    end if;
  end if;

  return new;
end; $$;
