// =============================================================================
// ÉTAPES DE LA JOURNÉE — la jauge ne ment pas, les boutons ne sautent pas.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import { etapesPour, etatEtapes, deplacer, momentDecompteSuggere }
  from "../src/operations/etapes-journee.js";

test("chaque type a sa séquence, un type inconnu prend celle du déménagement", () => {
  assert.deepEqual(etapesPour("visite").map((e) => e.cle), ["depart", "visite", "fin"]);
  assert.equal(etapesPour("demenagement").length, 6);
  assert.deepEqual(etapesPour("inconnu"), etapesPour("demenagement"));
});

test("pas commencé, en cours, terminé", () => {
  assert.equal(etatEtapes("demenagement", null).rang, 0);
  assert.equal(etatEtapes("demenagement", null).pct, 0);
  const e = etatEtapes("demenagement", "route");
  assert.equal(e.rang, 3); assert.equal(e.pct, 0.5);
  assert.equal(e.suivante.cle, "dechargement"); assert.equal(e.precedente.cle, "chargement");
  assert.equal(etatEtapes("demenagement", "fin").termine, true);
});

test("avancer et reculer d'UNE étape, jamais au-delà des bornes", () => {
  assert.deepEqual(deplacer("visite", null, +1), { cle: "depart", rang: 1 });
  assert.deepEqual(deplacer("visite", "depart", -1), { cle: null, rang: 0 });
  assert.equal(deplacer("visite", null, -1), null);
  assert.equal(deplacer("visite", "fin", +1), null);
});

test("une clé étrangère à la séquence repart de zéro au lieu d'afficher faux", () => {
  assert.equal(etatEtapes("visite", "dechargement").rang, 0);
});

test("l'étape suggère le moment du décompte", () => {
  assert.equal(momentDecompteSuggere("dechargement"), "avant_dechargement");
  assert.equal(momentDecompteSuggere("retour"), "avant_retour_depot");
  assert.equal(momentDecompteSuggere("route"), null);
});
