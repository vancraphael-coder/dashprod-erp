// Tests — civilité du client et formules qui en découlent.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CIVILITES, civiliteValide, civiliteCourte, civiliteLongue,
  nomAvecCivilite, formuleAppel, accord, pluralise,
} from "../src/crm/civilite.js";

test("trois civilités, dont « les deux » — le cas le plus fréquent", () => {
  assert.equal(CIVILITES.length, 3);
  assert.ok(CIVILITES.find((c) => c.cle === "les_deux"));
});

test("l'absence de civilité est un état LÉGITIME", () => {
  // Au premier appel, on ne sait pas toujours.
  assert.equal(civiliteValide(null), true);
  assert.equal(civiliteValide(""), true);
  assert.equal(civiliteValide(undefined), true);
  assert.equal(civiliteValide("monsieur"), true);
  assert.equal(civiliteValide("docteur"), false);
});

test("les formes courtes et longues", () => {
  assert.equal(civiliteCourte("monsieur"), "M.");
  assert.equal(civiliteCourte("madame"), "Mme");
  assert.equal(civiliteCourte("les_deux"), "M. et Mme");
  assert.equal(civiliteLongue("les_deux"), "Monsieur et Madame");
});

test("une civilité inconnue ne produit RIEN, pas une supposition", () => {
  assert.equal(civiliteCourte(null), "");
  assert.equal(civiliteLongue("truc"), "");
});

test("le nom garde sa civilité, ou reste seul", () => {
  assert.equal(nomAvecCivilite("les_deux", "Dupont"), "M. et Mme Dupont");
  assert.equal(nomAvecCivilite("madame", "Chariot"), "Mme Chariot");
  // Sans civilité : le nom seul. On ne devine pas le genre d'un prénom.
  assert.equal(nomAvecCivilite(null, "Camille Dupont"), "Camille Dupont");
  assert.equal(nomAvecCivilite("monsieur", ""), "");
});

test("la formule d'appel reste correcte quand on ne sait pas", () => {
  assert.equal(formuleAppel(null), "Bonjour,");
  assert.equal(formuleAppel(""), "Bonjour,");
  assert.equal(formuleAppel("monsieur"), "Monsieur,");
  assert.equal(formuleAppel("les_deux"), "Monsieur et Madame,");
});

test("la formule peut porter le nom", () => {
  assert.equal(formuleAppel("madame", { avecNom: true, nom: "Chariot" }),
               "Madame Chariot,");
  assert.equal(formuleAppel("madame", { avecNom: true, nom: "  " }), "Madame,");
});

test("l'accord des participes suit la civilité", () => {
  assert.equal(accord("monsieur", "informé", "informée", "informés"), "informé");
  assert.equal(accord("madame", "informé", "informée", "informés"), "informée");
  assert.equal(accord("les_deux", "informé", "informée", "informés"), "informés");
  // Inconnu : le masculin reste la forme neutre du français.
  assert.equal(accord(null, "informé", "informée", "informés"), "informé");
});

test("« les deux » se traite au pluriel", () => {
  assert.equal(pluralise("les_deux"), true);
  assert.equal(pluralise("madame"), false);
  assert.equal(pluralise(null), false);
});
