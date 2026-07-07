// =============================================================================
// CRM — Clients & dédoublonnage
// Source : Réf. 2 (C-01 : client existe une seule fois) et Réf. 3 (T2).
// Reconnaissance du client existant au branchement Supabase (trouverDoublon,
// cascade S10-1) : correspondance forte (téléphone) ou faible (nom).
// =============================================================================

/**
 * Normalise un numéro de téléphone : garde les chiffres et +.
 * @param {string} tel numéro brut
 * @returns {string} normalisé (ex. "+32123456789")
 */
export function normaliserTel(tel) {
  if (!tel) return "";
  return tel.replace(/[^0-9+]/g, "");
}

/**
 * Normalise un nom : minuscules, sans accents ni espaces multiples.
 * @param {string} nom nom brut
 * @returns {string} normalisé (ex. "dupont")
 */
export function normaliserNom(nom) {
  if (!nom) return "";
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // ôter diacritiques
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cherche un doublon probable dans une liste de clients.
 * Correspondance forte : téléphone exact (normalisé).
 * Correspondance faible : nom (normalisé) proche.
 * @param {{nom?: string, tel?: string, email?: string}} entree données saisies
 * @param {Array} clients liste complète des clients
 * @returns {{client: object, type: "fort"|"faible"} | null}
 */
export function trouverDoublon(entree, clients = []) {
  if (!entree || (!entree.nom && !entree.tel)) return null;

  const telEntree = normaliserTel(entree.tel || "");
  const nomEntree = normaliserNom(entree.nom || "");

  // Correspondance forte : téléphone exact
  if (telEntree) {
    const fort = clients.find((c) => {
      const telClient = normaliserTel(c.tel || "");
      return telClient && telClient === telEntree;
    });
    if (fort) return { client: fort, type: "fort" };
  }

  // Correspondance faible : nom simplement présent
  if (nomEntree && nomEntree.length > 2) {
    const faible = clients.find((c) => {
      const nomClient = normaliserNom(c.nom || "");
      return nomClient && nomClient.includes(nomEntree);
    });
    if (faible) return { client: faible, type: "faible" };
  }

  return null;
}

/**
 * Valide les données d'un client avant insertion.
 * @param {{nom: string, tel?: string, email?: string, societe?: string}} client
 * @returns {{valide: boolean, erreurs: string[]}}
 */
export function validerClient(client) {
  const erreurs = [];
  if (!client.nom || client.nom.trim().length < 2) {
    erreurs.push("Le nom est requis (min. 2 caractères)");
  }
  if (client.email && !client.email.includes("@")) {
    erreurs.push("L'email doit être valide");
  }
  return { valide: erreurs.length === 0, erreurs };
}
