// =============================================================================
// LA TABLE DE RÉUTILISATION — quel secteur ouvrir ensuite, et pourquoi.
//
// À QUOI ELLE SERT. Dashprod porte huit offres ; trois sont construites, cinq
// attendent. La question « laquelle ouvrir maintenant » se répondait à
// l'intuition. Elle est arithmétique : une offre dont tous les modules
// existent déjà coûte un parcours à construire ; une offre qui demande trois
// modules neufs coûte trois chantiers plus le parcours.
//
// CE QU'ELLE MESURE, et c'est le mot que Raphaël a employé : l'ÉPANOUISSEMENT.
// Pas la rentabilité — je n'ai pas les chiffres de marché et je n'en invente
// pas. Ce que je peux mesurer, c'est la part d'une offre qui existe déjà :
//
//   · le TAUX DE RÉUTILISATION — quelle fraction des modules dont elle a
//     besoin est déjà livrée ;
//   · le RESTE À CONSTRUIRE — les modules manquants, nommés ;
//   · la PARENTÉ — avec quelle offre déjà construite elle partage le plus.
//
// LES BESOINS SONT DÉCLARÉS, PAS DEVINÉS. Chaque offre non construite déclare
// les modules que son parcours exige (voir `parcours-offres.js`, qui décrit
// déjà le trajet). Deviner ferait dire à la table ce qu'on veut entendre.
//
// DEUX AXES À NE PAS CONFONDRE, et c'est la distinction qui rend la table
// utile :
//   · ENTRE CORPS D'UN MÊME SECTEUR — un déménageur, un liftier et un
//     manutentionnaire travaillent sur le même chantier. Ils partagent le
//     terrain, la preuve, la facturation. Ouvrir l'un sert les autres tout de
//     suite.
//   · ENTRE SECTEURS — un garde-meubles et un logisticien de mobilier ne se
//     croisent jamais sur un chantier, mais ils ont le même besoin :
//     attribuer un espace et facturer une période. La réutilisation est
//     technique, pas commerciale.
// La première crée un réseau ; la seconde économise du code. Elles ne se
// décident pas pour les mêmes raisons.
// =============================================================================

import { REFERENTIEL_OFFRES, offreReferentiel } from "./referentiel-offres.js";
import { MODULES, module as moduleParCle } from "./plans.js";

/**
 * Les modules dont chaque offre non construite a BESOIN pour que son parcours
 * tourne de bout en bout. Déclaré offre par offre, en partant du trajet décrit
 * dans `parcours-offres.js`.
 *
 * `neufs` : ce qui n'existe dans aucun module livré aujourd'hui — donc à
 * construire, pas seulement à ouvrir.
 */
export const BESOINS_OFFRES = Object.freeze({
  independant_manutention: {
    secteur: "chantier",
    requis: ["crm", "planning", "terrain", "facturation", "signature_client",
             "rapport_chantier"],
    neufs: [],
  },
  donneur_ordre: {
    secteur: "chantier",
    // Il confie et il suit. Il ne monte pas de dossier de déménagement, il ne
    // facture pas de client final : il reçoit des factures.
    requis: ["crm", "planning", "rapport_chantier"],
    // Recevoir et rapprocher une facture entrante n'existe pas : `comptabilite`
    // sait sortir des pièces, pas accueillir celles d'un prestataire.
    neufs: ["facture_entrante"],
  },
  garde_meubles: {
    secteur: "entreposage",
    requis: ["crm", "facturation", "stockage_3d", "comptabilite"],
    // Une échéance qui tombe toute seule chaque mois, avec prorata d'entrée et
    // de sortie. `generer_echeances_contrat` existe en base (0169) mais aucun
    // module ne le porte côté produit.
    neufs: ["facturation_recurrente"],
  },
  groupe_liftier: {
    secteur: "chantier",
    requis: ["crm", "planning", "terrain", "flotte", "facturation",
             "rapport_chantier"],
    // Affecter une machine avec sa couronne kilométrique, sans double
    // réservation. Le planning sait affecter des gens, pas des machines à
    // portée limitée.
    neufs: ["planning_machines"],
  },
  logistique_mobilier: {
    secteur: "entreposage",
    requis: ["crm", "planning", "facturation", "multi_depots", "stockage_3d",
             "comptabilite"],
    // Un créneau de quai n'est pas un rendez-vous : c'est une ressource
    // partagée à capacité, réservée par tranche.
    neufs: ["creneaux_quai", "arrivages"],
  },
});

/** Les modules livrés aujourd'hui. */
function modulesLivres() {
  return new Set(MODULES.filter((m) => m.livre).map((m) => m.cle));
}

/**
 * Le bilan d'une offre : ce qui existe, ce qui manque, et à quel point elle
 * est déjà faite.
 *
 * `taux` compte les modules REQUIS déjà livrés sur le total requis, plus les
 * modules neufs au dénominateur — sinon une offre qui réclame deux mécanismes
 * inédits paraîtrait prête à 100 %.
 */
export function bilanOffre(code) {
  const b = BESOINS_OFFRES[code];
  if (!b) return null;
  const livres = modulesLivres();
  const deja = b.requis.filter((m) => livres.has(m));
  const aOuvrir = b.requis.filter((m) => !livres.has(m));
  const denominateur = b.requis.length + b.neufs.length;
  return {
    code,
    secteur: b.secteur,
    requis: b.requis,
    deja,
    a_ouvrir: aOuvrir,          // le module existe, l'offre ne le porte pas
    a_construire: [...b.neufs], // le mécanisme n'existe nulle part
    taux: denominateur === 0 ? 1
      : Math.round((deja.length / denominateur) * 100) / 100,
    porte_deja: (offreReferentiel(code)?.modules || []).length > 0,
  };
}

/**
 * Ce que deux offres partagent. Sert à répondre : « si je construis celle-ci,
 * qu'est-ce que ça donne à celle-là ? »
 */
export function parente(codeA, codeB) {
  const a = BESOINS_OFFRES[codeA]?.requis
         || offreReferentiel(codeA)?.modules || [];
  const b = BESOINS_OFFRES[codeB]?.requis
         || offreReferentiel(codeB)?.modules || [];
  const communs = a.filter((m) => b.includes(m));
  const union = new Set([...a, ...b]);
  return {
    communs,
    // Jaccard : la part de l'union qui est commune. Robuste quand les deux
    // offres n'ont pas la même taille.
    proximite: union.size === 0 ? 0
      : Math.round((communs.length / union.size) * 100) / 100,
  };
}

/**
 * Le classement : quelle offre ouvrir ensuite.
 *
 * Ordre : d'abord celles qui ne demandent AUCUN mécanisme inédit (le coût est
 * un parcours, pas un chantier), puis par taux de réutilisation décroissant.
 *
 * La table ne décide pas — elle chiffre. Un arbitrage commercial peut
 * parfaitement primer : une offre plus coûteuse qui a un client qui attend vaut
 * mieux qu'une offre gratuite que personne ne demande.
 */
export function classementOuverture() {
  return Object.keys(BESOINS_OFFRES)
    .map(bilanOffre)
    .sort((x, y) => (x.a_construire.length - y.a_construire.length)
                 || (y.taux - x.taux));
}

/**
 * Les mécanismes inédits, avec le nombre d'offres qui les attendent.
 *
 * C'est la lecture la plus utile de toute la table : un mécanisme réclamé par
 * deux offres se construit une fois et en débloque deux. Il passe donc devant
 * un mécanisme réclamé par une seule, même si cette offre-là est plus avancée.
 */
export function mecanismesPartages() {
  const compte = new Map();
  for (const [code, b] of Object.entries(BESOINS_OFFRES)) {
    for (const n of b.neufs) {
      if (!compte.has(n)) compte.set(n, []);
      compte.get(n).push(code);
    }
  }
  return [...compte.entries()]
    .map(([mecanisme, offres]) => ({ mecanisme, offres, nb: offres.length }))
    .sort((a, b) => b.nb - a.nb || a.mecanisme.localeCompare(b.mecanisme));
}

/**
 * Les offres d'un même secteur. Deux corps d'un même secteur se croisent sur
 * un chantier : ouvrir l'un crée de la demande pour l'autre. Deux secteurs
 * différents ne partagent que du code.
 */
export function offresDuSecteur(secteur) {
  return Object.entries(BESOINS_OFFRES)
    .filter(([, b]) => b.secteur === secteur)
    .map(([code]) => code);
}

/** Un module cité par les besoins doit exister au catalogue, ou être déclaré neuf. */
export function incoherences() {
  const connus = new Set(MODULES.map((m) => m.cle));
  const out = [];
  for (const [code, b] of Object.entries(BESOINS_OFFRES)) {
    for (const m of b.requis) {
      if (!connus.has(m)) out.push(`${code} requiert « ${m} », inconnu au catalogue`);
      else if (!moduleParCle(m)?.livre) {
        out.push(`${code} requiert « ${m} », connu mais non livré`);
      }
    }
    for (const n of b.neufs) {
      if (connus.has(n)) out.push(`${code} déclare « ${n} » comme neuf alors qu'il existe`);
    }
  }
  return out;
}
