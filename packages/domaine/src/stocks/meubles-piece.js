// =============================================================================
// Meubles pré-remplis par pièce.
//
// Pendant une visite chez le client, le métreur ne doit pas taper « canapé »,
// « table basse », « télévision » à chaque dossier. Chaque pièce propose donc
// ses meubles habituels, en un geste.
//
// Deux niveaux, et c'est important :
//   - un socle par défaut, livré avec le produit (une entreprise neuve est
//     immédiatement utilisable) ;
//   - la liste de l'entreprise, réglée dans Paramètres → Pièces du relevé,
//     qui REMPLACE le socle pour la pièce concernée dès qu'elle existe.
//
// Remplacer, pas fusionner : si un déménageur retire « piano » de son salon,
// il ne doit pas le voir revenir par la porte du défaut. Une liste vide de
// façon explicite est un choix, pas une absence.
//
// Stockage : organisations.parametres_catalogues.meubles_par_piece
//   { "Salon": ["Canapé 3 places", "Table basse"], "Cuisine": [...] }
// =============================================================================

/**
 * Socle par défaut. Volontairement court : ce sont les meubles qu'on retrouve
 * partout, pas un inventaire exhaustif. Le reste s'ajoute à la main et devient
 * la liste de l'entreprise.
 */
export const MEUBLES_DEFAUT = Object.freeze({
  "Salon": ["Canapé 2 places", "Canapé 3 places", "Fauteuil", "Table basse",
            "Meuble TV", "Télévision", "Bibliothèque", "Buffet", "Tapis"],
  "Salle à manger": ["Table à manger", "Chaise", "Buffet", "Vaisselier",
                     "Desserte"],
  "Cuisine": ["Frigo", "Congélateur", "Lave-vaisselle", "Cuisinière",
              "Four micro-ondes", "Table de cuisine", "Chaise de cuisine",
              "Carton vaisselle"],
  "Chambre": ["Lit 1 personne", "Lit 2 personnes", "Sommier", "Matelas",
              "Armoire 2 portes", "Armoire 3 portes", "Commode",
              "Table de nuit", "Coiffeuse"],
  "Bureau": ["Bureau", "Chaise de bureau", "Caisson", "Bibliothèque",
             "Ordinateur", "Imprimante"],
  "Salle de bain": ["Meuble lavabo", "Colonne de rangement", "Machine à laver",
                    "Sèche-linge"],
  "Cave": ["Établi", "Étagère", "Outillage", "Vélo", "Carton livres"],
  "Grenier": ["Carton", "Malle", "Valise", "Décoration de Noël"],
  "Garage": ["Établi", "Étagère", "Tondeuse", "Vélo", "Pneus"],
  "Extérieur": ["Table de jardin", "Chaise de jardin", "Parasol", "Barbecue",
                "Salon de jardin", "Bac à fleurs"],
});

const propre = (v) => String(v ?? "").trim();

/**
 * Meubles proposés pour une pièce. La liste de l'entreprise l'emporte ;
 * à défaut, le socle. Aucune fusion (voir l'en-tête).
 */
export function meublesDePiece(catalogues, piece) {
  const nom = propre(piece);
  if (!nom) return [];
  const perso = catalogues?.meubles_par_piece?.[nom];
  if (Array.isArray(perso)) return perso.map(propre).filter(Boolean);
  return [...(MEUBLES_DEFAUT[nom] || [])];
}

/** Cette pièce a-t-elle une liste propre à l'entreprise ? */
export function listePersonnalisee(catalogues, piece) {
  return Array.isArray(catalogues?.meubles_par_piece?.[propre(piece)]);
}

/**
 * Écrit la liste d'une pièce. Doublons retirés (comparaison insensible à la
 * casse) et ordre de saisie conservé : le métreur retrouve ses habitudes.
 */
export function definirMeubles(catalogues, piece, meubles) {
  const nom = propre(piece);
  if (!nom) return catalogues || {};
  const vus = new Set();
  const liste = (Array.isArray(meubles) ? meubles : [])
    .map(propre).filter(Boolean)
    .filter((m) => {
      const cle = m.toLowerCase();
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    });
  return {
    ...(catalogues || {}),
    meubles_par_piece: { ...(catalogues?.meubles_par_piece || {}), [nom]: liste },
  };
}

/** Ajoute un meuble à une pièce (sans doublon). */
export function ajouterMeuble(catalogues, piece, meuble) {
  const nom = propre(meuble);
  if (!nom) return catalogues || {};
  return definirMeubles(catalogues, piece,
    [...meublesDePiece(catalogues, piece), nom]);
}

/** Retire un meuble d'une pièce. */
export function retirerMeuble(catalogues, piece, meuble) {
  const cible = propre(meuble).toLowerCase();
  return definirMeubles(catalogues, piece,
    meublesDePiece(catalogues, piece).filter((m) => m.toLowerCase() !== cible));
}

/**
 * Rend à une pièce le socle par défaut : on efface la liste personnalisée.
 * Utile quand un réglage a mal tourné.
 */
export function reinitialiserMeubles(catalogues, piece) {
  const suite = { ...(catalogues?.meubles_par_piece || {}) };
  delete suite[propre(piece)];
  return { ...(catalogues || {}), meubles_par_piece: suite };
}
