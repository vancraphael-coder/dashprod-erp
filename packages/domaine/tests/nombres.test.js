// Tests — le remède au piège Number(null) === 0, payé six fois.
import test from "node:test";
import assert from "node:assert/strict";
import { nombre, ouDefaut, estFourni, borne } from "../src/noyau/nombres.js";

test("le piège lui-même : Number() confond absence et zéro", () => {
  // Ce test documente POURQUOI ce module existe.
  assert.equal(Number(null), 0);
  assert.equal(Number(""), 0);
  assert.equal(Number.isFinite(Number(null)), true, "0 est fini — d'où le piège");
});

test("nombre() distingue l'absence du zéro", () => {
  assert.ok(Number.isNaN(nombre(null)));
  assert.ok(Number.isNaN(nombre(undefined)));
  assert.ok(Number.isNaN(nombre("")));
  assert.ok(Number.isNaN(nombre("   ")));
  assert.ok(Number.isNaN(nombre("abc")));
});

test("un zéro EXPLICITE reste un zéro", () => {
  assert.equal(nombre(0), 0);
  assert.equal(nombre("0"), 0);
  assert.equal(estFourni(0), true, "0 est une valeur, pas une absence");
});

test("ouDefaut respecte un zéro voulu et comble une absence", () => {
  assert.equal(ouDefaut(0, 21), 0, "un taux 0 % voulu (export hors UE) est respecté");
  assert.equal(ouDefaut(null, 21), 21);
  assert.equal(ouDefaut("", 21), 21);
  assert.equal(ouDefaut(6, 21), 6);
});

test("borne encadre les saisies aberrantes", () => {
  assert.equal(borne(9999, 10, 1, 90), 90);
  assert.equal(borne(-5, 10, 1, 90), 1);
  assert.equal(borne(null, 10, 1, 90), 10);
  assert.equal(borne(15, 10, 1, 90), 15);
});
