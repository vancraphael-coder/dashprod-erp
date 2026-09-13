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

/**
 * Retire des sources tout ce qui n'est pas du code : commentaires, chaînes
 * littérales, et les parties TEXTE des gabarits.
 *
 * POURQUOI. Les commentaires étaient déjà retirés — sans quoi le mot
 * « ligne » dans une phrase passait pour un appel `ligne(`. Les CHAÎNES ne
 * l'étaient pas, et le français les piège tout autant : le libellé
 * « En attente de facture (3) » contient littéralement `facture (`, ce qui
 * accusait l'écran d'utiliser `facture()` sans l'importer. Constaté le
 * 13/09/2026 sur `SuiviEngagements.jsx`.
 *
 * Les expressions `${...}` d'un gabarit sont CONSERVÉES : c'est du code, et un
 * appel non importé peut s'y cacher. Les retirer aurait troué le test pour
 * échapper à un faux positif — le remède aurait été pire.
 */
function sansTexte(brut) {
  const sansCommentaires = brut
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  return sansCommentaires
    // Gabarits : on ne garde que les expressions interpolées.
    .replace(/`(?:[^`\\]|\\.)*`/g, (g) => {
      const expressions = [...g.matchAll(/\$\{([\s\S]*?)\}/g)]
        .map((m) => m[1]);
      return expressions.length ? ` ${expressions.join(" ; ")} ` : " ";
    })
    // Chaînes simples et doubles : jamais du code.
    .replace(/'(?:[^'\\\n]|\\.)*'/g, " ")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, " ");
}

test("aucun écran n'utilise un symbole du domaine sans l'importer", () => {
  const dispo = exportsDomaine();
  const fautes = [];

  for (const f of fichiers(SRC_APP, ".jsx")) {
    const brut = readFileSync(f, "utf8");
    // On retire les commentaires AVANT d'analyser : un mot comme « en ligne »
    // dans une phrase ne doit pas passer pour un appel `ligne(`. Sans ça, le
    // test accuse à tort un fichier selon la prose de ses commentaires.
    const src = sansTexte(brut);
    const importes = importsDe(brut);
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
