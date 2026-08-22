// =============================================================================
// MONTANT D'ABONNEMENT — le barème testé sans toucher la base.
//
// Ces tests existent à cause d'un incident réel : une rétrogradation de test a
// été committée en production sur Roovers, parce que le barème ne se vérifiait
// qu'en écrivant dans la base. Depuis, la logique vit dans un étage pur, et
// c'est ici qu'on la prouve.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import { montantAbonnement, economieAnnuelle, PERIODICITES }
  from "../src/organisation/abonnement.js";

/** Les trois offres telles que publiées au référentiel (migration 0140). */
const BASIQUE = {
  code: "starter", libelle: "Basique", membres_inclus: 2, centres_inclus: 0,
  prix_base_htva_mensuel: 180, prix_base_htva_annuel: 2052,
  prix_membre_supp_htva: 13, prix_membre_supp_htva_annuel: 148.20,
  prix_centre_supp_htva: null, prix_centre_supp_htva_annuel: null,
};
const PRO = {
  code: "pro", libelle: "Pro", membres_inclus: 30, centres_inclus: 1,
  prix_base_htva_mensuel: 720, prix_base_htva_annuel: 8208,
  prix_membre_supp_htva: 13, prix_membre_supp_htva_annuel: 148.20,
  prix_centre_supp_htva: 50, prix_centre_supp_htva_annuel: 570,
};

const eur = (c) => c / 100;

/* ── Le barème publié ───────────────────────────────────────────────────── */

test("le prix de base sort tel qu'il est publié, mensuel comme annuel", () => {
  assert.equal(eur(montantAbonnement(BASIQUE, { membres: 2 }, "mensuel")
    .montant.total_htva_centimes), 180);
  assert.equal(eur(montantAbonnement(BASIQUE, { membres: 2 }, "annuel")
    .montant.total_htva_centimes), 2052);
  assert.equal(eur(montantAbonnement(PRO, { membres: 30, centres: 1 }, "annuel")
    .montant.total_htva_centimes), 8208);
});

test("les membres au-delà du seuil se facturent, à leur prix de périodicité", () => {
  // Basique inclut 2 membres. À 5, trois sont dus.
  const m = montantAbonnement(BASIQUE, { membres: 5 }, "mensuel").montant;
  assert.equal(m.membres_supp, 3);
  assert.equal(eur(m.total_htva_centimes), 219);          // 180 + 3 × 13

  const a = montantAbonnement(BASIQUE, { membres: 5 }, "annuel").montant;
  assert.equal(eur(a.total_htva_centimes), 2496.60);      // 2052 + 3 × 148,20
});

test("la remise annuelle porte AUSSI sur les suppléments", () => {
  // C'est la règle explicite de Raphaël : un membre ou un centre ajouté profite
  // des 5 % s'il est payé annuellement.
  const eco = economieAnnuelle(BASIQUE, { membres: 5 });
  assert.equal(eco.pourcentage, 5,
    "5 % sur l'ensemble, pas seulement sur la base");
  assert.equal(eur(eco.economie_centimes), 131.40);       // 219×12 − 2496,60
});

test("un centre supplémentaire suit la même règle en Pro", () => {
  const m = montantAbonnement(PRO, { membres: 30, centres: 3 }, "mensuel").montant;
  assert.equal(m.centres_supp, 2);
  assert.equal(eur(m.total_htva_centimes), 820);          // 720 + 2 × 50

  const a = montantAbonnement(PRO, { membres: 30, centres: 3 }, "annuel").montant;
  assert.equal(eur(a.total_htva_centimes), 9348);         // 8208 + 2 × 570
  assert.equal(economieAnnuelle(PRO, { membres: 30, centres: 3 }).pourcentage, 5);
});

/* ── Les garde-fous ─────────────────────────────────────────────────────── */

test("une équipe sous le seuil ne donne PAS de crédit", () => {
  // Facturer un montant négatif parce que l'entreprise a moins de monde que
  // prévu serait absurde — et le supplément, lui, n'a pas de miroir.
  const m = montantAbonnement(BASIQUE, { membres: 1 }, "mensuel").montant;
  assert.equal(m.membres_supp, 0);
  assert.equal(eur(m.total_htva_centimes), 180);
});

test("une offre sans prix publié REFUSE d'être facturée", () => {
  // L'état d'avant la migration 0140 : six prix à null. Émettre une facture
  // dans ces conditions produirait un montant faux ou nul.
  const r = montantAbonnement({ libelle: "X", membres_inclus: 2 }, { membres: 2 });
  assert.equal(r.ok, false);
  assert.match(r.motif, /prix/i);
});

test("un supplément dû sans prix publié est une ERREUR, pas une gratuité", () => {
  // Basique ne vend pas de centre. En demander un ne doit pas le facturer 0 €.
  const r = montantAbonnement(BASIQUE, { membres: 2, centres: 1 }, "mensuel");
  assert.equal(r.ok, false);
  assert.match(r.motif, /centre/i);
});

test("une périodicité inconnue est refusée, pas ramenée au mensuel", () => {
  const r = montantAbonnement(BASIQUE, { membres: 2 }, "trimestriel");
  assert.equal(r.ok, false);
  assert.match(r.motif, /[Pp]ériodicité/);
  assert.deepEqual(Object.keys(PERIODICITES), ["mensuel", "annuel"]);
});

test("les montants sont des centimes entiers, jamais des flottants", () => {
  // 148,20 € annuel × 3 membres = 44 460 centimes exactement. Un flottant
  // introduirait un centime de dérive qui ferait échouer un rapprochement.
  const a = montantAbonnement(BASIQUE, { membres: 5 }, "annuel").montant;
  assert.equal(Number.isInteger(a.total_htva_centimes), true);
  assert.equal(a.membres_supp_centimes, 44460);
});
