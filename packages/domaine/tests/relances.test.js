// =============================================================================
// LES RELANCES (vague 1, lot D) — factures échues et non soldées.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { soldeFacture, facturesARelancer } from "../src/facturation/relances.js";

const jours = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

test("le solde retranche les paiements qui visent la facture", () => {
  const f = { id: "a", tvac_centimes: 12100 };
  const p = [{ facture_id: "a", montant_centimes: 5000 }, { facture_id: "b", montant_centimes: 9999 }];
  assert.equal(soldeFacture(f, p), 7100);       // 12100 - 5000 (b ignoré)
  assert.equal(soldeFacture(f, []), 12100);
  // Payée à 100 % ou plus → solde 0, jamais négatif.
  assert.equal(soldeFacture(f, [{ facture_id: "a", montant_centimes: 99999 }]), 0);
});

test("ne relance QUE l'échue non soldée", () => {
  const factures = [
    { id: "retard", echeance: jours(-10), tvac_centimes: 10000 },   // échue, impayée
    { id: "future", echeance: jours(+10), tvac_centimes: 10000 },   // pas échue
    { id: "payee", echeance: jours(-5), tvac_centimes: 10000 },     // échue mais payée
    { id: "sansech", echeance: null, tvac_centimes: 10000 },        // pas d'échéance
  ];
  const paiements = [{ facture_id: "payee", montant_centimes: 10000 }];
  const r = facturesARelancer(factures, paiements);
  assert.deepEqual(r.map((x) => x.facture.id), ["retard"]);
  assert.ok(r[0].jours_retard >= 9 && r[0].jours_retard <= 11, "≈ 10 jours de retard");
  assert.equal(r[0].solde_centimes, 10000);
});

test("les relances sont triées de la plus en retard à la moins en retard", () => {
  const factures = [
    { id: "peu", echeance: jours(-3), tvac_centimes: 5000 },
    { id: "beaucoup", echeance: jours(-30), tvac_centimes: 5000 },
    { id: "moyen", echeance: jours(-12), tvac_centimes: 5000 },
  ];
  const r = facturesARelancer(factures, []);
  assert.deepEqual(r.map((x) => x.facture.id), ["beaucoup", "moyen", "peu"]);
});

test("une facture partiellement payée mais échue reste à relancer, sur le reste", () => {
  const factures = [{ id: "a", echeance: jours(-7), tvac_centimes: 10000 }];
  const r = facturesARelancer(factures, [{ facture_id: "a", montant_centimes: 4000 }]);
  assert.equal(r.length, 1);
  assert.equal(r[0].solde_centimes, 6000);
});
