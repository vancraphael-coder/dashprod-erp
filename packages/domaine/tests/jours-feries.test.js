// Tests — jours fériés belges et qualification du planning.
import test from "node:test";
import assert from "node:assert/strict";
import {
  paques, joursFeriesBelges, nomFerie, qualifierJour, feriesSurPlage,
} from "../src/planning/jours-feries.js";

test("Pâques tombe aux dates connues", () => {
  // Dates vérifiables du calendrier grégorien.
  assert.equal(paques(2026).toISOString().slice(0, 10), "2026-04-05");
  assert.equal(paques(2025).toISOString().slice(0, 10), "2025-04-20");
  assert.equal(paques(2024).toISOString().slice(0, 10), "2024-03-31");
});

test("il y a exactement 10 jours fériés légaux belges", () => {
  assert.equal(joursFeriesBelges(2026).length, 10);
});

test("les fériés fixes sont présents à leur date", () => {
  const f = joursFeriesBelges(2026);
  const cherche = (d) => f.find((x) => x.date === d);
  assert.ok(cherche("2026-07-21"), "fête nationale");
  assert.ok(cherche("2026-12-25"), "Noël");
  assert.ok(cherche("2026-11-11"), "armistice");
});

test("les fériés mobiles suivent Pâques 2026 (05/04)", () => {
  const f = joursFeriesBelges(2026);
  assert.ok(f.find((x) => x.date === "2026-04-06"), "lundi de Pâques");
  assert.ok(f.find((x) => x.date === "2026-05-14"), "Ascension (Pâques +39)");
  assert.ok(f.find((x) => x.date === "2026-05-25"), "lundi de Pentecôte (Pâques +50)");
});

test("nomFerie reconnaît un férié et rejette un jour ordinaire", () => {
  assert.equal(nomFerie("2026-07-21"), "Fête nationale");
  assert.equal(nomFerie("2026-07-22"), null);
});

test("qualifierJour croise férié, fermeture et jour ouvrable", () => {
  const fermetures = [{ debut: "2026-07-20", fin: "2026-08-03",
                        motif: "Congé annuel" }];

  const ferie = qualifierJour("2026-07-21", fermetures);
  assert.equal(ferie.ferie, "Fête nationale");
  assert.equal(ferie.ferme, true, "le 21/07 tombe aussi dans la fermeture");

  const ferme = qualifierJour("2026-07-27", fermetures);
  assert.equal(ferme.ferie, null);
  assert.equal(ferme.ferme, true);
  assert.equal(ferme.motif_fermeture, "Congé annuel");

  const normal = qualifierJour("2026-09-15", fermetures);
  assert.equal(normal.ouvrable, true);
});

test("feriesSurPlage couvre plusieurs années", () => {
  const m = feriesSurPlage(2025, 2026);
  assert.equal(m.get("2026-12-25"), "Noël");
  assert.equal(m.get("2025-12-25"), "Noël");
  assert.ok(m.size >= 20, "au moins 10 par an sur deux ans");
});
