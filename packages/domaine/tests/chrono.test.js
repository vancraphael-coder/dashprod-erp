// Tests — Chrono chantier (sessions serveur). Le compteur principal (travail)
// ignore les pauses ; les pauses sont informatives.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  dureeSecondes, chronoEnCours, formaterDuree, formaterChrono, dureePause, enPause,
  heuresParMembre, heuresGlobales,
} from "../src/operations/chrono.js";

test("dureeSecondes additionne les sessions de travail fermées", () => {
  const sessions = [
    { debut: "2026-07-17T08:00:00Z", fin: "2026-07-17T10:00:00Z" },
    { debut: "2026-07-17T13:00:00Z", fin: "2026-07-17T14:30:00Z" },
  ];
  assert.equal(dureeSecondes(sessions), (2 + 1.5) * 3600);
});

test("dureeSecondes compte une session ouverte jusqu'à maintenant", () => {
  const sessions = [{ debut: "2026-07-17T08:00:00Z", fin: null }];
  const ref = new Date("2026-07-17T08:30:00Z");
  assert.equal(dureeSecondes(sessions, ref), 30 * 60);
});

test("dureeSecondes ignore les pauses ; dureePause les cumule", () => {
  const sessions = [
    { debut: "2026-07-17T08:00:00Z", fin: "2026-07-17T12:00:00Z", type: "travail" },
    { debut: "2026-07-17T10:00:00Z", fin: "2026-07-17T10:30:00Z", type: "pause" },
  ];
  assert.equal(dureeSecondes(sessions), 4 * 3600);
  assert.equal(dureePause(sessions), 30 * 60);
});

test("enPause détecte une pause ouverte ; chronoEnCours ignore les pauses", () => {
  const sessions = [
    { debut: "2026-07-17T08:00:00Z", fin: null, type: "travail" },
    { debut: "2026-07-17T10:00:00Z", fin: null, type: "pause" },
  ];
  assert.equal(enPause(sessions), true);
  assert.equal(chronoEnCours(sessions), true);
});

test("formaterDuree affiche h et minutes (1h01)", () => {
  assert.equal(formaterDuree(3661), "1h01");
  assert.equal(formaterDuree(0), "0h00");
});

test("formaterChrono affiche hh:mm:ss (temps réel)", () => {
  assert.equal(formaterChrono(3661), "01:01:01");
  assert.equal(formaterChrono(0), "00:00:00");
});

test("heuresParMembre répartit le temps chantier sur les affectés", () => {
  const missions = [
    { sessions: [{ debut: "2026-07-17T08:00:00Z", fin: "2026-07-17T12:00:00Z" }],
      affectations: [{ utilisateur_id: "a" }, { utilisateur_id: "b" }] },
    { sessions: [{ debut: "2026-07-18T08:00:00Z", fin: "2026-07-18T10:00:00Z" }],
      affectations: [{ utilisateur_id: "a" }] },
  ];
  const h = heuresParMembre(missions);
  assert.equal(h.a, 6 * 3600); // 4h + 2h
  assert.equal(h.b, 4 * 3600);
});

test("heuresGlobales compte le temps chantier une seule fois", () => {
  const missions = [
    { sessions: [{ debut: "2026-07-17T08:00:00Z", fin: "2026-07-17T12:00:00Z" }],
      affectations: [{ utilisateur_id: "a" }, { utilisateur_id: "b" }] },
  ];
  assert.equal(heuresGlobales(missions), 4 * 3600); // pas 8h malgré 2 membres
});
