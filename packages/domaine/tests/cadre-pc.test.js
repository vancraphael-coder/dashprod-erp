// =============================================================================
// LE CADRE PC — consolidation grand écran, sans casser le mobile.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "apps", "web", "src");
const cadre = readFileSync(join(APP, "lib/cadre-pc.js"), "utf8");

test("le cadre PC ne s'active qu'au-dessus d'un seuil bureau", () => {
  // En dessous, le mobile doit rester intact : tout est sous @media min-width.
  assert.match(cadre, /const SEUIL = \d+/);
  assert.match(cadre, /@media \(min-width: \$\{SEUIL\}px\)/);
});

test("le contenu garde une largeur de LECTURE, il ne s'étire pas", () => {
  // La faute serait d'élargir le contenu à tout l'écran : illisible.
  assert.match(cadre, /max-width: \$\{largeurApp\}/);
  assert.match(cadre, /width: \$\{largeurApp\}/);
});

test("il vise UN hôte unique, il ne touche aucun écran", () => {
  // Non invasif : un seul sélecteur d'hôte, pas de modification par écran.
  assert.match(cadre, /\.dp-cadre-pc-hote > div/);
});

test("le cadre s'adapte au mode nuit", () => {
  assert.match(cadre, /nuit\s*\?/);
});

test("l'app est enveloppée par l'hôte du cadre", () => {
  const main = readFileSync(join(APP, "main.jsx"), "utf8");
  assert.match(main, /dp-cadre-pc-hote/);
  // Et la largeur vient d'une source unique, pas d'un 520 recopié.
  const theme = readFileSync(join(APP, "lib/theme.jsx"), "utf8");
  assert.match(theme, /export const LARGEUR_APP = \d+/);
  assert.match(theme, /installerCadrePc/);
});
