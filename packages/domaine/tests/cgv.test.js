// Tests — CGV versionnées. Critique : une offre signée doit rejouer SES CGV,
// jamais les dernières en date (C-02).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  cgv, CGV_VERSION_COURANTE, PRESTATIONS_INCLUSES, ACOMPTE_PCT,
} from "../src/documents/cgv.js";

test("la version courante renvoie les 7 articles", () => {
  assert.equal(cgv(CGV_VERSION_COURANTE).length, 7);
  assert.match(cgv(1)[0], /acompte de 30 %/i);
});

test("une version inconnue ne retombe PAS sur la dernière (document faux interdit)", () => {
  assert.deepEqual(cgv(99), []);
});

test("les CGV sont immuables (gel de l'objet)", () => {
  const articles = cgv(1);
  assert.throws(() => { articles[0] = "modifié"; });
});

test("les constantes commerciales sont exposées", () => {
  assert.equal(ACOMPTE_PCT, 30);
  assert.equal(PRESTATIONS_INCLUSES.length, 3);
});
