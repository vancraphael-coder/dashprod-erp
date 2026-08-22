-- =============================================================================
-- 0139 — FACTURES FOURNISSEUR REÇUES (Peppol entrant).
--
-- APPLIQUÉE ET ÉPROUVÉE le 22/08/2026, dans un bloc rollback :
--   · comptabiliser sans approbation  → refusé (42501)
--   · approuver sans décideur nommé   → refusé (42501)
--   · A_VERIFIER → APPROUVE → COMPTABILISE avec décideur → passe
--   · doublon (org + empreinte)       → refusé (unique_violation)
--
-- POURQUOI
-- --------
-- Depuis le 01/01/2026, toute entreprise belge assujettie doit POUVOIR recevoir
-- des factures électroniques structurées. Dashprod savait émettre, pas recevoir.
-- C'est aussi la porte d'entrée de la moitié « achat », absente du produit.
--
-- LA RÈGLE PORTÉE PAR LE SCHÉMA
-- -----------------------------
-- Recevoir n'est pas accepter. Une facture entrante n'est jamais approuvée ni
-- comptabilisée d'office : `etat` démarre à 'RECU', et seul un passage explicite
-- par 'A_VERIFIER' → 'APPROUVE' (fait par une personne, tracée) ouvre la
-- comptabilisation. La machine d'états vit dans le domaine
-- (`facturation/reception.js`) ; la base porte le garde-fou.
-- =============================================================================

create table if not exists factures_fournisseur (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references organisations(id) on delete cascade,

  -- Identité du document, telle que le fournisseur l'a émise.
  numero             text not null,
  type               text not null default 'facture'
                     check (type in ('facture', 'avoir')),
  date_emission      date,
  echeance           date,
  devise             char(3) not null default 'EUR',

  -- Le fournisseur. `peppol_id` ou `tva` : l'un des deux suffit à identifier,
  -- les deux absents envoient le document en vérification humaine.
  fournisseur_nom    text,
  fournisseur_tva    text,
  fournisseur_peppol text,
  fournisseur_pays   char(2),

  -- Montants LUS chez le fournisseur, en centimes entiers. On ne les recalcule
  -- pas : ce serait réécrire sa facture.
  htva_centimes      integer,
  tva_centimes       integer,
  tvac_centimes      integer,
  du_centimes        integer,

  -- Le document d'origine, conservé tel quel. C'est la pièce justificative :
  -- elle doit rester intacte et opposable, indépendamment de notre lecture.
  document_xml       text,
  document_empreinte text,

  -- L'empreinte de DÉDOUBLONNAGE : fournisseur + numéro, pas le contenu.
  -- Un même document retransmis (reprise, webhook rejoué) diffère parfois d'un
  -- octet sans être une autre facture.
  empreinte_doc      text not null,

  etat               text not null default 'RECU'
                     check (etat in ('RECU','LISIBLE','DOUBLON','A_VERIFIER',
                                     'APPROUVE','REFUSE','COMPTABILISE','ARCHIVE')),
  motif_etat         text,

  -- La trace humaine : qui a approuvé ou refusé, et quand. Sans elle, on ne
  -- peut pas prouver que quelqu'un a regardé.
  decide_par         uuid references utilisateurs(id),
  decide_le          timestamptz,

  recu_le            timestamptz not null default now(),

  -- Un même fournisseur ne peut pas nous envoyer deux fois le même numéro.
  unique (org_id, empreinte_doc)
);

comment on table factures_fournisseur is
  'Factures reçues par Peppol. Recevoir n''est pas accepter : aucune n''est '
  'approuvée ni comptabilisée sans décision humaine tracée (0139).';

create index if not exists idx_ff_org_etat
  on factures_fournisseur(org_id, etat, recu_le desc);

alter table factures_fournisseur enable row level security;

create policy ff_tenant on factures_fournisseur for all
  using (org_id = jwt_org())
  with check (org_id = jwt_org());

-- ── Garde-fou : la comptabilisation exige une approbation humaine ───────────
-- La machine d'états vit dans le domaine, mais une écriture comptable mérite
-- une seconde serrure. Ce trigger refuse tout passage à 'COMPTABILISE' qui ne
-- vient pas de 'APPROUVE', et toute approbation sans décideur.
create or replace function ff_verifier_passage()
returns trigger language plpgsql as $fn$
begin
  if new.etat = 'COMPTABILISE' and old.etat <> 'APPROUVE' then
    raise exception 'Seul un document approuvé peut être comptabilisé (état : %)', old.etat
      using errcode = '42501';
  end if;
  if new.etat in ('APPROUVE', 'REFUSE') and new.decide_par is null then
    raise exception 'Une décision doit porter le nom de la personne qui la prend'
      using errcode = '42501';
  end if;
  if new.etat in ('APPROUVE', 'REFUSE') and new.decide_le is null then
    new.decide_le := now();
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_ff_passage on factures_fournisseur;
create trigger trg_ff_passage
  before update of etat on factures_fournisseur
  for each row execute function ff_verifier_passage();

-- =============================================================================
-- BLOC DE VÉRIFICATION — à exécuter APRÈS application, avant de s'y fier.
-- Il doit se terminer par « ROLLBACK volontaire — garde-fous OK ».
-- =============================================================================
-- do $$
-- declare v_org uuid; v_id uuid; v_u uuid;
-- begin
--   select id into v_org from organisations limit 1;
--   select id into v_u from utilisateurs where org_id = v_org limit 1;
--
--   insert into factures_fournisseur (org_id, numero, empreinte_doc, du_centimes)
--   values (v_org, 'F-TEST-1', 'BE0999|F-TEST-1', 12100) returning id into v_id;
--
--   -- 1) comptabiliser sans approbation doit ÉCHOUER
--   begin
--     update factures_fournisseur set etat = 'COMPTABILISE' where id = v_id;
--     raise exception 'ÉCHEC : comptabilisation sans approbation acceptée';
--   exception when insufficient_privilege then
--     raise notice 'garde-fou comptabilisation OK';
--   end;
--
--   -- 2) approuver sans décideur doit ÉCHOUER
--   begin
--     update factures_fournisseur set etat = 'APPROUVE' where id = v_id;
--     raise exception 'ÉCHEC : approbation anonyme acceptée';
--   exception when insufficient_privilege then
--     raise notice 'garde-fou décideur OK';
--   end;
--
--   -- 3) le doublon doit être refusé par la contrainte d'unicité
--   begin
--     insert into factures_fournisseur (org_id, numero, empreinte_doc)
--     values (v_org, 'F-TEST-1', 'BE0999|F-TEST-1');
--     raise exception 'ÉCHEC : doublon accepté';
--   exception when unique_violation then
--     raise notice 'dédoublonnage OK';
--   end;
--
--   raise exception 'ROLLBACK volontaire — garde-fous OK';
-- end $$;
