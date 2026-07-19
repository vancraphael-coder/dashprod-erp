-- =============================================================================
-- Migration 0035 — Désistement client, synchronisation des dates, paiement.
-- DÉJÀ APPLIQUÉE EN BASE via MCP (volets a et b). Fichier de traçabilité.
-- =============================================================================

-- ── A. DÉSISTEMENT : annuler / reporter ─────────────────────────────────────
create or replace function cmd_annuler_affaire(p_affaire uuid, p_motif text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid := jwt_org(); v_acteur uuid; v_source etat_affaire;
begin
  if not acteur_a_capacite('creer_affaire') then
    raise exception 'Refusé : capacité creer_affaire requise' using errcode = '42501';
  end if;
  select etat into v_source from affaires where id = p_affaire and org_id = v_org;
  if v_source is null then raise exception 'Affaire introuvable'; end if;
  if not transition_permise(v_source, 'annule') then
    raise exception 'Annulation impossible depuis l''état %', v_source using errcode = '23514';
  end if;
  perform set_config('app.transition_ok', 'true', true);
  update affaires set etat = 'annule' where id = p_affaire;
  perform set_config('app.transition_ok', 'false', true);
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Affaire.Annulee', 'affaire', p_affaire, v_acteur,
    jsonb_build_object('de', v_source, 'motif', coalesce(p_motif, '')));
end; $$;

-- cmd_reporter_affaire : voir 0036 (version corrigée qui replanifie si une
-- nouvelle date est fournie).

-- Annuler/reporter libère le planning : les missions ouvertes sont annulées et
-- les chronos restés ouverts sont fermés.
create or replace function annuler_missions_affaire() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.etat in ('annule','reporte') and old.etat is distinct from new.etat then
    update missions set etat = 'annulee'
     where affaire_id = new.id and org_id = new.org_id
       and etat in ('planifiee','en_cours');
    update chrono_sessions cs set fin = now()
     from missions m
     where cs.mission_id = m.id and m.affaire_id = new.id
       and cs.org_id = new.org_id and cs.fin is null;
  end if;
  return new;
end; $$;
drop trigger if exists trg_annuler_missions on affaires;
create trigger trg_annuler_missions after update of etat on affaires
  for each row execute function annuler_missions_affaire();

-- ── B. SYNC DATE dossier → missions ─────────────────────────────────────────
-- Changer la date/heure du dossier après confirmation déplace la mission.
create or replace function sync_date_vers_missions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  if new.date_souhaitee is distinct from old.date_souhaitee
     or new.heure_souhaitee is distinct from old.heure_souhaitee then
    update missions set date = new.date_souhaitee, heure = new.heure_souhaitee
     where affaire_id = new.id and org_id = new.org_id
       and type = 'demenagement' and etat in ('planifiee','en_cours');
  end if;
  if new.date_emballage is distinct from old.date_emballage
     or new.heure_emballage is distinct from old.heure_emballage then
    update missions set date = new.date_emballage, heure = new.heure_emballage
     where affaire_id = new.id and org_id = new.org_id
       and type = 'emballage' and etat in ('planifiee','en_cours');
  end if;
  return new;
end; $$;
drop trigger if exists trg_sync_date_missions on affaires;
create trigger trg_sync_date_missions
  after update of date_souhaitee, heure_souhaitee, date_emballage, heure_emballage
  on affaires for each row execute function sync_date_vers_missions();

-- ── C. PAIEMENT DU SOLDE → affaire « payé » ─────────────────────────────────
create or replace function avancer_paye_si_solde() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_facture record; v_paye bigint; v_affaire uuid; v_etat etat_affaire;
begin
  select * into v_facture from factures where id = new.facture_id;
  if v_facture is null then return new; end if;
  select coalesce(sum(montant_centimes),0) into v_paye
    from paiements where facture_id = new.facture_id;
  if v_paye >= v_facture.tvac_centimes then
    v_affaire := v_facture.affaire_id;
    select etat into v_etat from affaires where id = v_affaire;
    if v_etat = 'facture' then perform transition_interne(v_affaire, 'paye'); end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_avancer_paye on paiements;
create trigger trg_avancer_paye after insert on paiements
  for each row execute function avancer_paye_si_solde();

-- ── D. TEXTES DU BUREAU (modèles de l'email d'offre) ────────────────────────
alter table organisations add column if not exists parametres_textes jsonb;
