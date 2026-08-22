// =============================================================================
// CATÉGORIES D'OPÉRATION — ce que l'entreprise vend, et ce que ça implique.
//
// POURQUOI CE MODULE
// ------------------
// Le lot 23 a posé une règle dure : aucun taux de TVA ne s'invente. Mais un
// déménageur n'est pas fiscaliste — lui demander « quelle catégorie TVA ? »
// serait déplacer le problème sur quelqu'un qui n'a pas la réponse.
//
// La sortie est ici : ce n'est pas l'utilisateur qui qualifie, c'est la NATURE
// du dossier. Un déménagement est une vente de services soumise à 21 % ; ça ne
// dépend pas de l'humeur du jour, donc Dashprod le sait d'avance.
//
//        nature du dossier  →  catégorie d'opération  →  taux
//              (connue)            (pré-définie)       (déterminé)
//
// Ce n'est PAS un retour au défaut implicite du lot 23. La différence est
// entière : un taux qui tombe de nulle part est une supposition ; un taux
// dérivé d'une catégorie déclarée et LISIBLE est une décision documentée que
// l'utilisateur peut lire, comprendre et corriger.
//
// LA « LECTURE »
// --------------
// Chaque catégorie porte son explication en langage courant : ce qu'elle
// recouvre, un exemple du métier, et la conséquence. Un sélecteur qui affiche
// seulement « Vente de services » ne renseigne personne. Celui-ci se lit.
//
// Statut des règles : les taux ci-dessous sont les taux belges usuels, validés
// avec Raphaël pour son métier. Un cas particulier (taux réduit, exonération)
// reste possible : la catégorie propose, l'utilisateur peut corriger, et
// `qualifierTva` reste seul juge de la cohérence.
// =============================================================================

/**
 * Les catégories d'opération proposées à la facturation. Alignées sur ce que
 * proposent les logiciels de facturation belges agréés, pour qu'un utilisateur
 * qui en vient ne soit pas dépaysé.
 *
 * `tauxUsuel` : le taux que Dashprod pré-remplit. Jamais imposé en silence —
 * il s'affiche, et l'utilisateur peut le changer.
 */
export const CATEGORIES_OPERATION = Object.freeze({
  vente_services: {
    libelle: "Vente de services",
    lecture: "Vous vendez du travail : main-d'œuvre, transport, manutention, "
           + "conseil. C'est le cas de la très grande majorité des prestations.",
    exemple: "Un déménagement, une journée de lift, de la sous-traitance.",
    tauxUsuel: 21,
    consequence: "Soumis à 21 %, le taux normal.",
  },
  vente_biens: {
    libelle: "Vente de biens",
    lecture: "Vous vendez un objet, pas du travail. Le bien change de "
           + "propriétaire.",
    exemple: "Des cartons, du film à bulles, du matériel d'emballage.",
    tauxUsuel: 21,
    consequence: "Soumis à 21 % pour du matériel courant.",
  },
  location_espace: {
    libelle: "Location d'espace de stockage",
    lecture: "Vous mettez un emplacement à disposition pour entreposer des "
           + "biens. La location d'espaces de stockage n'est pas exonérée : "
           + "elle est taxée comme une prestation.",
    exemple: "Un box de garde-meubles, une zone louée au mois.",
    tauxUsuel: 21,
    consequence: "Soumis à 21 %.",
  },
  loyer_professionnel: {
    libelle: "Loyer professionnel",
    lecture: "Vous louez un immeuble ou une partie d'immeuble. Attention : la "
           + "location immobilière suit des règles propres, et toutes ne se "
           + "traitent pas de la même façon.",
    exemple: "Un hangar loué à une autre entreprise.",
    tauxUsuel: null,   // volontairement absent : le régime dépend du bail
    consequence: "Régime à confirmer avec votre comptable — Dashprod ne "
               + "pré-remplit aucun taux ici.",
    aValider: true,
  },
  droits_auteur: {
    libelle: "Revenu de droits d'auteur",
    lecture: "Vous cédez ou concédez un droit sur une œuvre.",
    exemple: "Une cession de photographies, d'un plan, d'un contenu.",
    tauxUsuel: null,
    consequence: "Régime particulier — à confirmer avec votre comptable.",
    aValider: true,
  },
  don: {
    libelle: "Don",
    lecture: "Une somme reçue sans contrepartie. Ce n'est pas une vente.",
    exemple: "Un soutien versé sans prestation en retour.",
    tauxUsuel: null,
    consequence: "Hors champ de la TVA — à confirmer avec votre comptable.",
    aValider: true,
  },
});

/**
 * LE PONT : la nature du dossier détermine la catégorie d'opération.
 *
 * C'est ici que se joue la promesse faite à l'utilisateur : il ne choisit pas
 * une catégorie fiscale, il crée un dossier de déménagement — et Dashprod en
 * tire la conséquence. Le lien est explicite et relisible, pas enfoui dans un
 * écran.
 */
export const CATEGORIE_PAR_NATURE = Object.freeze({
  demenagement:   "vente_services",
  lift:           "vente_services",
  sous_traitance: "vente_services",
  // Le garde-meubles et la zone louent un espace de stockage : en Belgique,
  // la mise à disposition d'emplacements pour l'entreposage de biens est
  // exclue de l'exonération immobilière, donc taxée. On la distingue quand
  // même de la prestation pure : c'est une catégorie à part dans les
  // logiciels agréés, et la distinction servira aux exports comptables.
  boxe:           "location_espace",
  zone:           "location_espace",
});

/** La catégorie complète (libellé + lecture + taux) pour une clé donnée. */
export function categorieOperation(cle) {
  return CATEGORIES_OPERATION[cle] || null;
}

/**
 * Ce que Dashprod propose pour un dossier, sans rien imposer.
 *
 * Rend la catégorie ET sa lecture, pour que l'écran puisse EXPLIQUER son choix
 * au lieu de l'appliquer en silence. Une nature inconnue ne devine pas : elle
 * rend `null`, et l'utilisateur choisit.
 *
 * @param {string} nature clé de nature du dossier
 * @returns {{cle: string, tauxUsuel: number|null, ...}|null}
 */
export function categoriePourNature(nature) {
  const cle = CATEGORIE_PAR_NATURE[nature];
  if (!cle) return null;
  const def = CATEGORIES_OPERATION[cle];
  return def ? { cle, ...def } : null;
}

/**
 * Le taux que Dashprod pré-remplit pour une nature, ou `null` s'il n'y a rien
 * de sûr à proposer. `null` n'est PAS un zéro : c'est l'aveu qu'il faut
 * demander. `qualifierTva` refusera alors, avec son motif.
 */
export function tauxUsuelPourNature(nature) {
  const c = categoriePourNature(nature);
  return c ? c.tauxUsuel : null;
}
