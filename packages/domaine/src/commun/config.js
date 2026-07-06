// =============================================================================
// Commun — Garde de configuration d'environnement
// Source : leçon des prototypes (bug d'écran blanc quand createClient est
// appelé avec des variables absentes). Cette logique est extraite ici, PURE et
// testable, puis consommée par apps/web/src/lib/supabase.js.
// Principe : sans configuration, l'application affiche un état clair — elle ne
// plante jamais.
// =============================================================================

/**
 * Détermine si la configuration Supabase est présente et exploitable.
 * @param {string|undefined} url
 * @param {string|undefined} anon
 * @returns {boolean}
 */
export function configPresente(url, anon) {
  return Boolean(url && anon && typeof url === "string" && typeof anon === "string");
}

/**
 * Interprète le résultat d'un test de vie de la base en message d'état clair.
 * Logique pure séparée de l'appel réseau, pour être testable.
 * @param {{configuree: boolean, erreur?: string, lignes?: number}} etat
 * @returns {{ok: boolean, message: string}}
 */
export function interpreterEtatConnexion(etat) {
  if (!etat.configuree) {
    return { ok: false, message: "Supabase non configuré (variables d'environnement absentes)." };
  }
  if (etat.erreur) {
    return { ok: false, message: `Base joignable mais requête refusée : ${etat.erreur}` };
  }
  if (!etat.lignes || etat.lignes === 0) {
    return { ok: true, message: "Base joignable. Aucune organisation visible (connexion requise)." };
  }
  return { ok: true, message: "Base joignable." };
}
