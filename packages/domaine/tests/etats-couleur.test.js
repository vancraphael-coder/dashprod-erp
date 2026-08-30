// =============================================================================
// COULEURS D'ÉTAT (remarque R9) — « Envoyé » et « Confirmé » sont distincts.
//
// Remarque de l'atelier : les deux états partageaient la même couleur alors
// qu'ils veulent dire des choses différentes (offre partie vs client a validé).
// Ce test empêche que la distinction se reperde silencieusement.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RACINE = new URL("../../..", import.meta.url).pathname;
const lire = (p) => readFileSync(join(RACINE, p), "utf8");

test("« Envoyé » a sa PROPRE clé de couleur, distincte de « Confirmé »", () => {
  const theme = lire("apps/web/src/lib/theme.jsx");
  // La ligne envoye ne doit plus pointer vers la couleur "confirme".
  const ligneEnvoye = theme.split("\n").find((l) => l.includes("envoye:") && l.includes("couleur"));
  assert.ok(ligneEnvoye, "la ligne envoye doit exister");
  assert.match(ligneEnvoye, /"etats", "envoye"/,
    "« Envoyé » doit lire sa propre clé de couleur, pas celle de confirme");
});

test("la clé de couleur « envoye » est définie dans l'apparence", () => {
  const app = lire("apps/web/src/lib/apparence.js");
  assert.match(app, /cle: "envoye"/, "la clé envoye doit être réglable");
});

test("le badge « Envoyé » est en attente (contour), pas plein comme un état acté", () => {
  const theme = lire("apps/web/src/lib/theme.jsx");
  assert.match(theme, /enAttente = etat === "envoye"/,
    "le badge doit traiter « Envoyé » comme un état en attente");
});
