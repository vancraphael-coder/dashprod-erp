// Tests — Opérations : chrono de mission et conflits d'affectation.
// Parties critiques : coût réel (chrono) et intégrité du planning (conflits).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  dureeSecondes, chronoEnCours, coutEquipeCentimes, formaterDuree,
} from "../src/operations/chrono.js";
import {
  transitionMissionPermise, estEnConge, conflitsAffectation, remplacantsDisponibles,
} from "../src/operations/missions.js";

// --- Chrono ------------------------------------------------------------------

test("dureeSecondes somme les sessions closes, pauses exclues", () => {
  // 2 sessions de 1 h chacune, séparées d'une pause d'1 h → 2 h comptées.
  const sessions = [
    { debut: "2026-07-05T08:00:00Z", fin: "2026-07-05T09:00:00Z" },
    { debut: "2026-07-05T10:00:00Z", fin: "2026-07-05T11:00:00Z" },
  ];
  assert.equal(dureeSecondes(sessions), 7200);
});

test("une session ouverte est comptée jusqu'à 'maintenant'", () => {
  const sessions = [{ debut: "2026-07-05T08:00:00Z" }]; // pas de fin
  const maintenant = new Date("2026-07-05T08:30:00Z");
  assert.equal(dureeSecondes(sessions, maintenant), 1800); // 30 min
});

test("chronoEnCours détecte une session ouverte", () => {
  assert.equal(chronoEnCours([{ debut: "x", fin: "y" }]), false);
  assert.equal(chronoEnCours([{ debut: "x" }]), true);
  assert.equal(chronoEnCours([]), false);
});

test("coutEquipeCentimes utilise les taux réels des affectés", () => {
  // 2 h × (30 + 32 + 35) €/h = 2 × 97 = 194 € = 19400 centimes
  const cout = coutEquipeCentimes(7200, [30, 32, 35]);
  assert.equal(cout, 19400);
});

test("coutEquipeCentimes applique un repli prudent sans taux", () => {
  // 1 h × (3 × 32) = 96 € = 9600 centimes
  const cout = coutEquipeCentimes(3600, [], { effectif: 3, tauxDefaut: 32 });
  assert.equal(cout, 9600);
});

test("formaterDuree produit HhMM", () => {
  assert.equal(formaterDuree(7200), "2h00");
  assert.equal(formaterDuree(5430), "1h30"); // 1 h 30 min 30 s
  assert.equal(formaterDuree(0), "0h00");
});

// --- Sous-cycle de mission ---------------------------------------------------

test("transitions de mission : chemin nominal permis, sauts interdits", () => {
  assert.equal(transitionMissionPermise("planifiee", "en_cours"), true);
  assert.equal(transitionMissionPermise("en_cours", "effectuee"), true);
  assert.equal(transitionMissionPermise("planifiee", "effectuee"), false);
  assert.equal(transitionMissionPermise("effectuee", "en_cours"), false);
});

// --- Conflits d'affectation --------------------------------------------------

const CONGES = [{ debut: "2026-07-10", fin: "2026-07-20" }];

test("estEnConge détecte une date couverte", () => {
  assert.equal(estEnConge(CONGES, "2026-07-15"), true);
  assert.equal(estEnConge(CONGES, "2026-07-10"), true); // borne
  assert.equal(estEnConge(CONGES, "2026-07-21"), false);
  assert.equal(estEnConge([], "2026-07-15"), false);
});

test("conflitsAffectation signale un congé", () => {
  const r = conflitsAffectation({
    date: "2026-07-15", missionId: "m1", conges: CONGES, affectations: [],
  });
  assert.equal(r.enConge, true);
  assert.equal(r.conflit, true);
});

test("conflitsAffectation signale une double affectation le même jour", () => {
  const r = conflitsAffectation({
    date: "2026-07-05", missionId: "m1", conges: [],
    affectations: [{ missionId: "m2", date: "2026-07-05T14:00:00Z" }],
  });
  assert.equal(r.doubleAffectation, true);
  assert.equal(r.conflit, true);
});

test("la mission elle-même n'est pas un doublon d'elle-même", () => {
  const r = conflitsAffectation({
    date: "2026-07-05", missionId: "m1", conges: [],
    affectations: [{ missionId: "m1", date: "2026-07-05" }],
  });
  assert.equal(r.doubleAffectation, false);
  assert.equal(r.conflit, false);
});

test("remplacantsDisponibles exclut inactifs et personnes en conflit (C-20)", () => {
  const membres = [
    { id: "libre",   actif: true,  conges: [], affectations: [] },
    { id: "conge",   actif: true,  conges: CONGES, affectations: [] },
    { id: "pris",    actif: true,  conges: [], affectations: [{ missionId: "m9", date: "2026-07-15" }] },
    { id: "inactif", actif: false, conges: [], affectations: [] },
  ];
  const dispo = remplacantsDisponibles({ date: "2026-07-15", missionId: "m1", membres });
  assert.deepEqual(dispo, ["libre"]);
});
