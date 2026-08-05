// =============================================================================
// Civilité du client — et les formules qui en découlent.
//
// Un déménagement se traite le plus souvent avec un COUPLE. Écrire
// « Monsieur » sur une offre que madame va lire, et souvent signer, est une
// maladresse commerciale gratuite. « Les deux » n'est donc pas une case de
// complaisance : c'est le cas le plus fréquent du métier.
//
// L'ABSENCE est un état légitime. Au premier appel on ne sait pas toujours, et
// on ne DEVINE pas : déduire le genre d'un client de son prénom est à la fois
// techniquement fragile (« Camille », « Dominique », tous les prénoms non
// francophones) et déplacé. Sans civilité connue, les documents emploient une
// formule neutre.
// =============================================================================

export const CIVILITES = Object.freeze([
  { cle: "monsieur", court: "M.",       libelle: "Monsieur" },
  { cle: "madame",   court: "Mme",      libelle: "Madame" },
  { cle: "les_deux", court: "M. et Mme", libelle: "Monsieur et Madame" },
]);

const trouve = (cle) => CIVILITES.find((c) => c.cle === cle) || null;

/** La civilité est-elle une valeur connue ? */
export function civiliteValide(cle) {
  return cle === null || cle === undefined || cle === "" || !!trouve(cle);
}

/** Forme courte : « M. », « Mme », « M. et Mme ». Vide si inconnue. */
export function civiliteCourte(cle) {
  return trouve(cle)?.court ?? "";
}

/** Forme longue : « Monsieur », « Madame », « Monsieur et Madame ». */
export function civiliteLongue(cle) {
  return trouve(cle)?.libelle ?? "";
}

/**
 * Le nom précédé de sa civilité, pour une adresse ou un en-tête de document.
 * Sans civilité : le nom seul — jamais une supposition.
 */
export function nomAvecCivilite(civilite, nom) {
  const n = String(nom ?? "").trim();
  const c = civiliteCourte(civilite);
  return c && n ? `${c} ${n}` : n;
}

/**
 * Formule d'appel d'un courrier ou d'un e-mail.
 * Neutre et correcte quand la civilité est inconnue : « Bonjour, » passe
 * partout, là où « Cher client » sonne comme un publipostage.
 */
export function formuleAppel(civilite, { avecNom, nom } = {}) {
  const longue = civiliteLongue(civilite);
  if (!longue) return "Bonjour,";
  if (avecNom && String(nom ?? "").trim()) {
    return `${longue} ${String(nom).trim()},`;
  }
  return `${longue},`;
}

/**
 * Accord des participes dans une phrase adressée au client.
 * « Vous avez été informé / informée / informés ». Un détail, mais c'est
 * exactement ce qui distingue un document soigné d'un publipostage.
 */
export function accord(civilite, masculin, feminin, pluriel) {
  if (civilite === "madame") return feminin;
  if (civilite === "les_deux") return pluriel;
  return masculin;   // monsieur, ou inconnu : le masculin reste la forme neutre
}

/** Le vouvoiement collectif : « vous » singulier ou pluriel selon le cas. */
export function pluralise(civilite) {
  return civilite === "les_deux";
}
