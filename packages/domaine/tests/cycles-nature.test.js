// =============================================================================
// A1 — LES CYCLES DE VIE PAR NATURE.
// Défaut corrigé : une seule machine à états pour six métiers → 47 dossiers
// bloqués en brouillon (boxe, zone, sous-traitance à 100 %).
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  familleDeNature, etatsDeNature, transitionsDeNature,
  verifierTransitionNature, exigeSignature, exigeEquipe, ETATS_CONTRAT,
} from "../src/crm/cycles-nature.js";

test("chaque nature tombe dans la bonne famille de cycle", () => {
  assert.equal(familleDeNature("demenagement"), "chantier");
  assert.equal(familleDeNature("lift"), "chantier");
  assert.equal(familleDeNature("sous_traitance"), "chantier");
  assert.equal(familleDeNature("boxe"), "contrat");
  assert.equal(familleDeNature("zone"), "contrat");
  assert.equal(familleDeNature("vente"), "vente");
  // Une nature inconnue retombe sur le cycle le PLUS strict, jamais le plus
  // permissif : on ne débloque rien par accident.
  assert.equal(familleDeNature("inconnue"), "chantier");
});

test("LE DÉMÉNAGEMENT NE CHANGE PAS : signature toujours exigée", () => {
  // L'invariant C-02 est préservé. Un accord tracé NE suffit PAS.
  const sans = verifierTransitionNature("demenagement", "envoye", "confirme",
    { accordTrace: true });
  assert.equal(sans.ok, false);
  assert.match(sans.motif, /SIGNÉE/);
  const avec = verifierTransitionNature("demenagement", "envoye", "confirme",
    { instanceSignee: true });
  assert.equal(avec.ok, true);
  assert.equal(exigeSignature("demenagement"), true);
});

test("LE LIFT se confirme sur un accord tracé (20 dossiers débloqués)", () => {
  assert.equal(exigeSignature("lift"), false);
  assert.equal(
    verifierTransitionNature("lift", "envoye", "confirme", { accordTrace: true }).ok,
    true);
  // Une signature reste acceptée si elle existe.
  assert.equal(
    verifierTransitionNature("lift", "envoye", "confirme", { instanceSignee: true }).ok,
    true);
  // Mais pas de confirmation sans RIEN.
  assert.equal(verifierTransitionNature("lift", "envoye", "confirme", {}).ok, false);
});

test("LE LIFT se planifie sans équipe constituée", () => {
  assert.equal(exigeEquipe("lift"), false);
  assert.equal(exigeEquipe("demenagement"), true);
  assert.equal(
    verifierTransitionNature("lift", "confirme", "planifie",
      { aDate: true, aVehicule: true }).ok, true);
});

test("LE BOXE suit un cycle CONTRAT : ni planifié, ni effectué", () => {
  const etats = etatsDeNature("boxe");
  assert.deepEqual(etats, [...ETATS_CONTRAT]);
  assert.equal(etats.includes("planifie"), false, "un box ne se planifie pas");
  assert.equal(etats.includes("effectue"), false, "un box ne s'exécute pas");
  // Le parcours réel : proposition → actif → terminé.
  assert.equal(verifierTransitionNature("boxe", "brouillon", "proposition",
    { aTarif: true }).ok, true);
  assert.equal(verifierTransitionNature("boxe", "proposition", "actif",
    { aTarif: true, aDateDebut: true }).ok, true);
  assert.equal(verifierTransitionNature("boxe", "actif", "termine",
    { aDateFin: true }).ok, true);
});

test("un contrat sans TARIF ne peut pas devenir actif (rien à facturer)", () => {
  const r = verifierTransitionNature("boxe", "proposition", "actif",
    { aDateDebut: true });
  assert.equal(r.ok, false);
  assert.match(r.motif, /tarif/i);
});

test("un contrat se SUSPEND et reprend, sans rompre", () => {
  assert.ok(transitionsDeNature("boxe", "actif").includes("suspendu"));
  assert.ok(transitionsDeNature("boxe", "suspendu").includes("actif"));
  assert.ok(transitionsDeNature("boxe", "suspendu").includes("termine"));
});

test("une VENTE n'a pas de cycle : la facture fait foi", () => {
  assert.deepEqual(etatsDeNature("vente"), []);
  const r = verifierTransitionNature("vente", "brouillon", "devis", {});
  assert.equal(r.ok, false);
  assert.match(r.motif, /facture fait foi/i);
});
