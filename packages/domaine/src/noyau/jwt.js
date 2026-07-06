// =============================================================================
// Identité & permissions — Revendications du jeton (JWT claims)
// Source : Référence 3 (T3, parcours de connexion étape 2).
// À l'émission du jeton, un hook serveur résout organisation + rôles et les
// inscrit dans les revendications SIGNÉES. Le client ne peut pas les fabriquer.
// Ce module construit et valide la forme de ces revendications — logique pure,
// partagée entre le hook serveur et les tests.
// =============================================================================

/**
 * Construit les revendications personnalisées à injecter dans le JWT.
 * @param {{org_id: string, roles: string[]}} contexte résolu depuis la base
 * @returns {{org_id: string, roles: string[]}}
 */
export function construireClaims(contexte) {
  if (!contexte || !contexte.org_id) {
    throw new Error("construireClaims : org_id obligatoire (I-1)");
  }
  return {
    org_id: contexte.org_id,
    roles: Array.isArray(contexte.roles) ? contexte.roles : [],
  };
}

/**
 * Valide la forme des revendications reçues avant de s'y fier.
 * Défense en profondeur : même si la RLS est la vraie barrière (T3), le code
 * qui lit les claims doit refuser une forme invalide plutôt que de supposer.
 * @param {*} claims
 * @returns {boolean}
 */
export function claimsValides(claims) {
  return (
    claims != null &&
    typeof claims.org_id === "string" &&
    claims.org_id.length > 0 &&
    Array.isArray(claims.roles) &&
    claims.roles.every((r) => typeof r === "string")
  );
}

/**
 * Filtre les rôles connus : un rôle inscrit dans le jeton mais inconnu du
 * catalogue est ignoré (ceinture et bretelles avec la RLS).
 * @param {string[]} roles
 * @param {Object} catalogueRoles ex. import { ROLES } — clés = rôles connus
 * @returns {string[]}
 */
export function rolesConnus(roles, catalogueRoles) {
  return (roles || []).filter((r) => Object.prototype.hasOwnProperty.call(catalogueRoles, r));
}
