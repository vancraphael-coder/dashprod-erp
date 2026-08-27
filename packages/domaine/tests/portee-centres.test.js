// =============================================================================
// LA PORTÉE PAR CENTRE — responsable dépôt cloisonné, secrétaire+ voit tout.
//
// Ce que ces tests protègent : le « sans interférer » de Raphaël. Une erreur
// ici, et un responsable dépôt voit les dossiers d'un autre centre, ou une
// liste mélange deux centres.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  porteeCentres, peutVoirCentre, filtrerParCentre, MAISON_MERE,
} from "../src/organisation/centres.js";

const CENTRES = [{ id: "anvers", nom: "Anvers" }, { id: "gand", nom: "Gand" }];

test("le responsable dépôt ne voit QUE son centre, sans bascule", () => {
  const p = porteeCentres({ poste: "responsable_depot", centre_id: "anvers" }, CENTRES);
  assert.deepEqual(p.centresVisibles, ["anvers"]);
  assert.equal(p.tousCentres, false);
  assert.equal(p.peutBasculer, false);
  assert.equal(p.centreParDefaut, "anvers");
});

test("le responsable dépôt ne peut pas ouvrir un autre centre", () => {
  // LE CŒUR DU « SANS INTERFÉRER ».
  const acteur = { poste: "responsable_depot", centre_id: "anvers" };
  assert.equal(peutVoirCentre(acteur, CENTRES, "anvers"), true);
  assert.equal(peutVoirCentre(acteur, CENTRES, "gand"), false);
  assert.equal(peutVoirCentre(acteur, CENTRES, MAISON_MERE), false,
    "il ne remonte pas non plus à la maison mère");
});

test("secrétaire, gérant, fondateur voient tous les centres + la maison mère", () => {
  for (const poste of ["secretaire", "gerant", "fondateur"]) {
    const p = porteeCentres({ poste, centre_id: "gand" }, CENTRES);
    assert.equal(p.tousCentres, true);
    assert.equal(p.peutBasculer, true);
    assert.deepEqual(p.centresVisibles, [MAISON_MERE, "anvers", "gand"]);
    // On atterrit sur SON centre s'il en a un.
    assert.equal(p.centreParDefaut, "gand");
  }
});

test("secrétaire+ peut ouvrir n'importe quel centre ET la maison mère", () => {
  const acteur = { poste: "secretaire", centre_id: null };
  assert.equal(peutVoirCentre(acteur, CENTRES, "anvers"), true);
  assert.equal(peutVoirCentre(acteur, CENTRES, "gand"), true);
  assert.equal(peutVoirCentre(acteur, CENTRES, MAISON_MERE), true);
});

test("le terrain reste dans son centre, sans bascule", () => {
  // Un déménageur ne « visite » pas les centres — il travaille dans le sien.
  const p = porteeCentres({ poste: "demenageur", centre_id: "anvers" }, CENTRES);
  assert.deepEqual(p.centresVisibles, ["anvers"]);
  assert.equal(p.peutBasculer, false);
});

test("filtrerParCentre ne mélange JAMAIS deux centres", () => {
  // La garantie « sans interférer » au niveau des listes.
  const dossiers = [
    { id: 1, centre_id: "anvers" }, { id: 2, centre_id: "gand" },
    { id: 3, centre_id: null }, { id: 4, centre_id: "anvers" },
  ];
  assert.deepEqual(filtrerParCentre(dossiers, "anvers").map((d) => d.id), [1, 4]);
  assert.deepEqual(filtrerParCentre(dossiers, MAISON_MERE).map((d) => d.id), [3]);
  assert.deepEqual(filtrerParCentre(dossiers, "gand").map((d) => d.id), [2]);
});
