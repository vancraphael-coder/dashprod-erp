// =============================================================================
// CORRECTIONS PLANNING — permis, et missions d'une même équipe.
//
// Deux précisions de Raphaël, verrouillées ici pour qu'elles ne régressent pas :
//   1. une attention sur le permis UNIQUEMENT si la personne ne l'a pas ;
//   2. une équipe n'est pas en défaut pour porter plusieurs missions qui LUI
//      sont affiliées.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { permisConduite } from "../src/flotte/vehicules.js";
import { lecteurDisponibilite, disponibiliteRessource }
  from "../src/operations/missions.js";

/* ── 1. Permis : on n'alerte que sur une absence RÉELLE ───────────────────── */

test("aucune alerte quand la personne détient le bon permis", () => {
  assert.equal(permisConduite({ permis: "C" }, { permis_detenus: ["C"] }, "2026-09-01").ok, true);
});

test("aucune alerte quand un permis SUPÉRIEUR couvre le requis", () => {
  // CE domaine couvre C : réclamer quand même C serait l'alerte de trop, celle
  // qui pousse à ignorer toutes les autres.
  assert.equal(permisConduite({ permis: "C" }, { permis_detenus: ["CE"] }, "2026-09-01").ok, true);
});

test("alerte UNIQUEMENT quand le permis requis manque vraiment", () => {
  const r = permisConduite({ permis: "C" }, { permis_detenus: ["B"] }, "2026-09-01");
  assert.equal(r.ok, false);
  assert.equal(r.manque, "permis");
});

test("un véhicule sans permis requis ne déclenche jamais d'alerte", () => {
  // Un petit utilitaire (permis B implicite / aucun) ne réclame rien : personne
  // ne doit être signalé à tort pour l'avoir conduit.
  assert.equal(permisConduite({ permis: null }, { permis_detenus: [] }, "2026-09-01").ok, true);
  assert.equal(permisConduite({}, { permis_detenus: null }, "2026-09-01").ok, true);
});

/* ── 2. Une équipe peut porter plusieurs missions sans défaut ──────────────── */

test("deux missions du même jour dans la MÊME équipe ne sont pas un doublon", () => {
  // PRÉCISION DE RAPHAËL : une équipe n'est pas en défaut pour avoir plusieurs
  // missions affiliées. Être sur le déménagement ET l'emballage d'une seule
  // équipe, c'est une seule présence.
  const missions = [
    { id: "m1", date: "2026-09-01", affectations: [{ utilisateur_id: "a" }] },
    { id: "m2", date: "2026-09-01", affectations: [{ utilisateur_id: "a" }] },
  ];
  const lecteur = lecteurDisponibilite({
    missions, equipeParMission: { m1: "E1", m2: "E1" } });
  assert.equal(lecteur.membre("a", { date: "2026-09-01", missionId: "m1" }).niveau, "libre");
  assert.equal(lecteur.membre("a", { date: "2026-09-01", missionId: "m2" }).niveau, "libre");
});

test("deux missions du même jour dans des équipes DISTINCTES restent un doublon", () => {
  // La règle ne s'assouplit que pour UNE équipe : deux équipes différentes le
  // même jour, c'est toujours un conflit — on ne peut être à deux endroits.
  const missions = [
    { id: "m1", date: "2026-09-01", affectations: [{ utilisateur_id: "a" }] },
    { id: "m2", date: "2026-09-01", affectations: [{ utilisateur_id: "a" }] },
  ];
  const lecteur = lecteurDisponibilite({
    missions, equipeParMission: { m1: "E1", m2: "E2" } });
  assert.equal(lecteur.membre("a", { date: "2026-09-01", missionId: "m1" }).niveau, "double");
});

test("sans info d'équipe, le comportement prudent d'avant est conservé", () => {
  // CE QUI CASSE SANS CE TEST : un appelant qui ne passe pas encore
  // `equipeParMission` verrait soudain tous ses doublons disparaître. Sans
  // information, on garde la prudence : deux missions le même jour = doublon.
  const missions = [
    { id: "m1", date: "2026-09-01", affectations: [{ utilisateur_id: "a" }] },
    { id: "m2", date: "2026-09-01", affectations: [{ utilisateur_id: "a" }] },
  ];
  const lecteur = lecteurDisponibilite({ missions });
  assert.equal(lecteur.membre("a", { date: "2026-09-01", missionId: "m1" }).niveau, "double");
});

test("la mission courante ne se compte jamais elle-même", () => {
  const r = disponibiliteRessource({
    date: "2026-09-01", missionId: "m1",
    affectations: [{ missionId: "m1", date: "2026-09-01" }], conges: [] });
  assert.equal(r.niveau, "libre");
});
