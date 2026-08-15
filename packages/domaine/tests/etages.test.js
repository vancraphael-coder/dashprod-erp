// =============================================================================
// Étages — relire l'ancien texte, et confronter au lift.
//
// Le piège central : « non renseigné » ne vaut PAS le rez-de-chaussée. Les
// confondre placerait au rez tout ce qui n'a pas été saisi, et un lift trop
// court passerait alors pour suffisant partout.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import {
  ETAGES_RAPIDES, libelleEtage, niveau, estRelisible, etageMaxDemande,
  liftSuffit,
} from "../src/planning/etages.js";

test("le rez s'écrit RDC, le premier s'écrit 1er", () => {
  assert.equal(libelleEtage(0), "RDC");
  assert.equal(libelleEtage(1), "1er");
  assert.equal(libelleEtage(2), "2e");
  assert.equal(libelleEtage(-1), "Sous-sol");
  assert.equal(libelleEtage(null), "");
});

test("l'ancien texte libre reste relisible", () => {
  // Ces valeurs existent déjà dans les dossiers : les perdre serait pire que
  // de les garder.
  assert.equal(niveau("RDC"), 0);
  assert.equal(niveau("rez-de-chaussée"), 0);
  assert.equal(niveau("2e"), 2);
  assert.equal(niveau("3ème"), 3);
  assert.equal(niveau("étage 4"), 4);
  assert.equal(niveau("5"), 5);
  assert.equal(niveau("sous-sol"), -1);
  assert.equal(niveau(2), 2);
});

test("ce qui ne se comprend pas reste NUL, jamais zéro", () => {
  for (const v of [null, undefined, "", "  ", "au fond du couloir"]) {
    assert.equal(niveau(v), null, `${JSON.stringify(v)} ne doit pas valoir 0`);
  }
  // Zéro EXPLICITE, lui, vaut bien le rez.
  assert.equal(niveau("RDC"), 0);
  assert.equal(niveau(0), 0);
});

test("une saisie incomprise est signalée, pas écrasée", () => {
  assert.equal(estRelisible("2e"), true);
  assert.equal(estRelisible(""), true);
  assert.equal(estRelisible("au fond du couloir"), false);
});

test("l'étage le plus haut commande le choix du lift", () => {
  const r = etageMaxDemande([{ etage: "RDC" }, { etage: "4e" }, { etage: 2 }]);
  assert.equal(r.etage, 4);
  assert.equal(r.incertain, false);
});

test("une adresse illisible est écartée du calcul mais signalée", () => {
  const r = etageMaxDemande([{ etage: "3e" }, { etage: "quelque part" }]);
  assert.equal(r.etage, 3);
  assert.equal(r.incertain, true, "on ne prétend pas savoir");
  // Une adresse sans étage du tout n'est pas une incertitude.
  assert.equal(etageMaxDemande([{ etage: "3e" }, {}]).incertain, false);
});

/* ── Le lift ────────────────────────────────────────────────────────────── */

test("un lift trop court est refusé, avec le motif lisible", () => {
  const r = liftSuffit({ etage_max: 4 }, [{ etage: "6e" }]);
  assert.equal(r.ok, false);
  assert.match(r.motif, /4e/);
  assert.match(r.motif, /6e/);
});

test("un lift qui atteint l'étage passe sans bruit", () => {
  assert.equal(liftSuffit({ etage_max: 4 }, [{ etage: "4e" }]).ok, true);
  assert.equal(liftSuffit({ etage_max: 4 }, [{ etage: "RDC" }]).motif, null);
});

test("étage maximal non renseigné ne bloque pas, mais le dit", () => {
  const r = liftSuffit({ etage_max: null }, [{ etage: "9e" }]);
  assert.equal(r.ok, true);
  assert.equal(r.inconnu, true);
  assert.match(r.motif, /non renseigné/i);
});

test("un lift au rez EXPLICITE refuse bien un étage", () => {
  // etage_max = 0 est une contrainte réelle, pas une absence.
  const r = liftSuffit({ etage_max: 0 }, [{ etage: "1er" }]);
  assert.equal(r.ok, false);
});

test("sans lift choisi, on ne prononce aucun verdict", () => {
  assert.equal(liftSuffit(null, [{ etage: "9e" }]).ok, true);
  assert.equal(liftSuffit(null, [{ etage: "9e" }]).motif, null);
});

test("la sélection rapide couvre le rez et les cinq premiers étages", () => {
  assert.deepEqual([...ETAGES_RAPIDES], [0, 1, 2, 3, 4, 5]);
  assert.equal(libelleEtage(ETAGES_RAPIDES[0]), "RDC");
});
