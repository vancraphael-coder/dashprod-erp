-- =============================================================================
-- 0049 + 0049b — APPLIQUÉES en production le 21/07/2026 (ranger, ne pas rejouer)
--
-- MODÈLE FINANCIER CANONIQUE — une source de vérité, plusieurs sorties.
--
-- Constat d'audit : facture_lignes ne portait que { libelle, montant_htva }.
-- UBL BIS Billing 3.0 exige par ligne quantité, prix unitaire et taux de TVA.
-- Il était donc IMPOSSIBLE d'émettre une facture électronique conforme.
-- versUBL() existait dans le domaine mais n'était appelé nulle part.
-- =============================================================================

alter table public.facture_lignes
  add column if not exists quantite              numeric(12,3) not null default 1,
  add column if not exists unite                 text not null default 'pièce',
  add column if not exists prix_unitaire_centimes integer,
  add column if not exists tva_pct               numeric(5,2);

update public.facture_lignes
   set prix_unitaire_centimes = montant_htva_centimes
 where prix_unitaire_centimes is null;

comment on column public.facture_lignes.tva_pct is
  'Taux de TVA de la ligne. NULL = taux de l''organisation au moment de '
  'l''émission. Une facture émise fige son taux ligne par ligne.';

alter table public.organisations add column if not exists peppol_id text;
comment on column public.organisations.peppol_id is
  'Identifiant Peppol de l''entreprise, ex. 0208:0478363616 (0208 = BCE belge).';

alter table public.clients add column if not exists peppol_id text;
comment on column public.clients.peppol_id is
  'Identifiant Peppol du client destinataire. NULL = pas de facturation '
  'électronique possible vers ce client.';

-- Journal de transmission. AUCUN statut n'est écrit sans retour réel d'un
-- point d'accès : un statut inventé serait pire que pas de statut.
create table if not exists public.transmissions (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organisations(id),
  facture_id     uuid not null references public.factures(id),
  canal          text not null,
  etat           text not null default 'BROUILLON',
  reference_ext  text,
  charge_utile   text,
  erreur         text,
  cle_idempotence text,
  cree_le        timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint transmissions_canal_valide
    check (canal in ('PEPPOL','EMAIL','PDF','EXPORT_COMPTABLE')),
  constraint transmissions_etat_valide
    check (etat in ('BROUILLON','VALIDEE','PRETE','SOUMISE',
                    'ACCEPTEE','DELIVREE','REJETEE','ECHEC')),
  unique (facture_id, canal, cle_idempotence)
);

alter table public.transmissions enable row level security;

drop policy if exists transmissions_lecture on public.transmissions;
create policy transmissions_lecture on public.transmissions
  for select to authenticated using (org_id = jwt_org());

drop policy if exists transmissions_ecriture on public.transmissions;
create policy transmissions_ecriture on public.transmissions
  for all to authenticated
  using      (org_id = jwt_org() and acteur_a_capacite('emettre_facture'))
  with check (org_id = jwt_org() and acteur_a_capacite('emettre_facture'));

create index if not exists idx_transmissions_facture
  on public.transmissions (facture_id, canal);

-- touch_updated_at() écrit new.updated_at : la colonne doit porter ce nom.
drop trigger if exists trg_transmissions_maj on public.transmissions;
create trigger trg_transmissions_maj before update on public.transmissions
  for each row execute function touch_updated_at();
