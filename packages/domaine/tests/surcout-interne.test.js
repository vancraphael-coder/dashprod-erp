// =============================================================================
// LE SURCOÛT INTERNE — panne/retard/nettoyage : coût réel, jamais facturé.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  MOTIFS_INTERNES, motifInterne, surcoutInterne, surcoutValide,
  terrainPeutModifier, bureauPeutCorriger, heuresInternes, coutInterne,
  effetSurCalcul,
} from "../src/pilotage/surcout-interne.js";

test("les motifs de Raphaël existent, tous internes", () => {
  for (const cle of ["panne_retour", "retard_equipe", "nettoyage"]) {
    assert.ok(motifInterne(cle), `le motif « ${cle} » doit exister`);
  }
  assert.equal(MOTIFS_INTERNES.some((m) => m.facturable), false);
});

test("LE PRINCIPE : le surcoût interne n'ajoute JAMAIS au facturé", () => {
  const effet = effetSurCalcul(120);
  assert.equal(effet.ajouteAuReel, 120);
  assert.equal(effet.ajouteAuFacture, 0, "JAMAIS un centime sur la facture");
});

test("les heures internes s'additionnent, les motifs inconnus sont ignorés", () => {
  const s = [
    { motif: "panne_retour", heures: 1 },
    { motif: "nettoyage", heures: 0.5 },
    { motif: "inconnu", heures: 5 },
    { motif: "retard_equipe", heures: 0.25 },
  ];
  assert.equal(heuresInternes(s), 1.75);
});

test("le coût interne valorise au taux, ventilé par motif", () => {
  const c = coutInterne([
    { motif: "panne_retour", heures: 2 },
    { motif: "nettoyage", heures: 1 },
  ], 22);
  assert.equal(c.heures, 3);
  assert.equal(c.coutEuros, 66);
  assert.equal(c.parMotif.find((p) => p.motif === "panne_retour").coutEuros, 44);
});

test("Number(null) ne fabrique pas d'heures internes fantômes", () => {
  assert.equal(heuresInternes([{ motif: "panne_retour", heures: null }]), 0);
  assert.equal(coutInterne([{ motif: "nettoyage", heures: 2 }], null).coutEuros, 0);
});

test("le terrain déclare et FIGE : figé, il ne modifie plus", () => {
  assert.equal(terrainPeutModifier({ motif: "panne_retour", heures: 1, fige: false }), true);
  assert.equal(terrainPeutModifier({ motif: "panne_retour", heures: 1, fige: true }), false);
  assert.equal(bureauPeutCorriger(true), true);
  assert.equal(bureauPeutCorriger(false), false);
});

test("une déclaration vide ou sans motif est refusée", () => {
  assert.equal(surcoutValide({ heures: 1 }).ok, false);
  assert.equal(surcoutValide({ motif: "panne_retour", heures: 0 }).ok, false);
  assert.equal(surcoutValide({ motif: "panne_retour", heures: -2 }).ok, false);
  assert.equal(surcoutValide({ motif: "autre_interne", heures: 1 }).ok, false);
  assert.equal(surcoutValide({ motif: "autre_interne", heures: 1, note: "grève" }).ok, true);
  assert.equal(surcoutValide({ motif: "nettoyage", heures: 0.5 }).ok, true);
});

test("surcoutInterne normalise proprement", () => {
  const s = surcoutInterne({ motif: "nettoyage", heures: "1.5", note: "  boue  ", fige: 1 });
  assert.equal(s.heures, 1.5);
  assert.equal(s.note, "boue");
  assert.equal(s.fige, true);
  assert.equal(surcoutInterne({ motif: "bidon" }).motif, null);
});

/* ── L'intégration au Calcul définitif (usage réel de Devis.jsx) ─────────── */

test("dans le Calcul définitif : le surcoût grossit le réel, pas le facturé", () => {
  // Reproduit exactement ce que fait CalculDefinitif : coûts réels + surcoût
  // au réel, facturé inchangé.
  const surcouts = [
    { motif: "panne_retour", heures: 1, fige: true },
    { motif: "nettoyage", heures: 0.5, fige: true },
  ];
  const tauxMoyen = 24;
  const c = coutInterne(surcouts, tauxMoyen);        // 1.5 h × 24 = 36
  const effet = effetSurCalcul(c.coutEuros);

  const diversReelAvant = 100;
  const diversReelApres = diversReelAvant + effet.ajouteAuReel;
  assert.equal(diversReelApres, 136, "le réel absorbe le surcoût");

  // Le facturé, lui, est calculé à part et ne reçoit RIEN du surcoût.
  const factureAvant = 500;
  const factureApres = factureAvant + effet.ajouteAuFacture;
  assert.equal(factureApres, 500, "le facturé ne bouge pas d'un centime");
});
