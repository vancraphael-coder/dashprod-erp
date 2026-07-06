// Tests — Identité & permissions : autorisation des commandes, claims JWT.
// Partie critique (T3) : ces règles gouvernent qui peut écrire dans le noyau.

import { test } from "node:test";
import assert from "node:assert/strict";

import { COMMANDES, peutExecuter, verifierCommande } from "../src/noyau/autorisation.js";
import { construireClaims, claimsValides, rolesConnus } from "../src/noyau/jwt.js";
import { ROLES } from "../src/noyau/permissions.js";

// --- Autorisation des commandes ---------------------------------------------

test("la direction peut exécuter toutes les commandes du noyau", () => {
  for (const cmd of Object.keys(COMMANDES)) {
    assert.equal(peutExecuter(["direction"], cmd), true, `direction bloquée sur ${cmd}`);
  }
});

test("la coordination ne peut pas publier de référentiel", () => {
  // gérer_référentiels est réservé à la direction (S3) : coordination exclue.
  assert.equal(peutExecuter(["coordination"], "PUBLIER_REFERENTIEL"), false);
  assert.equal(peutExecuter(["coordination"], "AFFECTER_ROLE"), false);
});

test("un commercial ne peut pas inviter d'utilisateur", () => {
  assert.equal(peutExecuter(["commercial"], "INVITER_UTILISATEUR"), false);
});

test("une commande inconnue est refusée par défaut (liste blanche)", () => {
  assert.equal(peutExecuter(["direction"], "COMMANDE_FANTOME"), false);
});

test("verifierCommande explicite la raison du refus (pour l'audit)", () => {
  const r1 = verifierCommande(["commercial"], "PUBLIER_REFERENTIEL");
  assert.equal(r1.autorise, false);
  assert.equal(r1.raison, "capacite_manquante");
  assert.equal(r1.capaciteRequise, "gerer_referentiels");

  const r2 = verifierCommande(["direction"], "COMMANDE_FANTOME");
  assert.equal(r2.autorise, false);
  assert.equal(r2.raison, "commande_inconnue");

  const r3 = verifierCommande(["direction"], "AFFECTER_ROLE");
  assert.equal(r3.autorise, true);
  assert.equal(r3.raison, null);
});

// --- Claims JWT --------------------------------------------------------------

test("construireClaims produit org_id et roles", () => {
  const c = construireClaims({ org_id: "org-1", roles: ["coordination"] });
  assert.equal(c.org_id, "org-1");
  assert.deepEqual(c.roles, ["coordination"]);
});

test("construireClaims défaut roles à [] et exige org_id", () => {
  const c = construireClaims({ org_id: "org-1" });
  assert.deepEqual(c.roles, []);
  assert.throws(() => construireClaims({ roles: ["direction"] }), /org_id obligatoire/);
  assert.throws(() => construireClaims(null), /org_id obligatoire/);
});

test("claimsValides accepte une forme correcte et rejette le reste", () => {
  assert.equal(claimsValides({ org_id: "o", roles: [] }), true);
  assert.equal(claimsValides({ org_id: "o", roles: ["direction"] }), true);
  assert.equal(claimsValides({ org_id: "", roles: [] }), false);      // org vide
  assert.equal(claimsValides({ roles: [] }), false);                   // pas d'org
  assert.equal(claimsValides({ org_id: "o", roles: "direction" }), false); // roles non-tableau
  assert.equal(claimsValides({ org_id: "o", roles: [1, 2] }), false);  // roles non-strings
  assert.equal(claimsValides(null), false);
});

test("rolesConnus filtre les rôles hors catalogue (défense en profondeur)", () => {
  const filtres = rolesConnus(["direction", "pirate", "commercial"], ROLES);
  assert.deepEqual(filtres, ["direction", "commercial"]);
  assert.deepEqual(rolesConnus([], ROLES), []);
});
