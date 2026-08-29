// =============================================================================
// LA COMMUNICATION DE FACTURE (vague 1, lot B) — stockée, donc rapprochable.
//
// Défaut corrigé : l'OGM était calculée au PDF et jamais gardée. Ces tests
// verrouillent la cohérence de la valeur qu'on stocke désormais à l'émission.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { genererOGM, ogmValide, decomposerNumero } from "../src/facturation/ogm.js";

test("l'OGM produite est toujours valide (aller-retour)", () => {
  // Ce qu'on stocke doit se rapprocher : générer puis valider doit tenir.
  for (const [a, s] of [[2026, 1], [2026, 42], [2025, 123456], [2026, 97]]) {
    const ogm = genererOGM(s, a);
    assert.equal(ogmValide(ogm), true, `${ogm} devrait être valide`);
  }
});

test("ogmValide REJETTE une communication corrompue ou mal formée", () => {
  // Sans ce test, une validation qui accepte tout passerait inaperçue —
  // et un paiement se rapprocherait de la mauvaise facture.
  assert.equal(ogmValide("+++202/6000/00193+++"), false, "clé fausse (192 attendu)");
  assert.equal(ogmValide("+++202/6000/0019+++"), false, "trop court");
  assert.equal(ogmValide("2026-000001"), false, "pas une OGM");
  assert.equal(ogmValide(""), false);
  assert.equal(ogmValide(null), false);
});

test("le numéro de facture (fallback libre) n'est PAS pris pour une OGM", () => {
  // Quand communication_structuree = false, on stocke le numéro « 2026-000001 ».
  // Le PDF doit l'afficher comme communication LIBRE, pas structurée.
  assert.equal(ogmValide("2026-000001"), false);
  assert.equal(/^\+\+\+/.test("2026-000001"), false);
  // À l'inverse, une vraie OGM commence par +++.
  assert.equal(/^\+\+\+/.test(genererOGM(1, 2026)), true);
});

test("decomposerNumero relit le format légal AAAA-NNNNNN", () => {
  assert.deepEqual(decomposerNumero("2026-000042"), { annee: 2026, sequence: 42 });
  assert.equal(decomposerNumero("bricole"), null);
});

test("une clé de contrôle nulle s'écrit 97, jamais 00", () => {
  // Invariant de la convention belge. On cherche un cas où base % 97 === 0.
  let trouve = false;
  for (let s = 1; s < 200 && !trouve; s++) {
    const base = BigInt(`2026${String(s).padStart(6, "0")}`.slice(0, 10));
    if (base % 97n === 0n) {
      trouve = true;
      assert.ok(genererOGM(s, 2026).endsWith("97+++"),
        "un reste de 0 doit donner une clé 97");
    }
  }
  // Si aucun cas dans la plage, le test ne prouve rien mais ne ment pas.
});
