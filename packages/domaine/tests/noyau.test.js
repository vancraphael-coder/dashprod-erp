// Tests du noyau — permissions et référentiels versionnés.
// Exécution : node --test (runner natif, zéro dépendance).
// Priorité critique (S3, C-07) : ces règles gouvernent l'accès et le calcul.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CAPACITES, ROLES, resoudreCapacites, aCapacite,
} from "../src/noyau/permissions.js";
import {
  versionActive, versionParId, versionPerimee,
} from "../src/noyau/referentiels.js";

// --- Permissions ------------------------------------------------------------

test("direction détient toutes les capacités", () => {
  for (const cap of Object.values(CAPACITES)) {
    assert.equal(aCapacite(["direction"], cap), true, `direction manque ${cap}`);
  }
});

test("un déménageur ne voit pas les prix ni la paie", () => {
  assert.equal(aCapacite(["demenageur"], CAPACITES.VOIR_PRIX), false);
  assert.equal(aCapacite(["demenageur"], CAPACITES.VOIR_PAIE), false);
});

test("un déménageur peut signaler du matériel et demander un congé", () => {
  assert.equal(aCapacite(["demenageur"], CAPACITES.SIGNALER_MATERIEL), true);
  assert.equal(aCapacite(["demenageur"], CAPACITES.DEMANDER_CONGE), true);
});

test("seule la direction gère les référentiels", () => {
  assert.equal(aCapacite(["direction"], CAPACITES.GERER_REFERENTIELS), true);
  assert.equal(aCapacite(["coordination"], CAPACITES.GERER_REFERENTIELS), false);
  assert.equal(aCapacite(["commercial"], CAPACITES.GERER_REFERENTIELS), false);
});

test("le cumul de rôles est une union de capacités (S3)", () => {
  // Un commercial qui est aussi coordination obtient gérer_planning (via coord).
  const caps = resoudreCapacites(["commercial", "coordination"]);
  assert.equal(caps.has(CAPACITES.GERER_PLANNING), true);
  assert.equal(caps.has(CAPACITES.VOIR_PRIX), true);
  // …mais pas voir_paie, qu'aucun des deux ne porte.
  assert.equal(caps.has(CAPACITES.VOIR_PAIE), false);
});

test("valider un intake est réservé à coordination et direction", () => {
  assert.equal(aCapacite(["coordination"], CAPACITES.VALIDER_INTAKE), true);
  assert.equal(aCapacite(["direction"], CAPACITES.VALIDER_INTAKE), true);
  assert.equal(aCapacite(["commercial"], CAPACITES.VALIDER_INTAKE), false);
  assert.equal(aCapacite(["chef_equipe"], CAPACITES.VALIDER_INTAKE), false);
});

test("rôle inconnu ou liste vide ne donne aucune capacité", () => {
  assert.equal(resoudreCapacites([]).size, 0);
  assert.equal(resoudreCapacites(["role_inexistant"]).size, 0);
  assert.equal(resoudreCapacites(null).size, 0);
});

// --- Référentiels versionnés ------------------------------------------------

const REFS = [
  { id: "a", type: "bareme_horaire", cle: "std", valeur: { 3: 120 },
    version: 1, actif: true, juridiction: "BE", publie_le: "2026-01-01" },
  { id: "b", type: "bareme_horaire", cle: "std", valeur: { 3: 130 },
    version: 2, actif: true, juridiction: "BE", publie_le: "2026-06-01" },
  { id: "c", type: "bareme_horaire", cle: "std", valeur: { 3: 140 },
    version: 3, actif: false, juridiction: "BE", publie_le: "2026-07-01" },
  { id: "fr", type: "bareme_horaire", cle: "std", valeur: { 3: 150 },
    version: 1, actif: true, juridiction: "FR", publie_le: "2026-05-01" },
];

test("versionActive prend la version active la plus haute", () => {
  const v = versionActive(REFS, "bareme_horaire", "std", "BE");
  assert.equal(v.id, "b"); // v3 est inactive, donc v2 gagne
});

test("versionActive respecte la juridiction (I-4)", () => {
  const fr = versionActive(REFS, "bareme_horaire", "std", "FR");
  assert.equal(fr.id, "fr");
  assert.equal(fr.valeur[3], 150);
});

test("versionActive renvoie null si rien ne correspond", () => {
  assert.equal(versionActive(REFS, "inexistant", "x"), null);
  assert.equal(versionActive([], "bareme_horaire", "std"), null);
});

test("versionParId retrouve une version précise (reconstitution d'offre)", () => {
  assert.equal(versionParId(REFS, "a").valeur[3], 120);
  assert.equal(versionParId(REFS, "zzz"), null);
});

test("versionPerimee détecte qu'une offre s'appuie sur un barème dépassé", () => {
  // Une offre calculée avec la v1 (id "a") : la v2 active existe → périmée.
  assert.equal(versionPerimee(REFS, "a"), true);
  // Une offre calculée avec la v2 (id "b") : c'est l'active → non périmée.
  assert.equal(versionPerimee(REFS, "b"), false);
  // Référence inconnue : pas d'alerte.
  assert.equal(versionPerimee(REFS, "zzz"), false);
});
