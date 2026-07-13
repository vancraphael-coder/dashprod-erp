-- =============================================================================
-- Migration 0020 — Paramètres de l'organisation (P0, prérequis des rendus)
-- Source : docs/alignement/claude-alignement-08 §4 et -05.
-- L'offre, la facture et le mail exigent l'identité complète de l'émetteur :
-- siège, BCE, IBAN, contacts. Elles étaient codées en dur dans le modèle
-- (constantes ME/TEL/IBAN) — inacceptable en multi-tenant (I-1) : chaque
-- organisation a les siennes.
-- =============================================================================

alter table organisations add column if not exists bce      text;
alter table organisations add column if not exists adresse  text;
alter table organisations add column if not exists cp       text;
alter table organisations add column if not exists ville    text;
alter table organisations add column if not exists tel      text;
alter table organisations add column if not exists email    text;
alter table organisations add column if not exists iban     text;

comment on column organisations.iban is
  'IBAN de l''organisation — imprimé sur les factures et le brief équipe.';

-- Valeurs réelles Roovers (fournies par le fondateur). Ne touche que
-- l'organisation dont la TVA correspond : sans effet sur les autres tenants.
update organisations set
  bce     = coalesce(bce,     'BE 0478.363.616'),
  adresse = coalesce(adresse, 'Rue de l''Avenir 9'),
  cp      = coalesce(cp,      '1370'),
  ville   = coalesce(ville,   'Jodoigne'),
  tel     = coalesce(tel,     '0455/17.16.79'),
  email   = coalesce(email,   'raphael.roovers@gmail.com'),
  iban    = coalesce(iban,    'BE73 3101 6268 5860')
where tva = 'BE0478363616';
