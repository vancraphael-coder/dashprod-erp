// Tests — pointage déclaré (double minuteur départ / arrivée).
import test from "node:test";
import assert from "node:assert/strict";
import {
  instant, heureDe, corrigerJourSuivant, secondesTravail, heuresTravail,
  secondesPause, formaterDuree, etatPointage, verifierPointage,
} from "../src/operations/pointage.js";

const T = (h) => new Date(`2026-07-28T${h}:00`);

test("instant combine la date de mission et l'heure saisie", () => {
  const i = instant("2026-07-28", "07:30");
  assert.equal(i.getHours(), 7);
  assert.equal(i.getMinutes(), 30);
  assert.equal(instant("", "07:30"), null);
  assert.equal(instant("2026-07-28", "7h30"), null);
});

test("heureDe prérempli le champ au format HH:MM", () => {
  assert.equal(heureDe(T("07:05")), "07:05");
  assert.equal(heureDe(null), "");
});

test("durée simple, sans pause", () => {
  assert.equal(secondesTravail(T("08:00"), T("16:00")), 8 * 3600);
  assert.equal(heuresTravail(T("08:00"), T("16:00")), 8);
});

test("les pauses se déduisent du temps travaillé", () => {
  const pauses = [{ debut: T("12:00"), fin: T("12:30") }];
  assert.equal(secondesTravail(T("08:00"), T("16:00"), pauses), 7.5 * 3600);
  assert.equal(heuresTravail(T("08:00"), T("16:00"), pauses), 7.5);
});

test("sans arrivée déclarée, le minuteur court jusqu'à maintenant", () => {
  const s = secondesTravail(T("08:00"), null, [], T("11:00"));
  assert.equal(s, 3 * 3600);
});

test("aucun départ = aucune durée (on n'invente pas une heure)", () => {
  assert.equal(secondesTravail(null, T("16:00")), 0);
});

test("un retour après minuit est compris, pas rejeté", () => {
  const depart = new Date("2026-07-28T22:00:00");
  const saisie = new Date("2026-07-28T01:30:00");   // le chef tape 01:30
  const corrige = corrigerJourSuivant(depart, saisie);
  assert.equal(corrige.getDate(), 29, "l'arrivée bascule au lendemain");
  assert.equal(secondesTravail(depart, corrige), 3.5 * 3600);
});

test("une pause hors des bornes du chantier est ignorée", () => {
  const pauses = [
    { debut: T("12:00"), fin: T("12:30") },   // valide
    { debut: T("06:00"), fin: T("06:30") },   // avant le départ
    { debut: T("18:00"), fin: T("18:30") },   // après l'arrivée
    { debut: T("14:00"), fin: T("13:00") },   // fin avant début
  ];
  assert.equal(secondesPause(pauses, T("08:00"), T("16:00")), 1800);
});

test("formaterDuree se lit d'un coup d'œil", () => {
  assert.equal(formaterDuree(7 * 3600 + 25 * 60), "7 h 25");
  assert.equal(formaterDuree(3600), "1 h");
  assert.equal(formaterDuree(45 * 60), "45 min");
  assert.equal(formaterDuree(0), "0 min");
});

test("les trois phases proposent une seule action évidente", () => {
  const avant = etatPointage(null, null);
  assert.equal(avant.phase, "avant");
  assert.match(avant.action, /départ/i);

  const encours = etatPointage(T("08:00"), null);
  assert.equal(encours.phase, "encours");
  assert.equal(encours.encours, true);
  assert.match(encours.action, /arrivée/i);
  // En cours, AUCUNE durée n'est calculée : on ne projette pas l'horloge.
  assert.equal(encours.secondes, null,
    "tant que l'arrivée manque, la durée reste indéfinie — pas d'extrapolation");

  const fini = etatPointage(T("08:00"), T("16:00"));
  assert.equal(fini.phase, "termine");
  assert.equal(fini.action, null);
  assert.equal(fini.encours, false);
  assert.equal(fini.secondes, 8 * 3600, "départ + arrivée posés : durée définie");
});

test("le total ne se calcule que sur des heures définies (départ ET arrivée)", () => {
  // C'est le cœur de la correction : sans arrivée, pas de total, même si le
  // départ est connu depuis des heures.
  assert.equal(etatPointage(T("08:00"), null).secondes, null);
  assert.equal(etatPointage(T("08:00"), T("11:30")).secondes, 3.5 * 3600);
});

// — Contrôles de saisie —
test("une arrivée avant le départ est refusée", () => {
  const v = verifierPointage(T("16:00"), T("08:00"));
  assert.equal(v.ok, false);
  assert.match(v.message, /précéder/i);
});

test("un départ manquant est refusé", () => {
  assert.equal(verifierPointage(null, T("16:00")).ok, false);
});

test("une journée de plus de 18 h alerte (probable erreur de saisie)", () => {
  const v = verifierPointage(T("06:00"), new Date("2026-07-29T02:00:00"));
  assert.equal(v.ok, false);
  assert.match(v.message, /18 h/);
});

test("des pauses plus longues que le chantier sont refusées", () => {
  const v = verifierPointage(T("08:00"), T("09:00"),
    [{ debut: T("08:10"), fin: T("08:50") }, { debut: T("08:00"), fin: T("08:40") }]);
  assert.equal(v.ok, false);
  assert.match(v.message, /pauses/i);
});

test("un pointage normal passe les contrôles", () => {
  assert.equal(verifierPointage(T("07:30"), T("16:15"),
    [{ debut: T("12:00"), fin: T("12:30") }]).ok, true);
});
