// Tests — Moteur de chiffrage. Partie LA PLUS critique du produit (S5).
// Chaque montant attendu est calculé à la main depuis les tarifs validés.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  calculerScenario, comparerScenarios, zoneMarge, indemnite,
} from "../src/chiffrage/moteur.js";
import { versEuros, tva, htvaDepuisTvac } from "../src/commun/monnaie.js";

// --- Régime tarifaire (horaire simple) --------------------------------------

test("tarifaire : 3 dém. × 6 h à 130 € = 780 € HTVA, TVAC 943,80 €", () => {
  // 6 × 130 = 780 HTVA ; TVA 21 % = 163,80 ; TVAC = 943,80
  const s = calculerScenario({
    formule: "tarifaire", nbDemenageurs: 3, heures: 6, nbCamions: 1, km: 0,
    elevateur: false,
  });
  assert.equal(s.htva, 780);
  assert.equal(s.tva, 163.8);
  assert.equal(s.tvac, 943.8);
});

test("tarifaire : élévateur (+150) et km (20 × 1 × 2 camions = 40) s'ajoutent", () => {
  // 6×130=780 ; +150 élévateur ; +40 km = 970 HTVA
  const s = calculerScenario({
    formule: "tarifaire", nbDemenageurs: 3, heures: 6, nbCamions: 2, km: 20,
    elevateur: true,
  });
  assert.equal(s.htva, 970);
});

test("tarifaire : km multipliés par le nombre de camions", () => {
  // 10 km × 1 € × 3 camions = 30 ; + 4×170=680 => 710
  const s = calculerScenario({
    formule: "tarifaire", nbDemenageurs: 4, heures: 4, nbCamions: 3, km: 10,
    elevateur: false,
  });
  assert.equal(s.htva, 710);
});

// --- Régime tarifaire + emballage -------------------------------------------

test("emballage : ajoute 75 €/h et 0,75 €/km d'emballage en régie", () => {
  // base 3×6×130=780 ; emballage 4 h × 75 = 300 ; 12 km × 0,75 = 9 => 1089
  const s = calculerScenario({
    formule: "emballage", nbDemenageurs: 3, heures: 6, nbCamions: 1, km: 0,
    elevateur: false, heuresEmballage: 4, kmEmballage: 12,
  });
  assert.equal(s.htva, 1089);
});

// --- Régime forfait ----------------------------------------------------------

test("forfait : HTVA déduit d'un TVAC ferme de 1210 € => 1000 € HTVA", () => {
  // 1210 / 1,21 = 1000 HTVA ; TVA 210 ; TVAC 1210
  const s = calculerScenario({
    formule: "forfait", forfaitTvacEuros: 1210,
  });
  assert.equal(s.htva, 1000);
  assert.equal(s.tvac, 1210);
});

// --- Remise ------------------------------------------------------------------

test("remise de 10 % s'applique à la recette horaire", () => {
  // 780 − 10 % = 702
  const s = calculerScenario({
    formule: "tarifaire", nbDemenageurs: 3, heures: 6, nbCamions: 1, km: 0,
    elevateur: false, remisePct: 10,
  });
  assert.equal(s.htva, 702);
});

// --- Marge et zones ----------------------------------------------------------

test("marge : recette 780, coûts 500 => marge 280, 35,9 %, zone dans_cible", () => {
  const s = calculerScenario(
    { formule: "tarifaire", nbDemenageurs: 3, heures: 6, nbCamions: 1, km: 0, elevateur: false },
    { mainOeuvreEuros: 400, carburantEuros: 60, materielEuros: 40 } // 500
  );
  assert.equal(s.marge, 280);
  assert.equal(s.marge_pct, 35.9); // 280/780 = 35,897 → 35,9
  assert.equal(s.zone, "dans_cible");
});

test("zones de marge : sous_cible < 25 <= dans_cible <= 45 < premium", () => {
  assert.equal(zoneMarge(10), "sous_cible");
  assert.equal(zoneMarge(25), "dans_cible");
  assert.equal(zoneMarge(45), "dans_cible");
  assert.equal(zoneMarge(60), "premium");
});

test("marge à recette nulle ne divise pas par zéro", () => {
  const s = calculerScenario({ formule: "forfait", forfaitTvacEuros: 0 });
  assert.equal(s.marge_pct, 0);
});

// --- Barème absent -----------------------------------------------------------

test("un effectif hors barème lève une erreur explicite", () => {
  assert.throws(
    () => calculerScenario({ formule: "tarifaire", nbDemenageurs: 9, heures: 4, nbCamions: 1, km: 0 }),
    /Barème absent pour 9/
  );
});

// --- Comparaison de scénarios ------------------------------------------------

test("comparerScenarios chiffre chaque variante nommée", () => {
  const res = comparerScenarios([
    { nom: "3 dém.", faits: { formule: "tarifaire", nbDemenageurs: 3, heures: 8, nbCamions: 1, km: 0, elevateur: false } },
    { nom: "4 dém.", faits: { formule: "tarifaire", nbDemenageurs: 4, heures: 6, nbCamions: 1, km: 0, elevateur: false } },
  ]);
  assert.equal(res.length, 2);
  assert.equal(res[0].nom, "3 dém.");
  assert.equal(res[0].scenario.htva, 1040); // 8×130
  assert.equal(res[1].scenario.htva, 1020); // 6×170
});

// --- Indemnités report / annulation (C-23) ----------------------------------

test("report : barème 25 / 50 / 75 % selon la distance à la date", () => {
  const tvac = 100000; // 1000,00 € en centimes
  assert.equal(indemnite(tvac, 10, "report").pct, 25); // ≥ 5 jours
  assert.equal(indemnite(tvac, 5, "report").pct, 25);  // pile 5 jours
  assert.equal(indemnite(tvac, 4, "report").pct, 50);  // entre 2 et 4
  assert.equal(indemnite(tvac, 2, "report").pct, 50);  // pile 2 jours
  assert.equal(indemnite(tvac, 1, "report").pct, 75);  // veille
  assert.equal(indemnite(tvac, 0, "report").pct, 75);  // jour même
});

test("annulation : barème 50 / 70 / 100 % et montant calculé", () => {
  const tvac = 100000; // 1000,00 €
  assert.equal(indemnite(tvac, 10, "annulation").pct, 50);
  assert.equal(indemnite(tvac, 3, "annulation").pct, 70);
  assert.equal(indemnite(tvac, 0, "annulation").pct, 100);
  // montant : 70 % de 1000 = 700
  assert.equal(indemnite(tvac, 3, "annulation").montant, 700);
});

// --- Monnaie (garde-fous virgule flottante) ---------------------------------

test("monnaie : htvaDepuisTvac et tva sont cohérents", () => {
  assert.equal(versEuros(htvaDepuisTvac(12100, 21)), 100); // 121,00 TVAC → 100 HTVA
  assert.equal(versEuros(tva(10000, 21)), 21);             // 100 HTVA → 21 TVA
});
