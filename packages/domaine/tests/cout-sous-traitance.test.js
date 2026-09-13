// =============================================================================
// LA SOUS-TRAITANCE EST UN POSTE DE COÛT À PART.
//
// CE QUI CASSE SANS CES TESTS : la marge d'un chantier qui s'effondre à
// l'arrivée d'une facture. Un accord est un dû ; ne pas le compter fait
// paraître le chantier rentable jusqu'à ce que la facture arrive. Inversement,
// compter une PROPOSITION gonflerait tous les chantiers en cours d'un montant
// que le prestataire peut encore refuser.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  ETATS_ENGAGEANTS, ETATS_SANS_COUT, ligneCout, coutSousTraitance,
  posteSousTraitanceEuros, alerteCloture,
} from "../src/pilotage/cout-sous-traitance.js";

const E = (etat, prix, facture = null) => ({
  id: `e-${etat}-${prix}`, contrepartie: "Van Cutsem", etat,
  prix_htva_centimes: prix, facture_htva_centimes: facture,
  date: "2026-09-20", nature: "Manutention 4 h",
});

test("une PROPOSITION ne coûte rien", () => {
  // Le prestataire peut refuser. Compter une proposition gonflerait tous les
  // chantiers en cours d'un montant qui n'existe pas encore.
  const l = ligneCout(E("proposee", 18000));
  assert.equal(l.compte, false);
  assert.equal(l.montant_htva_centimes, 0);
  assert.equal(l.source, "aucune");
});

test("un refus et une annulation ne coûtent rien non plus", () => {
  for (const etat of ["refusee", "annulee"]) {
    assert.equal(ligneCout(E(etat, 18000)).montant_htva_centimes, 0);
  }
  assert.deepEqual([...ETATS_SANS_COUT], ["proposee", "refusee", "annulee"]);
});

test("un ACCORD est un dû, même sans facture", () => {
  // Ne pas le compter ferait paraître le chantier rentable jusqu'à l'arrivée
  // de la facture — puis la marge s'effondrerait sans explication.
  const l = ligneCout(E("acceptee", 18000));
  assert.equal(l.compte, true);
  assert.equal(l.montant_htva_centimes, 18000);
  assert.equal(l.source, "convenu");
  assert.deepEqual([...ETATS_ENGAGEANTS], ["acceptee", "realisee", "facturee"]);
});

test("la FACTURE reçue prime sur le prix convenu", () => {
  // C'est elle qu'on paie. Et l'écart se voit.
  const l = ligneCout(E("facturee", 18000, 19500));
  assert.equal(l.montant_htva_centimes, 19500);
  assert.equal(l.source, "facture");
  assert.equal(l.ecart_centimes, 1500);
  assert.equal(l.prix_convenu_centimes, 18000);
});

test("un écart à la BAISSE se voit aussi", () => {
  // Une facture plus basse que convenu est une information — un prestataire
  // qui a fini plus vite, ou une erreur de facturation.
  const l = ligneCout(E("facturee", 18000, 15000));
  assert.equal(l.montant_htva_centimes, 15000);
  assert.equal(l.ecart_centimes, -3000);
});

test("le poste sépare l'engagé, le facturé et l'attendu", () => {
  // Trois questions différentes : la marge, le rapprochement, et la
  // possibilité de clôturer sans surprise.
  const c = coutSousTraitance([
    E("proposee", 10000),               // ignoré
    E("acceptee", 18000),               // engagé, sans facture
    E("facturee", 20000, 21000),        // engagé et facturé
    E("refusee", 50000),                // ignoré
  ]);
  assert.equal(c.engage_htva_centimes, 39000);   // 18000 + 21000
  assert.equal(c.facture_htva_centimes, 21000);
  assert.equal(c.attendu_htva_centimes, 18000);
  assert.equal(c.ecart_total_centimes, 1000);
  assert.equal(c.retenues.length, 2);
  assert.equal(c.nb_sans_facture, 1);
});

test("le poste se rend en euros pour le calcul définitif", () => {
  // `calculDefinitif` raisonne en euros sur ses postes réels. Un seul chemin
  // vers le total : deux finiraient par ne plus dire la même chose.
  assert.equal(posteSousTraitanceEuros([E("acceptee", 18000)]), 180);
  assert.equal(posteSousTraitanceEuros([E("facturee", 18000, 19550)]), 195.5);
  assert.equal(posteSousTraitanceEuros([]), 0);
  assert.equal(posteSousTraitanceEuros(null), 0);
});

test("la clôture PRÉVIENT, elle ne bloque pas", () => {
  // Une entreprise doit pouvoir clôturer. Mais une facture qui arrive après
  // la clôture arrive sur un dossier dont la marge est déjà annoncée.
  assert.equal(alerteCloture([E("facturee", 18000, 18000)]), null);
  const a = alerteCloture([E("acceptee", 18000), E("realisee", 9000)]);
  assert.equal(a.niveau, "attention");
  assert.match(a.message, /2 engagements sans facture/);
  assert.match(a.message, /270,00 €/);
});

test("plusieurs prestataires sur un même dossier se comptent", () => {
  const c = coutSousTraitance([
    { ...E("acceptee", 18000), contrepartie: "A" },
    { ...E("acceptee", 9000), contrepartie: "B" },
    { ...E("realisee", 4500), contrepartie: "A" },
  ]);
  assert.equal(c.nb_prestataires, 2);
  assert.equal(c.engage_htva_centimes, 31500);
});

test("les entrées absurdes ne créent pas de coût", () => {
  assert.equal(coutSousTraitance(undefined).engage_htva_centimes, 0);
  assert.equal(ligneCout(null).compte, false);
  assert.equal(ligneCout({ etat: "acceptee" }).montant_htva_centimes, 0);
});
