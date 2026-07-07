// Tests — RH · Flotte · Stocks : échéances, solde matériel, workflow congés.
// Parties critiques : file « À traiter » (échéances), contrôle E/U/R (C-18),
// et droits d'approbation des congés (C-25).

import { test } from "node:test";
import assert from "node:assert/strict";

import { qualifierEcheance, echeanceARegler } from "../src/commun/echeances.js";
import { controleSolde, valoriserConsomme, articlesEnEcart } from "../src/stocks/stock.js";
import {
  transitionCongePermise, verifierTransitionConge,
  periodesSeChevauchent, chevauchementsApprouves,
} from "../src/rh/conges.js";

// --- Échéances (RH documents, Flotte CT/assurance) --------------------------

const REF = new Date("2026-07-05T00:00:00Z");

test("qualifierEcheance distingue valide / proche / expirée / absente", () => {
  assert.equal(qualifierEcheance("2026-09-01", REF).etat, "valide");   // ~58 j
  assert.equal(qualifierEcheance("2026-07-20", REF).etat, "proche");   // 15 j
  assert.equal(qualifierEcheance("2026-07-01", REF).etat, "expiree");  // -4 j
  assert.equal(qualifierEcheance(null, REF).etat, "absente");
});

test("qualifierEcheance renvoie le nombre de jours restant", () => {
  assert.equal(qualifierEcheance("2026-07-20", REF).jours, 15);
  assert.equal(qualifierEcheance("2026-07-01", REF).jours, -4);
});

test("echeanceARegler : file « À traiter » (proche, expirée, absente)", () => {
  assert.equal(echeanceARegler(qualifierEcheance("2026-07-20", REF)), true);  // proche
  assert.equal(echeanceARegler(qualifierEcheance("2026-07-01", REF)), true);  // expirée
  assert.equal(echeanceARegler(qualifierEcheance(null, REF)), true);          // absente
  assert.equal(echeanceARegler(qualifierEcheance("2026-09-01", REF)), false); // valide
});

// --- Stock : contrôle E/U/R (C-18) ------------------------------------------

test("controleSolde : Enlevé = Utilisé + Repris est cohérent", () => {
  assert.deepEqual(controleSolde({ enleve: 10, utilise: 6, repris: 4 }), { coherent: true, ecart: 0 });
});

test("controleSolde : un écart signale du matériel manquant", () => {
  const r = controleSolde({ enleve: 10, utilise: 6, repris: 2 });
  assert.equal(r.coherent, false);
  assert.equal(r.ecart, 2); // 2 cartons non rendus
});

test("valoriserConsomme : le matériel utilisé devient des lignes de facture", () => {
  const r = valoriserConsomme([
    { articleId: "std", nom: "Carton standard", utilise: 20, prixUnitaireEuros: 2 },
    { articleId: "bulle", nom: "Papier bulle", utilise: 3, prixUnitaireEuros: 5 },
    { articleId: "vide", nom: "Non utilisé", utilise: 0, prixUnitaireEuros: 9 },
  ]);
  // 20×2 = 40 € ; 3×5 = 15 € → total 55 € = 5500 centimes ; l'article à 0 est exclu
  assert.equal(r.lignes.length, 2);
  assert.equal(r.total_centimes, 5500);
  assert.equal(r.lignes[0].montant_centimes, 4000);
});

test("articlesEnEcart liste les articles au solde incohérent", () => {
  const ecarts = articlesEnEcart([
    { articleId: "a", nom: "A", enleve: 5, utilise: 3, repris: 2 }, // ok
    { articleId: "b", nom: "B", enleve: 8, utilise: 5, repris: 1 }, // écart 2
  ]);
  assert.equal(ecarts.length, 1);
  assert.equal(ecarts[0].articleId, "b");
  assert.equal(ecarts[0].ecart, 2);
});

// --- RH : workflow des congés (C-25) ----------------------------------------

test("transitions de congé : chemin permis, refus terminal", () => {
  assert.equal(transitionCongePermise("demande", "approuve"), true);
  assert.equal(transitionCongePermise("demande", "refuse"), true);
  assert.equal(transitionCongePermise("approuve", "annule"), true);
  assert.equal(transitionCongePermise("refuse", "approuve"), false); // terminal
});

test("approuver/refuser exige la capacité approuver_conge (C-25)", () => {
  // Sans le droit : refus.
  assert.equal(verifierTransitionConge("demande", "approuve", false).autorise, false);
  assert.equal(verifierTransitionConge("demande", "approuve", false).raison, "approbation_non_autorisee");
  // Avec le droit : autorisé.
  assert.equal(verifierTransitionConge("demande", "approuve", true).autorise, true);
  // Annuler ne requiert pas le droit d'approbation.
  assert.equal(verifierTransitionConge("demande", "annule", false).autorise, true);
});

test("periodesSeChevauchent détecte le recouvrement", () => {
  assert.equal(periodesSeChevauchent(
    { debut: "2026-07-10", fin: "2026-07-20" },
    { debut: "2026-07-15", fin: "2026-07-25" }), true);
  assert.equal(periodesSeChevauchent(
    { debut: "2026-07-10", fin: "2026-07-20" },
    { debut: "2026-07-21", fin: "2026-07-30" }), false);
});

test("chevauchementsApprouves ignore les congés non approuvés", () => {
  const demande = { debut: "2026-07-12", fin: "2026-07-14" };
  const existants = [
    { debut: "2026-07-10", fin: "2026-07-20", etat: "approuve" }, // chevauche
    { debut: "2026-07-13", fin: "2026-07-13", etat: "demande" },  // chevauche mais pas approuvé
  ];
  assert.equal(chevauchementsApprouves(demande, existants), 1);
});
