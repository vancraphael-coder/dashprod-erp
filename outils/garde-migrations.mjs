#!/usr/bin/env node
/**
 * GARDE-MIGRATIONS — ce qu'on peut vérifier sans base de données.
 *
 * Le 2026-09-19, le rejeu des migrations sur une base vierge a révélé quatre
 * défauts que personne ne pouvait voir :
 *
 *   · `0021_mission_a_la_confirmation.sql` contenait des marqueurs de conflit
 *     de fusion non résolus (`<<<<<<< HEAD`). Ce fichier ne pouvait s'appliquer
 *     NULLE PART, pas même en production — il était là depuis des semaines.
 *   · Trois migrations appliquées en production (0062, 0075, 0086) n'avaient
 *     jamais été commitées. Le dépôt ne pouvait donc pas reconstruire la base.
 *   · Deux fichiers portaient le même numéro 0046 : l'ordre d'application
 *     dépendait du tri alphabétique, donc du hasard.
 *   · Deux migrations contiennent l'identifiant d'un client en dur. Une base
 *     neuve échoue dessus sur une clé étrangère.
 *
 * Ce garde ferme ces quatre portes, sans base de données et en une seconde.
 * Il ne remplace pas le rejeu (outils/rejeu-migrations.mjs) : il attrape ce qui
 * se voit à la lecture, le rejeu attrape le reste.
 *
 * Usage : node outils/garde-migrations.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DOSSIER = "supabase/migrations";
const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith(".sql")).sort();

// Le numéro de tête : 4 chiffres, éventuellement suivis d'une lettre de
// correctif (0046b), puis un nom en minuscules avec tirets bas.
const NOM = /^(\d{4})([a-z]?)_[a-z0-9_]+\.sql$/;

const fautes = [];
const ajouter = (regle, fichier, detail) => fautes.push({ regle, fichier, detail });

const numeros = new Map();      // "0046" → [fichiers]
let plafond = 0;

for (const f of fichiers) {
  const m = NOM.exec(f);
  if (!m) {
    ajouter("nom non conforme", f,
      "attendu : NNNN[lettre]_nom_en_minuscules.sql — le tri alphabétique EST "
    + "l'ordre d'application, donc le nom porte l'ordre.");
    continue;
  }
  const [, numero, lettre] = m;
  plafond = Math.max(plafond, Number(numero));
  if (!lettre) {
    const liste = numeros.get(numero) || [];
    liste.push(f);
    numeros.set(numero, liste);
  }

  const texte = readFileSync(join(DOSSIER, f), "utf8");

  if (/^(<{7}|={7}|>{7})/m.test(texte)) {
    ajouter("conflit de fusion non résolu", f,
      "le fichier contient des marqueurs <<<<<<< / ======= / >>>>>>> : il ne "
    + "peut s'appliquer sur AUCUNE base.");
  }

  // Un identifiant de locataire en dur rend la migration inapplicable sur une
  // base neuve. Les modèles système (org_id NULL) n'ont pas ce problème.
  const uuids = texte.match(/'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/g);
  if (uuids && Number(numero) > 201) {   // 201 = dernière migration d'avant ce garde
    ajouter("donnée de locataire en dur", f,
      `${uuids.length} identifiant(s) écrit(s) en clair. Les données propres à `
    + "un client vont dans supabase/seed/, pas dans une migration : une base "
    + "neuve échouerait sur la clé étrangère.");
  }
}

// ── Numéros en double ───────────────────────────────────────────────────────
for (const [numero, liste] of numeros) {
  if (liste.length > 1) {
    ajouter("numéro en double", liste.join(", "),
      `le numéro ${numero} est porté par ${liste.length} fichiers : l'ordre `
    + "d'application dépend alors du tri alphabétique du nom, pas d'une "
    + "décision. Renuméroter, ou suffixer le second (0046b).");
  }
}

// ── Trous dans la numérotation ──────────────────────────────────────────────
// Un trou signale presque toujours une migration appliquée en production mais
// jamais commitée. C'est ainsi que 0062, 0075 et 0086 ont été retrouvées.
// Après le socle (0000), l'historique est rangé ailleurs : la numérotation
// reprend à 0202. La continuité se vérifie donc à partir du plus petit numéro
// présent au-delà du socle, pas à partir de 1.
const presents = new Set([...numeros.keys()].map(Number));
const auDela = [...presents].filter((n) => n > 0);
const debut = auDela.length ? Math.min(...auDela) : 1;
const trous = [];
for (let n = debut; n <= plafond; n++) if (!presents.has(n)) trous.push(String(n).padStart(4, "0"));

if (trous.length > 0) {
  ajouter("numéro absent", trous.join(", "),
    "une migration manque à l'appel. Si elle a été appliquée en production, le "
  + "dépôt ne sait plus reconstruire la base : la récupérer depuis "
  + "`supabase_migrations.schema_migrations` et la commiter à sa place.");
}

// ── Verdict ─────────────────────────────────────────────────────────────────
if (fautes.length > 0) {
  console.error(`\n✗ ${fautes.length} problème(s) dans ${DOSSIER} :\n`);
  for (const { regle, fichier, detail } of fautes) {
    console.error(`  ✗ ${regle}`);
    console.error(`    ${fichier}`);
    console.error(`    ${detail}\n`);
  }
  process.exit(1);
}

console.log(`✓ garde-migrations : ${fichiers.length} migrations, numérotation `
          + `continue jusqu'à ${String(plafond).padStart(4, "0")}, aucun conflit.`);
