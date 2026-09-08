// =============================================================================
// DESKTOP — le shell « scène » a été ABANDONNÉ (décision du 01/09/2026).
// Retenu : une colonne fluide qui épouse l'écran (voir cadre-pc.test.js).
// Ce fichier garde l'abandon pour ne pas laisser un test orphelin actif.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "apps", "web", "src");

test("le shell desktop (scène/rail) a bien été retiré", () => {
  // Le composant n'existe plus.
  assert.equal(existsSync(join(APP, "composants/CadreBureau.jsx")), false);
  // main.jsx ne l'importe ni ne l'utilise.
  const main = readFileSync(join(APP, "main.jsx"), "utf8");
  assert.equal(/CadreBureau|useEstBureau|estBureau/.test(main), false);
});
