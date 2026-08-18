// =============================================================================
// FLOTTE — permis, catégories, capacité.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import { permisConduite, permisCouverts } from "../src/flotte/vehicules.js";

/* ── Permis de conduite : signaler, pas bloquer (lot permis) ─────────────── */

test("détenir le grand permis couvre le petit", () => {
  // Un CE conduit tout ; ne comparer que l'égalité crierait à tort sur un
  // fourgon confié à un chef d'équipe titulaire du CE.
  const c = permisCouverts(["CE"]);
  for (const p of ["CE", "C", "C1", "BE", "B"]) assert.ok(c.has(p), `CE couvre ${p}`);
  assert.equal(permisCouverts(["B"]).has("C"), false, "B ne couvre pas C");
});

test("un véhicule sans permis requis ne réclame rien", () => {
  assert.equal(permisConduite({}, { permis_detenus: [] }).ok, true);
});

test("le permis manquant est signalé avec son motif", () => {
  const r = permisConduite({ permis: "C" }, { permis_detenus: ["B"] }, "2026-06-01");
  assert.equal(r.ok, false);
  assert.equal(r.manque, "permis");
  assert.match(r.motif, /permis C/);
});

test("le bon permis passe", () => {
  assert.equal(permisConduite({ permis: "C1" }, { permis_detenus: ["C"] }, "2026-06-01").ok,
    true, "C couvre C1");
});

test("code 95 expiré : signalé SÉPARÉMENT du permis", () => {
  // Deux problèmes, deux actions : passer un permis vs renouveler une formation.
  const r = permisConduite({ permis: "C" },
    { permis_detenus: ["C"], code95_echeance: "2026-01-01" }, "2026-06-01");
  assert.equal(r.ok, false);
  assert.equal(r.manque, "code95");
});

test("une échéance code 95 absente n'est pas une échéance expirée", () => {
  // On ne crie pas sur ce qu'on ignore.
  assert.equal(permisConduite({ permis: "C" }, { permis_detenus: ["C"] }, "2026-06-01").ok,
    true);
});
