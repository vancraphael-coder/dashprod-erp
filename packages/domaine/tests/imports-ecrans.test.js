// =============================================================================
// Garde-fou statique — un symbole du domaine utilisé sans être importé.
//
// Ce défaut ne se voit NI aux tests unitaires (l'écran n'est pas exécuté) NI au
// build (Rollup n'échoue pas sur un identifiant libre) : il ne se manifeste
// qu'à l'ouverture de la page, par un ReferenceError — donc un ÉCRAN BLANC.
// Il a coûté exactement ça sur le planning. Ce test le rend impossible à
// livrer sans le voir.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RACINE = new URL("../../..", import.meta.url).pathname;
const SRC_DOMAINE = join(RACINE, "packages/domaine/src");
const SRC_APP = join(RACINE, "apps/web/src");

function fichiers(dossier, ext, acc = []) {
  for (const e of readdirSync(dossier)) {
    const p = join(dossier, e);
    if (statSync(p).isDirectory()) fichiers(p, ext, acc);
    else if (p.endsWith(ext)) acc.push(p);
  }
  return acc;
}

/** Tous les noms exportés par le domaine ET par les modules de `lib`. */
function exportsDomaine() {
  const noms = new Set();
  // `lib` en entier, et pas seulement l'adaptateur : un symbole exporté par
  // apparence.js et oublié à l'import produit le même écran blanc. Le cas s'est
  // produit avec couleurUtilite, invisible tant que ce test ne connaissait que
  // le domaine et l'adaptateur.
  const sources = [...fichiers(SRC_DOMAINE, ".js"), ...fichiers(join(SRC_APP, "lib"), ".js")];
  for (const f of sources) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) {
      noms.add(m[1]);
    }
    for (const m of src.matchAll(/^export\s+const\s+([A-Za-z_$][\w$]*)/gm)) {
      noms.add(m[1]);
    }
  }
  return noms;
}

/** Noms importés par un fichier, toutes provenances confondues. */
function importsDe(src) {
  const noms = new Set();
  for (const m of src.matchAll(/import\s+([^;]*?)\s+from\s+["'][^"']+["']/gs)) {
    const clause = m[1];
    const accolades = /\{([^}]*)\}/s.exec(clause);
    if (accolades) {
      for (const part of accolades[1].split(",")) {
        const nom = part.trim().split(/\s+as\s+/).pop().trim();
        if (nom) noms.add(nom);
      }
    }
    const defaut = clause.replace(/\{[^}]*\}/s, "").replace(/,/g, "").trim();
    if (defaut && /^[A-Za-z_$][\w$]*$/.test(defaut)) noms.add(defaut);
  }
  return noms;
}

test("aucun écran n'utilise un symbole du domaine sans l'importer", () => {
  const dispo = exportsDomaine();
  const fautes = [];

  for (const f of fichiers(SRC_APP, ".jsx")) {
    const src = readFileSync(f, "utf8");
    const importes = importsDe(src);
    // On ignore ce que le fichier définit lui-même — y compris les noms issus
    // d'une déstructuration (`const [facture, setFacture] = useState()`), sans
    // quoi une variable d'état homonyme d'un export du domaine passerait pour
    // un oubli d'import.
    const locaux = new Set();
    for (const m of src.matchAll(/(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
      locaux.add(m[1]);
    }
    for (const m of src.matchAll(/(?:const|let|var)\s*[\[{]([^\]}]*)[\]}]/g)) {
      for (const part of m[1].split(",")) {
        const nom = part.trim().split(":").pop().replace(/^\.\.\./, "").trim();
        if (/^[A-Za-z_$][\w$]*$/.test(nom)) locaux.add(nom);
      }
    }
    for (const nom of dispo) {
      if (importes.has(nom) || locaux.has(nom)) continue;
      // Usage réel : appel de fonction ou référence en JSX/expression.
      const utilise = new RegExp(`(?<![.\\w$])${nom}\\s*\\(`).test(src);
      if (utilise) fautes.push(`${f.replace(RACINE, "")} → ${nom}`);
    }
  }

  assert.deepEqual(fautes, [],
    "symbole(s) du domaine utilisé(s) sans import — écran blanc garanti :\n"
    + fautes.join("\n"));
});
