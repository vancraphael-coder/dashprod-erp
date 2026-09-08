// =============================================================================
// ADAPTATION DESKTOP — la colonne épouse l'écran, sans shell ni scène.
//
// Historique : deux tentatives de « design desktop » (cadre redimensionné, puis
// scène à roulette) ont été ABANDONNÉES. Le choix retenu est sobre : la colonne
// s'élargit par paliers en gardant une largeur de lecture. Ce test garde ce
// choix et empêche le retour d'un shell invasif.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "apps", "web", "src");
const theme = readFileSync(join(APP, "lib/theme.jsx"), "utf8");
const main = readFileSync(join(APP, "main.jsx"), "utf8");

test("aucun shell desktop invasif (ni cadre redimensionné, ni scène)", () => {
  assert.equal(/installerCadrePc/.test(theme), false);
  assert.equal(/dp-cadre-pc-hote/.test(main), false);
  assert.equal(/CadreBureau/.test(main), false);
});

test("la largeur de la colonne est fluide, par paliers", () => {
  // --dp-largeur pilote la colonne ; le mobile garde 520.
  assert.match(theme, /--dp-largeur: 520px/);
  assert.match(theme, /@media \(min-width: 1024px\) \{ :root \{ --dp-largeur:/);
  // S.page l'utilise, avec 520 en repli.
  assert.match(theme, /maxWidth: "var\(--dp-largeur, 520px\)"/);
});

test("les barres fixes suivent la MÊME largeur que la colonne", () => {
  // Sinon la barre du bas serait décalée d'une colonne élargie.
  assert.match(main, /maxWidth: "var\(--dp-largeur, 520px\)"/);
});
