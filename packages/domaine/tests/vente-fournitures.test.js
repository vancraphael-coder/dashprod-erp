// =============================================================================
// VENTE DE FOURNITURES (vague 2, lot E) — article de stock → ligne de facture.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  euxCentimes, articleVendable, ligneVente, composerVente,
} from "../src/stocks/vente-fournitures.js";

test("le prix en euros devient des centimes entiers", () => {
  assert.equal(euxCentimes(2.5), 250);
  assert.equal(euxCentimes(0), 0);
  assert.equal(euxCentimes("1.99"), 199);
  assert.equal(euxCentimes(-1), null);      // négatif refusé
  assert.equal(euxCentimes("abc"), null);
});

test("un article vendable a un nom, un prix et un taux de TVA", () => {
  assert.equal(articleVendable({ nom: "Carton", prix_unitaire: 2.5, tva_pct: 21 }).ok, true);
  assert.equal(articleVendable({ nom: "", prix_unitaire: 2.5, tva_pct: 21 }).ok, false);
  assert.equal(articleVendable({ nom: "X", prix_unitaire: 2.5, tva_pct: 21, actif: false }).ok, false);
});

test("un taux de TVA ABSENT est refusé, pas transformé en 0 % (piège Number(null))", () => {
  // LE piège du projet : Number(null) === 0. Un article sans TVA ne se vend pas
  // à 0 % en douce — on refuse.
  assert.equal(articleVendable({ nom: "Carton", prix_unitaire: 2.5, tva_pct: null }).ok, false);
  assert.equal(articleVendable({ nom: "Carton", prix_unitaire: 2.5, tva_pct: undefined }).ok, false);
  assert.equal(articleVendable({ nom: "Carton", prix_unitaire: 2.5, tva_pct: "" }).ok, false);
  // 0 % explicite, lui, est valide (certains biens y ont droit).
  assert.equal(articleVendable({ nom: "Carton", prix_unitaire: 2.5, tva_pct: 0 }).ok, true);
});

test("ligneVente produit une ligne de facture correcte", () => {
  const l = ligneVente({ nom: "Carton 60L", prix_unitaire: 2.5, tva_pct: 21 }, 4);
  assert.equal(l.prix_unitaire_centimes, 250);
  assert.equal(l.tva_pct, 21);
  assert.equal(l.montant_htva_centimes, 1000);   // 4 × 250
  assert.equal(l.type, "fourniture");
});

test("ligneVente refuse un article invalide ou une quantité nulle", () => {
  assert.equal(ligneVente({ nom: "X", prix_unitaire: 2, tva_pct: null }, 3), null);
  assert.equal(ligneVente({ nom: "X", prix_unitaire: 2, tva_pct: 21 }, 0), null);
  assert.equal(ligneVente({ nom: "X", prix_unitaire: 2, tva_pct: 21 }, -5), null);
});

test("composerVente additionne le vendable et compte les rejets", () => {
  const panier = [
    { article: { nom: "Carton", prix_unitaire: 2.5, tva_pct: 21 }, quantite: 4 },   // 1000
    { article: { nom: "Bulle", prix_unitaire: 10, tva_pct: 21 }, quantite: 1 },      // 1000
    { article: { nom: "SansTVA", prix_unitaire: 5, tva_pct: null }, quantite: 2 },   // rejeté
  ];
  const r = composerVente(panier);
  assert.equal(r.lignes.length, 2);
  assert.equal(r.total_htva_centimes, 2000);
  assert.equal(r.rejets, 1);
});
