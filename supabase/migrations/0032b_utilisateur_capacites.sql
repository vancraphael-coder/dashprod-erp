-- =============================================================================
-- 0032b — RECONSTITUTION : utilisateur_capacites
--
-- ⚠ CE FICHIER N'A JAMAIS ÉTÉ APPLIQUÉ EN PRODUCTION SOUS CE NOM. La table
--   existe en production depuis les tout premiers jours, mais aucune migration
--   du dépôt ne la crée : elle date d'avant le registre Supabase
--   (`supabase_migrations.schema_migrations`), qui ne commence qu'à la
--   migration 0033. Les migrations 0001 à 0032 ont été passées à la main dans
--   l'éditeur SQL ; il n'en reste aucune trace machine.
--
--   Structure reconstituée le 2026-09-19 en interrogeant la base de production
--   (colonnes, contraintes, politiques RLS) — pas inventée. Sans elle, le rejeu
--   du dépôt sur une base vierge s'arrêtait à la migration 0081.
--
--   `create table if not exists` : sur la production, où la table existe déjà,
--   ce fichier ne fait rien. Il ne sert qu'à reconstruire une base neuve.
--
-- CE QU'ELLE PORTE. Une capacité accordée à UNE personne, en plus de celles de
-- son rôle. Le rôle dit ce que fait un poste ; cette table dit ce que fait
-- cette personne-là en plus — un chef d'équipe autorisé à valider les heures,
-- par exemple, sans changer le rôle de tous les chefs d'équipe.
-- =============================================================================

create table if not exists public.utilisateur_capacites (
  org_id         uuid not null default jwt_org() references public.organisations(id),
  utilisateur_id uuid not null references public.utilisateurs(id) on delete cascade,
  capacite_cle   text not null,
  accorde_le     timestamptz not null default now(),
  primary key (utilisateur_id, capacite_cle)
);

comment on table public.utilisateur_capacites is
  'Capacités accordées à UNE personne, en plus de celles de son rôle. '
  'Reconstituée depuis la production le 2026-09-19 : la migration d''origine '
  '(avant 0033) n''a jamais été commitée.';

alter table public.utilisateur_capacites enable row level security;

-- Lecture : tout le monde dans la société voit qui a quoi. Une capacité cachée
-- est une capacité que personne ne peut contester.
drop policy if exists ucap_lecture on public.utilisateur_capacites;
create policy ucap_lecture on public.utilisateur_capacites
  for select to authenticated
  using (org_id = jwt_org());

-- Écriture : réservée à qui gère les référentiels. Accorder une capacité est
-- un acte d'administration, pas un réglage d'écran.
drop policy if exists ucap_ecriture on public.utilisateur_capacites;
create policy ucap_ecriture on public.utilisateur_capacites
  for all to authenticated
  using (org_id = jwt_org() and acteur_a_capacite('gerer_referentiels'))
  with check (org_id = jwt_org() and acteur_a_capacite('gerer_referentiels'));
