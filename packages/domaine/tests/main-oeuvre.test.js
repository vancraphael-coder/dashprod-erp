// Tests — main-d'œuvre automatique : lignes conservées, retirées, signalées.
import test from "node:test";
import assert from "node:assert/strict";
import {
  lignesMainOeuvre, coutMainOeuvre, mentionLignesRetirees,
  TON_NORMAL, TON_HISTORIQUE,
} from "../src/rh/main-oeuvre.js";

const MEMBRES = [
  { id: "m1", nom: "Ali", actif: true },
  { id: "m2", nom: "Bea", actif: true },
  { id: "m3", nom: "Cem", actif: false },   // retiré de l'équipe
];
const TAUX = { m1: 22, m2: 25, m3: 20 };

test("le bug d'origine : un membre retiré n'affiche jamais son identifiant", () => {
  // La liste des membres ne contient PAS m9 — c'est le cas qui produisait
  // « 3f2a91c8-… · ? €/h » à l'écran.
  const l = lignesMainOeuvre({
    equipeIds: ["m9"], membres: MEMBRES, taux: {},
    dossierClos: true,
  });
  assert.equal(l.length, 1);
  assert.equal(l[0].nom, "Membre retiré");
  assert.ok(!/[0-9a-f]{8}-/.test(l[0].nom));
  assert.equal(l[0].tauxConnu, false, "un taux absent se dit, il ne s'invente pas");
  assert.equal(l[0].taux, 0);
});

test("règle 1 — dossier clôturé : la ligne reste, en orange", () => {
  const l = lignesMainOeuvre({
    equipeIds: ["m1", "m3"], membres: MEMBRES, taux: TAUX,
    ontTravaille: [], dossierClos: true, missionTerminee: false,
  });
  assert.equal(l.length, 2, "un dossier clos ne perd aucune ligne");
  assert.equal(l[0].ton, TON_HISTORIQUE);
  assert.equal(l[1].ton, TON_HISTORIQUE);
});

test("règle 2 — mission non terminée et personne n'ayant pas travaillé : ligne supprimée", () => {
  const l = lignesMainOeuvre({
    equipeIds: ["m1", "m2", "m3"], membres: MEMBRES, taux: TAUX,
    ontTravaille: ["m1"], dossierClos: false, missionTerminee: false,
  });
  assert.deepEqual(l.map((x) => x.id), ["m1"]);
});

test("mission terminée : tout le monde reste, même sans pointage", () => {
  const l = lignesMainOeuvre({
    equipeIds: ["m1", "m2"], membres: MEMBRES, taux: TAUX,
    ontTravaille: [], dossierClos: false, missionTerminee: true,
  });
  assert.equal(l.length, 2);
  assert.equal(l[0].ton, TON_NORMAL, "membre actif, dossier ouvert : ligne normale");
});

test("un membre retiré est signalé même sur un dossier ouvert", () => {
  const l = lignesMainOeuvre({
    equipeIds: ["m3"], membres: MEMBRES, taux: TAUX,
    ontTravaille: ["m3"], missionTerminee: true,
  });
  assert.equal(l[0].ton, TON_HISTORIQUE);
  assert.equal(l[0].retire, true);
  assert.equal(l[0].nom, "Cem", "on garde son nom : il a bien travaillé");
});

test("le total ne compte que les lignes retenues", () => {
  const l = lignesMainOeuvre({
    equipeIds: ["m1", "m2"], membres: MEMBRES, taux: TAUX,
    ontTravaille: ["m1"], missionTerminee: false,
  });
  assert.equal(coutMainOeuvre(l, 6), 132, "22 €/h × 6 h, m2 écarté");
});

test("un taux absent ne devient pas zéro en silence dans le total", () => {
  const l = lignesMainOeuvre({
    equipeIds: ["m1"], membres: MEMBRES, taux: { m1: null },
    ontTravaille: ["m1"], missionTerminee: true,
  });
  assert.equal(l[0].tauxConnu, false);
  assert.equal(coutMainOeuvre(l, 6), 0);
});

test("les lignes retirées sont annoncées, jamais escamotées", () => {
  const equipe = ["m1", "m2", "m3"];
  const l = lignesMainOeuvre({
    equipeIds: equipe, membres: MEMBRES, taux: TAUX, ontTravaille: ["m1"],
  });
  assert.match(mentionLignesRetirees(equipe, l), /^2 membres pressentis/);
  assert.equal(mentionLignesRetirees(equipe, equipe.map((id) => ({ id }))), null);
});

test("équipe vide : aucune ligne, aucune erreur", () => {
  assert.deepEqual(lignesMainOeuvre({}), []);
  assert.equal(coutMainOeuvre([], 8), 0);
});
