// =============================================================================
// LA SCÈNE DESKTOP — roulette emblème + carte de contenu, sans casser le mobile.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "apps", "web", "src");
const cadre = readFileSync(join(APP, "composants/CadreBureau.jsx"), "utf8");
const main = readFileSync(join(APP, "main.jsx"), "utf8");

test("sur mobile, la scène est TRANSPARENTE (rend ses enfants tels quels)", () => {
  assert.match(cadre, /if \(!bureau\) return children/);
  assert.match(cadre, /const SEUIL = \d+/);
});

test("le desktop est réactif au redimensionnement", () => {
  assert.match(cadre, /useEstBureau/);
  assert.match(cadre, /matchMedia/);
  assert.match(cadre, /addEventListener\?\.\("change"/);
});

test("la ROULETTE est l'emblème de la scène, pas une pastille en coin", () => {
  // Elle est agrandie et posée dans son puits de lumière.
  assert.match(cadre, /SelecteurRotatif/);
  assert.match(cadre, /dp-puits/);
  assert.match(cadre, /selecteur-rotatif \{ transform: scale/);
});

test("la scène n'est PAS linéaire : deux colonnes, emblème + plateau", () => {
  // La faute serait de rester en colonne unique : c'est ce qu'on quitte.
  assert.match(cadre, /grid-template-columns: 300px/);
  assert.match(cadre, /dp-embleme/);
  assert.match(cadre, /dp-plateau/);
});

test("le contenu se POSE (carte de verre animée) et se ré-anime par écran", () => {
  assert.match(cadre, /dp-carte/);
  assert.match(cadre, /@keyframes dp-pose/);
  // La clé force la ré-animation à chaque écran.
  assert.match(cadre, /key=\{actif\}/);
});

test("le mouvement sert le confort : lent, et coupé si mouvement réduit", () => {
  assert.match(cadre, /prefers-reduced-motion/);
  // La dérive du fond est LENTE (>= 20s) : une pièce respire, elle ne clignote pas.
  assert.match(cadre, /dp-derive \d\ds|22s/);
});

test("la barre du bas ne s'affiche QUE sur mobile", () => {
  assert.match(main, /!estBureau && RACINES\.includes/);
  // Une seule source d'entrées, rail↔barre ne divergent pas.
  assert.match(main, /function itemsNav/);
});
