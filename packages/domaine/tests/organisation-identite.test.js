// Tests — identité de l'organisation, source de vérité.
import test from "node:test";
import assert from "node:assert/strict";
import {
  FACTURATION_DEFAUT, identiteComplete, facturation, tauxTva, libelleTva,
  tvaBelgeValide, ibanValide, nomAffiche, lignesEntete, normaliserNumero,
} from "../src/organisation/identite.js";

const COMPLETE = {
  nom: "Déménagements Test SRL", bce: "BE 0478.363.616", tva: "BE0478363616",
  adresse: "Rue de Test 1", cp: "1000", ville: "Bruxelles",
  tel: "02 000 00 00", email: "info@test.be", iban: "BE68539007547034",
};

test("identiteComplete : une organisation neuve n'est pas prête", () => {
  const e = identiteComplete({});
  assert.equal(e.complete, false);
  assert.equal(e.pretDocuments, false);
  assert.ok(e.bloquants.includes("nom"));
  assert.ok(e.bloquants.includes("iban"));
});

test("identiteComplete : une organisation renseignée est prête", () => {
  const e = identiteComplete(COMPLETE);
  assert.equal(e.complete, true);
  assert.equal(e.pretDocuments, true);
  assert.deepEqual(e.invalides, []);
});

test("tvaBelgeValide : format BE + 10 chiffres", () => {
  assert.equal(tvaBelgeValide("BE0478363616"), true);
  assert.equal(tvaBelgeValide("BE 0478.363.616"), true);
  assert.equal(tvaBelgeValide("BE123"), false);
  assert.equal(tvaBelgeValide("FR0478363616"), false);
  assert.equal(tvaBelgeValide(""), true, "un champ vide n'est pas jugé invalide");
});

test("ibanValide : contrôle modulo 97, pas seulement la forme", () => {
  assert.equal(ibanValide("BE68 5390 0754 7034"), true);
  assert.equal(ibanValide("BE68539007547035"), false, "clé de contrôle fausse");
  assert.equal(ibanValide("XX"), false);
  assert.equal(ibanValide(""), true);
});

test("un IBAN mal formé bloque l'envoi de documents", () => {
  const e = identiteComplete({ ...COMPLETE, iban: "BE68539007547035" });
  assert.ok(e.invalides.includes("iban"));
  assert.equal(e.pretDocuments, false);
});

test("facturation : défauts belges si rien n'est réglé", () => {
  assert.deepEqual(facturation({}), { ...FACTURATION_DEFAUT });
  assert.equal(tauxTva({}), 21);
  assert.equal(libelleTva({}), "TVA 21 %");
});

test("facturation : le taux de l'organisation prime", () => {
  const org = { parametres_facturation: { tva_taux: 6 } };
  assert.equal(tauxTva(org), 6);
  assert.equal(libelleTva(org), "TVA 6 %");
  assert.equal(facturation(org).echeance_jours, 30, "les autres défauts restent");
});

test("facturation : un taux aberrant retombe sur le défaut", () => {
  assert.equal(tauxTva({ parametres_facturation: { tva_taux: -3 } }), 21);
  assert.equal(tauxTva({ parametres_facturation: { tva_taux: 250 } }), 21);
  assert.equal(tauxTva({ parametres_facturation: { tva_taux: "abc" } }), 21);
});

test("nomAffiche : l'enseigne prime sur le nom légal", () => {
  assert.equal(nomAffiche({ nom: "X SRL", nom_commercial: "Enseigne" }), "Enseigne");
  assert.equal(nomAffiche({ nom: "X SRL" }), "X SRL");
  assert.equal(nomAffiche({}), "");
});

test("lignesEntete : aucune ligne vide, aucune valeur inventée", () => {
  const l = lignesEntete(COMPLETE);
  assert.ok(l.length > 0);
  assert.equal(l.some((x) => !x || !x.trim()), false);
  assert.deepEqual(lignesEntete({}), []);
});

test("normaliserNumero : espaces, points et tirets retirés", () => {
  assert.equal(normaliserNumero("be 0478.363-616"), "BE0478363616");
});

// — Moteur de chiffrage : le taux de TVA suit l'organisation —
import { calculerScenario } from "../src/chiffrage/moteur.js";

test("moteur : sans tvaPct, le taux belge par défaut (21 %) s'applique", () => {
  const s = calculerScenario({ formule: "forfait", forfaitTvacEuros: 121 }, {}, {});
  assert.equal(s.htva_centimes, 10000);
  assert.equal(s.tva_centimes, 2100);
});

test("moteur : ref.tvaPct pilote le calcul (6 %)", () => {
  const s = calculerScenario({ formule: "forfait", forfaitTvacEuros: 106 }, {}, { tvaPct: 6 });
  assert.equal(s.htva_centimes, 10000);
  assert.equal(s.tva_centimes, 600);
});
