// =============================================================================
// CONFORMITÉ TRANSPORT — CMR / lettre de voiture (réglementation belge).
// Repérage de terrain, pas un avis juridique : voir l'en-tête du module.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  exigeDocumentTransport, estInternational, regimeDocument,
  verifierMentions, controleAvantDepart, MENTIONS_CMR,
} from "../src/conformite/transport.js";

test("seul le transport pour compte d'autrui appelle un document", () => {
  // Le déménagement relève d'un régime PROPRE, pas de la CMR fret.
  assert.equal(exigeDocumentTransport("sous_traitance"), true);
  assert.equal(exigeDocumentTransport("demenagement"), false);
  assert.equal(exigeDocumentTransport("lift"), false);
  assert.equal(exigeDocumentTransport("boxe"), false);
  assert.equal(exigeDocumentTransport("zone"), false);
});

test("le régime dépend du franchissement de frontière", () => {
  assert.equal(regimeDocument("sous_traitance", "BE", "FR"), "cmr");
  assert.equal(regimeDocument("sous_traitance", "BE", "BE"), "national");
  // Un déménagement ne relève d'aucun de ces deux régimes.
  assert.equal(regimeDocument("demenagement", "BE", "FR"), "aucun");
  // Pays inconnu : on ne PRÉSUME pas l'international.
  assert.equal(estInternational("", "FR"), false);
  assert.equal(estInternational("be", "BE"), false, "insensible à la casse");
});

test("les mentions obligatoires de la CMR sont listées", () => {
  // Art. 6 : sans elles, le document est contestable au contrôle.
  const cles = MENTIONS_CMR.map((m) => m.cle);
  for (const c of ["expediteur", "transporteur", "destinataire",
                   "lieu_prise_en_charge", "lieu_livraison",
                   "nature_marchandise", "poids_brut", "mention_convention"]) {
    assert.ok(cles.includes(c), `${c} doit être exigée`);
  }
});

test("un document incomplet est détecté, mention par mention", () => {
  const partiel = { expediteur: "Roovers", transporteur: "Roovers" };
  const r = verifierMentions(partiel, "cmr");
  assert.equal(r.complet, false);
  assert.ok(r.manquantes.length > 5);
  // Une chaîne vide ne vaut pas une mention renseignée.
  const vide = verifierMentions({ ...partiel, destinataire: "   " }, "cmr");
  assert.ok(vide.manquantes.some((m) => m.cle === "destinataire"));
});

test("le régime national exige MOINS que la CMR internationale", () => {
  const doc = {};
  const cmr = verifierMentions(doc, "cmr").manquantes.length;
  const nat = verifierMentions(doc, "national").manquantes.length;
  assert.ok(nat < cmr, "le national ne réclame ni douane ni mention de la Convention");
});

test("on SIGNALE avant le départ, on ne bloque pas le terrain", () => {
  const r = controleAvantDepart("sous_traitance", "BE", "FR", {});
  // Règle du projet : on signale, on n'interdit pas.
  assert.equal(r.peutPartir, true);
  assert.match(r.avertissement, /CMR/);
  assert.match(r.avertissement, /manquante/);
  // Un déménagement ne déclenche aucun avertissement de ce type.
  assert.equal(controleAvantDepart("demenagement", "BE", "FR", {}).avertissement, null);
});
