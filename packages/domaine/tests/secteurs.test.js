// =============================================================================
// LE SECTEUR EST DÉCLARÉ UNE FOIS, ET TOUT LE RESTE EN DÉRIVE.
//
// CE QUI CASSE SANS CES TESTS : la quatrième récidive de la même maladie. La
// notion de secteur existait à TROIS endroits — texte libre sur l'offre,
// énumération dans la table de réutilisation, énumération recopiée en base.
// Trois déclarations du même axe, celui-là même sur lequel le produit doit
// s'étendre à dix.
//
// Ces tests tiennent la dérivation : si une des trois se remet à diverger de
// `secteurs.js`, l'arbre casse.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  SECTEURS, CLES_SECTEURS, secteur, tousLesCorps, secteurDuCorps,
  secteurDeLOffre, voisinsDeSecteur, coutMarginal,
} from "../src/produit/secteurs.js";
import { BESOINS_OFFRES } from "../src/commercial/reutilisation.js";
import { REFERENTIEL_OFFRES, offreReferentiel }
  from "../src/commercial/referentiel-offres.js";

/** Relevé de `corps_metier` en base, 14/09/2026 (migration 0190). */
const CORPS_EN_BASE = [
  ["demenagement", "chantier"], ["manutention", "chantier"],
  ["levage", "chantier"], ["livraison", "chantier"], ["montage", "chantier"],
  ["entreposage", "entreposage"], ["logistique", "entreposage"],
];

test("l'énumération des secteurs est fermée", () => {
  // Un cinquième secteur se discute, il ne se glisse pas.
  assert.deepEqual([...CLES_SECTEURS], ["chantier", "entreposage"]);
  for (const s of SECTEURS) {
    assert.ok(s.titre, `${s.cle} sans titre`);
    // Le « liant » dit POURQUOI ces corps sont ensemble. Sans lui, un secteur
    // n'est qu'un tiroir.
    assert.ok(s.liant && s.liant.length > 20, `${s.cle} sans liant énoncé`);
    assert.ok(s.corps.length > 0 && s.offres.length > 0);
  }
});

test("DÉRIVATION 1 — les corps correspondent à la table en base", () => {
  assert.deepEqual([...tousLesCorps()].sort(),
    CORPS_EN_BASE.map(([c]) => c).sort());
  for (const [corps, sect] of CORPS_EN_BASE) {
    assert.equal(secteurDuCorps(corps)?.cle, sect,
      `le corps « ${corps} » n'est pas dans le même secteur qu'en base`);
  }
});

test("DÉRIVATION 2 — la table de réutilisation dit le même secteur", () => {
  for (const [code, b] of Object.entries(BESOINS_OFFRES)) {
    assert.equal(secteurDeLOffre(code)?.cle, b.secteur,
      `l'offre ${code} : secteur divergent entre secteurs.js et reutilisation.js`);
  }
});

test("DÉRIVATION 3 — toute offre publiée appartient à un secteur", () => {
  // Une offre sans secteur sort de tous les raisonnements d'ordre
  // d'ouverture : elle deviendrait invisible au moment de décider.
  for (const o of REFERENTIEL_OFFRES) {
    assert.ok(secteurDeLOffre(o.code),
      `l'offre ${o.code} n'appartient à aucun secteur`);
  }
  // Et l'inverse : un secteur ne cite pas une offre inexistante.
  for (const s of SECTEURS) {
    for (const code of s.offres) {
      assert.ok(offreReferentiel(code),
        `le secteur ${s.cle} cite l'offre inconnue « ${code} »`);
    }
  }
});

test("une offre n'est dans qu'UN seul secteur", () => {
  const vus = new Map();
  for (const s of SECTEURS) {
    for (const code of s.offres) {
      assert.ok(!vus.has(code),
        `${code} est dans ${vus.get(code)} ET ${s.cle}`);
      vus.set(code, s.cle);
    }
  }
});

test("SECTEUR ≠ CLIENTÈLE VISÉE — deux notions, deux champs", () => {
  // C'est la clarification qui a débloqué l'audit. `offres.secteur` portait un
  // argument commercial (« Self-storage », « Débit industriel ») : ça décrit à
  // qui on parle, pas ce qu'on fait. Le mot « secteur » désignait les deux —
  // exactement ce qui est arrivé à « pyramide ».
  const clientele = offreReferentiel("garde_meubles").secteur;
  assert.equal(clientele, "Self-storage");
  // Et ce texte n'est PAS une clé de secteur.
  assert.ok(!CLES_SECTEURS.includes(clientele));
  // Le vrai secteur, lui, vient de la déclaration.
  assert.equal(secteurDeLOffre("garde_meubles").cle, "entreposage");
});

test("les voisins de secteur décident de l'ordre d'ouverture", () => {
  // Ouvrir un corps crée de la demande pour les autres corps du MÊME secteur,
  // parce qu'ils se croisent sur le même travail. Entre secteurs, on ne
  // partage que du code — et ça ne se décide pas pour les mêmes raisons.
  const v = voisinsDeSecteur("independant_manutention");
  assert.ok(v.includes("donneur_ordre"),
    "l'indépendant et le donneur d'ordre sont du même chantier");
  assert.ok(!v.includes("garde_meubles"));
  assert.ok(!v.includes("independant_manutention"), "pas son propre voisin");
});

test("le coût marginal dénombre, il n'estime pas", () => {
  // Pas une durée — je n'en ai pas les moyens. Un dénombrement de ce qui
  // reste à déclarer ou à écrire, ce qui est vérifiable.
  const c = coutMarginal({
    modulesNeufs: 1, tablesAVerrouiller: 3, ecransNeufs: 5,
    naturesNeuves: 1, reglagesNeufs: 2 });
  assert.equal(c.declarations, 4);
  assert.equal(c.verrous, 3);
  assert.equal(c.ecrans, 5);
  // L'irréductible, c'est l'écran. S'il domine, c'est BON signe : le reste a
  // été absorbé par les générateurs.
  assert.equal(c.irreductible, 5);
  assert.deepEqual(coutMarginal(), {
    declarations: 0, verrous: 0, ecrans: 0, irreductible: 0 });
});
