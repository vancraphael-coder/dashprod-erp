// =============================================================================
// LES OFFRES SECTORIELLES ET LA VITRINE.
// La règle qui protège la crédibilité : rien ne s'annonce comme DISPONIBLE tant
// que son parcours n'existe pas. Une landing qui ment ne se répare pas.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  OFFRES_SECTEURS, offreSecteur, offresVitrine, offreSouscriptible,
  libelleStatut, STATUTS_OFFRE,
} from "../src/commercial/plans.js";

test("les offres décidées portent leur prix exact", () => {
  assert.equal(offreSecteur("independant_manutention").prix_centimes, 6000);   // 60 €
  assert.equal(offreSecteur("groupe_liftier").prix_centimes, 45000);           // 450 € révisé
  // Le donneur d'ordre est GRATUIT : c'est le côté rare qu'on subventionne.
  assert.equal(offreSecteur("donneur_ordre").prix_centimes, 0);
});

test("AUCUNE offre n'est souscriptible tant que son parcours n'existe pas", () => {
  // C'est LA règle. Si ce test rougit sans qu'un parcours ait été livré, la
  // landing ment et la crédibilité tombe.
  for (const o of OFFRES_SECTEURS) {
    assert.equal(offreSouscriptible(o.cle), false,
      `${o.cle} ne doit pas être souscriptible avant que son parcours existe`);
  }
});

test("chaque statut est valide et l'étude reste cachée de la vitrine", () => {
  for (const o of OFFRES_SECTEURS) {
    assert.ok(STATUTS_OFFRE.includes(o.statut), `${o.cle} : statut inconnu`);
  }
  // La logistique mobilier est à l'étude (quais, arrivages) : on ne la montre pas.
  assert.equal(offresVitrine().some((o) => o.cle === "logistique_mobilier"), false);
  assert.equal(offreSecteur("logistique_mobilier").statut, "etude");
});

test("la vitrine se lit du plus accessible au plus engageant", () => {
  const prix = offresVitrine().map((o) => o.prix_centimes);
  assert.deepEqual(prix, [...prix].sort((a, b) => a - b));
  // Le gratuit ouvre la marche.
  assert.equal(offresVitrine()[0].cle, "donneur_ordre");
});

test("une offre non disponible le DIT au visiteur", () => {
  assert.equal(libelleStatut("independant_manutention"), "Bientôt disponible");
});

test("chaque offre vend des RÉCURRENTS, pas un temps gagné inventé", () => {
  // L'argument doit être vérifiable : « ne sera plus jamais contesté ».
  for (const o of offresVitrine()) {
    assert.ok(Array.isArray(o.recurrents) && o.recurrents.length >= 3,
      `${o.cle} doit annoncer au moins 3 récurrents vérifiables`);
    assert.ok(o.promesse && o.pour, `${o.cle} : promesse et cible requises`);
  }
});

test("les produits de l'indépendant sont ceux définis", () => {
  const p = offreSecteur("independant_manutention").produits;
  for (const attendu of ["1 manutentionnaire", "Équipe joignable", "Demi-journée",
                         "Journée", "Taux horaire", "Intervention ponctuelle"]) {
    assert.ok(p.includes(attendu), `${attendu} doit être un produit vendable`);
  }
});

/* ── Prix révisés + parrainage « casino toujours gagnant » ───────────────── */

import { creditParrainage, factureApresParrainage, PART_PARRAINAGE }
  from "../src/commercial/plans.js";

test("les prix trop élevés ont été révisés", () => {
  // Liftier : facturé aux accès bureau, pas aux têtes. 450 € au lieu de 600.
  assert.equal(offreSecteur("groupe_liftier").prix_centimes, 45000);
  assert.match(offreSecteur("groupe_liftier").note_prix, /accès/i);
  // Logistique ramené à un chiffre défendable.
  assert.equal(offreSecteur("logistique_mobilier").prix_centimes, 90000);
});

test("le parrainage est PLAFONNÉ à une mensualité — jamais gratuité totale", () => {
  const men = 6000;
  // Douze filleuls payants ne donnent qu'UNE mensualité, pas douze.
  const r = creditParrainage({ mensualite_centimes: men,
    filleuls: Array(12).fill({ paye: true, mensualite_centimes: 6000 }) });
  assert.equal(r.credit_centimes, 6000);
  assert.equal(r.plafond_atteint, true);
});

test("un filleul qui n'a pas payé ne rapporte RIEN", () => {
  // On ne récompense pas une inscription qui ne paiera jamais.
  const r = creditParrainage({ mensualite_centimes: 6000,
    filleuls: [{ paye: false, mensualite_centimes: 6000 }] });
  assert.equal(r.credit_centimes, 0);
  assert.equal(r.filleuls_payants, 0);
});

test("le crédit déjà utilisé cette année réduit le plafond restant", () => {
  // Plafond ANNUEL : si une demi-mensualité a déjà servi, il reste une demie.
  const r = creditParrainage({ mensualite_centimes: 6000,
    filleuls: Array(4).fill({ paye: true, mensualite_centimes: 6000 }),
    credit_deja_utilise_centimes: 3000 });
  assert.equal(r.credit_centimes, 3000);
});

test("la facture après parrainage ne descend JAMAIS sous zéro", () => {
  // Un crédit réduit une dette, il n'est pas un versement.
  assert.equal(factureApresParrainage(6000, 9999), 0);
  assert.equal(factureApresParrainage(6000, 2000), 4000);
  assert.ok(PART_PARRAINAGE > 0 && PART_PARRAINAGE <= 1);
});
