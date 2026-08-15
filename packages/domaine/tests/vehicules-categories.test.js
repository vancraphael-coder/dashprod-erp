// =============================================================================
// Véhicules — catégories, lift, capacité.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORIES, CARBURANTS, PERMIS, TYPES_VEHICULE, categorie, porte,
  nomCarburant, nomPermis, capaciteCamions, liftsDisponibles, liftAtteint,
  resumeCapacite,
} from "../src/flotte/vehicules.js";

test("trois catégories, et la carrosserie reste un axe distinct", () => {
  assert.deepEqual(CATEGORIES.map((c) => c.cle), ["camion", "lift", "voiture"]);
  // `type` (fourgon/porteur/hayon) ne doit JAMAIS se mélanger aux catégories :
  // « fourgon » et « lift » ne sont pas du même ordre.
  for (const t of TYPES_VEHICULE) {
    assert.equal(categorie(t), null, `${t} est une carrosserie, pas une catégorie`);
  }
});

test("chaque catégorie porte ses propres attributs", () => {
  assert.equal(porte("camion", "volume"), true);
  assert.equal(porte("camion", "carrosserie"), true);
  assert.equal(porte("camion", "echelle"), false);

  assert.equal(porte("lift", "echelle"), true);
  assert.equal(porte("lift", "volume"), false);
  assert.equal(porte("lift", "carrosserie"), false);

  // Une voiture ne charge rien : c'est le sens de la catégorie.
  assert.equal(porte("voiture", "volume"), false);
  assert.equal(porte("voiture", "echelle"), false);
});

test("une catégorie inconnue ne porte rien", () => {
  assert.equal(categorie("tracteur"), null);
  assert.equal(porte("tracteur", "volume"), false);
});

test("seuls les camions comptent dans la capacité", () => {
  const flotte = [
    { categorie: "camion", volume_m3: 20 },
    { categorie: "camion", volume_m3: 30 },
    { categorie: "lift", volume_m3: 99 },     // saisie parasite : ignorée
    { categorie: "voiture", volume_m3: 5 },
  ];
  assert.equal(capaciteCamions(flotte), 50);
  // Sans catégorie, on suppose un camion : les lignes d'avant la migration.
  assert.equal(capaciteCamions([{ volume_m3: 12 }]), 12);
});

test("on ne propose que les lifts, et jamais un lift archivé", () => {
  const flotte = [
    { id: "a", categorie: "lift" },
    { id: "b", categorie: "camion" },
    { id: "c", categorie: "lift", archive_le: "2026-01-01" },
  ];
  assert.deepEqual(liftsDisponibles(flotte).map((v) => v.id), ["a"]);
});

/* ── L'étage limite ─────────────────────────────────────────────────────── */

test("un lift trop court est refusé, avec le motif", () => {
  const lift = { categorie: "lift", etage_max: 4 };
  const r = liftAtteint(lift, 6);
  assert.equal(r.ok, false);
  assert.match(r.motif, /4e étage/);
  assert.match(r.motif, /6e/);
});

test("un lift qui atteint l'étage passe sans bruit", () => {
  const lift = { categorie: "lift", etage_max: 4 };
  assert.equal(liftAtteint(lift, 4).ok, true);
  assert.equal(liftAtteint(lift, 4).motif, null);
  assert.equal(liftAtteint(lift, 0).ok, true);
});

test("étage maximal non renseigné ne vaut PAS zéro", () => {
  // Le piège Number(null) === 0 : confondre « non renseigné » et « rez-de-
  // chaussée » ferait refuser tous les lifts non documentés.
  for (const max of [null, undefined, ""]) {
    const r = liftAtteint({ categorie: "lift", etage_max: max }, 5);
    assert.equal(r.ok, true, `etage_max=${JSON.stringify(max)} ne doit pas refuser`);
    assert.equal(r.inconnu, true);
    assert.match(r.motif, /non renseigné/i);
  }
  // Zéro EXPLICITE, lui, refuse bien un 5e étage.
  const zero = liftAtteint({ categorie: "lift", etage_max: 0 }, 5);
  assert.equal(zero.ok, false);
});

test("un véhicule qui n'est pas un lift est refusé comme lift", () => {
  const r = liftAtteint({ categorie: "camion", etage_max: 9 }, 2);
  assert.equal(r.ok, false);
  assert.match(r.motif, /pas un lift/i);
});

/* ── Affichage ──────────────────────────────────────────────────────────── */

test("le résumé suit la catégorie", () => {
  assert.equal(resumeCapacite({ categorie: "camion", volume_m3: 20 }), "20 m³");
  assert.equal(resumeCapacite({ categorie: "lift", echelle_m: 21, etage_max: 6 }),
    "21 m · jusqu'au 6e");
  // Une voiture n'annonce aucune charge.
  assert.equal(resumeCapacite({ categorie: "voiture", volume_m3: 5 }), "");
  // Un lift au rez : 0 est une valeur, pas une absence.
  assert.match(resumeCapacite({ categorie: "lift", echelle_m: 8, etage_max: 0 }),
    /jusqu'au 0e/);
});

test("carburants et permis sont nommés, l'inconnu reste nul", () => {
  assert.equal(nomCarburant("diesel"), "Diesel");
  assert.equal(nomCarburant("fioul"), null);
  assert.equal(nomPermis("C"), "C");
  assert.equal(nomPermis("Z"), null);
  assert.ok(CARBURANTS.some((c) => c.cle === "electrique"));
  assert.ok(PERMIS.some((p) => p.cle === "BE"));
});
