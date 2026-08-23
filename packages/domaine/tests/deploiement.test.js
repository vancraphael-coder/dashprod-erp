// =============================================================================
// vercel.json — LE FICHIER QUI A BLOQUÉ 20 DÉPLOIEMENTS D'AFFILÉE.
//
// L'INCIDENT (22/08/2026, 20:06 UTC → 23/08/2026)
// ----------------------------------------------
// Dernier déploiement réussi : 22/08 à 20:05:24. Premier échec : 20:06:32,
// SOIXANTE-HUIT SECONDES plus tard. Entre les deux commits, un seul fichier
// avait changé : `vercel.json`. Tout ce qui a suivi a échoué — 20 déploiements,
// tous en ERROR.
//
// Ce qui avait été ajouté au bloc `rewrites` :
//
//     "//":  "EXCLURE /api de la réécriture SPA…",
//     "//2": "les routes serveur et le webhook Peppol…",
//
// Des COMMENTAIRES. JSON n'en a pas, donc ils avaient été déguisés en clés
// nommées « // ». L'intention était bonne — expliquer pourquoi la négation
// existe — mais Vercel valide `vercel.json` contre un schéma, et un objet de
// `rewrites` n'accepte que `source`, `destination`, `has`, `missing` et
// `statusCode`. Toute clé inconnue fait échouer la validation.
//
// POURQUOI C'ÉTAIT SI DIFFICILE À VOIR
// ------------------------------------
// La validation a lieu AVANT le build. Le déploiement n'atteint jamais le
// conteneur : « No build log events found » sur les 20 échecs. On cherche donc
// une erreur de compilation dans des logs qui n'existent pas, pendant que
// `npm run build` passe parfaitement en local — parce qu'il ne lit jamais
// `vercel.json`.
//
// Deux enseignements :
//   1. Un build local vert ne dit RIEN sur la configuration de déploiement.
//      Ce sont deux fichiers différents, lus par deux programmes différents.
//   2. Un échec SANS logs de build est un échec de configuration, pas de code.
//      C'est le premier réflexe à avoir.
//
// CE QUE CE TEST PROTÈGE
// ----------------------
// Sans lui, la prochaine bonne intention — annoter une règle de réécriture,
// documenter un en-tête — remet la production à l'arrêt, et il faudra à nouveau
// remonter 20 déploiements pour comprendre. La règle est simple : le POURQUOI
// d'une règle de routage se documente ici et dans `docs/`, jamais dans le JSON.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CONFIG = JSON.parse(readFileSync(join(RACINE, "vercel.json"), "utf8"));

/** Les seules clés qu'un objet de `rewrites` accepte côté Vercel. */
const CLES_REWRITE = new Set(["source", "destination", "has", "missing", "statusCode"]);

test("vercel.json ne contient AUCUNE clé de commentaire déguisée", () => {
  // CE QUI CASSE SANS CE TEST : la validation du schéma échoue avant le build,
  // le déploiement part en ERROR sans le moindre log, et la production reste
  // sur la dernière version publiée sans que rien n'explique pourquoi.
  const fautes = [];
  const parcourir = (valeur, chemin) => {
    if (Array.isArray(valeur)) {
      valeur.forEach((v, i) => parcourir(v, `${chemin}[${i}]`));
    } else if (valeur && typeof valeur === "object") {
      for (const cle of Object.keys(valeur)) {
        // Une clé qui commence par « // » n'est jamais autre chose qu'un
        // commentaire déguisé : JSON n'a pas de syntaxe pour en écrire.
        if (cle.startsWith("//")) fautes.push(`${chemin}.${cle}`);
        parcourir(valeur[cle], `${chemin}.${cle}`);
      }
    }
  };
  parcourir(CONFIG, "vercel.json");
  assert.deepEqual(fautes, [],
    "clés de commentaire dans vercel.json — elles cassent la validation du "
    + "schéma et le déploiement échoue AVANT le build :\n" + fautes.join("\n"));
});

test("chaque règle de réécriture n'a que des clés reconnues par Vercel", () => {
  // Plus large que le test précédent : une faute de frappe (`destinaton`) ou
  // une clé inventée produirait le même échec silencieux qu'un commentaire.
  for (const [i, regle] of (CONFIG.rewrites || []).entries()) {
    for (const cle of Object.keys(regle)) {
      assert.ok(CLES_REWRITE.has(cle),
        `rewrites[${i}] : clé « ${cle} » inconnue du schéma Vercel. `
        + `Autorisées : ${[...CLES_REWRITE].join(", ")}.`);
    }
    assert.ok(regle.source && regle.destination,
      `rewrites[${i}] : source et destination sont obligatoires`);
  }
});

test("la réécriture SPA laisse passer /api — sinon le webhook Peppol est avalé", () => {
  // L'INVARIANT que les commentaires supprimés cherchaient à protéger. Il est
  // désormais gardé par une assertion, ce qui vaut mieux qu'une phrase.
  //
  // Sans la négation, `/(.*)` renvoie TOUTES les routes vers index.html — y
  // compris `/api/peppol/webhook`. Le point d'accès recevrait la page d'accueil
  // avec un code 200, conclurait que la facture a été reçue, et ne réessaierait
  // JAMAIS. Une facture entrante perdue en silence.
  const spa = (CONFIG.rewrites || []).find((r) => r.destination === "/index.html");
  assert.ok(spa, "une règle doit renvoyer vers index.html");
  assert.match(spa.source, /\(\?!api\//,
    "la règle SPA doit exclure /api par une négation");
  // La négation DOIT être enveloppée dans un groupe : `path-to-regexp` refuse
  // `/(?!api/)` nu. C'est écrit dans la liste d'erreurs de Vercel, et c'est le
  // genre de détail qui repasse en ERROR sans log.
  assert.match(spa.source, /^\/\(\(\?!api\/\)\.\*\)$/,
    "la négation doit être enveloppée dans un groupe : /((?!api/).*)");
});

test("le build et la sortie déclarés correspondent au monorepo", () => {
  // `outputDirectory` pointe sur le dist de l'app web, pas sur la racine : une
  // erreur ici publie un site vide sans qu'aucun build n'échoue.
  assert.equal(CONFIG.outputDirectory, "apps/web/dist");
  assert.match(CONFIG.buildCommand, /--workspace @dashprod\/web/,
    "le build doit viser l'espace de travail de l'app web");
});
