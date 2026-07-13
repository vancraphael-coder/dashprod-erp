// Tests — Flotte : capacité, jauge, alertes. Critique : la jauge évite le
// « tout ne rentre pas » du jour J ; les alertes empêchent de rouler CT expiré.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  capaciteFlotte, jaugeCapacite, alertesVehicule,
} from "../src/flotte/vehicules.js";

const REF = new Date("2026-07-15T00:00:00Z");

test("capaciteFlotte somme les volumes (numériques ou texte SQL)", () => {
  assert.equal(capaciteFlotte([{ volume_m3: 20 }, { volume_m3: "12.5" }]), 32.5);
  assert.equal(capaciteFlotte([]), 0);
});

test("jaugeCapacite : zones ok / serre / surcharge", () => {
  assert.deepEqual(jaugeCapacite(10, 20), { pct: 50, zone: "ok" });
  assert.deepEqual(jaugeCapacite(19, 20), { pct: 95, zone: "serre" });
  assert.deepEqual(jaugeCapacite(25, 20), { pct: 125, zone: "surcharge" });
  assert.equal(jaugeCapacite(10, 0).zone, "vide");
});

test("alertesVehicule : mécanique urgente ou CT expiré → urgent", () => {
  const a = alertesVehicule({ etat_mecanique: "urgent" }, REF);
  assert.equal(a.niveau, "urgent");
  const b = alertesVehicule({ etat_mecanique: "ok", ct_echeance: "2026-06-01" }, REF);
  assert.equal(b.niveau, "urgent");
  assert.match(b.raisons[0], /expiré/);
});

test("alertesVehicule : échéance proche ou mécanique à surveiller → attention", () => {
  const a = alertesVehicule({ etat_mecanique: "surveiller" }, REF);
  assert.equal(a.niveau, "attention");
  const b = alertesVehicule({ etat_mecanique: "ok", assurance_echeance: "2026-08-01" }, REF);
  assert.equal(b.niveau, "attention");
});

test("alertesVehicule : rien à signaler → ok, sans raison", () => {
  const a = alertesVehicule({ etat_mecanique: "ok", ct_echeance: "2027-06-01" }, REF);
  assert.deepEqual(a, { niveau: "ok", raisons: [] });
});
