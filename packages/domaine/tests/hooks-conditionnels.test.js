import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SRC_APP = join(RACINE, "apps", "web", "src");

function fichiers(dir, ext) {
  const out = [];
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...fichiers(p, ext));
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}

const HOOKS = /^\s{2}(?:const\s*\[?[^=]*=\s*)?(useState|useEffect|useMemo|useRef|useCallback|useContext|useReducer)\s*\(/;
// Un return au niveau du composant : « return … » ou « if (…) return … ».
const RETOUR = /^\s{2}(?:if\s*\(.*\)\s*)?return\b/;
// Début d'une fonction au niveau du fichier. On borne sur TOUTES les fonctions
// de premier niveau, pas seulement celles à majuscule : un hook personnalisé
// (useCharge…) ferme lui aussi le bloc précédent, sinon on l'accuse à tort
// d'appartenir au composant d'au-dessus.
const COMPOSANT = /^(?:export\s+default\s+)?(?:async\s+)?function\s+(\w+)\s*\(/;

/** Découpe un fichier en blocs { nom, lignes } — un par composant. */
function composants(src) {
  const lignes = src.split("\n");
  const blocs = [];
  let courant = null;
  lignes.forEach((l, i) => {
    const m = COMPOSANT.exec(l);
    if (m) {
      if (courant) blocs.push(courant);
      courant = { nom: m[1], depart: i + 1, lignes: [] };
    } else if (courant) {
      courant.lignes.push({ n: i + 1, t: l });
    }
  });
  if (courant) blocs.push(courant);
  return blocs;
}

/**
 * Les hooks de React doivent être appelés dans le MÊME ORDRE à chaque rendu.
 * Un hook placé après un `return` conditionnel n'est parfois pas appelé : le
 * nombre de hooks varie d'un rendu à l'autre, React refuse, et l'application
 * rend un écran blanc — sans que le build ni les tests ne bronchent.
 *
 * Ce cas s'est produit sur main.jsx (le chargement de l'abonnement placé après
 * six returns conditionnels). D'où ce garde-fou.
 */
test("aucun hook React n'est appelé après un return conditionnel", () => {
  const fautes = [];
  for (const f of fichiers(SRC_APP, ".jsx")) {
    const src = readFileSync(f, "utf8");
    for (const bloc of composants(src)) {
      let vuRetour = null;
      for (const { n, t } of bloc.lignes) {
        // On ignore les commentaires et les chaînes évidentes.
        if (/^\s*(\/\/|\*|\/\*)/.test(t)) continue;
        if (RETOUR.test(t) && vuRetour === null) vuRetour = n;
        if (vuRetour !== null && HOOKS.test(t)) {
          fautes.push(
            `${f.replace(RACINE, "")}:${n} — hook dans ${bloc.nom}() après le return ligne ${vuRetour}`);
          break;
        }
      }
    }
  }
  assert.deepEqual(fautes, [],
    "hook(s) appelé(s) après un return conditionnel — écran blanc garanti :\n"
    + fautes.join("\n"));
});
