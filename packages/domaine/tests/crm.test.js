// Tests — CRM : dédoublonnage clients (C-01) et machine à états (S4, C-06).
// Parties critiques : la reconnaissance client et les invariants du cycle de vie.

import { test } from "node:test";
import assert from "node:assert/strict";

import { normaliserTel, normaliserNom, trouverDoublon } from "../src/crm/clients.js";
import {
  ETATS, transitionPermise, verifierTransition, transitionsPossibles,
} from "../src/crm/affaire.js";

// --- Normalisation téléphone -------------------------------------------------

test("normaliserTel unifie les formats belges", () => {
  assert.equal(normaliserTel("0478 33 66 35"), "+32478336635");
  assert.equal(normaliserTel("0478/33.66.35"), "+32478336635");
  assert.equal(normaliserTel("+32 478 336 635"), "+32478336635");
  assert.equal(normaliserTel("0032478336635"), "+32478336635");
  assert.equal(normaliserTel(""), "");
});

test("normaliserNom retire accents, casse et espaces superflus", () => {
  assert.equal(normaliserNom("  Cédric   HERMAND "), "cedric hermand");
  assert.equal(normaliserNom("Éloïse Dûpont"), "eloise dupont");
});

// --- Dédoublonnage -----------------------------------------------------------

const CLIENTS = [
  { id: "c1", nom: "Cédric Hermand", tel: "0478/33.66.35" },
  { id: "c2", nom: "Marie Dupont", tel: "010 81 01 56" },
];

test("un téléphone identique donne une correspondance forte", () => {
  const r = trouverDoublon({ nom: "C. Hermand", tel: "+32 478 33 66 35" }, CLIENTS);
  assert.equal(r.client.id, "c1");
  assert.equal(r.confiance, "forte");
});

test("à défaut de téléphone, un nom identique donne une correspondance faible", () => {
  const r = trouverDoublon({ nom: "MARIE DUPONT" }, CLIENTS);
  assert.equal(r.client.id, "c2");
  assert.equal(r.confiance, "faible");
});

test("le téléphone prime sur le nom", () => {
  // Nom proche de c2 mais téléphone de c1 → c'est c1 qui gagne (forte).
  const r = trouverDoublon({ nom: "Marie Dupont", tel: "0478 33 66 35" }, CLIENTS);
  assert.equal(r.client.id, "c1");
  assert.equal(r.confiance, "forte");
});

test("aucune correspondance renvoie null (nouveau client)", () => {
  assert.equal(trouverDoublon({ nom: "Inconnu", tel: "0499 00 00 00" }, CLIENTS), null);
  assert.equal(trouverDoublon({}, CLIENTS), null);
});

// --- Machine à états : transitions structurelles -----------------------------

test("le chemin nominal complet est permis, étape par étape", () => {
  const chemin = [
    ["brouillon", "devis"], ["devis", "envoye"], ["envoye", "confirme"],
    ["confirme", "planifie"], ["planifie", "en_cours"], ["en_cours", "effectue"],
    ["effectue", "facture"], ["facture", "paye"], ["paye", "clos"],
  ];
  for (const [s, c] of chemin) {
    assert.equal(transitionPermise(s, c), true, `${s} → ${c} devrait être permis`);
  }
});

test("les sauts d'étape sont interdits", () => {
  assert.equal(transitionPermise("brouillon", "confirme"), false);
  assert.equal(transitionPermise("devis", "facture"), false);
  assert.equal(transitionPermise("confirme", "paye"), false);
});

test("annulé et clos sont des états terminaux", () => {
  assert.equal(transitionsPossibles("annule").length, 0);
  assert.equal(transitionsPossibles("clos").length, 0);
});

test("une affaire reportée peut se replanifier", () => {
  assert.equal(transitionPermise("reporte", "planifie"), true);
});

// --- Machine à états : gardes (invariants absolus S4) ------------------------

test("INVARIANT : pas de passage à 'confirme' sans instance signée (C-02)", () => {
  // Transition permise structurellement, mais garde non satisfaite.
  const sansSignature = verifierTransition("envoye", "confirme", { instanceSignee: false });
  assert.equal(sansSignature.autorise, false);
  assert.equal(sansSignature.raison, "garde_non_satisfaite");

  const avecSignature = verifierTransition("envoye", "confirme", { instanceSignee: true });
  assert.equal(avecSignature.autorise, true);
});

test("INVARIANT : pas de facture sans numéro de séquence attribué", () => {
  assert.equal(
    verifierTransition("effectue", "facture", { numeroAttribue: false }).raison,
    "garde_non_satisfaite"
  );
  assert.equal(
    verifierTransition("effectue", "facture", { numeroAttribue: true }).autorise,
    true
  );
});

test("'envoye' exige une instance de document générée", () => {
  assert.equal(verifierTransition("devis", "envoye", { instanceGeneree: false }).autorise, false);
  assert.equal(verifierTransition("devis", "envoye", { instanceGeneree: true }).autorise, true);
});

test("'planifie' exige date, équipe et véhicule", () => {
  assert.equal(
    verifierTransition("confirme", "planifie", { aDate: true, aEquipe: true, aVehicule: false }).autorise,
    false
  );
  assert.equal(
    verifierTransition("confirme", "planifie", { aDate: true, aEquipe: true, aVehicule: true }).autorise,
    true
  );
});

test("'effectue' exige un chrono arrêté", () => {
  assert.equal(verifierTransition("en_cours", "effectue", { chronoArrete: true }).autorise, true);
  assert.equal(verifierTransition("en_cours", "effectue", {}).autorise, false);
});

test("transitionsPossibles projette les actions offertes selon le contexte", () => {
  // Depuis 'envoye' sans signature : on peut reporter ou annuler, pas confirmer.
  const possibles = transitionsPossibles("envoye", { instanceSignee: false });
  assert.ok(possibles.includes("reporte"));
  assert.ok(possibles.includes("annule"));
  assert.ok(!possibles.includes("confirme"));
});

test("un état inconnu est rejeté proprement", () => {
  assert.equal(verifierTransition("fantome", "devis").raison, "etat_inconnu");
  assert.equal(ETATS.length, 12);
});
