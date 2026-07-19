-- =============================================================================
-- Migration 0037 — LE CIRCUIT DE FACTURATION N'AVAIT JAMAIS PU FONCTIONNER.
-- DÉJÀ APPLIQUÉE EN BASE via MCP (volets 0037 et 0037b). Traçabilité.
--
-- Constat d'audit : 0 facture en base depuis l'origine. Quatre causes.
--
-- BUG 1 — factures.numero NOT NULL sans défaut, alors que le processus légal
--   est en deux temps : BROUILLON sans numéro, puis cmd_emettre_facture qui
--   attribue le numéro de séquence. L'insertion du brouillon échouait donc
--   systématiquement. Invariant préservé par contrainte : une facture ÉMISE a
--   forcément un numéro.
-- BUG 2 — factures.annee NOT NULL sans défaut : même blocage.
-- BUG 3 — cmd_emettre_facture n'avançait pas l'affaire : le dossier restait
--   « effectué » après facturation, et ne pouvait donc jamais devenir « payé ».
-- BUG 4 — les totaux de l'en-tête n'étaient jamais calculés (le front n'insère
--   que les lignes) : facture à 0 €, et le déclencheur de paiement voyait
--   0 >= 0 → l'affaire passait « payée » au premier acompte venu. Les totaux
--   sont désormais DÉRIVÉS des lignes : ils ne peuvent plus diverger.
-- =============================================================================

alter table factures alter column numero drop not null;
alter table factures alter column annee set default extract(year from current_date)::integer;

alter table factures drop constraint if exists factures_emise_numerotee;
alter table factures add constraint factures_emise_numerotee
  check (emise = false or numero is not null);

create or replace function cmd_emettre_facture(p_facture uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_annee integer := extract(year from current_date);
  v_num integer; v_numero text; v_acteur uuid; v_affaire uuid;
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
   where id = p_facture and org_id = v_org
  returning affaire_id into v_affaire;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Facture.Emise', 'facture', p_facture, v_acteur,
    jsonb_build_object('numero', v_numero));
  if v_affaire is not null then perform transition_interne(v_affaire, 'facture'); end if;
  return v_numero;
end; $$;

create or replace function recalculer_totaux_facture() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_facture uuid := coalesce(new.facture_id, old.facture_id); v_htva bigint; v_tva bigint;
begin
  if exists (select 1 from factures where id = v_facture and emise = true) then return null; end if;
  select coalesce(sum(montant_htva_centimes), 0) into v_htva
    from facture_lignes where facture_id = v_facture;
  v_tva := round(v_htva * 0.21);
  update factures set htva_centimes = v_htva, tva_centimes = v_tva,
         tvac_centimes = v_htva + v_tva where id = v_facture;
  return null;
end; $$;
drop trigger if exists trg_totaux_facture on facture_lignes;
create trigger trg_totaux_facture after insert or update or delete on facture_lignes
  for each row execute function recalculer_totaux_facture();
