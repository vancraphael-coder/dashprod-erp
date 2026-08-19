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

/**
 * Une `const`/`let` fléchée n'est PAS hoistée : l'appeler avant sa ligne de
 * déclaration, dans le corps d'un composant, lève « Cannot access X before
 * initialization » AU RENDU — un écran blanc que ni le build ni les tests
 * unitaires ne voient (le fichier compile, l'erreur est à l'exécution).
 *
 * C'est arrivé sur CarteDate : `engages` (calculé au rendu) appelait
 * `permisManquant`, une const fléchée déclarée dix lignes plus bas. D'où ce
 * garde-fou : pour chaque const/let fléchée du corps d'un composant, on vérifie
 * qu'aucun APPEL `nom(` n'apparaît avant sa déclaration.
 *
 * On reste volontairement conservateur : on ne regarde que les fonctions
 * fléchées assignées à une const/let au niveau du composant (indentation 2),
 * et on ignore les appels à l'intérieur d'autres fonctions (elles s'exécutent
 * plus tard, pas pendant l'évaluation du corps). Faux négatif possible, faux
 * positif non — c'est le bon sens pour un garde-fou.
 */
test("aucune const fléchée n'est appelée avant sa déclaration (TDZ = écran blanc)", () => {
  const fautes = [];
  const DECL = /^  (?:const|let)\s+(\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>/;
  for (const f of fichiers(SRC_APP, ".jsx")) {
    const src = readFileSync(f, "utf8");
    for (const bloc of composants(src)) {
      // Ligne de déclaration de chaque const fléchée de premier niveau du corps.
      const declaree = new Map();
      for (const { n, t } of bloc.lignes) {
        const m = DECL.exec(t);
        if (m && !declaree.has(m[1])) declaree.set(m[1], n);
      }
      if (declaree.size === 0) continue;

      // Approche par INDENTATION, robuste et sans parseur : une instruction du
      // corps DIRECT du composant est à exactement 2 espaces. Tout ce qui est
      // dans une sous-fonction (majAffectation, un map, un onClick) est plus
      // indenté, donc différé — on ne le juge pas. On ne s'intéresse donc qu'aux
      // lignes à 2 espaces qui appellent une const fléchée déclarée plus bas.
      for (const { n, t } of bloc.lignes) {
        if (/^\s*(\/\/|\*|\/\*)/.test(t)) continue;
        if (!/^  \S/.test(t)) continue;          // pas au corps direct → différé
        for (const [nom, ligneDecl] of declaree) {
          if (n >= ligneDecl) continue;
          const appel = new RegExp(`(?<![\\w.])${nom}\\s*\\(`);
          if (appel.test(t) && !DECL.test(t)) {
            fautes.push(`${f.replace(RACINE, "")}:${n} — ${bloc.nom}() appelle `
              + `${nom}() avant sa déclaration ligne ${ligneDecl}`);
          }
        }
      }
    }
  }
  assert.deepEqual(fautes, [],
    "const fléchée utilisée avant sa déclaration — TDZ, écran blanc au rendu :\n"
    + fautes.join("\n"));
});
