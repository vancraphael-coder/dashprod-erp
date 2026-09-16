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
 * Chaque posture : les rôles qui l'incarnent, les offres où elle existe, et
 * son ANCRAGE — l'écran sur lequel on atterrit.
 *
 * POURQUOI L'ANCRAGE EST ICI. Il était codé en dur dans `main.jsx` : la route
 * initiale valait « liste », donc tout le monde atterrissait sur les dossiers
 * de déménagement — y compris un indépendant, qui n'en monte jamais. Le
 * correctif appliqué ensuite ne déplaçait la route qu'APRÈS la réponse du
 * serveur, ce qui laissait l'écran des dossiers s'afficher une fraction de
 * seconde, puis parfois rester.
 *
 * L'ancrage est une propriété du métier, pas une valeur par défaut de
 * l'application. Il se déclare donc avec la posture, et l'application ne
 * choisit RIEN avant de savoir à qui elle parle.
 */
export const POSTURES = Object.freeze([
  {
    cle: "direction",
    titre: "Direction",
    // Le patron n'atterrit plus sur un catalogue d'affaires : il atterrit sur
    // ce qu'il doit décider aujourd'hui. C'est le sens même du produit —
    // sortir un patron de l'opérationnel commence par ne pas l'y replonger
    // dès l'ouverture.
    ancrage: "rituel_direction",
    veut: "L'argent : ce qui rentre, ce qui sort, ce qui bloque.",
    roles: ["fondateur", "direction", "gerant"],
    offres: ["starter", "regular", "pro", "donneur_ordre", "garde_meubles",
             "groupe_liftier", "logistique_mobilier"],
  },
  {
    cle: "coordination",
    titre: "Coordination",
    // Le planning montre ce qui est prévu ; la coordination a besoin de ce qui
    // MANQUE. Un planning bien rempli cache ses trous.
    ancrage: "rituel_coordination",
    veut: "La semaine : ce qui n'est pas couvert, ce qui n'est pas facturé.",
    roles: ["coordination", "secretaire"],
    offres: ["starter", "regular", "pro", "donneur_ordre", "garde_meubles",
             "groupe_liftier", "logistique_mobilier"],
  },
  {
    cle: "commerce",
    titre: "Commerce",
    ancrage: "liste_affaires",
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
    ancrage: "liste_affaires",
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
    // Le terrain, pas le planning : le planning est l'écran de celui qui
    // RÉPARTIT. Un chef d'équipe exécute avec son équipe — il pointe, il
    // prouve, il clôture.
    ancrage: "terrain",
    veut: "Ma journée, mon équipe, mon pointage.",
    roles: ["chef_equipe"],
    offres: ["starter", "regular", "pro", "groupe_liftier",
             "logistique_mobilier"],
  },
  {
    cle: "execution",
    titre: "Exécution",
    // CE QUI NE MARCHAIT PAS. Un déménageur ouvrait l'app et atterrissait sur
    // la liste des dossiers — parce que l'ancrage venait de l'OFFRE et non de
    // la personne. À 6 h du matin, debout dans un camion, il faut son
    // chantier, pas un catalogue d'affaires.
    ancrage: "terrain",
    veut: "Où je vais, avec qui, à quelle heure.",
    roles: ["demenageur", "chauffeur", "livreur", "monteur", "liftier",
            "interimaire"],
    offres: ["starter", "regular", "pro", "groupe_liftier",
             "logistique_mobilier"],
  },
  {
    cle: "acces_ponctuel",
    titre: "Accès ponctuel",
    ancrage: "liste_affaires",
    veut: "Le seul relevé pour lequel on m'a ouvert la porte.",
    roles: ["visite_terrain"],
    offres: ["starter", "regular", "pro"],
  },
  {
    cle: "independant",
    titre: "Indépendant",
    ancrage: "rituel_independant",
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
    ancrage: "espace_client",
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

/**
 * L'écran d'ancrage d'une offre. C'est la posture qui décide, et la posture se
 * déduit de l'offre : dans une offre qui en porte plusieurs, on prend celle
 * dont l'ancrage est le plus spécifique — l'indépendant avant tout, puisqu'il
 * est seul dans son offre.
 */
export function ancrageDeLOffre(codeOffre) {
  const p = posturesDeLOffre(codeOffre);
  const indep = p.find((x) => x.cle === "independant");
  if (indep) return indep.ancrage;
  // Sinon l'entreprise : la direction et la coordination partagent le même
  // ancrage, et c'est celui qu'on sert par défaut au bureau.
  return p.find((x) => x.cle === "direction")?.ancrage || "liste_affaires";
}

/**
 * Les entrées de navigation d'une posture : son ancrage d'abord, puis ce dont
 * elle a besoin au quotidien, puis le compte.
 *
 * POURQUOI ICI ET PLUS DANS `main.jsx`. La barre était écrite en dur, posture
 * par posture : ajouter une posture demandait d'éditer du code, et à dix
 * secteurs les postures se multiplient (opérateur machine, cariste,
 * préparateur). Déclarée ici, elle suit la posture — et le registre reste la
 * seule source.
 *
 * Trois entrées maximum hors direction : au-delà, une barre de téléphone
 * devient un menu.
 */
export const NAVIGATION = Object.freeze({
  direction: ["rituel_direction", "liste", "planning", "equipe", "compte"],
  coordination: ["rituel_coordination", "liste", "planning", "compte"],
  commerce: ["liste", "planning", "compte"],
  depot: ["liste", "planning", "equipe", "compte"],
  // Un chef d'équipe a besoin du planning : il sait qui vient demain.
  chef_equipe: ["terrain", "planning", "compte"],
  // Un exécutant n'a rien à répartir. Son chantier, ses messages, son compte.
  execution: ["terrain", "conversations", "compte"],
  acces_ponctuel: ["liste", "compte"],
  independant: ["rituel_independant", "mes_missions", "compte"],
  client: [],
});

/** Les entrées de navigation d'une posture. Vide = navigation par défaut. */
export function navigationDeLaPosture(cle) {
  return NAVIGATION[cle] || [];
}

/** Vrai si la posture existe dans cette offre. */
export function postureDansOffre(clePosture, codeOffre) {
  return Boolean(posture(clePosture)?.offres.includes(codeOffre));
}
