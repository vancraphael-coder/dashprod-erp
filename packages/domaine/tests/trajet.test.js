// Tests — temps de trajet et heure de départ conseillée.
import test from "node:test";
import assert from "node:assert/strict";
import {
  minutesDepuisKm, trajet, heureDepartConseillee, heureArriveePrevue,
  formaterTrajet, conseilDepart, VITESSE_MOYENNE_KMH, MARGE_PREPARATION_MIN,
} from "../src/operations/trajet.js";

const RDV = new Date("2026-07-28T08:00:00");

test("une distance devient une durée à vitesse moyenne", () => {
  assert.equal(minutesDepuisKm(50), 60);
  assert.equal(minutesDepuisKm(25), 30);
  assert.equal(minutesDepuisKm(0), 0);
  assert.equal(minutesDepuisKm(null), 0);
});

test("une durée mesurée l'emporte sur une distance", () => {
  const t = trajet({ minutes: 22, km: 40, source: "mesure" });
  assert.equal(t.minutes, 22, "on n'écrase pas une mesure par une estimation");
  assert.equal(t.source, "mesure");
});

test("sans durée, la distance donne une estimation clairement marquée", () => {
  const t = trajet({ km: 25 });
  assert.equal(t.ok, true);
  assert.equal(t.minutes, 30);
  assert.equal(t.source, "estime");
});

test("sans rien, on ne répond RIEN — pas un zéro", () => {
  const t = trajet({});
  assert.equal(t.ok, false);
  assert.equal(t.minutes, null);
  assert.ok(t.raison);
});

test("l'heure de départ recule du trajet ET de la préparation", () => {
  const d = heureDepartConseillee(RDV, trajet({ minutes: 30, source: "mesure" }), 15);
  assert.equal(d.getHours(), 7);
  assert.equal(d.getMinutes(), 15, "08:00 − 30 min − 15 min");
});

test("aucune heure conseillée si le trajet est inconnu", () => {
  assert.equal(heureDepartConseillee(RDV, trajet({})), null);
  assert.equal(heureDepartConseillee(null, trajet({ minutes: 20 })), null);
});

test("l'arrivée prévue se déduit d'un départ réel", () => {
  const a = heureArriveePrevue(new Date("2026-07-28T07:20:00"),
                               trajet({ minutes: 25, source: "mesure" }));
  assert.equal(a.getHours(), 7);
  assert.equal(a.getMinutes(), 45);
});

test("formaterTrajet se lit à voix haute", () => {
  assert.equal(formaterTrajet(25), "25 min");
  assert.equal(formaterTrajet(60), "1 h");
  assert.equal(formaterTrajet(65), "1 h 05");
});

test("le conseil porte toujours la qualité de la réponse", () => {
  const mesure = conseilDepart(RDV, trajet({ minutes: 30, source: "mesure" }));
  assert.match(mesure.texte, /07:15/);
  assert.equal(/estimation/.test(mesure.detail), false, "une mesure ne s'annonce pas comme estimée");

  const estime = conseilDepart(RDV, trajet({ km: 25 }));
  assert.match(estime.detail, /estimation/, "une estimation le dit");
});

test("sans trajet connu, le conseil explique quoi faire", () => {
  const c = conseilDepart(RDV, trajet({}));
  assert.equal(c.ok, false);
  assert.ok(c.detail && c.detail.length > 10);
});

test("les constantes restent prudentes et nommées", () => {
  assert.equal(VITESSE_MOYENNE_KMH, 50);
  assert.equal(MARGE_PREPARATION_MIN, 15);
});
