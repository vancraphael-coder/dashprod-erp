-- =============================================================================
-- Migration 0016 — Conformité RGPD & Gouvernance
-- Source : RGPD (registre des traitements art. 30, sous-traitants art. 28,
-- droits des personnes art. 15-20, violations art. 33-34) et demande explicite
-- du fondateur. Scope volontairement resserré : ce qui est réellement porteur
-- pour un ERP traitant données RH/clients aujourd'hui, pas une liste exhaustive
-- spéculative. Pas d'écran dédié pour les registres (consultés en SQL/export
-- DPO) — seule la mécanique porteuse (échéances, anonymisation) a une commande.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- REGISTRE_TRAITEMENTS — art. 30 RGPD. Contenu réel du projet, pas fictif.
-- -----------------------------------------------------------------------------
create table registre_traitements (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organisations(id),        -- null = registre plateforme
  finalite          text not null,
  categories_donnees text not null,
  base_legale       text not null,
  duree_conservation text not null,
  destinataires     text,
  mesures_securite  text,
  updated_at        timestamptz not null default now()
);
comment on table registre_traitements is 'Registre des traitements (RGPD art. 30).';

insert into registre_traitements
  (org_id, finalite, categories_donnees, base_legale, duree_conservation, destinataires, mesures_securite)
values
  (null, 'Gestion des comptes utilisateurs et connexion',
   'Identité (nom, email), identifiant Google OAuth',
   'Exécution du contrat (accès au service souscrit)',
   'Durée du compte + 3 ans après désactivation (preuve)',
   'Supabase (hébergeur, sous-traitant)',
   'RLS par organisation, mot de passe géré par le fournisseur d''identité, HTTPS'),
  (null, 'Gestion commerciale (clients, devis, offres)',
   'Identité et coordonnées des clients (nom, téléphone, email, adresse)',
   'Exécution du contrat / intérêt légitime précontractuel',
   '3 ans après le dernier contact sans affaire conclue ; durée légale comptable si facturé',
   'Aucun tiers hors sous-traitants techniques',
   'RLS par organisation, instances de documents immuables et horodatées'),
  (null, 'Gestion du personnel (RH, paie, congés)',
   'Identité, taux horaire, type de contrat, congés, documents administratifs',
   'Exécution du contrat de travail / obligation légale',
   '5 ans après la fin du contrat (droit social belge)',
   'Secrétariat social éventuel (sous-traitant, à documenter au cas par cas)',
   'RLS renforcée : capacité voir_paie requise, table dédiée isolée'),
  (null, 'Facturation et comptabilité',
   'Identité client, montants, numéro de TVA',
   'Obligation légale (droit comptable belge)',
   '7 ans (obligation légale minimale)',
   'Comptable/expert-comptable (sous-traitant, à documenter au cas par cas)',
   'Factures immuables après émission, séquence légale continue'),
  (null, 'Journal d''audit (sécurité, traçabilité)',
   'Identifiant acteur, action, horodatage',
   'Intérêt légitime (sécurité du service) / obligation légale',
   'Durée de l''organisation (append-only, non supprimable)',
   'Aucun',
   'Append-only, immuable par trigger, isolation de tenant')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- SOUS_TRAITANTS — art. 28 RGPD. Entrées réelles de la stack (T1).
-- -----------------------------------------------------------------------------
create table sous_traitants (
  id                uuid primary key default gen_random_uuid(),
  nom               text not null,
  role              text not null,
  pays_traitement   text not null,
  garanties         text not null,
  contrat_reference text
);
comment on table sous_traitants is 'Registre des sous-traitants (RGPD art. 28).';

insert into sous_traitants (nom, role, pays_traitement, garanties) values
  ('Supabase Inc.', 'Hébergement base de données, authentification, stockage',
   'Union européenne (région configurable) / États-Unis selon configuration',
   'Clauses contractuelles types (SCC) ; DPA disponible sur supabase.com/legal'),
  ('Vercel Inc.', 'Hébergement de l''application front-end',
   'Réseau de périphérie mondial (CDN) / États-Unis',
   'Clauses contractuelles types (SCC) ; DPA disponible sur vercel.com/legal')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- CONSENTEMENTS — table générique, minimale. Aucun consentement marketing
-- n'est collecté aujourd'hui (Dashprod n'envoie pas de communications
-- commerciales) : la table existe pour accueillir ce besoin sans refonte le
-- jour où il apparaît (I-7), pas pour un usage fictif immédiat.
-- -----------------------------------------------------------------------------
create table consentements (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  client_id         uuid references clients(id),
  utilisateur_id    uuid references utilisateurs(id),
  type              text not null,                           -- ex. communications_marketing
  accorde           boolean not null default false,
  accorde_le        timestamptz,
  retire_le         timestamptz
);
alter table consentements enable row level security;
create policy consentements_tenant on consentements
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());

-- -----------------------------------------------------------------------------
-- DEMANDES_RGPD — droits des personnes (accès, rectification, effacement,
-- portabilité). Échéance légale : 1 mois (qualifiée côté domaine,
-- echeanceDemandeRGPD). Workflow gardé.
-- -----------------------------------------------------------------------------
create type type_demande_rgpd as enum ('acces','rectification','effacement','portabilite');
create type statut_demande_rgpd as enum ('recue','en_cours','traitee','refusee');

create table demandes_rgpd (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  type              type_demande_rgpd not null,
  demandeur_email   citext not null,
  client_id         uuid references clients(id),             -- si la demande concerne un client
  utilisateur_id    uuid references utilisateurs(id),         -- si elle concerne un membre
  statut            statut_demande_rgpd not null default 'recue',
  recue_le          timestamptz not null default now(),
  traite_le         timestamptz,
  traite_par        uuid references utilisateurs(id),
  notes             text
);
create index idx_demandes_org on demandes_rgpd(org_id, statut);
alter table demandes_rgpd enable row level security;
create policy demandes_tenant on demandes_rgpd
  for all using (org_id = jwt_org() and acteur_a_capacite('gerer_referentiels'))
  with check (org_id = jwt_org() and acteur_a_capacite('gerer_referentiels'));

create or replace function cmd_creer_demande_rgpd(
  p_type type_demande_rgpd, p_email text, p_client uuid default null, p_utilisateur uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_id uuid;
begin
  insert into demandes_rgpd (org_id, type, demandeur_email, client_id, utilisateur_id)
    values (v_org, p_type, p_email, p_client, p_utilisateur)
    returning id into v_id;
  perform emettre_evenement(v_org, 'DemandeRGPD.Recue', 'demande_rgpd', v_id, null,
    jsonb_build_object('type', p_type));
  return v_id;
end; $$;
comment on function cmd_creer_demande_rgpd is
  'Enregistre une demande RGPD. Échéance légale (30j) qualifiée côté domaine.';

create or replace function cmd_traiter_demande_rgpd(p_demande uuid, p_statut statut_demande_rgpd, p_notes text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise' using errcode = '42501';
  end if;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  update demandes_rgpd
     set statut = p_statut, notes = p_notes,
         traite_le = case when p_statut in ('traitee','refusee') then now() else traite_le end,
         traite_par = v_acteur
   where id = p_demande and org_id = v_org;
  perform emettre_evenement(v_org, 'DemandeRGPD.Traitee', 'demande_rgpd', p_demande, v_acteur,
    jsonb_build_object('statut', p_statut));
end; $$;

-- -----------------------------------------------------------------------------
-- ANONYMISATION — droit à l'effacement (art. 17), sous réserve des obligations
-- de conservation légale. Un client dont une AFFAIRE a été FACTURÉE ne peut
-- être anonymisé avant l'expiration de la conservation comptable (7 ans) :
-- la fonction vérifie et refuse plutôt que de casser une obligation légale.
-- -----------------------------------------------------------------------------
alter table clients add column if not exists anonymise boolean not null default false;
alter table clients add column if not exists anonymise_le timestamptz;

create or replace function cmd_anonymiser_client(p_client uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
  v_verrou boolean;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise' using errcode = '42501';
  end if;

  -- Verrou légal : une facture émise il y a moins de 7 ans bloque l'effacement.
  select exists (
    select 1 from factures f
      join affaires a on a.id = f.affaire_id
     where a.client_id = p_client and f.emise = true
       and f.date_emission > (current_date - interval '7 years')
  ) into v_verrou;

  if v_verrou then
    raise exception 'Effacement refusé : facture(s) sous obligation de conservation légale (7 ans)'
      using errcode = '23514';
  end if;

  update clients set
    nom = 'Client anonymisé', tel = null, email = null,
    fact_lignes = null, fact_cp = null, fact_ville = null,
    notes = null, anonymise = true, anonymise_le = now()
  where id = p_client and org_id = v_org;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Client.Anonymise', 'client', p_client, v_acteur, '{}'::jsonb);
end; $$;
comment on function cmd_anonymiser_client is
  'Droit à l''effacement (art. 17), bloqué si conservation comptable légale active (7 ans).';

-- -----------------------------------------------------------------------------
-- INCIDENTS_SECURITE — violations de données (art. 33-34). Échéance de
-- notification à l'autorité : 72h (qualifiée côté domaine). SQL uniquement en
-- v1 (pas d'écran dédié — usage rare, geré par la direction en SQL/export).
-- -----------------------------------------------------------------------------
create type gravite_incident as enum ('faible','moyenne','elevee','critique');

create table incidents_securite (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  decouverte_le     timestamptz not null default now(),
  gravite           gravite_incident not null,
  description       text not null,
  personnes_concernees integer,
  notifie_autorite_le timestamptz,
  notifie_personnes_le timestamptz,
  statut            text not null default 'ouvert',          -- ouvert|en_cours|clos
  declare_par       uuid references utilisateurs(id)
);
alter table incidents_securite enable row level security;
create policy incidents_tenant on incidents_securite
  for all using (org_id = jwt_org() and acteur_a_capacite('gerer_referentiels'))
  with check (org_id = jwt_org() and acteur_a_capacite('gerer_referentiels'));
comment on table incidents_securite is
  'Registre des violations (art. 33-34). Échéance de notification 72h — domaine : echeanceNotificationIncident.';

-- -----------------------------------------------------------------------------
-- Note de méthode (résiduel, non corrigé rétroactivement) : certains
-- événements déjà émis (Utilisateur.Invite) embarquent un email en clair dans
-- leur payload — le journal étant append-only par conception (C-05), cette
-- donnée n'est techniquement pas effaçable sans casser l'invariant d'audit.
-- Bonne pratique retenue pour la suite : les nouveaux événements ne portent
-- que des identifiants, jamais de PII en clair, dans leur payload.
-- -----------------------------------------------------------------------------
