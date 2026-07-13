-- =============================================================================
-- Migration 0021 — Mission créée automatiquement à la confirmation (P0 n°2)
-- Source : docs/alignement/claude-alignement-09 §4.
--
-- PROBLÈME STRUCTUREL RÉSOLU : Dashprod sépare la VENTE (affaire, date
-- souhaitée) de l'EXÉCUTION (mission, date réelle) — c'est plus juste que le
-- modèle, où le dossier EST l'agenda (C-04). Mais le pont manquait : rien ne
-- créait jamais la mission. Le Planning restait donc vide À VIE, quel que soit
-- le nombre de dossiers signés.
--
-- Ici : à la transition vers « confirmé » (qui exige une signature, C-02), la
-- mission de déménagement est créée à la date souhaitée. Si une date
-- d'emballage existe, une seconde mission de type « emballage » est créée.
-- Idempotent : re-confirmer ne duplique pas.
--
-- Pourquoi un TRIGGER et non du code dans cmd_transition_affaire : la règle
-- vaut pour TOUT chemin menant à « confirmé », présent ou futur. Un trigger ne
-- peut pas être contourné par une nouvelle commande qu'on oublierait de câbler.
-- =============================================================================

-- Date d'emballage (journée séparée, souvent facturée à part — alignement 02 §4)
alter table affaires add column if not exists date_emballage  date;
alter table affaires add column if not exists heure_emballage time;
comment on column affaires.date_emballage is
  'Journée d''emballage, distincte du déménagement. Génère sa propre mission.';

create or replace function creer_missions_a_la_confirmation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Ne se déclenche qu'au PASSAGE à « confirme » (pas à chaque update).
  if new.etat = 'confirme' and (old.etat is distinct from 'confirme') then

    -- Mission de déménagement. La date souhaitée devient la date d'exécution ;
    -- elle reste modifiable ensuite au Planning sans toucher à l'affaire.
    if not exists (
      select 1 from missions
       where affaire_id = new.id and type = 'demenagement'
    ) then
      insert into missions (org_id, affaire_id, type, date, heure, etat)
      values (new.org_id, new.id, 'demenagement',
              new.date_souhaitee, coalesce(new.heure_souhaitee, '08:00'::time),
              'planifiee');

      perform emettre_evenement(new.org_id, 'Mission.CreeeALaConfirmation',
        'affaire', new.id, null,
        jsonb_build_object('type', 'demenagement', 'date', new.date_souhaitee));
    end if;

    -- Mission d'emballage, seulement si une date d'emballage est prévue.
    if new.date_emballage is not null and not exists (
      select 1 from missions where affaire_id = new.id and type = 'emballage'
    ) then
      insert into missions (org_id, affaire_id, type, date, heure, etat)
      values (new.org_id, new.id, 'emballage',
              new.date_emballage, coalesce(new.heure_emballage, '08:00'::time),
              'planifiee');

      perform emettre_evenement(new.org_id, 'Mission.CreeeALaConfirmation',
        'affaire', new.id, null,
        jsonb_build_object('type', 'emballage', 'date', new.date_emballage));
    end if;
  end if;

  return new;
end; $$;

comment on function creer_missions_a_la_confirmation is
  'Pont vente→exécution (C-04) : la signature crée la ou les missions. Idempotent.';

drop trigger if exists trg_missions_confirmation on affaires;
create trigger trg_missions_confirmation
  after update of etat on affaires
  for each row
  execute function creer_missions_a_la_confirmation();

-- -----------------------------------------------------------------------------
-- Rattrapage : les affaires DÉJÀ confirmées avant cette migration n'ont pas de
-- mission (elles n'auraient jamais pu en avoir). On les crée, sinon le Planning
-- reste vide pour l'historique existant.
-- -----------------------------------------------------------------------------
insert into missions (org_id, affaire_id, type, date, heure, etat)
select a.org_id, a.id, 'demenagement', a.date_souhaitee,
       coalesce(a.heure_souhaitee, '08:00'::time), 'planifiee'
  from affaires a
<<<<<<< HEAD
 where a.etat in ('confirme', 'effectue', 'facture', 'paye')
   and not exists (select 1 from missions m
                    where m.affaire_id = a.id and m.type = 'demenagement');
=======
 where a.etat in ('confirme', 'planifie', 'en_cours', 'effectue', 'facture', 'paye', 'clos')
   and not exists (select 1 from missions m
                    where m.affaire_id = a.id and m.type = 'demenagement');
>>>>>>> 1302b51 (sql 20 et 21 orga)
