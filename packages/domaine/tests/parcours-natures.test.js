// =============================================================================
// Parcours par nature — ce qui disparaît, ce qui reste.
//
// Deux confusions coûteuses, verrouillées ici :
//
//   1. RETIRER n'est pas ATTÉNUER. Une étape prématurée (l'offre avant
//      chiffrage) reste visible en grisé : elle viendra. Une étape qui
//      n'arrivera JAMAIS — le relevé d'un lift — doit disparaître, sinon on
//      promet une case qui ne se remplira pas.
//
//   2. MATÉRIEL n'est pas EMBALLAGE. Une sous-traitance emporte des sangles et
//      un diable, mais ne vend ni carton ni fourniture. Confondre les deux
//      supprimerait l'écran Matériel à une nature qui en a besoin — ou pire,
//      ferait apparaître des fournitures facturées sur son offre.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NATURES, comporte } from "../src/commercial/natures.js";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(ICI, "../../../apps/web/src");
const lire = (p) => fs.readFileSync(path.join(WEB, p), "utf8");

/* ── Matériel ≠ emballage ───────────────────────────────────────────────── */

test("la sous-traitance garde le matériel mais perd l'emballage", () => {
  assert.equal(comporte("sous_traitance", "materiel"), true,
    "elle emporte du matériel de terrain");
  assert.equal(comporte("sous_traitance", "emballage"), false,
    "elle ne vend ni carton ni fourniture");
});

test("le lift n'a ni relevé, ni matériel, ni emballage", () => {
  for (const e of ["releve", "materiel", "emballage"]) {
    assert.equal(comporte("lift", e), false, `le lift ne comporte pas ${e}`);
  }
});

test("seul le déménagement comporte le parcours complet", () => {
  const complet = NATURES.filter((n) =>
    n.etapes.releve && n.etapes.materiel && n.etapes.emballage);
  assert.deepEqual(complet.map((n) => n.cle), ["demenagement"]);
});

test("toute nature qui vend de l'emballage a forcément l'écran Matériel", () => {
  // L'inverse serait incohérent : vendre des cartons sans écran pour les
  // saisir. Le contrôle vaut pour les natures futures.
  for (const n of NATURES) {
    if (n.etapes.emballage) {
      assert.equal(n.etapes.materiel, true,
        `${n.cle} vend de l'emballage sans écran Matériel`);
    }
  }
});

/* ── Retiré, pas grisé ──────────────────────────────────────────────────── */

test("les sections hors parcours sont FILTRÉES, pas atténuées", () => {
  const src = lire("main.jsx");
  assert.ok(src.includes("SECTIONS_DOSSIER.filter"),
    "les sections d'une nature doivent être retirées de la sous-navigation");
  assert.equal(src.includes("horsParcours && !estActif ? 0.38 : 1"), false,
    "l'atténuation a été remplacée par un retrait");
});

test("Matériel se teste sur `materiel`, jamais sur `emballage`", () => {
  // Le piège exact : mapper Matériel sur l'emballage aurait supprimé l'écran
  // à la sous-traitance, qui en a besoin.
  const src = lire("main.jsx");
  assert.ok(/HORS_PARCOURS = \{ releve: "releve", materiel: "materiel" \}/.test(src),
    "Matériel doit se tester sur l'étape `materiel`");
});

/* ── L'écran Matériel ───────────────────────────────────────────────────── */

test("aucun bloc d'emballage FACTURABLE n'échappe au filtre", () => {
  // Le risque concret : une sous-traitance qui ferait apparaître « Fourniture
  // du matériel d'emballage » sur son offre.
  const src = lire("ecrans/Materiel.jsx");
  assert.ok(src.includes("{vendEmballage && fournitures.length > 0"),
    "la ligne d'offre doit être filtrée");
  assert.ok(src.includes("{vendEmballage && !modeTerrain && valorisation.lignes.length > 0"),
    "la valorisation doit être filtrée");
  assert.ok(src.includes('comporte(nature, "emballage")'),
    "la décision vient du domaine, pas d'une condition écrite sur place");
});

test("le matériel de terrain n'est jamais filtré par l'emballage", () => {
  const src = lire("ecrans/Materiel.jsx");
  const i = src.indexOf("materielTerrain.length > 0");
  assert.ok(i > 0);
  // La condition du bloc terrain ne doit pas dépendre de `vendEmballage`.
  const ligne = src.slice(src.lastIndexOf("\n", i), src.indexOf("\n", i));
  assert.equal(ligne.includes("vendEmballage"), false,
    "le matériel de terrain reste, même sans emballage");
});

/* ── La saisie du dossier ───────────────────────────────────────────────── */

test("visite préalable et jour d'emballage n'existent que pour un déménagement", () => {
  // « Trois dates deviennent une seule » : la date d'intervention subsiste,
  // la visite d'estimation et le jour d'emballage disparaissent.
  const src = lire("ecrans/Dossier.jsx");
  assert.ok(src.includes("{parcoursComplet && (<>"),
    "les deux dates optionnelles doivent être conditionnées");
  assert.ok(/const parcoursComplet = comporteEtape\([^)]*"releve"\)/.test(src),
    "le drapeau doit venir du domaine, pas d'une liste de natures écrite sur place");
});

test("un lift ne se réserve qu'avec un véhicule de catégorie lift", () => {
  const src = lire("ecrans/Dossier.jsx");
  assert.ok(/flotteOfferte\s*=\s*affaire\.nature === "lift"/.test(src),
    "la flotte offerte doit être filtrée pour un lift");
  assert.ok(src.includes('v.categorie === "lift"'));
  // Les autres natures gardent toute la flotte : le filtre est un ternaire.
  assert.ok(src.includes(": flotte;"),
    "hors lift, aucune restriction ne doit s'appliquer");
});

test("l'étage maximal du lift est réellement confronté aux adresses", () => {
  // Sans cette confrontation, la donnée saisie au lot 4 ne servirait à rien.
  const src = lire("ecrans/Dossier.jsx");
  assert.ok(src.includes("liftSuffit("),
    "le verdict doit être calculé, pas seulement stocké");
  assert.ok(src.includes("verdictLift.motif"),
    "et son motif doit être affiché");
});

test("la sélection rapide d'étage produit une valeur relisible", () => {
  const src = lire("ecrans/Dossier.jsx");
  assert.ok(src.includes("ETAGES_RAPIDES.map"));
  assert.ok(src.includes("libelleEtage(n)"),
    "les boutons écrivent RDC / 1er / 2e, que `niveau()` sait relire");
  assert.ok(src.includes("estRelisible(a.etage)"),
    "une saisie héritée incomprise doit être signalée, pas écrasée");
});

test("la sous-traitance sépare le donneur d'ordre du contact sur place", () => {
  // Deux personnes distinctes : on facture l'un, on appelle l'autre.
  const src = lire("composants/BlocsNature.jsx");
  assert.ok(src.includes("export function BlocDonneurOrdre"));
  assert.ok(src.includes("contact_tel") && src.includes("societe"));
  const dossier = lire("ecrans/Dossier.jsx");
  assert.ok(dossier.includes("BlocDonneurOrdre"),
    "le bloc doit être monté dans le dossier");
});

/* ── Devis et offre ─────────────────────────────────────────────────────── */

test("le devis n'appelle plus directement le moteur du déménagement", () => {
  // Il passe par l'aiguillage : sinon la règle « un lift se chiffre par
  // couronne » serait réécrite ici ET dans l'offre.
  const src = lire("ecrans/Devis.jsx");
  assert.ok(src.includes("chiffrerAffaire("),
    "le devis doit passer par le point d'entrée unique");
  assert.equal(/=\s*calculerScenario\(/.test(src), false,
    "l'appel direct au moteur déménagement doit avoir disparu");
});

test("les saisies du déménagement ne s'affichent que pour lui", () => {
  const src = lire("ecrans/Devis.jsx");
  assert.ok(src.includes('{nature === "demenagement" && (<>'),
    "formule, déménageurs et suppléments sont propres au déménagement");
});

test("le devis dit ce qui manque au lieu d'un bloc vide", () => {
  const src = lire("ecrans/Devis.jsx");
  assert.ok(src.includes("manqueAuChiffrage("));
  assert.ok(src.includes("manques.length > 0"));
});

test("la nature voyage jusqu'au document et y reste figée", () => {
  // Un contrat signé garde ce qu'il décrivait : on lit la nature DU DOCUMENT,
  // pas celle de l'affaire aujourd'hui.
  assert.ok(lire("lib/adaptateur.js").includes("nature: affaire?.nature"),
    "composerOffre doit embarquer la nature");
  const contrat = lire("ecrans/Contrat.jsx");
  assert.ok(contrat.includes('const natureOffre = contenu.nature || "demenagement"'),
    "le document lit SA nature, pas celle de l'affaire");
});

test("le récapitulatif d'une offre non-déménagement est adapté", () => {
  const src = lire("ecrans/Contrat.jsx");
  assert.ok(src.includes("function RecapNature"),
    "un lift ne doit pas annoncer « volume estimé » ni « relevé »");
  assert.ok(src.includes('natureOffre === "demenagement" ?'),
    "les deux récapitulatifs doivent être exclusifs");
  // Ce qui n'est pas compris doit être écrit : c'est de là que naissent les
  // litiges.
  assert.ok(/sans emballage ni fournitures/i.test(src));
});

/* ── Le récurrent (lot 7) ───────────────────────────────────────────────── */

test("aucune facture n'est émise automatiquement", () => {
  // Facturer sans regard humain un contrat résilié la veille fâche un client
  // pour rien, et la correction coûte plus cher que la saisie.
  const src = lire("ecrans/Contrats.jsx");
  assert.ok(src.includes("marquerEcheance("),
    "l'émission passe par une action explicite");
  assert.ok(/Marquer comme factur/.test(src),
    "le bureau décide de chaque échéance");
});

test("le prorata s'annonce à l'écran", () => {
  // Un montant réduit sans explication passe pour une erreur, et le client
  // appelle.
  const src = lire("ecrans/Contrats.jsx");
  assert.ok(src.includes("m.proratise"));
  assert.ok(/le mois plein/.test(src),
    "on montre le montant plein à côté du prorata");
});

test("un box hors barème est signalé avant d'être facturé à zéro", () => {
  const src = lire("ecrans/Contrats.jsx");
  assert.ok(src.includes("m.hors_bareme"));
  assert.ok(/aucune tranche/i.test(src));
});

test("le litige sur contrat est câblé de bout en bout", () => {
  // La contrainte existait depuis 0115, mais aucune commande ne permettait
  // d'ouvrir un litige SUR UN CONTRAT : la moitié était inutilisable.
  const ad = lire("lib/adaptateur.js");
  assert.ok(ad.includes("cmd_ouvrir_litige_contrat"));
  assert.ok(ad.includes("cmd_litiges_contrat"));
  const src = lire("ecrans/Contrats.jsx");
  assert.ok(src.includes("ouvrirLitigeContrat("));
  assert.ok(src.includes("litigesContrat("));
});
