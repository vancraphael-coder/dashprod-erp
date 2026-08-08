import test from "node:test";
import assert from "node:assert/strict";
import {
  VUES, dansLaVue, filtrerParVue, compteursVues, vueParDefaut,
} from "../src/crm/vues-dossiers.js";

const A = (etat) => ({ etat });

test("les vues couvrent le travail dans l'ordre où on le pense", () => {
  assert.deepEqual(VUES.map((v) => v.cle),
    ["a_traiter", "a_planifier", "terrain", "a_cloturer", "tous"]);
});

test("chaque état actif tombe dans exactement une vue métier", () => {
  const etats = ["brouillon", "devis", "envoye", "confirme", "reporte",
                 "planifie", "en_cours", "effectue"];
  for (const e of etats) {
    const vues = VUES.filter((v) => v.etats && v.etats.includes(e));
    assert.equal(vues.length, 1, `${e} devrait être dans une seule vue`);
  }
});

test("« Tous » contient tout, y compris clos et annulé", () => {
  assert.equal(dansLaVue(A("clos"), "tous"), true);
  assert.equal(dansLaVue(A("annule"), "tous"), true);
  assert.equal(dansLaVue(A("effectue"), "a_cloturer"), true);
  assert.equal(dansLaVue(A("clos"), "a_cloturer"), false);
});

test("filtrer par vue ne garde que les bons dossiers", () => {
  const liste = [A("devis"), A("confirme"), A("effectue"), A("clos")];
  assert.equal(filtrerParVue(liste, "a_traiter").length, 1);
  assert.equal(filtrerParVue(liste, "a_cloturer").length, 1);
  assert.equal(filtrerParVue(liste, "tous").length, 4);
});

test("les compteurs se calculent en un passage, sans « tous »", () => {
  const c = compteursVues([A("devis"), A("devis"), A("effectue"), A("clos")]);
  assert.equal(c.a_traiter, 2);
  assert.equal(c.a_cloturer, 1);
  assert.equal(c.tous, undefined, "le total n'aide pas à décider");
});

test("la vue par défaut privilégie ce qui presse (à clôturer d'abord)", () => {
  assert.equal(vueParDefaut([A("effectue"), A("devis")]), "a_cloturer");
  assert.equal(vueParDefaut([A("devis")]), "a_traiter");
  assert.equal(vueParDefaut([A("clos")]), "a_traiter", "rien à faire → À traiter par défaut");
  assert.equal(vueParDefaut([]), "a_traiter");
});

// — Signaux d'urgence de la barre —
import { urgencesVues } from "../src/crm/vues-dossiers.js";

test("un litige ouvert met À clôturer au rouge", () => {
  const u = urgencesVues([{ etat: "effectue", litiges_ouverts: 1 }]);
  assert.equal(u.a_cloturer, "rouge");
});

test("un impayé met aussi À clôturer au rouge", () => {
  const u = urgencesVues([{ etat: "effectue", solde_centimes: 5000, a_facture: true }]);
  assert.equal(u.a_cloturer, "rouge");
});

test("à facturer sans impayé ni litige : ambre, pas rouge", () => {
  const u = urgencesVues([{ etat: "effectue", solde_centimes: 0, a_facture: false }]);
  assert.equal(u.a_cloturer, "ambre");
});

test("le rouge l'emporte sur l'ambre dans la même vue", () => {
  const u = urgencesVues([
    { etat: "effectue", a_facture: false },              // ambre
    { etat: "effectue", litiges_ouverts: 1, a_facture: true }, // rouge
  ]);
  assert.equal(u.a_cloturer, "rouge");
});

test("un chantier remonté en attente du bureau signale la vue terrain", () => {
  const u = urgencesVues([{ etat: "en_cours", missions_terrain_en_attente: true }]);
  assert.equal(u.terrain, "ambre");
});

test("un dossier effectué propre n'allume aucun signal", () => {
  const u = urgencesVues([{ etat: "effectue", solde_centimes: 0, a_facture: true, litiges_ouverts: 0 }]);
  assert.equal(u.a_cloturer, undefined);
});
