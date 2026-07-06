-- =============================================================================
-- Migration 0002 — Noyau : fonctions de service
-- Source : Référence 3, T4 (mécanique du journal) et T2 (séquences).
-- Ces fonctions sont les seules portes d'écriture pour les séquences et le
-- journal : toute commande métier les appellera (T4 — "un changement sans
-- événement est impossible par construction").
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sequence_suivante — numéro légal continu pour (org, type, année).
-- Atomique : le verrou de ligne empêche tout trou ou doublon même en
-- concurrence (C-03). Crée la ligne d'année si absente.
-- -----------------------------------------------------------------------------
create or replace function sequence_suivante(
  p_org uuid, p_type text, p_annee integer
) returns integer
language plpgsql as $$
declare
  v_num integer;
begin
  insert into sequences (org_id, type, annee, prochain)
    values (p_org, p_type, p_annee, 1)
    on conflict (org_id, type, annee) do nothing;

  update sequences
     set prochain = prochain + 1
   where org_id = p_org and type = p_type and annee = p_annee
   returning prochain - 1 into v_num;

  return v_num;
end; $$;
comment on function sequence_suivante is
  'Numéro légal continu (C-03). Atomique via verrou de ligne UPDATE.';

-- -----------------------------------------------------------------------------
-- emettre_evenement — insertion dans le journal (T4).
-- Toute commande métier appelle cette fonction dans SA transaction : le
-- changement et son événement sont donc validés ensemble, ou pas du tout.
-- -----------------------------------------------------------------------------
create or replace function emettre_evenement(
  p_org uuid,
  p_type text,
  p_entite_type text,
  p_entite_id uuid,
  p_acteur uuid,
  p_payload jsonb default '{}'::jsonb
) returns bigint
language plpgsql as $$
declare
  v_id bigint;
begin
  if p_org is null then
    raise exception 'emettre_evenement : org_id obligatoire (I-1)';
  end if;
  if p_type is null or p_entite_type is null then
    raise exception 'emettre_evenement : type et entite_type obligatoires';
  end if;

  insert into evenements (org_id, type, entite_type, entite_id, acteur_id, payload)
    values (p_org, p_type, p_entite_type, p_entite_id, p_acteur, coalesce(p_payload, '{}'::jsonb))
    returning id into v_id;

  return v_id;
end; $$;
comment on function emettre_evenement is
  'Porte unique du journal (T4). Appelée dans la transaction de chaque commande.';
