// =============================================================================
// LA DISPONIBILITÉ DES RESSOURCES — ce que le bureau doit voir avant d'engager.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import { lecteurDisponibilite } from "../src/operations/missions.js";

/* ── Le lecteur de disponibilité : une composition, une seule ────────────── */

const MISSIONS_J = [
  { id: "m1", date: "2026-09-10", affectations: [{ utilisateur_id: "u1" }], camions: ["v1"] },
  { id: "m2", date: "2026-09-10", affectations: [{ utilisateur_id: "u1" }], camions: ["v1"] },
  { id: "m3", date: "2026-09-11", affectations: [{ utilisateur_id: "u2" }], camions: [] },
];
const CONGES_J = [
  { utilisateur_id: "u2", etat: "approuve", debut: "2026-09-09", fin: "2026-09-12" },
  { utilisateur_id: "u3", etat: "demande", debut: "2026-09-09", fin: "2026-09-12" },
];

test("un doublon reste visible même sur la mission qu'on est en train d'éditer", () => {
  // Le symptôme qui coûtait cher : une fois la ressource affectée, le conflit
  // disparaissait — donc on ne voyait jamais qu'on venait de la réserver deux
  // fois. Le lecteur exclut la mission COURANTE, pas la ressource.
  const l = lecteurDisponibilite({ missions: MISSIONS_J, conges: CONGES_J });
  const d = l.membre("u1", { date: "2026-09-10", missionId: "m1" });
  assert.equal(d.niveau, "double");
  assert.equal(d.raison, "déjà pris");
});

test("un congé ACCORDÉ rend indisponible, une demande en attente non", () => {
  // Sinon le membre déciderait seul de son planning : la décision est au bureau.
  const l = lecteurDisponibilite({ missions: MISSIONS_J, conges: CONGES_J });
  assert.equal(l.membre("u2", { date: "2026-09-11", missionId: "mX" }).niveau,
    "indisponible");
  assert.equal(l.membre("u3", { date: "2026-09-11", missionId: "mX" }).niveau,
    "libre");
});

test("un véhicule se surveille aussi — il ne prend simplement pas de congé", () => {
  const l = lecteurDisponibilite({ missions: MISSIONS_J, conges: CONGES_J });
  assert.equal(l.vehicule("v1", { date: "2026-09-10", missionId: "m1" }).niveau,
    "double");
  assert.equal(l.vehicule("v1", { date: "2026-09-11", missionId: "m3" }).niveau,
    "libre");
});

test("sans date, aucun conflit n'est inventé", () => {
  // Une carte dont la date n'est pas posée ne doit réclamer ni signaler rien.
  const l = lecteurDisponibilite({ missions: MISSIONS_J, conges: CONGES_J });
  assert.equal(l.membre("u1", { date: null, missionId: null }).conflit, false);
});
