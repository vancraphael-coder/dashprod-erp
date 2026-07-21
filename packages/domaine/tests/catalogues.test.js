// Tests — catalogues réglables par entreprise.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CATALOGUES_DEFAUT, LISTES_CATALOGUE, catalogue, estPersonnalise,
  normaliserArticle, coutsMateriel, valeurParcMateriel,
} from "../src/stocks/catalogues.js";

test("catalogue : repli sur le défaut si rien n'est réglé", () => {
  assert.deepEqual(catalogue({}, "pieces"), CATALOGUES_DEFAUT.pieces);
  assert.deepEqual(catalogue(null, "pieces"), CATALOGUES_DEFAUT.pieces);
  assert.deepEqual(catalogue({ pieces: [] }, "pieces"), CATALOGUES_DEFAUT.pieces);
});

test("catalogue : la liste de l'entreprise prime", () => {
  assert.deepEqual(catalogue({ pieces: ["Loft"] }, "pieces"), ["Loft"]);
  assert.equal(estPersonnalise({ pieces: ["Loft"] }, "pieces"), true);
  assert.equal(estPersonnalise({ pieces: [] }, "pieces"), false);
});

test("normaliserArticle : clé dérivée du nom, accents retirés", () => {
  const a = normaliserArticle({ nom: "Planche à roulettes", cout_centimes: 6500 });
  assert.equal(a.cle, "planche_a_roulettes");
  assert.equal(a.unite, "pièce");
  assert.equal(a.cout_centimes, 6500);
});

test("normaliserArticle : refuse un nom vide, borne un coût aberrant", () => {
  assert.equal(normaliserArticle({ nom: "  " }), null);
  assert.equal(normaliserArticle("", true), null);
  assert.equal(normaliserArticle({ nom: "X", cout_centimes: -5 }).cout_centimes, 0);
  assert.equal(normaliserArticle({ nom: "X", cout_centimes: "abc" }).cout_centimes, 0);
});

test("le matériel de terrain attendu figure dans les défauts", () => {
  const cles = CATALOGUES_DEFAUT.materiel_terrain.map((a) => a.cle);
  for (const attendu of ["diable", "planche_roulettes", "bandes_porter"]) {
    assert.ok(cles.includes(attendu), `${attendu} absent du matériel de terrain`);
  }
});

test("coutsMateriel : une ligne par article facturé, sans les gratuits", () => {
  // Les fournitures non réglées retombent sur le défaut : on isole la source
  // testée pour ne mesurer que le comportement du filtre de coût.
  const lignes = coutsMateriel({ materiel_terrain: [
    { cle: "a", nom: "A", unite: "pièce", cout_centimes: 100, consommable: false },
    { cle: "b", nom: "B", unite: "pièce", cout_centimes: 0 },
  ] }).filter((l) => l.source === "materiel_terrain");
  assert.equal(lignes.length, 1);
  assert.equal(lignes[0].cle, "a");
});

test("valeurParcMateriel : ne compte que le non consommable", () => {
  const v = valeurParcMateriel({ materiel_terrain: [
    { cle: "a", nom: "A", cout_centimes: 1000, consommable: false },
    { cle: "b", nom: "B", cout_centimes: 500, consommable: true },
  ] });
  assert.equal(v, 1000);
});

test("chaque liste réglable a des défauts", () => {
  for (const l of LISTES_CATALOGUE) {
    assert.ok(Array.isArray(CATALOGUES_DEFAUT[l.cle]), `défauts manquants : ${l.cle}`);
    assert.ok(CATALOGUES_DEFAUT[l.cle].length > 0, `liste vide : ${l.cle}`);
  }
});
