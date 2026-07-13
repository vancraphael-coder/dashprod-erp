// Tests — Opérations/Agenda : vue planning. Critique : l'ordre des jours et le
// filtre par membre (le terrain ne voit que ses missions).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  grouperParJour, chargeDuJour, missionsDuMembre, grilleMois, missionsDuJour,
} from "../src/operations/agenda.js";

test("grouperParJour trie les jours et les missions par heure", () => {
  const missions = [
    { id: "b", date: "2026-07-06", heure: "14:00" },
    { id: "a", date: "2026-07-05", heure: "08:00" },
    { id: "c", date: "2026-07-06", heure: "09:00" },
  ];
  const g = grouperParJour(missions);
  assert.deepEqual(g.map((x) => x.date), ["2026-07-05", "2026-07-06"]);
  // le 6 : 09:00 avant 14:00
  assert.deepEqual(g[1].missions.map((m) => m.id), ["c", "b"]);
});

test("grouperParJour ignore les missions sans date", () => {
  const g = grouperParJour([{ id: "x" }, { id: "y", date: "2026-07-05" }]);
  assert.equal(g.length, 1);
});

test("chargeDuJour compte missions et effectif affecté", () => {
  const jour = [
    { id: "a", affectations: [{ utilisateur_id: "u1" }, { utilisateur_id: "u2" }] },
    { id: "b", affectations: [{ utilisateur_id: "u3" }] },
  ];
  assert.deepEqual(chargeDuJour(jour), { nbMissions: 2, effectif: 3 });
});

test("missionsDuMembre ne renvoie que les missions où le membre est affecté", () => {
  const missions = [
    { id: "a", affectations: [{ utilisateur_id: "u1" }] },
    { id: "b", affectations: [{ utilisateur_id: "u2" }] },
    { id: "c", affectations: [{ utilisateur_id: "u1" }, { utilisateur_id: "u2" }] },
  ];
  const vues = missionsDuMembre(missions, "u1");
  assert.deepEqual(vues.map((m) => m.id), ["a", "c"]);
});

test("missionsDuMembre tolère différentes formes d'affectation", () => {
  const missions = [
    { id: "a", affectations: ["u1"] },                       // id brut
    { id: "b", affectations: [{ utilisateurId: "u1" }] },    // camelCase
  ];
  assert.equal(missionsDuMembre(missions, "u1").length, 2);
});

// --- Grille calendrier (vue mensuelle) ---------------------------------------

test("grilleMois : décalage correct pour une semaine commençant lundi", () => {
  // 1er juillet 2026 est un MERCREDI → 2 cases vides (lundi, mardi).
  const g = grilleMois(2026, 6, []);
  assert.equal(g.decalage, 2);
  assert.equal(g.jours.length, 31);
});

test("grilleMois : un mois commençant un dimanche décale de 6 (piège getDay)", () => {
  // 1er mars 2026 est un DIMANCHE → getDay()=0, mais 6 cases vides au lundi.
  const g = grilleMois(2026, 2, []);
  assert.equal(g.decalage, 6);
});

test("grilleMois : densité des missions par jour", () => {
  const missions = [
    { date: "2026-07-14" }, { date: "2026-07-14" }, { date: "2026-07-20" },
  ];
  const g = grilleMois(2026, 6, missions);
  assert.equal(g.jours.find((j) => j.jour === 14).nb, 2);
  assert.equal(g.jours.find((j) => j.jour === 20).nb, 1);
  assert.equal(g.jours.find((j) => j.jour === 15).nb, 0);
});

test("grilleMois : février bissextile 2028 → 29 jours", () => {
  assert.equal(grilleMois(2028, 1, []).jours.length, 29);
});

test("missionsDuJour filtre et trie par heure", () => {
  const missions = [
    { id: "b", date: "2026-07-14", heure: "14:00" },
    { id: "a", date: "2026-07-14", heure: "08:00" },
    { id: "c", date: "2026-07-15", heure: "09:00" },
  ];
  assert.deepEqual(missionsDuJour(missions, "2026-07-14").map((m) => m.id), ["a", "b"]);
});
