// Tests — Conformité : échéances légales. Critique : ce sont des délais RGPD
// opposables (art. 12.3 : 1 mois ; art. 33 : 72h), une erreur ici a un coût légal.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  echeanceDemandeRGPD, echeanceNotificationIncident, eligibleMinimisation,
} from "../src/conformite/retention.js";

const REF = new Date("2026-07-15T00:00:00Z");

// --- Demande RGPD (30 jours) -------------------------------------------------

test("echeanceDemandeRGPD calcule l'échéance à 30 jours de la réception", () => {
  const e = echeanceDemandeRGPD("2026-07-01", REF);
  assert.equal(e.echeance, "2026-07-31");
  assert.equal(e.depassee, false);
  assert.equal(e.joursRestants, 16);
});

test("echeanceDemandeRGPD détecte un dépassement", () => {
  const e = echeanceDemandeRGPD("2026-05-01", REF); // largement dépassé
  assert.equal(e.depassee, true);
  assert.ok(e.joursRestants < 0);
});

test("echeanceDemandeRGPD accepte un délai légal personnalisé (extension motivée)", () => {
  const e = echeanceDemandeRGPD("2026-07-01", REF, 60); // extension à 2 mois
  assert.equal(e.depassee, false);
});

// --- Incident de sécurité (72 heures) ----------------------------------------

test("echeanceNotificationIncident calcule l'échéance à 72h de la découverte", () => {
  const decouverte = "2026-07-15T00:00:00Z";
  const ref = new Date("2026-07-15T10:00:00Z"); // 10h après découverte
  const e = echeanceNotificationIncident(decouverte, ref);
  assert.equal(e.depassee, false);
  assert.equal(e.heuresRestantes, 62); // 72 - 10
});

test("echeanceNotificationIncident détecte un dépassement des 72h", () => {
  const decouverte = "2026-07-10T00:00:00Z";
  const e = echeanceNotificationIncident(decouverte, REF); // 5 jours après
  assert.equal(e.depassee, true);
});

// --- Éligibilité à la minimisation --------------------------------------------

test("eligibleMinimisation : inactif depuis plus de 3 ans → éligible", () => {
  assert.equal(eligibleMinimisation("2022-01-01", REF, 3), true);
});

test("eligibleMinimisation : activité récente → non éligible", () => {
  assert.equal(eligibleMinimisation("2026-06-01", REF, 3), false);
});

test("eligibleMinimisation : pile au seuil → éligible (limite incluse)", () => {
  assert.equal(eligibleMinimisation("2023-07-15", REF, 3), true);
});
