// =============================================================================
// LES CENTRES et le TRANSFERT DE MEMBRES — maison mère = null, transfert par lot.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  MAISON_MERE, centreOuMaisonMere, preparerTransfert, resumeTransfert,
  membresDuCentre,
} from "../src/organisation/centres.js";

const MEMBRES = [
  { id: "a", nom: "Ana", centre_id: null },        // maison mère
  { id: "b", nom: "Bob", centre_id: "anvers" },
  { id: "c", nom: "Cyril", centre_id: "anvers" },
  { id: "d", nom: "Dan", centre_id: "gand" },
];

test("la maison mère est l'absence de centre, pas une ligne", () => {
  // CE QUI CASSE SANS CE TEST : représenter la maison mère par un vrai id
  // créerait deux vérités (« centre_id null » ET « centre_id = maison-mère »)
  // qu'on finirait par désaccorder. `null`, `""` et « maison_mere » se ramènent
  // tous à MAISON_MERE.
  assert.equal(MAISON_MERE, null);
  assert.equal(centreOuMaisonMere(null), null);
  assert.equal(centreOuMaisonMere(""), null);
  assert.equal(centreOuMaisonMere("maison_mere"), null);
  assert.equal(centreOuMaisonMere("anvers"), "anvers");
});

test("un transfert ne compte QUE ceux qui bougent vraiment", () => {
  // CE QUI CASSE SANS CE TEST : réafficher « 3 transférés » quand 2 étaient
  // déjà à destination donne un compte-rendu faux et inquiétant.
  const p = preparerTransfert(MEMBRES, ["a", "b", "c"], "anvers");
  assert.deepEqual(p.aTransferer.map((m) => m.id), ["a"], "seule Ana bouge");
  assert.deepEqual(p.deja.map((m) => m.id).sort(), ["b", "c"], "Bob et Cyril y sont");
});

test("cliquer deux fois la même personne ne la transfère pas deux fois", () => {
  const p = preparerTransfert(MEMBRES, ["a", "a", "a"], "gand");
  assert.equal(p.aTransferer.length, 1);
});

test("on peut transférer vers la maison mère comme vers un centre", () => {
  const p = preparerTransfert(MEMBRES, ["b", "d"], MAISON_MERE);
  assert.deepEqual(p.aTransferer.map((m) => m.id).sort(), ["b", "d"]);
  assert.equal(p.destination, null);
});

test("le compte-rendu se lit, au singulier comme au pluriel", () => {
  assert.match(resumeTransfert(preparerTransfert(MEMBRES, ["a"], "anvers"), "Anvers"),
    /^1 membre vers Anvers\.$/);
  // b est déjà à Anvers, d vient de Gand : 1 bouge, 1 y était.
  assert.match(resumeTransfert(preparerTransfert(MEMBRES, ["b", "d"], "anvers"), "Anvers"),
    /1 membre vers Anvers \(1 y était déjà\)/);
  assert.match(resumeTransfert(preparerTransfert(MEMBRES, ["b"], "anvers"), "Anvers"),
    /déjà/);
  assert.match(resumeTransfert(preparerTransfert(MEMBRES, ["d"], MAISON_MERE), null),
    /la maison mère/);
  assert.match(resumeTransfert(preparerTransfert(MEMBRES, [], "anvers"), "Anvers"),
    /Aucun membre/);
});

test("membresDuCentre range chacun, maison mère comprise", () => {
  assert.deepEqual(membresDuCentre(MEMBRES, "anvers").map((m) => m.id), ["b", "c"]);
  assert.deepEqual(membresDuCentre(MEMBRES, MAISON_MERE).map((m) => m.id), ["a"]);
  assert.deepEqual(membresDuCentre(MEMBRES, "gand").map((m) => m.id), ["d"]);
  assert.deepEqual(membresDuCentre(MEMBRES, "inexistant"), []);
});

test("les listes vides ne font pas tomber la préparation", () => {
  assert.deepEqual(preparerTransfert([], ["a"], "anvers").aTransferer, []);
  assert.deepEqual(preparerTransfert(MEMBRES, [], "anvers").aTransferer, []);
  assert.deepEqual(membresDuCentre(null, "anvers"), []);
});
