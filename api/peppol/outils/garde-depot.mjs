#!/usr/bin/env node
/**
 * GARDE-DÉPÔT — ce qui ne doit JAMAIS revenir dans le dépôt.
 *
 * Le 17/09/2026, le dépôt contenait 2 787 fichiers de `node_modules`, un
 * `apps/web/dist` complet avec sa carte de sources en clair (tout le code de
 * l'ERP lisible par un concurrent) et sept fichiers `.patch` à la racine.
 * `.gitignore` les interdisait déjà : ils avaient été commités AVANT la règle,
 * et `.gitignore` n'a aucun effet sur un fichier déjà suivi.
 *
 * Une règle qu'aucune machine ne vérifie n'est pas une règle. Ce garde tourne
 * en intégration continue et refuse la fusion. Il lit l'index Git, pas le
 * disque : c'est ce qui est SUIVI qui compte.
 *
 * Usage : node outils/garde-depot.mjs
 */
import { execSync } from "node:child_process";

const suivis = execSync("git ls-files", { encoding: "utf8" })
  .split("\n").filter(Boolean);

const interdits = [
  {
    nom: "dépendances installées",
    test: (f) => f.startsWith("node_modules/") || f.includes("/node_modules/"),
    pourquoi: "npm ci les reconstruit ; les versionner fait diverger la machine "
            + "locale, la CI et Vercel, et rend toute revue illisible.",
  },
  {
    nom: "résultat de build",
    test: (f) => f.startsWith("apps/web/dist/") || /(^|\/)dist\//.test(f),
    pourquoi: "le build est reproductible ; le versionner publie en plus les "
            + "cartes de sources, donc le code source complet.",
  },
  {
    nom: "carte de sources",
    test: (f) => f.endsWith(".map"),
    pourquoi: "elle contient le code source d'origine, commentaires compris.",
  },
  {
    nom: "correctif de livraison",
    test: (f) => f.endsWith(".patch") || f.endsWith(".diff"),
    pourquoi: "un correctif appliqué n'a plus de raison d'être ; non appliqué, "
            + "il fait croire à une source de vérité qui n'en est pas une.",
  },
  {
    nom: "source égarée",
    // Les fichiers de configuration (vite.config.js…) vivent légitimement
    // à la racine du module : seuls les COMPOSANTS sont visés.
    test: (f) => /^apps\/[^/]+\/[^/]+\.(jsx|tsx)$/.test(f)
               && !f.includes(".config."),
    pourquoi: "un composant hors de src/ est un doublon d'import manuel : "
            + "apps/web/Legal.jsx était la copie exacte, jamais importée, de "
            + "apps/web/src/ecrans/vitrine/Legal.jsx. Deux vérités pour un "
            + "même texte légal, c'est une vérité de moins.",
  },
  {
    nom: "secret",
    test: (f) => /(^|\/)\.env($|\.)/.test(f) && !f.endsWith(".example"),
    pourquoi: "un secret poussé sur un dépôt public est un secret brûlé.",
  },
];

let fautes = 0;
for (const regle of interdits) {
  const touches = suivis.filter(regle.test);
  if (touches.length === 0) continue;
  fautes += touches.length;
  console.error(`\n✗ ${regle.nom} — ${touches.length} fichier(s) suivi(s)`);
  console.error(`  Pourquoi : ${regle.pourquoi}`);
  for (const f of touches.slice(0, 5)) console.error(`  · ${f}`);
  if (touches.length > 5) console.error(`  · … et ${touches.length - 5} autre(s)`);
  console.error(`  Réparation : git rm -r --cached <chemin> && git commit`);
}

if (fautes > 0) {
  console.error(`\n${fautes} fichier(s) ne doivent pas être suivis par Git.\n`);
  process.exit(1);
}

console.log(`✓ garde-dépôt : ${suivis.length} fichiers suivis, aucun interdit.`);
