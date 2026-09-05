// =============================================================================
// R10 — l'émission d'une facture passe par une CONFIRMATION.
// Émettre est irréversible (numéro légal, immuabilité) : un clic seul ne suffit
// pas. Garde de structure sur le source de l'écran Facture.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RACINE = new URL("../../..", import.meta.url).pathname;
const facture = readFileSync(join(RACINE, "apps/web/src/ecrans/Facture.jsx"), "utf8");

test("le bouton d'émission ouvre une confirmation, il n'émet pas directement", () => {
  // Avant : onClick={emettre}. Après : onClick ouvre confirmerEmission.
  assert.match(facture, /setConfirmerEmission\(true\)/);
  assert.match(facture, /confirmerEmission \?/);
});

test("la confirmation d'émission rappelle le montant et l'immuabilité", () => {
  // On ne fige pas un numéro légal sans redire ce que ça implique.
  assert.match(facture, /Émettre cette facture pour/);
  assert.match(facture, /IMMUABLE/);
  assert.match(facture, /onConfirmer=\{emettre\}/);
});
