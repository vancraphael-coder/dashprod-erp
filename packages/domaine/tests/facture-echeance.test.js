// =============================================================================
// L'ÉCHÉANCE DE FACTURE (vague 1, lot A) — date d'émission + délai réglé.
//
// Le défaut réel : 16 factures émises sans aucune échéance. cmd_emettre_facture
// pose désormais echeance = date_emission + echeance_jours. dateEcheance() est
// le doublon PUR testable de cette règle SQL.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { dateEcheance, qualifierEcheance } from "../src/commun/echeances.js";

const iso = (d) => d.toISOString().slice(0, 10);

test("l'échéance = émission + délai réglé", () => {
  // Roovers : 10 jours.
  assert.equal(iso(dateEcheance("2026-08-01", 10)), "2026-08-11");
  // 30 jours.
  assert.equal(iso(dateEcheance("2026-08-29", 30)), "2026-09-28");
  // 0 jour = payable immédiatement (échéance = émission).
  assert.equal(iso(dateEcheance("2026-08-01", 0)), "2026-08-01");
});

test("défaut prudent à 30 jours si le réglage manque ou est incohérent", () => {
  assert.equal(iso(dateEcheance("2026-08-01", null)), "2026-08-31");
  assert.equal(iso(dateEcheance("2026-08-01", undefined)), "2026-08-31");
  // Jamais d'échéance ANTÉRIEURE à l'émission : un délai négatif tombe au défaut.
  assert.equal(iso(dateEcheance("2026-08-01", -5)), "2026-08-31");
});

test("une facture échue est bien qualifiée « expirée »", () => {
  // Émise il y a 40 jours, échéance à 10 jours → dépassée de 30.
  const emission = new Date(); emission.setDate(emission.getDate() - 40);
  const ech = dateEcheance(emission, 10);
  const q = qualifierEcheance(iso(ech));
  assert.equal(q.etat, "expiree");
  assert.ok(q.jours < 0);
});
