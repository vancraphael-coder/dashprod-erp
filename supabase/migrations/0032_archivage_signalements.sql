-- =============================================================================
-- Migration 0032 — Archivage (dossiers, camions, membres) + historique des
-- signalements véhicule.
--
-- ARCHIVER n'est pas SUPPRIMER : la donnée reste (traçabilité, factures liées),
-- elle disparaît simplement des listes actives. Réversible en base.
--
-- SIGNALEMENTS : chaque problème véhicule est historisé automatiquement —
-- détail, PAR QUI, QUAND — au lieu d'écraser la note précédente.
-- =============================================================================

-- Archivage.
alter table affaires  add column if not exists archive_le timestamptz;
alter table vehicules add column if not exists archive_le timestamptz;
comment on column affaires.archive_le  is 'Dossier archivé (masqué des listes). NULL = actif.';
comment on column vehicules.archive_le is 'Camion archivé (masqué des listes). NULL = actif.';

-- Les membres s'archivent via utilisateurs.actif (existant) — mais la table est
-- SELECT-only (0003) : toute écriture d'identité passe par une commande gardée.
create or replace function cmd_archiver_utilisateur(p_utilisateur uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise' using errcode = '42501';
  end if;
  update utilisateurs set actif = false where id = p_utilisateur and org_id = v_org;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Utilisateur.Archive',
    'utilisateur', p_utilisateur, v_acteur, '{}'::jsonb);
end; $$;

-- Historique des signalements véhicule : QUI, QUOI, QUAND — jamais écrasé.
create table if not exists vehicule_signalements (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organisations(id),
  vehicule_id    uuid not null references vehicules(id) on delete cascade,
  utilisateur_id uuid references utilisateurs(id),
  etat           text not null,             -- ok | surveiller | urgent
  note           text,
  cree_le        timestamptz not null default now()
);
create index if not exists idx_signalements_vehicule
  on vehicule_signalements(vehicule_id, cree_le desc);

alter table vehicule_signalements enable row level security;
drop policy if exists signalements_tenant on vehicule_signalements;
create policy signalements_tenant on vehicule_signalements
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
