// Tests — meubles pré-remplis par pièce.
import test from "node:test";
import assert from "node:assert/strict";
import {
  MEUBLES_DEFAUT, meublesDePiece, listePersonnalisee, definirMeubles,
  ajouterMeuble, retirerMeuble, reinitialiserMeubles,
} from "../src/stocks/meubles-piece.js";

test("une entreprise neuve dispose déjà d'un socle", () => {
  assert.ok(meublesDePiece({}, "Salon").includes("Canapé 3 places"));
  assert.ok(meublesDePiece(null, "Cuisine").length > 3);
});

test("une pièce inconnue ne propose rien, sans planter", () => {
  assert.deepEqual(meublesDePiece({}, "Atelier de poterie"), []);
  assert.deepEqual(meublesDePiece({}, ""), []);
  assert.deepEqual(meublesDePiece({}, null), []);
});

test("la liste de l'entreprise REMPLACE le socle, elle ne s'y ajoute pas", () => {
  const cats = definirMeubles({}, "Salon", ["Piano droit", "Canapé cuir"]);
  const liste = meublesDePiece(cats, "Salon");
  assert.deepEqual(liste, ["Piano droit", "Canapé cuir"]);
  assert.equal(liste.includes("Table basse"), false,
    "le défaut ne doit pas revenir par la porte de derrière");
});

test("une liste vidée explicitement reste vide — c'est un choix", () => {
  const cats = definirMeubles({}, "Cave", []);
  assert.deepEqual(meublesDePiece(cats, "Cave"), []);
  assert.equal(listePersonnalisee(cats, "Cave"), true);
});

test("les autres pièces gardent leur socle", () => {
  const cats = definirMeubles({}, "Salon", ["Piano"]);
  assert.ok(meublesDePiece(cats, "Chambre").includes("Matelas"));
});

test("les doublons sont écartés, casse comprise", () => {
  const cats = definirMeubles({}, "Salon", ["Canapé", "canapé", " CANAPÉ ", "Table"]);
  assert.deepEqual(meublesDePiece(cats, "Salon"), ["Canapé", "Table"]);
});

test("l'ordre de saisie est conservé", () => {
  const cats = definirMeubles({}, "Bureau", ["Zèbre", "Alpha", "Miroir"]);
  assert.deepEqual(meublesDePiece(cats, "Bureau"), ["Zèbre", "Alpha", "Miroir"]);
});

test("ajouter un meuble part du socle si la pièce n'est pas personnalisée", () => {
  const cats = ajouterMeuble({}, "Salon", "Piano droit");
  const liste = meublesDePiece(cats, "Salon");
  assert.ok(liste.includes("Piano droit"));
  assert.ok(liste.includes("Table basse"), "le socle est repris comme base");
});

test("ajouter deux fois le même meuble n'en crée qu'un", () => {
  let cats = ajouterMeuble({}, "Cave", "Établi");
  cats = ajouterMeuble(cats, "Cave", "établi");
  assert.equal(meublesDePiece(cats, "Cave").filter((m) => /établi/i.test(m)).length, 1);
});

test("retirer un meuble le retire durablement", () => {
  const cats = retirerMeuble({}, "Salon", "Tapis");
  assert.equal(meublesDePiece(cats, "Salon").includes("Tapis"), false);
  // Et il ne revient pas au chargement suivant.
  assert.equal(meublesDePiece(JSON.parse(JSON.stringify(cats)), "Salon").includes("Tapis"), false);
});

test("réinitialiser rend le socle", () => {
  let cats = definirMeubles({}, "Salon", ["Rien"]);
  cats = reinitialiserMeubles(cats, "Salon");
  assert.equal(listePersonnalisee(cats, "Salon"), false);
  assert.ok(meublesDePiece(cats, "Salon").includes("Canapé 3 places"));
});

test("les autres catalogues ne sont jamais écrasés", () => {
  const avant = { pieces: ["Salon"], fournitures: [{ nom: "Carton" }] };
  const apres = definirMeubles(avant, "Salon", ["Canapé"]);
  assert.deepEqual(apres.pieces, ["Salon"]);
  assert.deepEqual(apres.fournitures, [{ nom: "Carton" }]);
});

test("le socle couvre les pièces courantes d'un logement belge", () => {
  for (const p of ["Salon", "Cuisine", "Chambre", "Cave", "Garage"]) {
    assert.ok((MEUBLES_DEFAUT[p] || []).length > 0, `${p} devrait avoir un socle`);
  }
});
