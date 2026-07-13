-- =============================================================================
-- Migration 0022 — Camions sélectionnés sur le dossier (P0 n°4)
-- Source : alignement pages 02 §4, 03 §2, 10 §4.
--
-- Architecture : la sélection de camions se fait au stade COMMERCIAL (le
-- relevé a besoin de la capacité avant toute mission), donc elle vit sur
-- l'AFFAIRE (jsonb d'identifiants — simple, réversible). À la CONFIRMATION,
-- elle est reportée dans mission_vehicules (0009), la vraie table d'exécution
-- — même logique que date souhaitée → date de mission (C-04).
-- =============================================================================

alter table affaires add column if not exists camions jsonb not null default '[]'::jsonb;
comment on column affaires.camions is
  'Identifiants des véhicules pressentis (stade commercial). Reportés dans mission_vehicules à la confirmation.';

-- Étend le trigger 0021 : reporter les camions du dossier sur la mission créée.
create or replace function creer_missions_a_la_confirmation() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_mission uuid;
  v_camion text;
begin
  if new.etat = 'confirme' and (old.etat is distinct from 'confirme') then

    -- Mission de déménagement (idempotent).
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

    -- Report des camions pressentis vers l'exécution.
    if v_mission is not null then
      for v_camion in select jsonb_array_elements_text(coalesce(new.camions, '[]'::jsonb))
      loop
        insert into mission_vehicules (mission_id, vehicule_id, org_id)
        values (v_mission, v_camion::uuid, new.org_id)
        on conflict do nothing;
      end loop;
    end if;

    -- Mission d'emballage si une date est prévue (idempotent).
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
