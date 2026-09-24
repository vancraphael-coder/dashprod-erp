#!/usr/bin/env node
/**
 * REJEU DES MIGRATIONS — le dépôt sait-il reconstruire la base ?
 *
 * LA QUESTION POSÉE. Si le projet Supabase disparaissait demain, pourrait-on
 * le reconstruire depuis GitHub ? Le 2026-09-19, la réponse était non, et
 * personne ne pouvait le savoir : rien ne le vérifiait.
 *
 * CE QUE LE REJEU A TROUVÉ, du premier coup :
 *   · un conflit de fusion non résolu dans 0021 — le fichier ne pouvait
 *     s'appliquer nulle part, pas même en production ;
 *   · trois migrations appliquées en production et jamais commitées
 *     (0062, 0075, 0086), dont celle qui crée toute la mécanique des offres ;
 *   · deux fichiers portant le même numéro 0046 ;
 *   · une table (`utilisateur_capacites`) qu'aucune migration ne crée.
 *
 * LE CLIQUET. Le dépôt ne rejoue pas encore de bout en bout : 63 migrations
 * sur 207 sont des STUBS — des fichiers de commentaires sans SQL, dont le
 * contenu réel ne vit que dans la base de production. Les réparer une par une
 * n'a pas de sens ; le socle reconstruit depuis la production réglera le
 * problème d'un coup.
 *
 * En attendant, ce n'est pas une raison pour ne rien vérifier. Le repère
 * (`supabase/cale-tests/repere.json`) enregistre combien de migrations passent
 * aujourd'hui. La CI échoue si ce nombre BAISSE. On ne peut donc plus reculer,
 * et chaque réparation relève le repère.
 *
 * Usage :
 *   node outils/rejeu-migrations.mjs                rejoue et compare au repère
 *   node outils/rejeu-migrations.mjs --poser-repere enregistre le nouveau repère
 *
 * Variable attendue : DATABASE_URL (une base VIERGE et JETABLE).
 * Ne jamais la pointer vers la production : le rejeu écrit.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const URL_BASE = process.env.DATABASE_URL;
const POSER = process.argv.includes("--poser-repere");
const REPERE = "supabase/cale-tests/repere.json";
const CALE = "supabase/cale-tests";
const MIGRATIONS = "supabase/migrations";

if (!URL_BASE) {
  console.error("✗ DATABASE_URL absente. Attendu : une base vierge et jetable "
              + "(jamais la production — le rejeu écrit).");
  process.exit(1);
}

const psql = (fichier) =>
  execFileSync("psql", [URL_BASE, "-v", "ON_ERROR_STOP=1", "-q", "-f", fichier],
               { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

// ── 1 · La cale : ce que Supabase fournit avant toute migration ─────────────
try {
  psql(join(CALE, "00-cale-supabase.sql"));
} catch (e) {
  console.error("✗ la cale Supabase n'a pas pu être posée :\n"
              + (e.stderr || e.message));
  process.exit(1);
}

// ── 2 · Les migrations, dans l'ordre du nom ─────────────────────────────────
// Le tri alphabétique EST l'ordre d'application : c'est pourquoi le garde
// interdit les numéros en double.
const fichiers = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();

// MODE SOCLE. Une fois le socle extrait de la production (workflow
// schema-production.yml), le dossier ne contient plus que 0000_socle.sql et
// les migrations écrites après lui. Il n'y a alors plus aucune excuse : TOUT
// doit passer, le repère ne sert plus, un seul échec bloque la fusion.
const MODE_SOCLE = fichiers[0] === "0000_socle.sql";

let passees = 0;
let arret = null;

for (const f of fichiers) {
  try {
    psql(join(MIGRATIONS, f));
    passees++;
  } catch (e) {
    const brut = (e.stderr || e.message || "").split("\n")
      .filter((l) => /ERROR|DETAIL|HINT/.test(l)).slice(0, 3).join("\n      ");
    arret = { fichier: f, erreur: brut };
    break;
  }
  // L'amorce comble ce que 0015 et 0046 supposent déjà présent : l'organisation
  // dont l'identifiant est écrit en dur dans ces migrations.
  if (f.startsWith("0001_")) {
    try { psql(join(CALE, "01-amorce-rejeu.sql")); }
    catch (e) { console.error("✗ amorce de rejeu :\n" + (e.stderr || e.message));
                process.exit(1); }
  }
}

// ── 3 · Le verdict, contre le repère ────────────────────────────────────────
console.log(`\nRejeu sur base vierge : ${passees} / ${fichiers.length} migrations appliquées.`);
if (arret) {
  console.log(`Arrêt sur : ${arret.fichier}\n      ${arret.erreur}`);
}

if (MODE_SOCLE) {
  if (arret) {
    console.error(`\n✗ Le socle est en place : toutes les migrations doivent passer.\n`
      + `  ${arret.fichier} échoue sur une base vierge — elle échouerait aussi\n`
      + `  sur toute base reconstruite. Corriger avant de fusionner.\n`);
    process.exit(1);
  }
  console.log(`✓ rejeu complet sur le socle : ${passees} / ${fichiers.length}.`);
  process.exit(0);
}

if (POSER) {
  const contenu = {
    commentaire: "Nombre de migrations qui s'appliquent sur une base vierge. "
               + "La CI échoue si ce nombre baisse. Il monte à chaque réparation ; "
               + "il n'atteindra le total qu'une fois le socle reconstruit depuis "
               + "la production (63 migrations sont des stubs sans SQL).",
    migrations_qui_passent: passees,
    total_fichiers: fichiers.length,
    arret_sur: arret?.fichier ?? null,
    pose_le: new Date().toISOString().slice(0, 10),
  };
  writeFileSync(REPERE, JSON.stringify(contenu, null, 2) + "\n");
  console.log(`✓ repère posé à ${passees} dans ${REPERE}.`);
  process.exit(0);
}

const repere = JSON.parse(readFileSync(REPERE, "utf8"));
const attendu = repere.migrations_qui_passent;

if (passees < attendu) {
  console.error(`\n✗ RÉGRESSION : ${attendu - passees} migration(s) de moins `
    + `qu'au repère du ${repere.pose_le} (${attendu}).\n`
    + `  Une modification a cassé le rejeu — corriger, ou expliquer pourquoi le\n`
    + `  repère doit baisser (et le reposer sciemment).\n`);
  process.exit(1);
}

if (passees > attendu) {
  console.error(`\n✗ Le rejeu passe ${passees - attendu} migration(s) de PLUS que `
    + `le repère (${attendu}).\n`
    + `  Bonne nouvelle, mais le repère doit suivre, sinon il ne protège plus\n`
    + `  de rien : node outils/rejeu-migrations.mjs --poser-repere\n`);
  process.exit(1);
}

console.log(`✓ rejeu : ${passees} migrations, conforme au repère du ${repere.pose_le}.`);
