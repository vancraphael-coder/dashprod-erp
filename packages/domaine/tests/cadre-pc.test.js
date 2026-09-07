// =============================================================================
// CADRE PC — REMPLACÉ par le shell à rail (CadreBureau, 01/09/2026).
// L'ancien « cadre redimensionné » (app encadrée sur fond) a été révoqué.
// Ce fichier reste pour ne pas laisser un test orphelin pointer du code
// disparu ; les vraies garanties sont dans cadre-bureau.test.js.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "apps", "web", "src");

test("l'ancien cadre-pc redimensionné a bien été révoqué", () => {
  // theme.jsx ne doit plus installer l'ancien cadre.
  const theme = readFileSync(join(APP, "lib/theme.jsx"), "utf8");
  assert.equal(/installerCadrePc/.test(theme), false);
  // main.jsx ne doit plus envelopper dans l'hôte du cadre redimensionné.
  const main = readFileSync(join(APP, "main.jsx"), "utf8");
  assert.equal(/dp-cadre-pc-hote/.test(main), false);
  // La nouvelle identité desktop passe par le shell à rail.
  assert.match(main, /CadreBureau/);
});
