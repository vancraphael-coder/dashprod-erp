// Tests — Pilotage : CA signé, dérive de marge (rentabilité par chantier),
// équilibre de charge d'équipe. Parties critiques : exactitude des indicateurs.

import { test } from "node:test";
import assert from "node:assert/strict";

import { caSigne, caParEtat, deriveMarge, alerteDerive } from "../src/pilotage/finances.js";
import { equilibreCharge, desequilibres } from "../src/pilotage/charge.js";

// --- CA signé ----------------------------------------------------------------

const AFFAIRES = [
  { etat: "devis", tvac_centimes: 100000 },      // exclu (pas encore engagé)
  { etat: "confirme", tvac_centimes: 200000 },   // compté
  { etat: "en_cours", tvac_centimes: 150000 },   // compté
  { etat: "facture", tvac_centimes: 300000 },    // compté
  { etat: "annule", tvac_centimes: 500000 },     // exclu
  { etat: "paye", tvac_centimes: 120000 },       // compté
];

test("caSigne ne compte que les affaires engagées (hors devis/annulé)", () => {
  // 200000 + 150000 + 300000 + 120000 = 770000
  assert.equal(caSigne(AFFAIRES), 770000);
});

test("caSigne : liste vide → 0", () => {
  assert.equal(caSigne([]), 0);
});

test("caParEtat ventile le carnet signé par état", () => {
  const v = caParEtat(AFFAIRES);
  assert.equal(v.confirme, 200000);
  assert.equal(v.facture, 300000);
  assert.equal(v.devis, undefined);   // non signé, absent
  assert.equal(v.annule, undefined);
});

// --- Dérive de marge (rentabilité par chantier) ------------------------------

test("deriveMarge : coûts réels conformes au devis → dérive nulle", () => {
  // recette 780, coûts 500 devisés et réels
  const d = deriveMarge(78000, 50000, 50000);
  assert.equal(d.marge_devisee_centimes, 28000);
  assert.equal(d.marge_reelle_centimes, 28000);
  assert.equal(d.derive_centimes, 0);
  assert.equal(d.derive_pct, 0);
});

test("deriveMarge : réel plus coûteux → dérive négative", () => {
  // devisé 500, réel 560 → marge réelle 220 vs 280 devisée → dérive -60 = -21,4 %
  const d = deriveMarge(78000, 50000, 56000);
  assert.equal(d.marge_devisee_centimes, 28000);
  assert.equal(d.marge_reelle_centimes, 22000);
  assert.equal(d.derive_centimes, -6000);
  assert.equal(d.derive_pct, -21.4);
});

test("alerteDerive se déclenche au-delà du seuil de perte", () => {
  const mauvais = deriveMarge(78000, 50000, 56000); // -21,4 %
  const bon = deriveMarge(78000, 50000, 51000);     // -3,6 %
  assert.equal(alerteDerive(mauvais), true);
  assert.equal(alerteDerive(bon), false);
});

// --- Équilibre de charge -----------------------------------------------------

test("equilibreCharge qualifie chaque membre par rapport à la moyenne", () => {
  // moyenne de 100, 100, 100 = 100 → tous équilibrés
  const bilan = equilibreCharge([
    { id: "a", heures: 100 }, { id: "b", heures: 100 }, { id: "c", heures: 100 },
  ]);
  assert.equal(bilan.moyenne, 100);
  assert.ok(bilan.membres.every((m) => m.etat === "equilibre"));
});

test("equilibreCharge détecte sur-charge et sous-charge (±20 %)", () => {
  // moyenne (150+100+50)/3 = 100 ; 150 = +50 % sur, 50 = -50 % sous
  const bilan = equilibreCharge([
    { id: "sur", heures: 150 }, { id: "moy", heures: 100 }, { id: "sous", heures: 50 },
  ]);
  assert.equal(bilan.moyenne, 100);
  const parId = Object.fromEntries(bilan.membres.map((m) => [m.id, m]));
  assert.equal(parId.sur.etat, "sur_charge");
  assert.equal(parId.moy.etat, "equilibre");
  assert.equal(parId.sous.etat, "sous_charge");
});

test("equilibreCharge trie du plus chargé au moins chargé", () => {
  const bilan = equilibreCharge([
    { id: "petit", heures: 20 }, { id: "gros", heures: 200 }, { id: "moyen", heures: 100 },
  ]);
  assert.deepEqual(bilan.membres.map((m) => m.id), ["gros", "moyen", "petit"]);
});

test("desequilibres liste les membres à rééquilibrer", () => {
  const bilan = equilibreCharge([
    { id: "sur", heures: 150 }, { id: "moy", heures: 100 }, { id: "sous", heures: 50 },
  ]);
  const d = desequilibres(bilan);
  assert.deepEqual(d.surcharges, ["sur"]);
  assert.deepEqual(d.souscharges, ["sous"]);
});
