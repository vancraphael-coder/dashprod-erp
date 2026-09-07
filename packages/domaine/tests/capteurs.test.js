// =============================================================================
// LES CAPTEURS KPI — déclarés AVANT le tableau de bord, pour éviter la dette.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPTEURS, FAMILLES_KPI, SENS, capteur, capteursDeSecteur,
  capteursDeFamille, contratExposition, catalogueMcp, catalogueApi,
} from "../src/pilotage/capteurs.js";

test("chaque capteur est complet et cohérent", () => {
  const cles = new Set();
  for (const c of CAPTEURS) {
    assert.ok(c.cle && c.libelle, "clé et libellé requis");
    assert.equal(cles.has(c.cle), false, `${c.cle} en double`);
    cles.add(c.cle);
    assert.ok(FAMILLES_KPI.includes(c.famille), `${c.cle} : famille inconnue`);
    assert.ok(Object.values(SENS).includes(c.sens), `${c.cle} : sens inconnu`);
    // Une mesure sans SOURCE est une intention, pas un capteur.
    assert.ok(c.source, `${c.cle} : source manquante`);
  }
});

test("un secteur ne voit que ce qui le concerne", () => {
  // Un garde-meubles n'a pas de chantier : pas d'heures réelles vs estimées.
  const boxe = capteursDeSecteur("boxe").map((c) => c.cle);
  assert.equal(boxe.includes("heures_reelles_vs_estimees"), false);
  assert.ok(boxe.includes("taux_occupation"));
  assert.ok(boxe.includes("recurrent_mensuel"));
  // Un déménageur voit le terrain, pas l'occupation de boxes.
  const dem = capteursDeSecteur("demenagement").map((c) => c.cle);
  assert.ok(dem.includes("chantiers_du_jour"));
  assert.equal(dem.includes("taux_occupation"), false);
  // L'argent est universel.
  for (const s of ["demenagement", "boxe", "lift", "sous_traitance"]) {
    assert.ok(capteursDeSecteur(s).some((c) => c.cle === "ca_emis"));
  }
});

test("les familles se lisent séparément", () => {
  const argent = capteursDeFamille("argent", "boxe").map((c) => c.cle);
  assert.ok(argent.includes("recurrent_mensuel"));
  assert.ok(argent.every((k) => capteur(k).famille === "argent"));
});

test("le contrat d'exposition est prêt pour l'API et le MCP", () => {
  // C'est ce qui évite de ré-annoter cinquante mesures dans six mois.
  const c = contratExposition("ca_emis");
  assert.equal(c.api, true);
  assert.equal(c.mcp, true);
  assert.ok(c.unite && c.sens, "un consommateur externe doit pouvoir interpréter");
  assert.equal(contratExposition("inexistant"), null);
});

test("le catalogue MCP permet un pilotage sans adaptateur sur mesure", () => {
  const cat = catalogueMcp();
  assert.ok(cat.length >= 15);
  for (const c of cat) {
    assert.ok(c.cle && c.libelle && c.unite && c.sens);
  }
});

test("le catalogue API expose ce qui doit être PROUVABLE", () => {
  const cles = catalogueApi().map((c) => c.cle);
  // La conformité doit être exposable : c'est le sens du branchement.
  assert.ok(cles.includes("factures_sans_communication"));
  assert.ok(cles.includes("documents_transport_incomplets"));
  assert.ok(cles.includes("ca_emis"));
});

test("le réseau est déjà déclaré, prêt à être alimenté", () => {
  // Poser les capteurs réseau maintenant évite de les rétro-ajouter.
  const r = capteursDeFamille("reseau");
  assert.ok(r.some((c) => c.cle === "missions_recues"));
  assert.ok(r.some((c) => c.cle === "missions_envoyees"));
});
