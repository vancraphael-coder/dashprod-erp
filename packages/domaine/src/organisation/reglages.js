// =============================================================================
// L'ORGANISATION DES RÉGLAGES — quelles familles, quelles entrées, dans quel
// ordre, et lesquelles l'abonnement ouvre.
//
// POURQUOI C'EST ICI ET PAS DANS L'ÉCRAN
// --------------------------------------
// C'était écrit dans `Parametres.jsx`, en JSX puis en tableau local. Dans les
// deux cas, la seule façon de vérifier le rangement était de LIRE LE FICHIER
// SOURCE au caractère près — un test qui compte des `titre: "` dans du texte
// prouve la mise en page, pas la logique. Et un écran ne se monte pas hors
// navigateur : ses effets ne s'exécutent pas, on ne peut donc pas l'éprouver.
//
// Ici, c'est une fonction pure : on lui donne les catalogues, l'organisation et
// les modules souscrits, elle rend la structure. On peut alors vérifier pour de
// vrai qu'aucune famille ne reste solitaire une fois les portes fermées
// retirées — ce qui est justement le cas qu'on ne voit jamais en développant,
// parce qu'on développe toujours en offre Pro.
//
// Règle du projet : la logique vit dans le domaine, pure, testable sans base.
// Les écrans n'additionnent rien — ici, ils ne rangent rien non plus.
//
// CE QUE CE MODULE NE FAIT PAS
// ----------------------------
// Aucune action, aucun `onClick`, aucun composant. Il rend des DONNÉES ; l'écran
// associe chaque `cle` à sa navigation. C'est ce qui le garde pur et ce qui
// permet de le tester sans React.
// =============================================================================

import { tauxTva, identiteComplete } from "./identite.js";

/**
 * Le badge de l'entrée « identité » : dit en un mot où en est la saisie.
 * Un badge qui ment est pire qu'une absence de badge — il se calcule donc à
 * partir de l'état réel, jamais d'un booléen mémorisé ailleurs.
 */
function badgeIdentite(organisation) {
  const etat = identiteComplete(organisation);
  if (etat.complete) return { texte: "complète", actif: false };
  if (etat.invalides.length) return { texte: "champ invalide", actif: true };
  const n = etat.bloquants.length;
  return {
    texte: `${n} champ${n > 1 ? "s" : ""} manquant${n > 1 ? "s" : ""}`,
    actif: true,
  };
}

/**
 * Les familles de réglages, rangées.
 *
 * DEUX CORRECTIONS DE RANGEMENT par rapport à l'organisation précédente, et
 * elles sont la raison d'être de ce module :
 *
 *   1. « Ce que ça vous coûte » mêlait les COÛTS INTERNES (votre métier : taux
 *      horaire, carburant) et VOTRE ABONNEMENT (ce que vous payez à Dashprod).
 *      Deux sujets sans rapport dans une même boîte. Les coûts rejoignent les
 *      grilles négociées — c'est là qu'on calcule une marge ; l'abonnement
 *      rejoint « Dashprod », avec l'apparence et vos droits sur vos données.
 *
 *   2. CONSULTER n'est pas RÉGLER. Comptabilité, Journal, Contrats et Archivage
 *      ne se règlent pas : ils s'ouvrent pour regarder. Mélangés aux réglages,
 *      ils allongeaient la page sans qu'on comprenne pourquoi elle était longue.
 *      Une page de réglages qui contient des rapports, c'est deux pages.
 *
 * @param {object} p
 * @param {object} p.catalogues       organisations.parametres_catalogues
 * @param {object} p.organisation     la ligne organisations
 * @param {string[]} p.modules        modules réellement souscrits
 * @param {number} p.nbCouts          articles de catalogue portant un coût
 * @param {object[]} p.listesCatalogue LISTES_CATALOGUE (injecté : le socle ne
 *        dépend pas de `stocks`, qui est un métier)
 * @param {(cle:string)=>({texte:string,actif:boolean}|null)} [p.badgeListe]
 * @returns {{cle,titre,aide,entrees}[]} familles NON VIDES uniquement
 */
export function famillesReglages({
  catalogues = {},
  organisation = {},
  modules = [],
  nbCouts = 0,
  listesCatalogue = [],
  badgeListe = null,
} = {}) {
  const ouvert = (cle) => !cle || modules.includes(cle);
  const bi = badgeIdentite(organisation);

  const brutes = [
    {
      cle: "entreprise",
      titre: "Mon entreprise",
      aide: "Ce qui vous identifie sur tous les documents.",
      entrees: [
        { cle: "identite", icone: "🏢", titre: "Identité de l'entreprise",
          resume: "Nom, BCE, TVA, adresse, IBAN.",
          badge: bi.texte, actif: bi.actif },
        { cle: "depots", icone: "🏭", titre: "Centres logistiques",
          resume: "Vos dépôts, leurs équipes et leurs véhicules.",
          module: "multi_depots" },
        { cle: "fermetures", icone: "🗓️", titre: "Fermetures de l'entreprise",
          resume: "Congé collectif, ponts. Visibles au planning." },
      ],
    },
    {
      cle: "vendre",
      titre: "Vendre et facturer",
      aide: "Vos prix, vos documents, ce que vos clients reçoivent.",
      entrees: [
        { cle: "bareme", icone: "🏷️", titre: "Barème (prix client)",
          resume: "Prix horaires par équipe, forfaits, suppléments." },
        { cle: "facturation", icone: "🧾", titre: "Réglages de facturation",
          resume: `TVA ${tauxTva(organisation)} %, échéance, numérotation, Peppol.` },
        { cle: "textes", icone: "📝", titre: "Textes des dossiers",
          resume: "Mails, PDF d'offre, conditions générales." },
      ],
    },
    {
      cle: "couts",
      titre: "Coûts et grilles négociées",
      aide: "Ce que le travail vous coûte, et ce que vous avez négocié.",
      entrees: [
        { cle: "cout", icone: "📉", titre: "Coûts internes",
          resume: `Taux horaire, carburant${nbCouts ? ` · ${nbCouts} articles des catalogues` : ""}.` },
        { cle: "services", icone: "⚙️", titre: "Grilles de services",
          resume: "Sous-traitance, couronnes du lift, axes du dépôt." },
      ],
    },
    {
      cle: "listes",
      titre: "Mes listes",
      aide: "Ce qui alimente le relevé, le chantier et l'emballage.",
      entrees: listesCatalogue.map((l) => {
        const b = badgeListe ? badgeListe(l.cle) : null;
        return {
          cle: l.cle, icone: l.icone, titre: l.titre, resume: l.resume,
          badge: b?.texte, actif: b?.actif,
        };
      }),
    },
    {
      cle: "depot",
      titre: "Mon dépôt",
      aide: "Ce que vous louez, et à qui.",
      entrees: [
        { cle: "stockage", icone: "📦", titre: "Zones et boxes",
          resume: "Plan du dépôt, emplacements, occupation.",
          module: "stockage_3d" },
        { cle: "contrats", icone: "📄", titre: "Contrats de stockage",
          resume: "Échéances mensuelles et litiges.",
          module: "stockage_3d" },
      ],
    },
    {
      cle: "consulter",
      titre: "Consulter",
      aide: "Ces écrans ne se règlent pas : ils s'ouvrent pour regarder.",
      entrees: [
        { cle: "comptabilite", icone: "📊", titre: "Comptabilité",
          resume: "Factures par période, TVA, fichiers pour votre comptable.",
          module: "comptabilite" },
        { cle: "journal", icone: "📖", titre: "Journal",
          resume: "Tous les mouvements, dans l'ordre. Rien ne s'y réécrit.",
          module: "journal" },
        { cle: "archivage", icone: "🗂️", titre: "Archivage",
          resume: "Dossiers, véhicules et membres archivés.",
          // Archivage n'est gardé par aucun module. En offre Basique, où
          // Comptabilité et Journal sont fermés, il resterait donc SEUL sous
          // le titre « Consulter » — une famille d'un élément, exactement ce
          // qu'on cherche à éviter. Il rejoint alors « Mon entreprise » : ce
          // sont les dossiers, véhicules et membres de la société.
          repli: "entreprise" },
      ],
    },
    {
      cle: "dashprod",
      titre: "Dashprod",
      aide: "Votre abonnement, l'affichage, et vos droits sur vos données.",
      entrees: [
        { cle: "abonnement", icone: "💳", titre: "Mon offre",
          resume: "Basique, Regular ou Pro. Mensuel ou annuel (−5 %)." },
        { cle: "apparence", icone: "🎨", titre: "Apparence",
          resume: "Mode clair ou nuit, couleur d'accent, matière." },
        { cle: "confidentialite", icone: "🔒", titre: "Confidentialité & données",
          resume: "Conservation, suppression RGPD, export." },
      ],
    },
  ];

  // ── Deux nettoyages, dans cet ordre ────────────────────────────────────
  //
  // 1. Une famille dont toutes les entrées sont fermées DISPARAÎT. Elle ne
  //    laisse pas un titre au-dessus du vide : un cadre creux ressemble à un
  //    bug, et un titre sans contenu est une publicité pour ce qu'on n'a pas
  //    acheté.
  //
  // 2. Une famille RÉDUITE À UNE SEULE entrée par le filtrage se dissout, et
  //    son entrée rejoint la famille de repli qu'elle déclare. C'est le cas
  //    qu'on ne voit jamais en développant — on développe tous modules ouverts
  //    — mais que TOUT client en offre Basique rencontre : « Consulter »
  //    n'aurait contenu qu'Archivage. Un titre de section pour un item unique
  //    double la hauteur sans rien apprendre.
  //
  //    Une entrée sans repli n'est jamais perdue : sa famille survit plutôt
  //    que de la faire disparaître. Perdre un réglage serait pire que de
  //    laisser une famille courte.
  const gardees = brutes
    .map((f) => ({ ...f, entrees: f.entrees.filter((e) => ouvert(e.module)) }))
    .filter((f) => f.entrees.length > 0);

  const orphelines = [];
  const restantes = gardees.filter((f) => {
    if (f.entrees.length !== 1) return true;
    const seule = f.entrees[0];
    if (!seule.repli || !gardees.some((g) => g.cle === seule.repli)) return true;
    orphelines.push(seule);
    return false;
  });

  return restantes.map((f) => {
    const ajouts = orphelines.filter((e) => e.repli === f.cle);
    return ajouts.length ? { ...f, entrees: [...f.entrees, ...ajouts] } : f;
  });
}

/**
 * Filtre de recherche.
 *
 * Une page de réglages honnête est longue : on ne peut pas la raccourcir en
 * retirant des réglages. Ce qu'on peut faire, c'est cesser d'obliger à la
 * parcourir. La recherche porte sur le titre, le résumé ET le nom de la
 * famille — c'est précisément quand le rangement se discute qu'elle sauve.
 */
export function filtrerReglages(familles, requete) {
  const q = String(requete ?? "").trim().toLowerCase();
  if (!q) return familles;
  return familles
    .map((f) => ({
      ...f,
      entrees: f.entrees.filter((e) =>
        `${e.titre} ${e.resume || ""} ${f.titre}`.toLowerCase().includes(q)),
    }))
    .filter((f) => f.entrees.length > 0);
}

/** Nombre d'entrées visibles — pour dire « 3 réglages » sous la recherche. */
export function compterReglages(familles) {
  return familles.reduce((n, f) => n + f.entrees.length, 0);
}
