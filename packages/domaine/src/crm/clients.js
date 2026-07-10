// =============================================================================
// CRM — Normalisation et dédoublonnage des clients
// Source : Réf. 2 (C-01 « le client n'existe pas » ; cascade S10-1
// « Client.Reconnu ou Client.Créé »).
// Logique PURE : la reconnaissance d'un client existant doit être déterministe,
// pas une devinette. Ces fonctions produisent les clés normalisées que la base
// indexe, et comparent une saisie entrante aux clients connus.
// =============================================================================

/**
 * Normalise un numéro de téléphone belge vers un format comparable (E.164
 * simplifié) : retire espaces, points, tirets, parenthèses ; convertit un 0
 * initial en +32. Ne valide pas le numéro — normalise pour comparer.
 * @param {string} tel
 * @returns {string} téléphone normalisé, ou "" si vide
 */
export function normaliserTel(tel) {
  if (!tel) return "";
  let t = String(tel).replace(/[\s.\-()/]/g, "");
  if (t.startsWith("00")) t = "+" + t.slice(2);
  else if (t.startsWith("0")) t = "+32" + t.slice(1);
  return t;
}

/**
 * Normalise un nom pour comparaison : minuscules, accents retirés, espaces
 * réduits. Sert de clé de rapprochement secondaire (le téléphone prime).
 * @param {string} nom
 * @returns {string}
 */
export function normaliserNom(nom) {
  if (!nom) return "";
  return String(nom)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // retire les accents
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cherche un client existant correspondant à une saisie entrante.
 * Priorité métier : un téléphone normalisé identique est une correspondance
 * forte ; à défaut, un nom normalisé identique est une correspondance faible.
 * @param {{nom?: string, tel?: string}} saisie
 * @param {{id: string, nom?: string, tel?: string}[]} clients existants (même tenant)
 * @returns {{client: Object, confiance: "forte"|"faible"}|null}
 */
export function trouverDoublon(saisie, clients) {
  const telS = normaliserTel(saisie && saisie.tel);
  const nomS = normaliserNom(saisie && saisie.nom);

  if (telS) {
    const parTel = (clients || []).find((c) => normaliserTel(c.tel) === telS);
    if (parTel) return { client: parTel, confiance: "forte" };
  }
  if (nomS) {
    const parNom = (clients || []).find((c) => normaliserNom(c.nom) === nomS);
    if (parNom) return { client: parNom, confiance: "faible" };
  }
  return null;
}
