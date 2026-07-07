// Tests — Facturation & Peppol : solde et paiements (C-24), note de crédit,
// mapping UBL BIS 3.0. Parties critiques : exactitude comptable et conformité.

import { test } from "node:test";
import assert from "node:assert/strict";

import { composerTotal, etatPaiement, noteDeCredit } from "../src/facturation/facture.js";
import { versUBL } from "../src/facturation/peppol.js";

// --- Composition du total ----------------------------------------------------

test("composerTotal additionne les lignes typées et applique la TVA", () => {
  // prestation 780 € + matériel 55 € = 835 € HTVA ; TVA 21 % = 175,35 ; TVAC 1010,35
  const t = composerTotal([
    { type: "prestation", libelle: "Déménagement", montant_htva_centimes: 78000 },
    { type: "materiel", libelle: "Cartons", montant_htva_centimes: 5500 },
  ]);
  assert.equal(t.htva_centimes, 83500);
  assert.equal(t.tva_centimes, 17535);
  assert.equal(t.tvac_centimes, 101035);
});

// --- Solde et statut (C-24) --------------------------------------------------

test("etatPaiement : aucune somme reçue → à payer", () => {
  const e = etatPaiement(101035, []);
  assert.equal(e.statut, "a_payer");
  assert.equal(e.paye_centimes, 0);
  assert.equal(e.solde_centimes, 101035);
});

test("etatPaiement : acompte partiel → partiel, solde restant", () => {
  // acompte de 300 € sur 1010,35 €
  const e = etatPaiement(101035, [{ montant_centimes: 30000, date: "2026-07-01" }]);
  assert.equal(e.statut, "partiel");
  assert.equal(e.paye_centimes, 30000);
  assert.equal(e.solde_centimes, 71035);
});

test("etatPaiement : plusieurs paiements couvrant le total → payé", () => {
  const e = etatPaiement(101035, [
    { montant_centimes: 30000, date: "2026-07-01" },
    { montant_centimes: 71035, date: "2026-07-15" },
  ]);
  assert.equal(e.statut, "paye");
  assert.equal(e.solde_centimes, 0);
});

test("etatPaiement : trop-perçu reste 'paye' avec solde négatif", () => {
  const e = etatPaiement(100000, [{ montant_centimes: 110000, date: "2026-07-01" }]);
  assert.equal(e.statut, "paye");
  assert.equal(e.solde_centimes, -10000); // remboursement dû (mouvement négatif futur)
});

// --- Note de crédit (C-24 : pas de rature) -----------------------------------

test("noteDeCredit reprend les lignes en négatif", () => {
  const nc = noteDeCredit([
    { type: "prestation", libelle: "Déménagement", montant_htva_centimes: 78000 },
  ]);
  assert.equal(nc.lignes[0].montant_htva_centimes, -78000);
  assert.match(nc.lignes[0].libelle, /^Avoir —/);
  assert.equal(nc.total.tvac_centimes, -94380); // -780 − 21 %
});

// --- Mapping UBL BIS 3.0 -----------------------------------------------------

const FACTURE_UBL = {
  numero: "2026-000123",
  date: "2026-07-05",
  echeance: "2026-08-04",
  vendeur: { nom: "Déménagements Roovers", tva: "BE0478363616", ville: "Jodoigne", pays: "BE" },
  acheteur: { nom: "Client Test", tva: "BE0999999999", ville: "Bruxelles", pays: "BE" },
  lignes: [
    { type: "prestation", libelle: "Déménagement", montant_htva_centimes: 78000 },
    { type: "materiel", libelle: "Cartons", montant_htva_centimes: 5500 },
  ],
  tauxTva: 21,
  total: { htva_centimes: 83500, tva_centimes: 17535, tvac_centimes: 101035 },
  communication: "+++123/4567/89012+++",
};

test("versUBL produit un document conforme au profil Peppol BIS 3.0", () => {
  const ubl = versUBL(FACTURE_UBL);
  assert.match(ubl.customizationID, /peppol\.eu:2017:poacc:billing:3\.0/);
  assert.equal(ubl.ID, "2026-000123");
  assert.equal(ubl.InvoiceTypeCode, "380");
  assert.equal(ubl.DocumentCurrencyCode, "EUR");
});

test("versUBL convertit les montants de centimes en décimales à 2 chiffres", () => {
  const ubl = versUBL(FACTURE_UBL);
  assert.equal(ubl.LegalMonetaryTotal.PayableAmount.value, "1010.35");
  assert.equal(ubl.TaxTotal.TaxAmount.value, "175.35");
  assert.equal(ubl.InvoiceLines[0].LineExtensionAmount.value, "780.00");
});

test("versUBL porte l'identité TVA des deux parties", () => {
  const ubl = versUBL(FACTURE_UBL);
  assert.equal(ubl.AccountingSupplierParty.PartyTaxScheme.CompanyID, "BE0478363616");
  assert.equal(ubl.AccountingCustomerParty.PartyTaxScheme.CompanyID, "BE0999999999");
});

test("versUBL inclut la communication structurée si fournie", () => {
  const ubl = versUBL(FACTURE_UBL);
  assert.equal(ubl.PaymentMeans.PaymentID, "+++123/4567/89012+++");
});

test("versUBL exige numéro et TVA vendeur", () => {
  assert.throws(() => versUBL({ ...FACTURE_UBL, numero: "" }), /numéro de facture requis/);
  assert.throws(() => versUBL({ ...FACTURE_UBL, vendeur: { nom: "X" } }), /TVA du vendeur requise/);
});
