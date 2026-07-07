-- =============================================================================
-- Migration 0013 — Pilotage
-- Source : Réf. 2 (indicateur CA signé ; Ressources · Heures) et Réf. 3 (T2 :
-- Pilotage lit, ne possède pas ; T8 : vues matérialisables).
-- Ce module introduit la table SCENARIOS (persistance des chiffrages) et AGRÈGE
-- ce que les autres produisent via des vues. C'est le principe « une donnée
-- existe une seule fois » (noyau) : le pilotage ne duplique rien, il lit. Les
-- vues sont miroir des fonctions de domaine (finances.js, charge.js).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SCENARIOS — persistance des scénarios calculés par le moteur de chiffrage
-- (module Chiffrage, moteur.js). Chaque affaire peut avoir plusieurs scénarios
-- (alternatives de tarification) ; un seul est marqué « retenu ». Les résultats
-- sont en JSONB pour accepter la forme calculée par le moteur (montants en
-- centimes, zones de marge, etc.). Les entrées sont mémorisées pour pouvoir
-- rejouer le calcul avec un barème ultérieur (rebase de tarification).
-- -----------------------------------------------------------------------------
create table scenarios (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  affaire_id        uuid not null references affaires(id) on delete cascade,
  nom               text,                                    -- nom du scénario (« Base », « Avec emballage », etc.)
  retenu            boolean not null default false,          -- un seul retenu par affaire
  entrees           jsonb,                                   -- faits d'entrée : {heures, effectif, km, etc.}
  resultats         jsonb not null,                          -- résultats : {tvac_centimes, marge, zone, ...}
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_scenarios_org     on scenarios(org_id);
create index idx_scenarios_affaire on scenarios(affaire_id);
create index idx_scenarios_retenu  on scenarios(affaire_id, retenu);
comment on table scenarios is
  'Scénarios de chiffrage (persistance Chiffrage). Un retenu par affaire. Agrégés par Pilotage.';

-- Trigger pour touch_updated_at
create trigger touch_scenarios before update on scenarios
  for each row execute function touch_updated_at();

-- RLS — isolation de tenant (T3, famille 1).
alter table scenarios enable row level security;
create policy scenarios_tenant on scenarios
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());

-- -----------------------------------------------------------------------------
-- v_ca_signe — carnet signé par organisation : somme des montants TVAC des
-- affaires engagées (états confirme→paye), hors devis et annulés. Miroir de
-- caSigne(). Le montant TVAC d'une affaire provient de son scénario retenu.
-- -----------------------------------------------------------------------------
create view v_ca_signe as
select a.org_id,
       count(*) filter (where a.etat in
         ('confirme','planifie','en_cours','effectue','facture','paye')) as nb_affaires,
       coalesce(sum(
         case when a.etat in
           ('confirme','planifie','en_cours','effectue','facture','paye')
         then ((s.resultats->>'tvac_centimes')::bigint) else 0 end
       ), 0) as ca_signe_centimes
  from affaires a
  left join scenarios s on s.affaire_id = a.id and s.retenu = true
 group by a.org_id;
comment on view v_ca_signe is
  'Carnet signé par organisation (miroir de caSigne). Lit les scénarios retenus.';

-- -----------------------------------------------------------------------------
-- v_charge_membre — heures cumulées par membre : somme des heures facturées des
-- missions où il est affecté (C-13 : source unique). Sert à l'équilibre de
-- charge (miroir de equilibreCharge, côté domaine pour la qualification ±20 %).
-- Les heures facturées d'une mission proviennent du scénario de son affaire.
-- -----------------------------------------------------------------------------
create view v_charge_membre as
select ma.org_id,
       ma.utilisateur_id,
       u.nom,
       count(distinct ma.mission_id) as nb_missions,
       coalesce(sum(
         case when m.etat <> 'annulee'
           then ((s.entrees->>'heures')::numeric) else 0 end
       ), 0) as heures
  from mission_affectations ma
  join utilisateurs u on u.id = ma.utilisateur_id
  join missions m on m.id = ma.mission_id
  left join scenarios s on s.affaire_id = m.affaire_id and s.retenu = true
 group by ma.org_id, ma.utilisateur_id, u.nom;
comment on view v_charge_membre is
  'Heures par membre depuis les missions affectées (C-13). Qualification ±20 % en domaine.';

-- Note (T8 · performance) : ces vues sont candidates à la matérialisation si le
-- volume l'exige, avec rafraîchissement sur les événements Affaire.* et
-- Mission.* — l'invariant I-8 (communication par événements) le permet sans
-- toucher aux modules. Non matérialisées en v2 (volume d'un pilote).

-- RLS : les vues héritent des politiques des tables sous-jacentes (affaires,
-- missions, mission_affectations sont déjà en RLS de tenant). Aucune donnée
-- d'un autre tenant ne peut donc remonter par ces agrégats.
