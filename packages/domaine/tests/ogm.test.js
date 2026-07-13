// Tests — OGM (communication structurée belge). Critique : une OGM fausse
// casse le rapprochement bancaire automatique ; le mod 97 doit être exact.

import { test } from "node:test";
import assert from "node:assert/strict";

import { genererOGM, ogmValide, decomposerNumero } from "../src/facturation/ogm.js";

test("genererOGM produit un format belge valide et déterministe", () => {
  const a = genererOGM(1, 2026);
  const b = genererOGM(1, 2026);
  assert.equal(a, b);                       // déterministe (rejouable à vie)
  assert.match(a, /^\+\+\+\d{3}\/\d{4}\/\d{5}\+\+\+$/);
  assert.equal(ogmValide(a), true);         // clé mod 97 correcte
});

test("genererOGM : le reste 0 s'écrit 97 (règle belge)", () => {
  // Cherche une base dont le mod 97 vaut 0 pour couvrir la branche.
  let trouve = null;
  for (let s = 1; s < 200; s++) {
    const base = `2026${String(s).padStart(6, "0")}`;
    if (Number(BigInt(base) % 97n) === 0) { trouve = s; break; }
  }
  assert.ok(trouve, "aucune séquence de test trouvée");
  const ogm = genererOGM(trouve, 2026);
  assert.equal(ogm.slice(-5, -3), "97");
  assert.equal(ogmValide(ogm), true);
});

test("ogmValide rejette les formats et clés invalides", () => {
  assert.equal(ogmValide("+++123/4567/89012+++"), false);  // clé fausse
  assert.equal(ogmValide("123/4567/89012"), false);         // format faux
  assert.equal(ogmValide(""), false);
});

test("decomposerNumero lit le numéro légal AAAA-NNNNNN", () => {
  assert.deepEqual(decomposerNumero("2026-000042"), { annee: 2026, sequence: 42 });
  assert.equal(decomposerNumero("facture-1"), null);
});
