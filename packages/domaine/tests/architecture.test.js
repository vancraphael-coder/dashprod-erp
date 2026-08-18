// =============================================================================
// L'ARCHITECTURE — le test qui la fait tenir.
//
// « Le déménagement est un vertical qui doit utiliser l'horizontal Dashprod. »
// Une arborescence ne garantit pas cela : rien n'empêche aujourd'hui `crm/`
// d'importer `releve/`. Le jour où c'est fait, personne ne le remarque — tout
// compile, tout passe, et Dashprod devient un logiciel de déménagement avec
// des options. On s'en aperçoit des mois plus tard, en essayant de vendre à un
// garde-meubles.
//
// Ce test le refuse. Il est écrit MAINTENANT, tant que les métiers sont
// petits : à quatre modules on déplace un import, à quarante on renonce.
//
// Il regarde la chaîne ENTIÈRE, pas le voisin immédiat. Un noyau qui importe
// un module anodin, lequel importe le relevé, dépend du déménagement tout
// autant — et c'est la forme sous laquelle la dépendance revient toujours.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VERTICAUX, AIGUILLAGE, TOUS_AIGUILLAGES, PLOMBERIE_WEB, DEROGATIONS }
  from "../architecture.js";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ICI, "../src");
const WEB = path.join(ICI, "../../../apps/web/src");

/** Tous les modules du domaine, en chemins relatifs à `src` (« crm/affaire.js »). */
function modulesDomaine(dossier = SRC, acc = []) {
  for (const e of fs.readdirSync(dossier)) {
    const p = path.join(dossier, e);
    if (fs.statSync(p).isDirectory()) modulesDomaine(p, acc);
    else if (p.endsWith(".js")) acc.push(path.relative(SRC, p));
  }
  return acc;
}

/**
 * Ce qu'un fichier importe, ramené à des chemins relatifs à `src`. Les imports
 * hors domaine (react, node:…) sont ignorés : ils ne créent pas de dépendance
 * entre métiers.
 */
function importsDe(chemin, base) {
  const src = fs.readFileSync(path.join(base, chemin), "utf8");
  const sortie = [];
  for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) {
    const cible = m[1];
    if (cible.startsWith("@domaine/")) sortie.push(cible.slice("@domaine/".length));
    else if (cible.startsWith(".")) {
      // Relatif AU FICHIER : c'est le dossier du fichier qui sert d'origine.
      sortie.push(path.normalize(path.join(path.dirname(chemin), cible)));
    }
  }
  return sortie;
}

/** Le module → son vertical, ou null s'il est horizontal. */
const VERTICAL_DE = new Map();
for (const [cle, v] of Object.entries(VERTICAUX)) {
  for (const m of v.modules) VERTICAL_DE.set(m, { cle, nom: v.nom });
}

// Tout module d'aiguillage : il a le DROIT de connaître les métiers, donc une
// chaîne d'imports ne doit pas le « traverser » pour conclure qu'un module
// horizontal dépend d'un métier. C'est le rôle même de l'aiguillage
// d'encapsuler cette connaissance.
const EST_AIGUILLAGE = new Set(TOUS_AIGUILLAGES);

/**
 * Le premier chemin d'imports qui mène d'un module à un vertical, ou null.
 * On rend la CHAÎNE et pas un booléen : « crm/affaire.js dépend du
 * déménagement » n'aide personne ; « crm/affaire.js → stocks/catalogues.js →
 * stocks/emballage.js » se corrige.
 */
function cheminVersVertical(depart, base = SRC, dansLeDomaine = true) {
  const vus = new Set([depart]);
  const file = [[depart, [depart]]];
  while (file.length) {
    const [courant, chemin] = file.shift();
    // On sort du domaine dès le premier saut : un fichier web importe le
    // domaine, jamais l'inverse.
    const b = chemin.length === 1 && !dansLeDomaine ? base : SRC;
    let suivants;
    try { suivants = importsDe(courant, b); } catch { continue; }
    for (const s of suivants) {
      if (vus.has(s)) continue;
      vus.add(s);
      const suite = [...chemin, s];
      if (VERTICAL_DE.has(s)) return suite;
      // On ne descend PAS dans un aiguillage : ce qu'il importe (les métiers)
      // est précisément ce qu'il a le droit de connaître. Sans cet arrêt,
      // appeler un aiguillage reviendrait à « dépendre » de tout ce qu'il route.
      if (EST_AIGUILLAGE.has(s)) continue;
      if (fs.existsSync(path.join(SRC, s))) file.push([s, suite]);
    }
  }
  return null;
}

const fleche = (c) => c.join("\n        → ");

/* ── Le manifeste dit-il vrai ? ─────────────────────────────────────────── */

test("chaque module déclaré vertical existe encore", () => {
  // Un fichier renommé sortirait SILENCIEUSEMENT de l'interdiction : le test
  // resterait vert en ne surveillant plus rien. C'est le mode de panne le plus
  // vicieux d'un garde-fou déclaratif.
  for (const [cle, v] of Object.entries(VERTICAUX)) {
    for (const m of v.modules) {
      assert.ok(fs.existsSync(path.join(SRC, m)),
        `${cle} déclare ${m}, qui n'existe pas — manifeste à corriger`);
    }
  }
  for (const m of TOUS_AIGUILLAGES) {
    assert.ok(fs.existsSync(path.join(SRC, m)), `aiguillage introuvable : ${m}`);
  }
});

/* ── La règle ───────────────────────────────────────────────────────────── */

test("l'horizontal Dashprod n'importe AUCUN métier, même de loin", () => {
  const horizontaux = modulesDomaine()
    .filter((m) => !VERTICAL_DE.has(m) && !EST_AIGUILLAGE.has(m));

  const fautes = [];
  for (const m of horizontaux) {
    const c = cheminVersVertical(m);
    if (c) {
      const v = VERTICAL_DE.get(c[c.length - 1]);
      fautes.push(`  ${v.nom} :\n        ${fleche(c)}`);
    }
  }
  assert.deepEqual(fautes, [],
    "des modules du socle dépendent d'un métier :\n" + fautes.join("\n")
    + "\n  → soit le module est lui-même un vertical (le déclarer dans "
    + "architecture.js),\n    soit la dépendance doit s'inverser.");
});

test("l'horizontal n'importe pas non plus l'aiguillage", () => {
  // Sinon l'interdiction se contourne en une ligne : le noyau importerait
  // `chiffrerAffaire()`, qui connaît tous les métiers. L'aiguillage est au
  // SOMMET de l'édifice, jamais dans ses fondations.
  const fautes = [];
  for (const m of modulesDomaine()) {
    if (EST_AIGUILLAGE.has(m) || VERTICAL_DE.has(m)) continue;
    for (const i of importsDe(m, SRC)) {
      if (EST_AIGUILLAGE.has(i)) fautes.push(`${m} → ${i}`);
    }
  }
  assert.deepEqual(fautes, [], `le socle importe l'aiguillage : ${fautes.join(", ")}`);
});

test("un métier PEUT s'appuyer sur le socle — c'est le sens de la flèche", () => {
  // Le test précédent ne doit pas se satisfaire d'un domaine sans aucun lien.
  // Ici on vérifie que la flèche existe bien dans le bon sens : le lift lit
  // `noyau/nombres.js`, et c'est exactement ce qu'on veut.
  const lift = importsDe("chiffrage/lift.js", SRC);
  assert.ok(lift.some((i) => i.startsWith("noyau/")),
    "un vertical doit pouvoir utiliser l'horizontal");
});

/* ── La plomberie de l'application ──────────────────────────────────────── */

test("la plomberie web ne connaît aucun métier, sauf dérogation déclarée", () => {
  const fautes = [];
  const utilisees = new Set();

  for (const dossier of PLOMBERIE_WEB) {
    const base = path.join(WEB, dossier);
    for (const f of fs.readdirSync(base)) {
      if (!f.endsWith(".js") && !f.endsWith(".jsx")) continue;
      const rel = `${dossier}/${f}`;
      const src = fs.readFileSync(path.join(base, f), "utf8");
      for (const m of src.matchAll(/from\s+["']@domaine\/([^"']+)["']/g)) {
        const cible = m[1];
        // L'aiguillage de COMPOSITION est fait pour être appelé par la
        // plomberie : il n'entraîne aucun métier au-delà de ce qu'il route.
        // Celui de CHIFFRAGE, lui, importe lift + sous-traitance : l'appeler
        // depuis la plomberie ferait rentrer ces métiers, donc on l'interdit
        // en le traitant comme un chemin vers vertical.
        if (AIGUILLAGE.composition.includes(cible)) continue;
        const chemin = AIGUILLAGE.chiffrage.includes(cible)
          ? [cible, ...cheminVersVertical(cible) ? cheminVersVertical(cible).slice(1) : []]
          : VERTICAL_DE.has(cible) ? [cible] : cheminVersVertical(cible);
        if (!chemin) continue;
        const derog = DEROGATIONS.find(
          (d) => d.fichier === rel && d.module === chemin[chemin.length - 1]);
        if (derog) { utilisees.add(`${derog.fichier}|${derog.module}`); continue; }
        const dernier = chemin[chemin.length - 1];
        const v = VERTICAL_DE.get(dernier);
        fautes.push(`  ${rel} dépend de ${v ? v.nom : dernier} :\n        ${fleche(chemin)}`);
      }
    }
  }
  assert.deepEqual(fautes, [],
    "la plomberie horizontale de l'app connaît un métier :\n" + fautes.join("\n")
    + "\n  → inverser la dépendance, ou l'inscrire en DÉROGATION datée et "
    + "motivée dans architecture.js.");

  // Une dérogation qui ne sert plus doit DISPARAÎTRE. Sans cette vérification,
  // la liste ne rétrécit jamais : elle devient un décor, et le cliquet ne
  // cliquette plus.
  const mortes = DEROGATIONS
    .filter((d) => !utilisees.has(`${d.fichier}|${d.module}`))
    .map((d) => `${d.fichier} → ${d.module}`);
  assert.deepEqual(mortes, [],
    `dérogations devenues inutiles, à retirer : ${mortes.join(", ")}`);
});

test("toute dérogation est datée et motivée", () => {
  // Une dérogation sans motif est une permission déguisée : dans six mois,
  // personne ne saura si elle est encore justifiée, donc personne n'y touchera.
  for (const d of DEROGATIONS) {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(d.depuis), `${d.fichier} : date manquante`);
    assert.ok((d.motif || "").length > 60,
      `${d.fichier} : le motif doit dire POURQUOI et comment en sortir`);
  }
});
