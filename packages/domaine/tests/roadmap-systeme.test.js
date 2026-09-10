// =============================================================================
// LE SYSTÈME DE ROADMAP NE POURRIT PAS EN SILENCE.
//
// CE QUI CASSE SANS CES TESTS : exactement ce que le système est censé
// empêcher. Un inventaire écrit en prose se périme sans bruit — c'est ce qui
// est arrivé au test qui figeait la grille de modules de la migration 0075 et
// verrouillait ensuite la version périmée. Le dossier `roadmap/` affirme des
// choses vérifiables (les outils qu'il annonce, les lots qu'il ordonne, les
// demandes qu'il classe) : ce qui est vérifiable doit être vérifié.
//
// Ces tests ne jugent PAS le contenu — une intention ne se teste pas. Ils
// tiennent la structure : rien d'annoncé qui n'existe, rien d'existant qui ne
// soit annoncé, aucune demande sans classement.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DOCS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "docs");
const ROADMAP = join(DOCS, "roadmap");
const OUTILS = join(DOCS, "outils");
const lire = (d, f) => readFileSync(join(d, f), "utf8");

test("le dossier roadmap a ses quatre fichiers, et rien de plus", () => {
  // Quatre questions, quatre fichiers. Un cinquième signifierait qu'une
  // question s'est ajoutée sans être nommée.
  assert.deepEqual(
    readdirSync(ROADMAP).filter((f) => f.endsWith(".md")).sort(),
    ["00-SYSTEME.md", "10-AUDIT-ECRANS.md", "20-LOTS.md", "30-DEMANDES.md"]);
});

test("chaque outil annoncé existe, et chaque outil existant est annoncé", () => {
  const index = lire(OUTILS, "00-SYSTEME-OUTILS.md");
  const fichiers = readdirSync(OUTILS)
    .filter((f) => f.endsWith(".md") && f !== "00-SYSTEME-OUTILS.md");

  assert.ok(fichiers.length > 0, "aucun outil");
  for (const f of fichiers) {
    assert.ok(index.includes(f),
      `${f} existe mais n'est pas dans le tableau de 00-SYSTEME-OUTILS.md`);
  }
  // Et l'inverse : un outil annoncé qui n'existe pas est une promesse vide.
  for (const cite of index.match(/`\d0-[A-Z-]+\.md`/g) || []) {
    const nom = cite.replace(/`/g, "");
    assert.ok(fichiers.includes(nom), `${nom} est annoncé mais absent`);
  }
});

test("chaque outil porte le préambule et sait s'arrêter", () => {
  for (const f of readdirSync(OUTILS)
    .filter((x) => x.endsWith(".md") && x !== "00-SYSTEME-OUTILS.md")) {
    const src = lire(OUTILS, f);
    // Sans le préambule, un sous-agent ignore la hiérarchie des sources et
    // les pièges déjà payés — il les repaiera.
    assert.match(src, /PRÉAMBULE/,
      `${f} ne renvoie pas au préambule commun`);
    assert.match(src, /## Mission/, `${f} n'énonce pas sa mission`);
    // Un outil qui ne dit pas ce qu'il NE fait pas déborde.
    assert.match(src, /Ce que tu ne fais pas/,
      `${f} ne borne pas son périmètre`);
  }
});

test("les lots sont numérotés sans trou et sans doublon", () => {
  // La numérotation porte l'ordre des dépendances. Un trou ou un doublon
  // signifie qu'un lot a bougé sans que l'ordre soit repensé.
  const numeros = [...lire(ROADMAP, "20-LOTS.md").matchAll(/^## Lot (\d+) —/gm)]
    .map((m) => Number(m[1]));
  assert.ok(numeros.length >= 1, "aucun lot");
  assert.deepEqual(numeros, [...numeros].sort((a, b) => a - b), "lots désordonnés");
  assert.deepEqual([...new Set(numeros)], numeros, "numéro de lot en double");
  for (let i = 0; i < numeros.length; i += 1) {
    assert.equal(numeros[i], i + 1, `trou dans la numérotation avant ${numeros[i]}`);
  }
});

test("chaque demande est classée, aucune ne reste en suspens", () => {
  // La règle d'entrée du système : une demande sort par une seule porte —
  // elle devient un lot, ou elle est écartée avec son motif. Une demande sans
  // classement est une directive perdue.
  const src = lire(ROADMAP, "30-DEMANDES.md");
  const blocs = src.split(/^### /m).slice(1);
  assert.ok(blocs.length > 0, "aucune demande enregistrée");
  for (const b of blocs) {
    const titre = b.split("\n")[0];
    assert.match(b, /\*\*(Classé|Écartée?)\s*:?\*\*/,
      `la demande « ${titre} » n'a aucun classement`);
    // La demande doit être citée telle qu'elle a été dite : sans la citation,
    // on ne peut plus vérifier ce qui avait été demandé.
    assert.match(b, /^>/m,
      `la demande « ${titre} » n'est pas citée littéralement`);
  }
});

test("les états d'un écran sont trois, et le vocabulaire est fixe", () => {
  const sys = lire(ROADMAP, "00-SYSTEME.md");
  for (const etat of ["livré", "esquisse", "manquant"]) {
    assert.ok(sys.includes(etat), `l'état « ${etat} » n'est plus défini`);
  }
  assert.match(sys, /pas de quatrième état/i,
    "la fermeture du vocabulaire n'est plus énoncée");
});

test("la règle du troisième angle est énoncée dans le système", () => {
  // C'est la demande qui a changé l'ordre des lots. Si elle disparaît du
  // système, l'ordre n'a plus de motif et se remettra à dériver.
  const sys = lire(ROADMAP, "00-SYSTEME.md");
  assert.match(sys, /paramètres/i);
  assert.match(sys, /point de vérité/i);
  assert.match(sys, /Aucun écran ne peut afficher, imprimer ou calculer/);
});
