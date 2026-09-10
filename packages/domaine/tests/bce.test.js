// =============================================================================
// Le moteur d'identité d'entreprise — étage pur.
//
// CE QUI CASSE SANS CES TESTS : la série 1. L'ancienne règle exigeait « BE0 »
// suivi de neuf chiffres. Toute entreprise inscrite à la BCE depuis le
// 19 septembre 2023 porte un numéro commençant par 1 et se voyait refuser
// l'inscription — sans message compréhensible, le bouton restant simplement
// grisé. Le premier cas rencontré fut la société de l'éditeur lui-même.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  normaliserSaisie, typeIdentifiant, normaliserBce, cleModulo97Valide,
  bceValide, tvaBelgeValide, formaterBce, formaterTvaBe, identifiantPeppol,
  statutConfiance,
} from "../src/organisation/bce.js";

// Deux numéros réels, un de chaque série, avec leur clé de contrôle juste.
const SERIE_0 = "0478363616";   // Déménagements Roovers
const SERIE_1 = "1033973082";   // Van Cutsem Raphaël

test("un même numéro écrit de six façons donne le même identifiant", () => {
  const ecritures = [
    "0478363616", "0478.363.616", "BE0478363616", "BE 0478.363.616",
    "be0478363616", "0478 363 616",
  ];
  for (const e of ecritures) {
    assert.equal(normaliserBce(e), SERIE_0, `échec sur « ${e} »`);
  }
});

test("le type d'identifiant est nommé, jamais deviné", () => {
  assert.equal(typeIdentifiant(SERIE_0), "bce");
  assert.equal(typeIdentifiant(SERIE_1), "bce");
  assert.equal(typeIdentifiant("BE0478363616"), "tva_be");
  assert.equal(typeIdentifiant("FR12345678901"), "tva_ue");
  assert.equal(typeIdentifiant(""), "inconnu");
  assert.equal(typeIdentifiant("bonjour"), "inconnu");
  // 9 chiffres, 11 chiffres : ni l'un ni l'autre n'est un numéro belge.
  assert.equal(typeIdentifiant("047836361"), "inconnu");
  assert.equal(typeIdentifiant("04783636160"), "inconnu");
  // Un numéro d'unité d'établissement commence par 2 : ce n'est PAS un
  // numéro d'entreprise, et le confondre mènerait à interroger la mauvaise
  // fiche à la source officielle.
  assert.equal(typeIdentifiant("2478363616"), "inconnu");
});

test("la clé modulo 97 tombe juste sur les deux séries", () => {
  assert.equal(cleModulo97Valide(SERIE_0), true);
  assert.equal(cleModulo97Valide(SERIE_1), true);
  assert.equal(cleModulo97Valide(`BE${SERIE_1}`), true);
});

test("RÉGRESSION — la série 1 n'est plus refusée", () => {
  // L'ancienne règle : /^BE0\d{9}$/. Elle disait faux sur ce numéro pourtant
  // parfaitement valide, et le formulaire de création restait bloqué.
  assert.equal(/^BE0\d{9}$/.test(`BE${SERIE_1}`), false, "l'ancienne règle refusait bien");
  assert.equal(tvaBelgeValide(`BE${SERIE_1}`), true, "la nouvelle l'accepte");
  assert.equal(bceValide(SERIE_1), true);
});

test("une faute de frappe est attrapée", () => {
  // Deux chiffres intervertis : la structure tient, la clé ne tombe plus.
  assert.equal(cleModulo97Valide("0478363661"), false);
  assert.equal(cleModulo97Valide("1033973083"), false);
  assert.equal(bceValide("0478363661"), false);
});

test("le vide n'est pas jugé ; l'étranger est typé, pas confondu", () => {
  // Un champ non rempli n'est pas une erreur : c'est un champ non rempli.
  assert.equal(bceValide(""), true);
  assert.equal(bceValide(null), true);
  assert.equal(tvaBelgeValide(undefined), true);
  // En revanche une TVA étrangère n'est PAS une TVA belge : la fonction
  // répond à cette question-là, et `typeIdentifiant` reste disponible pour
  // celui qui ouvrira l'international.
  assert.equal(tvaBelgeValide("NL123456789B01"), false);
  assert.equal(typeIdentifiant("NL123456789B01"), "tva_ue");
});

test("les formes d'affichage sont canoniques", () => {
  assert.equal(formaterBce("BE 0478.363.616"), "0478.363.616");
  assert.equal(formaterTvaBe("0478.363.616"), "BE0478363616");
  assert.equal(formaterBce("bonjour"), null);
  assert.equal(formaterTvaBe(""), null);
});

test("l'identifiant Peppol utilise le schéma 0208, pas le numéro de TVA", () => {
  assert.equal(identifiantPeppol("BE 0478.363.616"), "0208:0478363616");
  assert.equal(identifiantPeppol(SERIE_1), "0208:1033973082");
  assert.equal(identifiantPeppol("FR12345678901"), null);
});

test("le statut de confiance ne promet que ce qui a été établi", () => {
  const t0 = new Date("2026-09-09T00:00:00Z");
  assert.equal(statutConfiance({ numero: "" }), "absent");
  assert.equal(statutConfiance({ numero: "0478363661" }), "invalide");
  assert.equal(statutConfiance({ numero: SERIE_0 }), "structure");
  // Cohérent mais jamais confronté à une source : ce n'est pas « vérifié ».
  assert.equal(
    statutConfiance({ numero: SERIE_0, sourceOfficielle: true, verifieLe: null }),
    "structure");
  assert.equal(
    statutConfiance({ numero: SERIE_0, sourceOfficielle: true,
                      verifieLe: "2026-09-01T00:00:00Z", maintenant: t0 }),
    "officiel");
});

test("une vérification périmée retombe à « cohérent, non vérifié »", () => {
  const t0 = new Date("2026-09-09T00:00:00Z");
  // Une confirmation d'il y a deux ans ne dit rien de l'entreprise
  // d'aujourd'hui : la présenter comme officielle serait fabriquer de la
  // confiance.
  assert.equal(
    statutConfiance({ numero: SERIE_0, sourceOfficielle: true,
                      verifieLe: "2024-09-01T00:00:00Z", maintenant: t0 }),
    "structure");
  // Bord exact : le dernier jour de validité compte encore.
  assert.equal(
    statutConfiance({ numero: SERIE_0, sourceOfficielle: true,
                      verifieLe: "2026-03-13T00:00:00Z", maintenant: t0,
                      validiteJours: 180 }),
    "officiel");
  // Une date future ne vaut pas vérification.
  assert.equal(
    statutConfiance({ numero: SERIE_0, sourceOfficielle: true,
                      verifieLe: "2027-01-01T00:00:00Z", maintenant: t0 }),
    "structure");
});

test("normaliserSaisie ne juge rien et ne complète rien", () => {
  assert.equal(normaliserSaisie(" be 0478.363.616 "), "BE0478363616");
  assert.equal(normaliserSaisie(null), "");
  assert.equal(normaliserSaisie("n'importe quoi"), "N'IMPORTEQUOI");
});
