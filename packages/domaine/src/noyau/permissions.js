// =============================================================================
// Noyau — Capacités et rôles (permissions)
// Source : Référence 2 (S3) et Référence 3 (T3).
// Logique PURE : aucune dépendance base ni réseau. Consommée par le front
// (projeter les écrans) et le serveur (vérifier les droits) — implémentation
// unique (T1). Une permission est une donnée, jamais un "if" (I-7).
// =============================================================================

/**
 * Catalogue des capacités atomiques du vertical (S3).
 * Ces clés sont la référence : la table `capacites` (migration 0001) en est
 * le miroir persistant, et la matrice S3 les combine en rôles.
 */
export const CAPACITES = Object.freeze({
  VOIR_PRIX: "voir_prix",
  CREER_AFFAIRE: "creer_affaire",
  VALIDER_INTAKE: "valider_intake",
  FAIRE_SIGNER: "faire_signer",
  GERER_PLANNING: "gerer_planning",
  VOIR_PAIE: "voir_paie",
  GERER_REFERENTIELS: "gerer_referentiels",
  EMETTRE_FACTURE: "emettre_facture",
  SIGNALER_MATERIEL: "signaler_materiel",
  DEMANDER_CONGE: "demander_conge",
  APPROUVER_CONGE: "approuver_conge",
});

/**
 * Composition des rôles en capacités — la matrice S3 (extrait normatif).
 * "direction" reçoit tout ; les autres reçoivent un sous-ensemble explicite.
 * Le seed SQL (supabase/seed) matérialisera exactement cette table.
 */
const TOUTES = Object.values(CAPACITES);

export const ROLES = Object.freeze({
  direction: TOUTES,
  coordination: [
    CAPACITES.VOIR_PRIX, CAPACITES.CREER_AFFAIRE, CAPACITES.VALIDER_INTAKE,
    CAPACITES.FAIRE_SIGNER, CAPACITES.GERER_PLANNING, CAPACITES.EMETTRE_FACTURE,
    CAPACITES.SIGNALER_MATERIEL, CAPACITES.DEMANDER_CONGE, CAPACITES.APPROUVER_CONGE,
  ],
  commercial: [
    CAPACITES.VOIR_PRIX, CAPACITES.CREER_AFFAIRE, CAPACITES.FAIRE_SIGNER,
    CAPACITES.SIGNALER_MATERIEL, CAPACITES.DEMANDER_CONGE,
  ],
  chef_equipe: [
    CAPACITES.SIGNALER_MATERIEL, CAPACITES.DEMANDER_CONGE,
  ],
  demenageur: [
    CAPACITES.SIGNALER_MATERIEL, CAPACITES.DEMANDER_CONGE,
  ],
});

/**
 * Résout l'ensemble des capacités d'un utilisateur à partir de ses rôles.
 * Le cumul est une union (S3 : un utilisateur peut porter plusieurs rôles).
 * @param {string[]} rolesUtilisateur clés de rôles portées par l'utilisateur
 * @returns {Set<string>} capacités effectives
 */
export function resoudreCapacites(rolesUtilisateur) {
  const set = new Set();
  for (const role of rolesUtilisateur || []) {
    const caps = ROLES[role];
    if (caps) for (const c of caps) set.add(c);
  }
  return set;
}

/**
 * Vérifie qu'un utilisateur détient une capacité donnée.
 * C'est la fonction que le serveur applique (RLS/SECURITY DEFINER) et que le
 * front reflète (projection des écrans, S9). Même logique des deux côtés.
 * @param {string[]} rolesUtilisateur
 * @param {string} capacite
 * @returns {boolean}
 */
export function aCapacite(rolesUtilisateur, capacite) {
  return resoudreCapacites(rolesUtilisateur).has(capacite);
}
