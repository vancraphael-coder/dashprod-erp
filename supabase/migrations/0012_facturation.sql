-- =============================================================================
-- Migration 0012 — Facturation & Peppol
-- Source : Réf. 2 (C-03/C-19 : séquence légale ; C-24 : acomptes/partiels ;
-- facture émise immuable, correction = note de crédit) et Réf. 3 (T2, T12).
-- La facture devient une entité légale : numéro de séquence continu, lignes
-- typées par origine, paiements datés, statut dérivé du solde.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FACTURES — entité légale. Le numéro est attribué par sequence_suivante
-- (migration 0002) : continu, sans trou (C-03). Immuable après émission ; une
-- correction passe par une note de crédit (type='avoir'), jamais une rature.
-- -----------------------------------------------------------------------------
create table factures (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  affaire_id        uuid references affaires(id),
  type              text not null default 'facture',         -- facture|avoir
  numero            text not null,                           -- ex. 2026-000123
  annee             integer not null,
  date_emission     date not null default current_date,
  echeance          date,
  devise            char(3) not null default 'EUR',          -- I-2
  htva_centimes     integer not null default 0,
  tva_centimes      integer not null default 0,
  tvac_centimes     integer not null default 0,
  communication     text,                                    -- structurée belge (OGM/VCS)
  facture_corrigee  uuid references factures(id),            -- pour un avoir
  emise             boolean not null default false,          -- true = immuable
  created_at        timestamptz not null default now(),
  unique (org_id, numero)
);
create index idx_factures_org     on factures(org_id);
create index idx_factures_affaire on factures(affaire_id);
comment on table factures is
  'Facture légale (C-03). Immuable dès emise=true (trigger). Avoir = correction.';

-- -----------------------------------------------------------------------------
-- FACTURE_LIGNES — lignes typées par origine (C-24) : prestation (chiffrage),
-- materiel (stock valorisé, C-18), indemnite (annulation, C-23).
-- -----------------------------------------------------------------------------
create table facture_lignes (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  facture_id        uuid not null references factures(id) on delete cascade,
  type              text not null,                           -- prestation|materiel|indemnite
  libelle           text not null,
  montant_htva_centimes integer not null default 0,
  ordre             integer not null default 1
);
create index idx_lignes_facture on facture_lignes(facture_id);

-- -----------------------------------------------------------------------------
-- PAIEMENTS — datés et montants (C-24). Le solde et le statut sont CALCULÉS
-- (domaine etatPaiement / vue), jamais stockés en dur. Un remboursement est un
-- montant négatif.
-- -----------------------------------------------------------------------------
create table paiements (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organisations(id),
  facture_id        uuid not null references factures(id) on delete cascade,
  montant_centimes  integer not null,                        -- négatif = remboursement
  date_paiement     date not null default current_date,
  moyen             text,                                    -- cash|virement
  note              text
);
create index idx_paiements_facture on paiements(facture_id);

-- Vue de solde (miroir SQL de etatPaiement, pour requêtes et tableaux de bord).
create view v_factures_solde as
select f.id as facture_id, f.org_id, f.tvac_centimes,
       coalesce(sum(p.montant_centimes), 0) as paye_centimes,
       f.tvac_centimes - coalesce(sum(p.montant_centimes), 0) as solde_centimes,
       case
         when coalesce(sum(p.montant_centimes), 0) <= 0 then 'a_payer'
         when coalesce(sum(p.montant_centimes), 0) < f.tvac_centimes then 'partiel'
         else 'paye'
       end as statut
  from factures f
  left join paiements p on p.facture_id = f.id
 group by f.id;

-- -----------------------------------------------------------------------------
-- cmd_emettre_facture — attribue le numéro de séquence et fige la facture.
-- Capacité : emettre_facture. Émet Facture.Emise. Après cela, emise=true et la
-- facture est immuable (trigger). La transition Affaire → 'facture' se fait via
-- cmd_transition_affaire avec {numeroAttribue:true}.
-- -----------------------------------------------------------------------------
create or replace function cmd_emettre_facture(p_facture uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_annee integer := extract(year from current_date);
  v_num integer;
  v_numero text;
  v_acteur uuid;
begin
  if not acteur_a_capacite('emettre_facture') then
    raise exception 'Refusé : capacité emettre_facture requise' using errcode = '42501';
  end if;
  if not exists (select 1 from factures where id = p_facture and org_id = v_org and emise = false) then
    raise exception 'Facture introuvable ou déjà émise';
  end if;

  v_num := sequence_suivante(v_org, 'facture', v_annee);
  v_numero := v_annee || '-' || lpad(v_num::text, 6, '0');

  update factures
     set numero = v_numero, annee = v_annee, emise = true, date_emission = current_date
   where id = p_facture and org_id = v_org;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Facture.Emise', 'facture', p_facture, v_acteur,
    jsonb_build_object('numero', v_numero));
  return v_numero;
end; $$;
comment on function cmd_emettre_facture is
  'Attribue le numéro légal (C-03) et fige la facture. Émet Facture.Emise.';

-- Immuabilité de la facture émise (trigger).
create or replace function bloquer_facture_emise() returns trigger
language plpgsql as $$
begin
  if old.emise = true then
    raise exception 'Facture émise : modification interdite (correction = avoir)';
  end if;
  return new;
end; $$;
create trigger factures_immuables
  before update on factures
  for each row execute function bloquer_facture_emise();

-- -----------------------------------------------------------------------------
-- RLS — isolation de tenant (T3).
-- -----------------------------------------------------------------------------
alter table factures      enable row level security;
alter table facture_lignes enable row level security;
alter table paiements     enable row level security;

create policy factures_tenant on factures
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy lignes_tenant on facture_lignes
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy paiements_tenant on paiements
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
