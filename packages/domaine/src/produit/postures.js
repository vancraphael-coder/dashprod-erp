// =============================================================================
// LES POSTURES — le niveau qui décide de ce qu'on voit.
//
// POURQUOI PAS LES RÔLES. La base porte 15 rôles (`chauffeur`, `monteur`,
// `liftier`, `secretaire`…). Un rôle dit ce qu'on fait ; il ne dit pas ce
// qu'on a besoin de VOIR en ouvrant l'application. Un chauffeur, un monteur et
// un intérimaire ouvrent l'app pour la même raison : savoir où ils vont
// aujourd'hui. Trois rôles, un écran. Inversement un gérant et un
// déménageur partagent parfois un rôle en base et n'ont rien à voir en
// commun.
//
// La posture est donc l'unité de conception : un écran s'adresse à des
// postures, jamais à des rôles.
//
// CE QUE LA POSTURE RÈGLE AUSSI — et c'est l'essentiel. Chaque offre n'a pas
// les mêmes postures. Un indépendant est SEUL : il cumule tout, mais il n'est
// ni « direction » ni « exécution » — il est sa propre posture. Un déménageur
// en offre Basique n'a pas de responsable de dépôt, parce qu'il n'a pas de
// dépôt. Un groupe liftier a des opérateurs sur machine, pas des déménageurs.
//
// Conséquence : **un réglage ou un écran qui existe chez l'un ne doit pas
// forcément apparaître chez l'autre.** Ce n'est pas le module qui tranche —
// c'est la posture. Le module dit « la capacité est achetée » ; la posture dit
// « cette personne-là en a l'usage ». Les deux conditions sont nécessaires, et
// c'est la posture qui fait le tri entre les métiers.
// =============================================================================

/**
 * Chaque posture : les rôles de base qui l'incarnent, et les offres où elle
 * existe. `roles: []` = posture sans rôle en base (l'indépendant est seul, le
 * client est extérieur à l'organisation).
 */
export const POSTURES = Object.freeze([
  {
    cle: "direction",
    titre: "Direction",
    veut: "L'argent : ce qui rentre, ce qui sort, ce qui bloque.",
    roles: ["fondateur", "direction", "gerant"],
    offres: ["starter", "regular", "pro", "donneur_ordre", "garde_meubles",
             "groupe_liftier", "logistique_mobilier"],
  },
  {
    cle: "coordination",
    titre: "Coordination",
    veut: "La semaine : ce qui n'est pas couvert, ce qui n'est pas facturé.",
    roles: ["coordination", "secretaire"],
    offres: ["starter", "regular", "pro", "donneur_ordre", "garde_meubles",
             "groupe_liftier", "logistique_mobilier"],
  },
  {
    cle: "commerce",
    titre: "Commerce",
    veut: "Mes affaires en attente de réponse.",
    roles: ["commercial"],
    // Vendre un déménagement suppose un relevé et un devis de volume : c'est
    // le métier des trois paliers, pas celui d'un garde-meubles ni d'un
    // liftier, qui vendent au contrat ou à l'intervention.
    offres: ["starter", "regular", "pro"],
  },
  {
    cle: "depot",
    titre: "Responsable de dépôt",
    veut: "Mon centre aujourd'hui : équipes, camions, ce qui sort et rentre.",
    roles: ["responsable_depot"],
    // Pas de dépôt en Basique ni en Regular : `centres_limite` y vaut 0. La
    // posture n'existe donc pas — ce n'est pas un écran caché, c'est une
    // fonction qui n'existe pas dans ces entreprises.
    offres: ["pro", "garde_meubles", "logistique_mobilier"],
  },
  {
    cle: "chef_equipe",
    titre: "Chef d'équipe",
    veut: "Ma journée, mon équipe, mon pointage.",
    roles: ["chef_equipe"],
    offres: ["starter", "regular", "pro", "groupe_liftier",
             "logistique_mobilier"],
  },
  {
    cle: "execution",
    titre: "Exécution",
    veut: "Où je vais, avec qui, à quelle heure.",
    roles: ["demenageur", "chauffeur", "livreur", "monteur", "liftier",
            "interimaire"],
    offres: ["starter", "regular", "pro", "groupe_liftier",
             "logistique_mobilier"],
  },
  {
    cle: "acces_ponctuel",
    titre: "Accès ponctuel",
    veut: "Le seul relevé pour lequel on m'a ouvert la porte.",
    roles: ["visite_terrain"],
    offres: ["starter", "regular", "pro"],
  },
  {
    cle: "independant",
    titre: "Indépendant",
    veut: "Suis-je booké, ai-je pointé, ai-je été payé.",
    // Aucun rôle en base : l'offre n'admet qu'un seul accès
    // (`membres_limite: 1`). Il n'y a personne à qui déléguer, donc rien à
    // répartir entre rôles.
    roles: [],
    offres: ["independant_manutention"],
  },
  {
    cle: "client",
    titre: "Client",
    veut: "C'est confirmé pour quand, que dois-je faire, combien je paie.",
    // Extérieur à l'organisation : il entre par un code, pas par un rôle.
    roles: [],
    offres: ["starter", "regular", "pro", "independant_manutention",
             "donneur_ordre", "garde_meubles", "groupe_liftier",
             "logistique_mobilier"],
  },
]);

/** Une posture par sa clé. `null` plutôt qu'un défaut inventé. */
export function posture(cle) {
  return POSTURES.find((p) => p.cle === cle) || null;
}

/** La posture d'un rôle de base. `null` si le rôle n'est rattaché à aucune. */
export function postureDuRole(role) {
  return POSTURES.find((p) => p.roles.includes(role)) || null;
}

/** Les postures qui existent dans une offre. */
export function posturesDeLOffre(code) {
  return POSTURES.filter((p) => p.offres.includes(code));
}

/** Vrai si la posture existe dans cette offre. */
export function postureDansOffre(clePosture, codeOffre) {
  return Boolean(posture(clePosture)?.offres.includes(codeOffre));
}
