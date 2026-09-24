#!/usr/bin/env node
/**
 * PILOTAGE — le centre de pilotage interne, dérivé du code et non recopié.
 *
 * LE PROBLÈME QU'IL RÉSOUT. `docs/OFFRES.md` a été écrit le 2026-08-05 et dit
 * encore que Pro est verrouillée et que l'essai porte sur Pro. Le référentiel
 * dit aujourd'hui l'inverse : Pro est souscriptible, et l'essai porte sur la
 * meilleure offre souscriptible. La doc n'a pas menti — elle a vieilli. Toute
 * documentation recopiée à la main vieillit, et plus le projet s'élargit
 * (offres sectorielles, second métier), plus le décalage coûte cher.
 *
 * LA RÈGLE. Ce qui est DÉRIVABLE du code est généré et jamais édité à la main :
 * prix, seuils, modules, statut, parcours, verrous. Ce qui n'est PAS dérivable
 * — ce qu'un client fait réellement de l'offre, la dette connue, les décisions
 * prises — est amorcé une seule fois puis écrit à la main, et le générateur ne
 * l'écrase JAMAIS. Deux natures de fichiers, deux régimes.
 *
 * LE SUIVI. Chaque dossier porte un SUIVI.md qui recense ses sous-dossiers,
 * leur état et la date de dernière revue, agrégé depuis les fichiers feuilles.
 * C'est ce qui permet de reprendre le fil cinq messages ou six mois plus tard :
 * on ouvre docs/pilotage/SUIVI.md et on voit ce qui reste à écrire.
 *
 * Usage :
 *   node outils/pilotage.mjs              régénère le centre de pilotage
 *   node outils/pilotage.mjs --verifier   échoue si un fichier généré est périmé
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync,
         statSync } from "node:fs";
import { dirname, join } from "node:path";
import { REFERENTIEL_OFFRES } from "../packages/domaine/src/commercial/referentiel-offres.js";
import { PLANS, MODULES, module as moduleParCle }
  from "../packages/domaine/src/commercial/plans.js";
import { parcoursOffre } from "../packages/domaine/src/commercial/parcours-offres.js";

const RACINE = "docs/pilotage";
const VERIFIER = process.argv.includes("--verifier");
const AUJOURD_HUI = new Date().toISOString().slice(0, 10);

// Les fichiers à écrire : chemin → contenu. Remplis d'abord, écrits ensuite,
// pour que `--verifier` puisse comparer sans rien modifier sur le disque.
const generes = new Map();   // écrasés à chaque exécution
const amorces = new Map();   // écrits UNE fois, jamais réécrits

const euros = (c) => (c / 100).toLocaleString("fr-BE", { minimumFractionDigits: 0 });

const ENTETE_GENERE = (quoi, source) =>
`<!-- FICHIER GÉNÉRÉ — ne pas éditer à la main.
     Régénéré par : node outils/pilotage.mjs
     Source de vérité : ${source}
     Toute correction se fait dans la source, jamais ici. -->

# ${quoi}

État : généré
Dernière revue : ${AUJOURD_HUI}
`;

const ENTETE_AMORCE = (quoi, pourquoi) =>
`# ${quoi}

État : à écrire
Dernière revue : —

> ${pourquoi}
>
> Ce fichier n'est PAS généré : le générateur ne l'écrasera jamais. Quand il
> est rempli, remplacer « à écrire » par « à jour » et dater la revue — c'est
> ce que lit le SUIVI.md du dossier.
`;

// =============================================================================
// 1 · LES FICHIERS DÉRIVÉS DU CODE
// =============================================================================

function fichierModules(o) {
  const mods = o.modules.map((cle) => moduleParCle(cle)).filter(Boolean);
  const socle = mods.filter((m) => m.socle);
  const propres = mods.filter((m) => !m.socle);
  const l = [];
  l.push(ENTETE_GENERE(`${o.libelle} — capacités ouvertes`,
                       "packages/domaine/src/commercial/referentiel-offres.js"));

  if (mods.length === 0) {
    l.push("\n**Aucun module ouvert.** Ce n'est pas un oubli : le parcours de "
         + "cette offre n'existe pas encore, donc rien ne s'ouvre. La "
         + "contrainte de base 0179 interdit de la rendre souscriptible tant "
         + "que cette liste est vide.\n");
    return l.join("");
  }

  l.push(`\n${mods.length} module(s) ouvert(s) — dont ${socle.length} du socle `
        + `et ${propres.length} propre(s) à l'offre.\n`);

  const tableau = (titre, liste) => {
    if (liste.length === 0) return;
    l.push(`\n## ${titre}\n\n| Module | Ce que le client en fait | Livré |\n`
         + `|---|---|---|\n`);
    for (const m of liste) {
      l.push(`| **${m.titre}** | ${m.valeur} | ${m.livre ? "oui" : "**non**"} |\n`);
    }
  };
  tableau("Socle — présent dans toutes les offres déménageur", socle);
  tableau("Propre à cette offre", propres);

  const pasLivres = mods.filter((m) => !m.livre);
  if (pasLivres.length > 0) {
    l.push(`\n> **${pasLivres.length} module(s) annoncé(s) mais pas livré(s)** : `
         + pasLivres.map((m) => m.titre).join(", ")
         + ". Tant qu'ils ne tournent pas, ils ne se vendent pas.\n");
  }
  return l.join("");
}

function fichierParcours(o) {
  const p = parcoursOffre(o.code);
  const l = [];
  l.push(ENTETE_GENERE(`${o.libelle} — le parcours réel`,
                       "packages/domaine/src/commercial/parcours-offres.js"));
  if (!p) {
    l.push("\n**Aucun parcours défini.** Une offre sans parcours ne peut pas "
         + "être vendue : personne ne sait ce que le client fait le lundi "
         + "matin. C'est le premier manque à combler.\n");
    return l.join("");
  }
  l.push(`\n> ${p.accroche}\n\n## Les étapes, dans l'ordre\n\n`);
  p.parcours.forEach((e, i) => {
    l.push(`${i + 1}. **${e.etape}** — ${e.texte || "(texte manquant)"}\n`
         + `   · Écran : ${e.ecran || "—"} · Module : ${e.module || "—"}\n`);
  });
  if (p.pas_inclus?.length) {
    l.push(`\n## Ce que cette offre ne fait PAS\n\n`);
    for (const x of p.pas_inclus) l.push(`- ${x}\n`);
  }
  return l.join("");
}

function fichierPlafonds(o) {
  const l = [];
  l.push(ENTETE_GENERE(`${o.libelle} — plafonds et prix`,
                       "packages/domaine/src/commercial/referentiel-offres.js"));
  const membres = o.membres_limite === null
    ? `${o.membres_inclus} compris, **aucun plafond** — le membre `
      + `supplémentaire se facture ${euros(o.prix_membre_supp_centimes || 0)} €`
    : `${o.membres_inclus} compris, **plafond dur à ${o.membres_limite}**`;
  const centres = o.centres_limite === null
    ? `${o.centres_inclus} compris, aucun plafond `
      + `(+${euros(o.prix_centre_supp_centimes || 0)} € par centre)`
    : `${o.centres_inclus} compris, plafond ${o.centres_limite}`;

  l.push(`
| | |
|---|---|
| Prix de base | **${euros(o.prix_base_centimes)} € HTVA** ${o.unite} |
| Remise annuelle | ${o.remise_annuelle_pct ? o.remise_annuelle_pct + " %" : "—"} |
| Membres | ${membres} |
| Centres logistiques | ${centres} |
| Secteur | ${o.secteur || "Déménagement (échelle principale)"} |

**« Compris » et « plafonné » ne sont pas la même chose.** Les confondre avait
déjà coûté deux fautes : Pro annoncée « illimitée » alors qu'elle comprend
${PLANS.find((p) => p.cle === "pro")?.membres_inclus ?? 30} membres, et un 3ᵉ
utilisateur refusé en Basique que la facturation savait encaisser.
`);
  return l.join("");
}

function fichierVerrous(o) {
  const pasLivres = o.modules.map(moduleParCle).filter((m) => m && !m.livre);
  const l = [];
  l.push(ENTETE_GENERE(`${o.libelle} — verrous et état de vente`,
                       "packages/domaine/src/commercial/referentiel-offres.js"));
  l.push(`
| | |
|---|---|
| Statut affiché | **${o.statut}** |
| Souscriptible | ${o.souscriptible ? "**oui**" : "**non**"} |
| Modules ouverts | ${o.modules.length} |
| Modules non livrés | ${pasLivres.length} |
`);
  if (!o.souscriptible) {
    l.push(`
**Pourquoi elle ne se vend pas encore.** ${o.modules.length === 0
  ? "Aucun module n'est ouvert : le parcours propre à cette offre n'est pas construit."
  : "Les modules existent, mais le parcours de bout en bout n'est pas éprouvé."}
Encaisser pour une promesse est le plus sûr moyen de perdre le client au
premier mois. Le verrou vit en base (\`plan_souscriptible()\`), pas dans
l'interface : c'est le seul endroit à changer pour l'ouvrir.
`);
  }
  if (o.statut === "etude") {
    l.push(`\n**Statut « étude »** : l'offre ne s'affiche même pas sur la `
         + `vitrine. Elle existe ici pour être instruite, pas pour être vue.\n`);
  }
  return l.join("");
}

// =============================================================================
// 2 · LES FICHIERS À ÉCRIRE À LA MAIN (amorcés une fois)
// =============================================================================

function amorcesOffre(o) {
  const d = `${RACINE}/offres/${o.code}`;
  return [
    [`${d}/usages-reels/qui-fait-quoi.md`,
     ENTETE_AMORCE(`${o.libelle} — qui fait quoi, réellement`,
       "Les rôles tels qu'ils existent chez un client réel de cette offre : "
     + "qui ouvre l'app le matin, qui ne l'ouvre jamais, qui contourne. "
     + "Aucun code ne peut répondre à ça.")],
    [`${d}/usages-reels/cas-terrain.md`,
     ENTETE_AMORCE(`${o.libelle} — cas terrain observés`,
       "Ce qui s'est réellement passé chez un client : le cas qui a marché, "
     + "celui qui a cassé, la demande qui revient. Un cas daté vaut dix "
     + "hypothèses.")],
    [`${d}/limites/dette.md`,
     ENTETE_AMORCE(`${o.libelle} — dette connue`,
       "Ce qui est livré mais fragile, à la main, ou tenu par une convention "
     + "non vérifiée. La dette qu'on écrit coûte moins cher que celle qu'on "
     + "redécouvre.")],
    [`${d}/decisions/JOURNAL.md`,
     `# ${o.libelle} — journal des décisions

État : à jour
Dernière revue : ${AUJOURD_HUI}

> Une ligne par décision, la plus récente en haut. Une décision non datée
> n'est pas une décision, c'est un souvenir.

## ${AUJOURD_HUI} — dossier de pilotage ouvert

Offre \`${o.code}\` (${o.libelle}) suivie ici. État à l'ouverture :
statut **${o.statut}**, ${o.souscriptible ? "souscriptible" : "non souscriptible"},
${o.modules.length} module(s) ouvert(s), prix de base
${euros(o.prix_base_centimes)} € HTVA ${o.unite}.
`],
  ];
}

// =============================================================================
// 3 · LE SUIVI — agrégé depuis les fichiers feuilles
// =============================================================================

/** Lit l'état déclaré d'un fichier (ligne « État : … »). */
function etatFichier(chemin) {
  let texte = null;
  if (generes.has(chemin)) texte = generes.get(chemin);
  else if (existsSync(chemin)) texte = readFileSync(chemin, "utf8");
  else if (amorces.has(chemin)) texte = amorces.get(chemin);
  if (texte === null) return { etat: "absent", revue: "—" };
  const e = texte.match(/^État\s*:\s*(.+)$/m);
  const r = texte.match(/^Dernière revue\s*:\s*(.+)$/m);
  return { etat: (e?.[1] || "inconnu").trim(), revue: (r?.[1] || "—").trim() };
}

const PASTILLE = { "à jour": "🟢", "généré": "⚙️", "en cours": "🟡",
                   "à écrire": "🔴", "absent": "⛔", "inconnu": "❔" };

/**
 * Les fichiers .md d'un dossier (hors SUIVI.md), vus à la fois sur le disque et
 * dans les écritures en attente — sinon la première exécution et la suivante ne
 * verraient pas la même chose, et `--verifier` crierait au périmé sans raison.
 *
 * `recursif` sert au roulement vers le haut : l'état de `offres/` est celui de
 * tout ce qu'il contient, pas des zéro fichiers posés à sa racine.
 */
function fichiersDe(dossier, recursif = false) {
  const vus = new Set();
  const dedans = (c) => recursif
    ? c.startsWith(dossier + "/")
    : dirname(c) === dossier;

  const parcourir = (d) => {
    if (!existsSync(d)) return;
    for (const f of readdirSync(d)) {
      const chemin = join(d, f);
      if (statSync(chemin).isDirectory()) { if (recursif) parcourir(chemin); continue; }
      if (f.endsWith(".md") && f !== "SUIVI.md") vus.add(chemin);
    }
  };
  parcourir(dossier);

  for (const m of [generes, amorces]) {
    for (const c of m.keys()) {
      if (dedans(c) && !c.endsWith("SUIVI.md")) vus.add(c);
    }
  }
  return [...vus].sort();
}

function suiviDossier(dossier, titre, intro, sousDossiers) {
  const l = [];
  l.push(`<!-- FICHIER GÉNÉRÉ — régénéré par : node outils/pilotage.mjs -->

# ${titre} — suivi

Dernière régénération : ${AUJOURD_HUI}

${intro}

`);

  if (sousDossiers.length > 0) {
    l.push(`| Sous-dossier | Contenu | État | Dernière revue |\n|---|---|---|---|\n`);
    for (const sd of sousDossiers) {
      const chemin = join(dossier, sd.nom);
      const fichiers = fichiersDe(chemin, true);
      const etats = fichiers.map((f) => etatFichier(f).etat);
      const aEcrire = etats.filter((e) => e === "à écrire").length;
      const revues = fichiers.map((f) => etatFichier(f).revue)
        .filter((r) => r !== "—").sort();
      const global = fichiers.length === 0 ? "absent"
        : aEcrire === etats.length ? "à écrire"
        : aEcrire > 0 ? "en cours"
        : etats.every((e) => e === "généré") ? "généré" : "à jour";
      l.push(`| [\`${sd.nom}/\`](${sd.nom}/SUIVI.md) | ${sd.quoi} `
           + `| ${PASTILLE[global] || ""} ${global}`
           + `${aEcrire ? ` (${aEcrire}/${etats.length} à écrire)` : ""} `
           + `| ${revues[revues.length - 1] || "—"} |\n`);
    }
  }

  const propres = fichiersDe(dossier);
  if (propres.length > 0) {
    l.push(`\n## Fichiers de ce dossier\n\n| Fichier | État | Dernière revue |\n`
         + `|---|---|---|\n`);
    for (const f of propres) {
      const { etat, revue } = etatFichier(f);
      const nom = f.slice(dossier.length + 1);
      l.push(`| [\`${nom}\`](${nom}) | ${PASTILLE[etat] || ""} ${etat} | ${revue} |\n`);
    }
  }

  l.push(`\n---\n\n**Légende.** ⚙️ généré depuis le code (ne pas éditer) · `
       + `🟢 à jour · 🟡 en cours · 🔴 à écrire · ⛔ dossier vide.\n`);
  return l.join("");
}

// =============================================================================
// 4 · ASSEMBLAGE
// =============================================================================

const SOUS_DOSSIERS = [
  { nom: "capacites",    quoi: "Ce que l'offre ouvre réellement — modules, parcours" },
  { nom: "limites",      quoi: "Plafonds, prix, verrous de vente, dette connue" },
  { nom: "usages-reels", quoi: "Qui fait quoi chez un client, cas terrain observés" },
  { nom: "decisions",    quoi: "Journal daté des décisions prises sur l'offre" },
];

for (const o of REFERENTIEL_OFFRES) {
  const d = `${RACINE}/offres/${o.code}`;
  generes.set(`${d}/capacites/modules.md`, fichierModules(o));
  generes.set(`${d}/capacites/parcours.md`, fichierParcours(o));
  generes.set(`${d}/limites/plafonds.md`, fichierPlafonds(o));
  generes.set(`${d}/limites/verrous.md`, fichierVerrous(o));
  for (const [chemin, contenu] of amorcesOffre(o)) amorces.set(chemin, contenu);
}

// Les SUIVI.md, du plus profond vers le plus haut : un niveau agrège le suivant.
for (const o of REFERENTIEL_OFFRES) {
  const d = `${RACINE}/offres/${o.code}`;
  for (const sd of SOUS_DOSSIERS) {
    generes.set(`${d}/${sd.nom}/SUIVI.md`,
      suiviDossier(`${d}/${sd.nom}`, `${o.libelle} · ${sd.nom}`, `> ${sd.quoi}.`, []));
  }
  generes.set(`${d}/SUIVI.md`, suiviDossier(d, `Offre ${o.libelle}`,
    `> Offre \`${o.code}\` · statut **${o.statut}** · `
  + `${o.souscriptible ? "souscriptible" : "**non souscriptible**"} · `
  + `${euros(o.prix_base_centimes)} € HTVA ${o.unite} · `
  + `secteur : ${o.secteur || "déménagement"}.`, SOUS_DOSSIERS));
}

const paliers = REFERENTIEL_OFFRES.filter((o) => o.secteur === null);
const sectorielles = REFERENTIEL_OFFRES.filter((o) => o.secteur !== null);

generes.set(`${RACINE}/offres/SUIVI.md`, suiviDossier(`${RACINE}/offres`,
  "Les offres", `> ${REFERENTIEL_OFFRES.length} offres suivies : `
+ `${paliers.length} paliers déménageur, ${sectorielles.length} sectorielles. `
+ `${REFERENTIEL_OFFRES.filter((o) => o.souscriptible).length} souscriptible(s).`,
  REFERENTIEL_OFFRES.map((o) => ({
    nom: o.code,
    quoi: `${o.libelle} — ${o.secteur || "déménagement"} · ${o.statut}`
        + `${o.souscriptible ? "" : " · non souscriptible"}`,
  }))));

generes.set(`${RACINE}/README.md`, `<!-- FICHIER GÉNÉRÉ — régénéré par : node outils/pilotage.mjs -->

# Centre de pilotage — Dashprod

État : généré
Dernière revue : ${AUJOURD_HUI}

> **Où regarder d'abord :** [\`SUIVI.md\`](SUIVI.md).

## Ce que c'est

Un dossier par offre, et dans chacun ce qu'il faut savoir pour décider :
ce qu'elle **ouvre**, ce qu'elle **ne fait pas**, ce qu'un client en fait
**réellement**, et les **décisions** datées qui l'ont façonnée.

## La règle qui empêche cette doc de vieillir

Deux natures de fichiers, deux régimes :

| | Régime |
|---|---|
| **⚙️ Généré** — modules, parcours, prix, plafonds, verrous | Dérivé du code à chaque exécution. **Ne jamais éditer** : la correction se fait dans \`packages/domaine/src/commercial/\`. |
| **🟢🟡🔴 Écrit** — usages réels, dette, décisions | Amorcé une fois, écrit à la main. Le générateur ne l'écrase **jamais**. |

\`docs/OFFRES.md\` montre le coût de l'autre méthode : écrit le 2026-08-05, il
affirme encore que Pro est verrouillée et que l'essai porte sur Pro. Le
référentiel dit le contraire aujourd'hui. Personne n'a menti — la copie a
vieilli. Ici, ce qui est dérivable n'est plus recopié.

## Régénérer

\`\`\`
npm run pilotage            # régénère tout le centre de pilotage
npm run pilotage:verifier   # échoue si un fichier généré est périmé (CI)
\`\`\`

La CI exécute la vérification : un prix modifié dans le référentiel sans
régénération **bloque la fusion**. La doc ne peut plus dériver silencieusement.

## Structure

\`\`\`
docs/pilotage/
├── README.md                    ce fichier
├── SUIVI.md                     ⬅ le tableau de bord
└── offres/
    ├── SUIVI.md                 les ${REFERENTIEL_OFFRES.length} offres et leur état
${REFERENTIEL_OFFRES.map((o, i) => {
  const dernier = i === REFERENTIEL_OFFRES.length - 1;
  return `    ${dernier ? "└──" : "├──"} ${o.code}/${" ".repeat(Math.max(1, 26 - o.code.length))}${o.libelle}`;
}).join("\n")}
         ├── SUIVI.md
         ├── capacites/     modules.md ⚙️ · parcours.md ⚙️
         ├── limites/       plafonds.md ⚙️ · verrous.md ⚙️ · dette.md ✍️
         ├── usages-reels/  qui-fait-quoi.md ✍️ · cas-terrain.md ✍️
         └── decisions/     JOURNAL.md ✍️
\`\`\`

## Ajouter une offre

Elle s'ajoute dans \`referentiel-offres.js\`, puis \`npm run pilotage\` crée son
dossier complet. Aucun dossier ne se crée à la main : une offre absente du
référentiel n'existe pas, et une offre du référentiel ne peut pas être oubliée
ici.
`);

generes.set(`${RACINE}/SUIVI.md`, suiviDossier(RACINE, "Centre de pilotage",
  "> Le tableau de bord du projet. Ouvrir ce fichier d'abord : il dit où en "
+ "est chaque dossier et ce qui reste à écrire.",
  [{ nom: "offres", quoi: `Un dossier par offre — ${REFERENTIEL_OFFRES.length} au total` }]));

// =============================================================================
// 5 · ÉCRITURE OU VÉRIFICATION
// =============================================================================

if (VERIFIER) {
  const perimes = [];
  for (const [chemin, contenu] of generes) {
    const actuel = existsSync(chemin) ? readFileSync(chemin, "utf8") : null;
    // La date de régénération change chaque jour : on compare le fond, pas elle.
    // Les dates changent chaque jour, y compris dans les tableaux de suivi :
    // on compare le FOND, pas le jour où le fichier a été régénéré.
    const sansDate = (t) => t
      .replace(/^(Dernière (revue|régénération)) : .*$/gm, "$1 : —")
      .replace(/\d{4}-\d{2}-\d{2}/g, "—");
    if (actuel === null) perimes.push([chemin, "absent"]);
    else if (sansDate(actuel) !== sansDate(contenu)) perimes.push([chemin, "périmé"]);
  }
  const manquants = [...amorces.keys()].filter((c) => !existsSync(c));
  if (perimes.length || manquants.length) {
    console.error("\n✗ centre de pilotage désynchronisé du code :\n");
    for (const [c, quoi] of perimes.slice(0, 10)) console.error(`  · ${quoi} — ${c}`);
    if (perimes.length > 10) console.error(`  · … et ${perimes.length - 10} autre(s)`);
    for (const c of manquants.slice(0, 5)) console.error(`  · amorce manquante — ${c}`);
    console.error("\n  Réparation : npm run pilotage && git add docs/pilotage\n");
    process.exit(1);
  }
  console.log(`✓ pilotage : ${generes.size} fichiers générés à jour, `
            + `${amorces.size} amorces présentes.`);
} else {
  let ecrits = 0, conserves = 0;
  for (const [chemin, contenu] of generes) {
    mkdirSync(dirname(chemin), { recursive: true });
    writeFileSync(chemin, contenu);
    ecrits++;
  }
  for (const [chemin, contenu] of amorces) {
    if (existsSync(chemin)) { conserves++; continue; }
    mkdirSync(dirname(chemin), { recursive: true });
    writeFileSync(chemin, contenu);
    ecrits++;
  }
  console.log(`✓ pilotage : ${ecrits} fichier(s) écrit(s), `
            + `${conserves} contenu(s) manuel(s) conservé(s) intact(s).`);
  console.log(`  Tableau de bord : ${RACINE}/SUIVI.md`);
}
