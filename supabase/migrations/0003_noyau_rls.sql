-- =============================================================================
-- Migration 0003 — Noyau : Row Level Security
-- Source : Référence 3, T3 ("la sécurité vit dans la base, pas dans l'écran").
-- Famille 1 : isolation de tenant — org_id de la ligne = org_id du jeton.
-- Famille 3 : immuabilité — déjà posée par trigger sur evenements (0001).
-- La famille 2 (capacités) s'appliquera aux tables métier des modules suivants ;
-- ici on protège l'accès aux référentiels en écriture.
-- =============================================================================

-- Helper : organisation portée par le JWT. En production, la revendication est
-- injectée par un hook serveur à l'émission du jeton (T3). La fonction lit le
-- claim 'org_id' du JWT courant ; renvoie null hors session authentifiée.
create or replace function jwt_org() returns uuid
language sql stable as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'org_id',
    ''
  )::uuid;
$$;
comment on function jwt_org is
  'Organisation du jeton courant (T3). Base de toutes les politiques de tenant.';

-- Activation RLS sur les tables métier du noyau.
alter table organisations     enable row level security;
alter table utilisateurs       enable row level security;
alter table roles              enable row level security;
alter table utilisateur_roles  enable row level security;
alter table referentiels       enable row level security;
alter table sequences          enable row level security;
alter table evenements         enable row level security;

-- ORGANISATIONS : on ne voit que la sienne.
create policy org_isolation on organisations
  for select using (id = jwt_org());

-- UTILISATEURS : lecture limitée au tenant.
create policy utilisateurs_tenant on utilisateurs
  for select using (org_id = jwt_org());

-- ROLES : lecture limitée au tenant.
create policy roles_tenant on roles
  for select using (org_id = jwt_org());

-- UTILISATEUR_ROLES : lecture si l'utilisateur cible appartient au tenant.
create policy uroles_tenant on utilisateur_roles
  for select using (
    exists (select 1 from utilisateurs u
            where u.id = utilisateur_roles.utilisateur_id
              and u.org_id = jwt_org())
  );

-- REFERENTIELS : lecture des référentiels du tenant ou système (org_id null).
create policy referentiels_lecture on referentiels
  for select using (org_id = jwt_org() or org_id is null);

-- EVENEMENTS : lecture du journal de son tenant (l'écriture passe par la
-- fonction emettre_evenement, exécutée côté serveur).
create policy evenements_tenant on evenements
  for select using (org_id = jwt_org());

-- Note : les commandes d'écriture (création d'organisation, provisioning
-- d'utilisateurs, publication de référentiels) s'exécutent via des fonctions
-- SECURITY DEFINER contrôlées (module Identité & permissions, à venir), afin
-- que la vérification de capacité (famille 2, T3) soit centralisée et testée.
