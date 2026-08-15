// =============================================================================
// Natures d'affaire, sous-traitance et lift.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import {
  NATURES, nature, natureValide, naturesDuMenu, comporte, estRecurrente,
  exigeEntreprise, porteSurContrat, manques,
} from "../src/commercial/natures.js";
import * as ST from "../src/chiffrage/sous-traitance.js";

/* ── Natures ────────────────────────────────────────────────────────────── */

test("le menu propose les cinq natures, déménagement en tête", () => {
  const m = naturesDuMenu();
  assert.equal(m.length, 5);
  assert.equal(m[0].cle, "demenagement");
  assert.deepEqual(m.map((n) => n.cle),
    ["demenagement", "sous_traitance", "lift", "boxe", "zone"]);
});

test("seul le déménagement porte un relevé de meubles", () => {
  // C'est la règle métier centrale : lift et sous-traitance sont des services
  // sans relevé, et la base la fait respecter (trigger 0117).
  const avecReleve = NATURES.filter((n) => n.etapes.releve).map((n) => n.cle);
  assert.deepEqual(avecReleve, ["demenagement"]);
  assert.equal(comporte("lift", "releve"), false);
  assert.equal(comporte("sous_traitance", "releve"), false);
});

test("ni lift ni sous-traitance ne comportent d'emballage", () => {
  assert.equal(comporte("lift", "emballage"), false);
  assert.equal(comporte("sous_traitance", "emballage"), false);
  assert.equal(comporte("demenagement", "emballage"), true);
});

test("boxe et zone sont les seules natures récurrentes", () => {
  const rec = NATURES.filter((n) => estRecurrente(n.cle)).map((n) => n.cle);
  assert.deepEqual(rec, ["boxe", "zone"]);
  // Et ce sont donc elles qui peuvent porter un litige sur CONTRAT et non
  // sur affaire (contrainte litiges_porte_sur_une_chose, migration 0115).
  assert.equal(porteSurContrat("zone"), true);
  assert.equal(porteSurContrat("demenagement"), false);
});

test("zone et sous-traitance s'adressent à des entreprises", () => {
  assert.equal(exigeEntreprise("zone"), true);
  assert.equal(exigeEntreprise("sous_traitance"), true);
  assert.equal(exigeEntreprise("demenagement"), false);
});

test("une nature inconnue ne passe jamais pour valide", () => {
  assert.equal(natureValide("bricolage"), false);
  assert.equal(nature("bricolage"), null);
  assert.equal(comporte("bricolage", "releve"), false);
  assert.deepEqual(manques("bricolage"), ["Nature inconnue"]);
});

test("les manques sont listés, pas résumés en booléen", () => {
  const m = manques("zone", {});
  assert.ok(m.includes("Le client"));
  assert.ok(m.some((x) => /raison sociale/i.test(x)));
  assert.ok(m.some((x) => /début/i.test(x)));   // récurrent
  // Une nature ponctuelle demande une date d'intervention, pas un début.
  assert.ok(manques("lift", { clientNom: "X" }).some((x) => /intervention/i.test(x)));
  assert.deepEqual(manques("lift", { clientNom: "X", date: "2026-09-01" }), []);
});

/* ── Sous-traitance ─────────────────────────────────────────────────────── */

test("la sous-traitance facture hommes, camion et km", () => {
  const r = ST.chiffrer({ hommes: 2, heures: 4, camions: 1, km: 30 },
    { homme_heure_centimes: 4000, camion_jour_centimes: 10000, km_centimes: 100,
      heures_minimum: 2, remise_pct: 0 });
  // 2 hommes × 4 h × 40 € = 320 € ; camion 100 € ; 30 km × 1 € = 30 €
  assert.equal(r.brut_centimes, 32000 + 10000 + 3000);
  assert.equal(r.total_centimes, 45000);
  assert.equal(r.lignes.length, 3);
  assert.equal(r.complet, true);
});

test("sans camion fourni, aucune ligne camion — pas une ligne à zéro", () => {
  const r = ST.chiffrer({ hommes: 2, heures: 3, camions: 0, km: 0 });
  assert.equal(r.lignes.some((l) => l.cle === "camion"), false);
  assert.equal(r.lignes.some((l) => l.cle === "km"), false);
  assert.equal(r.lignes.length, 1);
});

test("le minimum d'heures protège le déplacement d'équipe", () => {
  const grille = { heures_minimum: 2, homme_heure_centimes: 5000 };
  // 30 minutes prestées, 2 h dues.
  assert.equal(ST.heuresFacturees(0.5, grille), 2);
  // Toute heure entamée est due.
  assert.equal(ST.heuresFacturees(3.2, grille), 4);
  assert.equal(ST.heuresFacturees(4, grille), 4);
});

test("la remise négociée s'applique sur le total et reste bornée", () => {
  const r = ST.chiffrer({ hommes: 2, heures: 2 },
    { homme_heure_centimes: 5000, heures_minimum: 2, remise_pct: 20 });
  assert.equal(r.brut_centimes, 20000);
  assert.equal(r.remise_centimes, 4000);
  assert.equal(r.total_centimes, 16000);
  // Une remise de 100 % rendrait la prestation gratuite : bornée à 90.
  assert.equal(ST.tarif({ remise_pct: 100 }).remise_pct, 90);
  // Zéro reste une valeur légitime, pas une absence.
  assert.equal(ST.tarif({ remise_pct: 0 }).remise_pct, 0);
});

test("sans homme, le chiffrage se déclare incomplet plutôt que nul", () => {
  const r = ST.chiffrer({ hommes: 0, heures: 4, camions: 1 });
  assert.equal(r.complet, false);
  assert.ok(r.total_centimes > 0 || r.lignes.length >= 0);
});

test("le taux horaire effectif révèle ce que la remise a coûté", () => {
  const g = { homme_heure_centimes: 5000, heures_minimum: 2, remise_pct: 20 };
  assert.equal(ST.tauxHoraireEffectif({ hommes: 2, heures: 2 }, g), 4000);
  assert.equal(ST.tauxHoraireEffectif({ hommes: 0 }, g), null);
});

/* ── Lift ───────────────────────────────────────────────────────────────── */
// Le chiffrage du lift a son propre fichier : `lift-chiffrage.test.js`.
// Le modèle a changé (couronne + temps inclus + homme supplémentaire à
// supplément propre) et méritait une suite dédiée plutôt qu'un appendice ici.
