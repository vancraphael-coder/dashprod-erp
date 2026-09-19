#!/usr/bin/env node
/**
 * GARDE-POIDS — le premier téléchargement a un plafond.
 *
 * Avant le découpage par coquille, ouvrir l'app coûtait 1 358 ko (374 ko
 * compressés) : le chef d'équipe téléchargeait la comptabilité, le journal et
 * la vitrine pour consulter son chantier. Sur un chantier, en cage d'escalier,
 * c'est la différence entre « ça marche » et « ça ne marche pas ».
 *
 * Un budget non mesuré remonte toujours : chaque écran ajouté pèse un peu, et
 * personne ne voit le jour où la limite est franchie. Ce garde mesure le
 * CHARGEMENT INITIAL — les morceaux réellement demandés par index.html et ses
 * dépendances immédiates — et refuse la fusion au-delà du plafond.
 *
 * Usage : node outils/garde-poids.mjs [--plafond=220]  (ko compressés)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIST = "apps/web/dist";
const PLAFOND_KO = Number(
  (process.argv.find((a) => a.startsWith("--plafond=")) || "=220").split("=")[1]
);

// Les morceaux du chargement initial : ceux que le navigateur va chercher AVANT
// d'afficher quoi que ce soit. Les coquilles et les écrans arrivent après, à la
// demande — leur poids compte, mais pas dans ce budget.
const PREFIXES_INITIAUX = ["index-", "socle-react", "socle-donnees",
                           "socle-tiers", "domaine-"];

let assets;
try {
  assets = readdirSync(join(DIST, "assets"));
} catch {
  console.error(`✗ ${DIST}/assets absent — lancer le build d'abord.`);
  process.exit(1);
}

const initiaux = assets.filter((f) =>
  f.endsWith(".js") && PREFIXES_INITIAUX.some((p) => f.startsWith(p)));

if (initiaux.length === 0) {
  console.error("✗ aucun morceau initial reconnu : le découpage a changé de "
              + "nom sans que ce garde soit mis à jour (cf. manualChunks).");
  process.exit(1);
}

let brut = 0, compresse = 0;
const lignes = [];
for (const f of initiaux) {
  const chemin = join(DIST, "assets", f);
  const octets = readFileSync(chemin);
  const gz = gzipSync(octets).length;
  brut += octets.length; compresse += gz;
  lignes.push([f, octets.length, gz]);
}

lignes.sort((a, b) => b[2] - a[2]);
for (const [f, o, gz] of lignes) {
  console.log(`  ${(gz / 1024).toFixed(1).padStart(7)} ko gz  `
            + `(${(o / 1024).toFixed(0).padStart(4)} ko)  ${f}`);
}

const ko = compresse / 1024;
const total = readdirSync(join(DIST, "assets"))
  .filter((f) => f.endsWith(".js"))
  .reduce((n, f) => n + statSync(join(DIST, "assets", f)).size, 0);

console.log(`\nChargement initial : ${ko.toFixed(1)} ko compressés `
          + `(${(brut / 1024).toFixed(0)} ko bruts) — plafond ${PLAFOND_KO} ko`);
console.log(`Application entière : ${(total / 1024).toFixed(0)} ko bruts, `
          + `répartis en ${assets.filter((f) => f.endsWith(".js")).length} morceaux`);

if (ko > PLAFOND_KO) {
  console.error(`\n✗ plafond dépassé de ${(ko - PLAFOND_KO).toFixed(1)} ko.\n`
    + `  Un écran vient-il d'être importé statiquement dans main.jsx au lieu\n`
    + `  de React.lazy ? C'est la cause dans neuf cas sur dix.\n`);
  process.exit(1);
}

console.log("✓ garde-poids : sous le plafond.");
