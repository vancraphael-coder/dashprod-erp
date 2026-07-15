// Tests — Matériel d'emballage (E/U/R). Critique : l'écart révèle la fuite de
// marge invisible ; les fournitures alimentent l'offre signée.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CATALOGUE_EMBALLAGE, resumeEmballage, fournituresOffre,
} from "../src/stocks/emballage.js";

test("resumeEmballage : équilibre atteint → aucun écart", () => {
  const r = resumeEmballage({ std: { e: 30, u: 20, r: 10 } });
  const std = r.lignes.find((l) => l.cle === "std");
  assert.equal(std.coherent, true);
  assert.equal(std.ecart, 0);
  assert.deepEqual(r.ecarts, []);
  assert.equal(r.totalUtilise, 20);
});

test("resumeEmballage : matériel non justifié → écart signalé", () => {
  // 30 partis, 20 utilisés, 5 repris → 5 manquants.
  const r = resumeEmballage({ std: { e: 30, u: 20, r: 5 } });
  assert.equal(r.ecarts.length, 1);
  assert.equal(r.ecarts[0].ecart, 5);
  assert.equal(r.ecarts[0].nom, "Carton standard");
});

test("resumeEmballage : rien de sorti → pas d'écart fantôme", () => {
  const r = resumeEmballage({});
  assert.deepEqual(r.ecarts, []);
  assert.equal(r.totalUtilise, 0);
  assert.equal(r.lignes.length, CATALOGUE_EMBALLAGE.length);
});

test("fournituresOffre : seul l'UTILISÉ est fourni, avec accord du pluriel", () => {
  const f = fournituresOffre({
    std: { e: 30, u: 20, r: 10 },
    livre: { e: 5, u: 1, r: 4 },
    tape: { e: 3, u: 0, r: 3 },     // rien d'utilisé → absent
  });
  assert.deepEqual(f, ["20 cartons standard", "1 carton livre"]);
});

test("fournituresOffre : rien d'utilisé → liste vide (aucune ligne sur l'offre)", () => {
  assert.deepEqual(fournituresOffre({ std: { e: 10, u: 0, r: 10 } }), []);
  assert.deepEqual(fournituresOffre(null), []);
});
