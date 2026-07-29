// Tests — horaires prévus d'une mission.
import test from "node:test";
import assert from "node:assert/strict";
import {
  minutesDe, hhmm, minutesRoute, formaterMinutes, verifierHoraires,
  resumeHoraires, HEURE_DEFAUT,
} from "../src/operations/horaires.js";

test("les colonnes time reviennent en HH:MM:SS et se normalisent", () => {
  assert.equal(hhmm("07:30:00"), "07:30");
  assert.equal(hhmm("07:30"), "07:30");
  assert.equal(hhmm(null), "");
  assert.equal(hhmm("25:00"), "", "une heure impossible n'est pas normalisée");
});

test("minutesDe lit l'heure, ou refuse", () => {
  assert.equal(minutesDe("08:00"), 480);
  assert.equal(minutesDe("07:45"), 465);
  assert.equal(minutesDe("bonjour"), null);
});

test("le temps de route se DÉDUIT, il ne se stocke pas", () => {
  assert.equal(minutesRoute("07:30", "08:00"), 30);
  assert.equal(minutesRoute("07:00", "08:15"), 75);
});

test("sans les deux heures, aucune durée n'est affichée", () => {
  assert.equal(minutesRoute("07:30", null), null);
  assert.equal(minutesRoute(null, "08:00"), null);
});

test("formaterMinutes se lit à voix haute", () => {
  assert.equal(formaterMinutes(30), "30 min");
  assert.equal(formaterMinutes(60), "1 h");
  assert.equal(formaterMinutes(75), "1 h 15");
  assert.equal(formaterMinutes(null), "");
});

test("une arrivée avant le départ est refusée", () => {
  const v = verifierHoraires({ depart: "08:00", arrivee: "07:00" });
  assert.equal(v.ok, false);
  assert.match(v.message, /antérieure/);
});

test("un trajet démesuré alerte (probable faute de frappe)", () => {
  const v = verifierHoraires({ depart: "06:00", arrivee: "20:00" });
  assert.equal(v.ok, false);
  assert.match(v.message, /8 h/);
});

test("des horaires normaux passent", () => {
  assert.equal(verifierHoraires({ depart: "07:15", heure: "08:00",
                                  arrivee: "07:50" }).ok, true);
});

test("des heures partiellement remplies ne bloquent pas la saisie", () => {
  assert.equal(verifierHoraires({ depart: "07:15" }).ok, true);
  assert.equal(verifierHoraires({}).ok, true);
});

test("le résumé dit ce qui manque au lieu de l'inventer", () => {
  const r = resumeHoraires({ depart: "07:30:00", heure: "08:00:00" });
  assert.equal(r.depart, "07:30");
  assert.equal(r.arrivee, null);
  assert.equal(r.route, null);
  assert.equal(r.complet, false);
});

test("le résumé complet porte le temps de route déduit", () => {
  const r = resumeHoraires({ depart: "07:30", heure: "08:00", arrivee: "07:55" });
  assert.equal(r.route_minutes, 25);
  assert.equal(r.route, "25 min");
  assert.equal(r.complet, true);
});

test("l'heure par défaut belge est 08:00", () => {
  assert.equal(HEURE_DEFAUT, "08:00");
});
