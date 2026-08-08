// Tests — Matériel d'emballage (E/U/R). Nouvelle règle : util. = enl. − rep.
// Le chef compte ce qu'il rapporte (repris) ; l'utilisé se déduit. Le seul
// écart possible est de reprendre plus qu'on a sorti (saisie incohérente).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CATALOGUE_EMBALLAGE, resumeEmballage, fournituresOffre,
} from "../src/stocks/emballage.js";
import { utiliseCalcule } from "../src/stocks/stock.js";

test("utiliseCalcule : util. = enl. − rep., jamais négatif", () => {
  assert.equal(utiliseCalcule(30, 10), 20);
  assert.equal(utiliseCalcule(5, 5), 0);
  assert.equal(utiliseCalcule(3, 10), 0, "reprendre plus que sorti ne donne pas un négatif");
  assert.equal(utiliseCalcule(0, 0), 0);
});

test("resumeEmballage : util. se déduit de enl. − rep.", () => {
  const r = resumeEmballage({ std: { e: 30, r: 10 } });
  const std = r.lignes.find((l) => l.cle === "std");
  assert.equal(std.u, 20, "20 utilisés = 30 sortis − 10 repris");
  assert.equal(std.coherent, true);
  assert.equal(std.ecart, 0);
  assert.equal(r.totalUtilise, 20);
});

test("resumeEmballage : tout repris → rien d'utilisé, cohérent", () => {
  const r = resumeEmballage({ std: { e: 30, r: 30 } });
  const std = r.lignes.find((l) => l.cle === "std");
  assert.equal(std.u, 0);
  assert.deepEqual(r.ecarts, []);
});

test("resumeEmballage : reprendre plus que sorti → écart signalé", () => {
  const r = resumeEmballage({ std: { e: 10, r: 15 } });
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

test("fournituresOffre : l'utilisé (déduit) alimente l'offre, pluriel accordé", () => {
  const f = fournituresOffre({
    std: { e: 30, r: 10 },     // 20 utilisés
    livre: { e: 5, r: 4 },     // 1 utilisé
    tape: { e: 3, r: 3 },      // 0 utilisé → absent
  });
  assert.deepEqual(f, ["20 cartons standard", "1 carton livre"]);
});

test("fournituresOffre : tout repris → liste vide", () => {
  assert.deepEqual(fournituresOffre({ std: { e: 10, r: 10 } }), []);
  assert.deepEqual(fournituresOffre(null), []);
});
