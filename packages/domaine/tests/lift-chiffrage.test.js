// =============================================================================
// Chiffrage du LIFT — couronne, temps inclus, homme supplémentaire.
//
// La règle la plus facile à trahir, et la plus coûteuse : un homme en plus
// REPREND LE TEMPS mais NE DOUBLE PAS LE PRIX. Doubler reviendrait à facturer
// deux fois le déplacement et la machine.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import * as LIFT from "../src/chiffrage/lift.js";

const REGLAGES = {
  parCentre: {
    anvers: [
      { jusqua_km: 10, prix_centimes: 15000, heures_incluses: 1 },
      { jusqua_km: 25, prix_centimes: 21000, heures_incluses: 2 },
    ],
  },
  maisonMere: [
    { jusqua_km: 20, prix_centimes: 20000, heures_incluses: 1 },
    { jusqua_km: 50, prix_centimes: 30000, heures_incluses: 2 },
  ],
};

const SUPP = { heure_centimes: 6000, homme_heure_centimes: 4000, km_centimes: 200 };

/* ── La couronne ────────────────────────────────────────────────────────── */

test("un centre applique sa grille, sinon celle de la maison mère", () => {
  assert.equal(LIFT.grilleDuCentre(REGLAGES, "anvers").origine, "centre");
  assert.equal(LIFT.grilleDuCentre(REGLAGES, "gand").origine, "maison_mere");
  assert.equal(LIFT.grilleDuCentre({}, "gand").origine, "defaut");
});

test("l'origine de la grille est toujours dite — on discute des prix", () => {
  const r = LIFT.chiffrer({ km: 8, heures: 1 }, REGLAGES, "anvers", SUPP);
  assert.equal(r.origine, "centre");
});

test("dans la couronne et dans le temps inclus, on paie l'anneau seul", () => {
  const r = LIFT.chiffrer({ km: 8, heures: 1 }, REGLAGES, "anvers", SUPP);
  assert.equal(r.total_centimes, 15000);
  assert.equal(r.lignes.length, 1);
  assert.equal(r.heures_supplementaires, 0);
});

test("la bonne couronne est choisie, bornes incluses", () => {
  assert.equal(LIFT.chiffrer({ km: 10, heures: 1 }, REGLAGES, "anvers", SUPP)
    .total_centimes, 15000);
  // 10,1 km bascule sur l'anneau suivant, qui inclut 2 h.
  assert.equal(LIFT.chiffrer({ km: 10.1, heures: 2 }, REGLAGES, "anvers", SUPP)
    .total_centimes, 21000);
});

/* ── Le temps inclus est PROPRE à la couronne ───────────────────────────── */

test("chaque couronne porte son propre temps inclus", () => {
  // 2 h à 8 km : l'anneau proche n'inclut qu'1 h → 1 h de dépassement.
  const proche = LIFT.chiffrer({ km: 8, heures: 2 }, REGLAGES, "anvers", SUPP);
  assert.equal(proche.heures_incluses, 1);
  assert.equal(proche.heures_supplementaires, 1);
  assert.equal(proche.total_centimes, 15000 + 6000);

  // Les mêmes 2 h à 20 km : l'anneau lointain les inclut → rien en plus.
  const loin = LIFT.chiffrer({ km: 20, heures: 2 }, REGLAGES, "anvers", SUPP);
  assert.equal(loin.heures_incluses, 2);
  assert.equal(loin.heures_supplementaires, 0);
  assert.equal(loin.total_centimes, 21000);
});

test("toute heure entamée au-delà de l'inclus est due", () => {
  const r = LIFT.chiffrer({ km: 8, heures: 1.2 }, REGLAGES, "anvers", SUPP);
  assert.equal(r.heures_supplementaires, 1);
  const r2 = LIFT.chiffrer({ km: 8, heures: 3.1 }, REGLAGES, "anvers", SUPP);
  assert.equal(r2.heures_supplementaires, 3);
});

/* ── L'homme supplémentaire ─────────────────────────────────────────────── */

test("un homme en plus NE DOUBLE PAS le prix", () => {
  const seul = LIFT.chiffrer({ km: 8, heures: 1 }, REGLAGES, "anvers", SUPP);
  const aDeux = LIFT.chiffrer({ km: 8, heures: 1, hommes_supp: 1 },
                              REGLAGES, "anvers", SUPP);
  assert.ok(aDeux.total_centimes < seul.total_centimes * 2,
    "doubler reviendrait à facturer deux fois le déplacement et la machine");
  // Il ajoute exactement son supplément horaire, rien d'autre.
  assert.equal(aDeux.total_centimes, seul.total_centimes + 4000);
});

test("l'homme en plus reprend TOUT le temps sur place, pas le dépassement", () => {
  // 3 h sur place, anneau à 1 h incluse : 2 h de dépassement, mais l'homme
  // supplémentaire est présent les 3 heures.
  const r = LIFT.chiffrer({ km: 8, heures: 3, hommes_supp: 1 },
                          REGLAGES, "anvers", SUPP);
  const ligne = r.lignes.find((l) => l.cle === "hommes_supp");
  assert.equal(ligne.centimes, 3 * 4000);
  assert.match(ligne.libelle, /× 3 h/);
  assert.equal(r.total_centimes, 15000 + 2 * 6000 + 3 * 4000);
});

test("deux hommes en plus comptent double, eux", () => {
  const un = LIFT.chiffrer({ km: 8, heures: 2, hommes_supp: 1 }, REGLAGES, "anvers", SUPP);
  const deux = LIFT.chiffrer({ km: 8, heures: 2, hommes_supp: 2 }, REGLAGES, "anvers", SUPP);
  assert.equal(deux.total_centimes - un.total_centimes, 2 * 4000);
});

test("sans temps saisi, l'homme en plus est compté sur le temps inclus", () => {
  // Sinon il coûterait zéro : `heures` non renseigné ne doit pas l'effacer.
  const r = LIFT.chiffrer({ km: 8, hommes_supp: 1 }, REGLAGES, "anvers", SUPP);
  const ligne = r.lignes.find((l) => l.cle === "hommes_supp");
  assert.ok(ligne.centimes > 0);
  assert.equal(ligne.centimes, 1 * 4000);
});

test("le supplément de l'homme est fixé par le bureau, pas en dur", () => {
  const cher = LIFT.chiffrer({ km: 8, heures: 1, hommes_supp: 1 }, REGLAGES,
    "anvers", { ...SUPP, homme_heure_centimes: 9000 });
  assert.equal(cher.total_centimes, 15000 + 9000);
});

/* ── Hors couronne ──────────────────────────────────────────────────────── */

test("au-delà du dernier anneau, on prolonge au km sans refuser", () => {
  const r = LIFT.chiffrer({ km: 40, heures: 2 }, REGLAGES, "anvers", SUPP);
  assert.equal(r.hors_couronne, true);
  assert.equal(r.km_supplementaires, 15);            // 40 − 25
  assert.equal(r.total_centimes, 21000 + 15 * 200);  // anneau + km, 2 h incluses
});

test("une couronne mal saisie est écartée, pas intégrée au tri", () => {
  const sales = [{ jusqua_km: 20, prix_centimes: 20000 },
                 { jusqua_km: null, prix_centimes: 5000 },
                 { jusqua_km: 10, prix_centimes: null },
                 { jusqua_km: 5, prix_centimes: 10000 }];
  assert.deepEqual(LIFT.couronnes(sales).map((c) => c.jusqua_km), [5, 20]);
  // Un anneau sans temps déclaré ne vend que le déplacement : 0, pas NaN.
  assert.equal(LIFT.couronnes(sales)[0].heures_incluses, 0);
});

test("les durées se lisent, elles ne se calculent pas de tête", () => {
  assert.equal(LIFT.formaterHeures(2), "2 h");
  assert.equal(LIFT.formaterHeures(1.5), "1 h 30");
  assert.equal(LIFT.formaterHeures(0.5), "30 min");
  assert.equal(LIFT.formaterHeures(0), "0 h");
});

test("la grille se décrit en anneaux lisibles, temps compris", () => {
  const d = LIFT.decrireGrille(REGLAGES.maisonMere);
  assert.deepEqual(d.map((l) => l.libelle), ["0 – 20 km", "20 – 50 km"]);
  assert.deepEqual(d.map((l) => l.heures_incluses), [1, 2]);
});
