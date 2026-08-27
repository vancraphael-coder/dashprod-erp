// =============================================================================
// LA MAIN-D'ŒUVRE RÉELLE — les heures pointées, valorisées au coût interne.
//
// Ce que ces tests protègent : que le « réel » du Calcul définitif cesse d'être
// l'estimation du devis déguisée, et devienne ce que chaque membre a vraiment
// pointé. Une erreur ici, et une mission déficitaire passe pour rentable.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  heuresPointees, mainOeuvreReelle, ecartHeures,
} from "../src/pilotage/main-oeuvre-reelle.js";

test("les heures pointées se lisent en heures OU en secondes", () => {
  assert.equal(heuresPointees({ heures: 7.5 }), 7.5);
  assert.equal(heuresPointees({ secondes: 3600 * 6 }), 6);
  // Ni l'un ni l'autre : affecté mais pas pointé → 0, pas une erreur.
  assert.equal(heuresPointees({}), 0);
});

test("Number(null) ne devient pas 0 h silencieux qui fausse le total", () => {
  // Le piège récurrent du dépôt : une heure absente coercée en 0 passe pour
  // « a travaillé zéro » au lieu de « n'a pas pointé ». Ici 0 est explicite et
  // remonte dans `sansPointage`, jamais noyé.
  assert.equal(heuresPointees({ heures: null }), 0);
  assert.equal(heuresPointees({ heures: NaN }), 0);
  assert.equal(heuresPointees({ heures: -3 }), 0, "une durée négative n'existe pas");
});

test("chaque membre apporte SES heures × SON taux interne", () => {
  // LE DÉFAUT CORRIGÉ : avant, tout le monde recevait les mêmes heures (celles
  // du devis). Ici Ana a fait 8 h, Bob 6 h — leurs coûts diffèrent.
  const r = mainOeuvreReelle({
    pointages: [{ membreId: "a", heures: 8 }, { membreId: "b", heures: 6 }],
    taux: { a: 22, b: 20 },
    membres: [{ id: "a", nom: "Ana" }, { id: "b", nom: "Bob" }],
  });
  assert.equal(r.heuresTotales, 14);
  assert.equal(r.coutEuros, 8 * 22 + 6 * 20);   // 296
  assert.equal(r.lignes.find((l) => l.membreId === "a").coutEuros, 176);
  assert.equal(r.lignes.find((l) => l.membreId === "b").coutEuros, 120);
});

test("un membre affecté SANS pointage apparaît à 0 h, et est signalé", () => {
  // Son absence de pointage est une information (oubli ? absence ?), pas un
  // silence. On ne le retire pas de la liste.
  const r = mainOeuvreReelle({
    pointages: [{ membreId: "a", heures: 8 }, { membreId: "z" }],
    taux: { a: 20, z: 20 },
  });
  assert.deepEqual(r.sansPointage, ["z"]);
  assert.equal(r.lignes.length, 2, "le non-pointé reste visible");
  assert.equal(r.coutEuros, 160, "il ne coûte rien tant qu'il n'a pas pointé");
});

test("un taux inconnu sur des heures réelles est signalé, pas ignoré", () => {
  // CE QUI CASSE SANS CE TEST : un membre pointé sans taux connu compte pour
  // 0 € et fait passer une mission chère pour bon marché. On le remonte dans
  // `sansTaux` pour que le bureau le voie.
  const r = mainOeuvreReelle({
    pointages: [{ membreId: "a", heures: 8 }],
    taux: {},   // aucun taux connu
  });
  assert.deepEqual(r.sansTaux, ["a"]);
  assert.equal(r.coutEuros, 0);
  assert.equal(r.lignes[0].tauxConnu, false);
});

test("un membre à 0 h avec taux inconnu n'encombre PAS sansTaux", () => {
  // Le taux ne manque que s'il aurait servi : pas de pointage, pas de reproche.
  const r = mainOeuvreReelle({ pointages: [{ membreId: "a" }], taux: {} });
  assert.deepEqual(r.sansTaux, []);
  assert.deepEqual(r.sansPointage, ["a"]);
});

test("l'écart prévu / réel se mesure sans juger de sa cause", () => {
  // Le module MESURE ; il ne décide pas si le dépassement est facturable ou
  // interne — c'est la décision du bureau, portée ailleurs.
  assert.deepEqual(ecartHeures(18, 23),
    { prevues: 18, reelles: 23, ecart: 5, depassement: true });
  assert.deepEqual(ecartHeures(20, 17),
    { prevues: 20, reelles: 17, ecart: -3, depassement: false });
  // Prévu absent : on ne fabrique pas un dépassement de nulle part.
  assert.equal(ecartHeures(null, 10).ecart, 10);
});

test("les totaux ne dérivent pas en flottants sales", () => {
  const r = mainOeuvreReelle({
    pointages: [{ membreId: "a", heures: 2.1 }, { membreId: "b", heures: 1.2 }],
    taux: { a: 19.99, b: 19.99 },
  });
  assert.equal(r.heuresTotales, 3.3);
  // 2.1*19.99 + 1.2*19.99 = 65.967 → arrondi propre au centime.
  assert.equal(r.coutEuros, 65.97);
});

/* ── Agrégation des sessions individuelles (0147/0148) ───────────────────── */

import { pointagesParMembre } from "../src/pilotage/main-oeuvre-reelle.js";

test("les sessions d'un membre sur plusieurs missions s'ADDITIONNENT", () => {
  // C'est son temps TOTAL sur le dossier : matin sur une mission, après-midi
  // sur une autre.
  const p = pointagesParMembre([
    { utilisateur_id: "a", depart: "2026-09-01T08:00:00Z", arrivee: "2026-09-01T12:00:00Z" },
    { utilisateur_id: "a", depart: "2026-09-01T13:00:00Z", arrivee: "2026-09-01T17:00:00Z" },
  ]);
  assert.deepEqual(p.pointages, [{ membreId: "a", heures: 8 }]);
});

test("une session sans utilisateur_id (pointage collectif d'avant 0147) est ignorée", () => {
  // CE QUI CASSE SANS CE TEST : attribuer une session collective à quelqu'un au
  // hasard fausserait son coût. On ne devine pas — on l'écarte et on le compte.
  const p = pointagesParMembre([
    { utilisateur_id: null, depart: "2026-09-01T08:00:00Z", arrivee: "2026-09-01T16:00:00Z" },
    { utilisateur_id: "a", depart: "2026-09-01T08:00:00Z", arrivee: "2026-09-01T12:00:00Z" },
  ]);
  assert.equal(p.collectivesIgnorees, 1);
  assert.deepEqual(p.pointages, [{ membreId: "a", heures: 4 }]);
});

test("une session non clôturée (sans arrivée) compte 0 h, pas un temps qui court", () => {
  const p = pointagesParMembre([
    { utilisateur_id: "a", depart: "2026-09-01T08:00:00Z", arrivee: null },
  ]);
  assert.deepEqual(p.pointages, [{ membreId: "a", heures: 0 }]);
});

test("une arrivée avant le départ ne crée pas d'heures négatives", () => {
  const p = pointagesParMembre([
    { utilisateur_id: "a", depart: "2026-09-01T17:00:00Z", arrivee: "2026-09-01T08:00:00Z" },
  ]);
  assert.deepEqual(p.pointages, [{ membreId: "a", heures: 0 }]);
});
