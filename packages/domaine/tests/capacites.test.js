// Tests — catalogue des capacités d'un membre.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPACITES, capacitesTerrain, capacitesBureau, capacite, libelleCapacite,
  capacitesEffectives, peut, origineCapacite, resumeAcces,
} from "../src/rh/capacites.js";

test("chaque capacité porte une phrase compréhensible par un patron", () => {
  for (const c of CAPACITES) {
    assert.ok(c.cle && /^[a-z_]+$/.test(c.cle), `clé douteuse : ${c.cle}`);
    assert.ok(c.titre && c.titre.length > 5, `titre manquant : ${c.cle}`);
    assert.ok(c.detail && c.detail.length > 20, `explication manquante : ${c.cle}`);
    // Le titre ne doit pas être la clé technique déguisée.
    assert.equal(c.titre.includes("_"), false, `${c.cle} : titre technique`);
  }
});

test("terrain et bureau partitionnent le catalogue", () => {
  assert.equal(capacitesTerrain().length + capacitesBureau().length, CAPACITES.length);
  assert.ok(capacitesTerrain().length >= 4);
});

test("les actions du chantier sont bien classées terrain", () => {
  for (const cle of ["pointer_chantier", "cloturer_chantier", "signaler_materiel"]) {
    assert.equal(capacite(cle).terrain, true, `${cle} devrait être terrain`);
  }
  assert.notEqual(capacite("emettre_facture").terrain, true);
});

test("les capacités sensibles sont marquées", () => {
  for (const cle of ["voir_paie", "emettre_facture", "gerer_referentiels", "voir_prix"]) {
    assert.equal(capacite(cle).sensible, true, `${cle} devrait être sensible`);
  }
  assert.notEqual(capacite("demander_conge")?.sensible, true);
});

test("une clé inconnue reste lisible plutôt que brute", () => {
  assert.equal(capacite("inexistante"), null);
  assert.equal(libelleCapacite("truc_machin"), "Truc machin");
  assert.equal(libelleCapacite("voir_paie"), capacite("voir_paie").titre);
});

// — Rôle + individuel : union, jamais remplacement —
test("les capacités individuelles s'AJOUTENT à celles du rôle", () => {
  const eff = capacitesEffectives({
    capacitesDesRoles: ["demander_conge", "signaler_materiel"],
    capacitesIndividuelles: ["pointer_chantier"],
  });
  assert.deepEqual(eff, ["demander_conge", "pointer_chantier", "signaler_materiel"]);
});

test("un doublon rôle/individuel ne compte qu'une fois", () => {
  const eff = capacitesEffectives({
    capacitesDesRoles: ["voir_prix"], capacitesIndividuelles: ["voir_prix"],
  });
  assert.deepEqual(eff, ["voir_prix"]);
});

test("un membre sans rien ne peut rien", () => {
  assert.deepEqual(capacitesEffectives({}), []);
  assert.deepEqual(capacitesEffectives(), []);
  assert.equal(peut({}, "pointer_chantier"), false);
  assert.equal(peut(null, "voir_paie"), false);
});

test("peut() lit les deux sources", () => {
  const m = { capacitesDesRoles: ["demander_conge"],
              capacitesIndividuelles: ["cloturer_chantier"] };
  assert.equal(peut(m, "demander_conge"), true);
  assert.equal(peut(m, "cloturer_chantier"), true);
  assert.equal(peut(m, "emettre_facture"), false);
});

test("l'origine distingue ce qui est retirable de ce qui vient du rôle", () => {
  const m = { capacitesDesRoles: ["voir_prix"],
              capacitesIndividuelles: ["voir_paie", "voir_prix"] };
  // Retirer une capacité de rôle demande de changer le rôle : autre geste.
  assert.equal(origineCapacite(m, "voir_prix"), "role_et_individuelle");
  assert.equal(origineCapacite(m, "voir_paie"), "individuelle");
  assert.equal(origineCapacite(m, "emettre_facture"), "aucune");
});

test("le résumé dit franchement quand un membre n'a aucun accès", () => {
  assert.match(resumeAcces({}), /Aucun accès/);
  assert.match(resumeAcces({ capacitesDesRoles: ["pointer_chantier"] }), /terrain/);
  const mixte = resumeAcces({
    capacitesDesRoles: ["pointer_chantier", "creer_affaire", "voir_prix"] });
  assert.match(mixte, /terrain/);
  assert.match(mixte, /bureau/);
});
