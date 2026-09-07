// =============================================================================
// LE SHELL DESKTOP — rail latéral, sans casser le mobile.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "apps", "web", "src");
const cadre = readFileSync(join(APP, "composants/CadreBureau.jsx"), "utf8");
const main = readFileSync(join(APP, "main.jsx"), "utf8");

test("sur mobile, le shell est TRANSPARENT (rend ses enfants tels quels)", () => {
  // Sans ce passthrough, le mobile hériterait d'un rail : régression.
  assert.match(cadre, /if \(!bureau\) return children/);
  assert.match(cadre, /const SEUIL = \d+/);
});

test("le seuil desktop est réactif au redimensionnement", () => {
  assert.match(cadre, /useEstBureau/);
  assert.match(cadre, /matchMedia/);
  assert.match(cadre, /addEventListener\?\.\("change"/);
});

test("le rail et la barre du bas partagent LES MÊMES entrées", () => {
  // Une seule source d'items : rail (desktop) et barre (mobile) ne divergent pas.
  assert.match(main, /function itemsNav/);
  assert.match(main, /items=\{itemsNav\(/);
});

test("la barre du bas ne s'affiche QUE sur mobile", () => {
  // Sur desktop, le rail la remplace : deux navigations à la fois = faute.
  assert.match(main, /!estBureau && RACINES\.includes/);
});

test("le rail anime : galet qui glisse + feutre au tracé", () => {
  // L'exigence « fluide » : l'onglet actif se suit à l'œil.
  assert.match(cadre, /\.dp-galet/);
  assert.match(cadre, /stroke-dashoffset: 0/);
  // Et le mouvement réduit est respecté.
  assert.match(cadre, /prefers-reduced-motion/);
});
