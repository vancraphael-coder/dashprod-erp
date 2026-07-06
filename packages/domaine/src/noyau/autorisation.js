// =============================================================================
// Identité & permissions — Règles d'autorisation des commandes
// Source : Référence 3 (T3, famille 2 « capacités ») et Réf. 2 (S3).
// Logique PURE et testable : pour chaque commande d'écriture du noyau, quelle
// capacité elle exige. Les fonctions SQL SECURITY DEFINER (migration 0004)
// appliquent ces mêmes règles ; le front les reflète pour projeter les écrans.
// Principe : aucune commande sans conséquence, aucune écriture sans droit vérifié.
// =============================================================================

import { CAPACITES, aCapacite } from "./permissions.js";

/**
 * Table des commandes du noyau et de la capacité qu'elles exigent.
 * Une commande absente d'ici est refusée par défaut (liste blanche stricte).
 */
export const COMMANDES = Object.freeze({
  INVITER_UTILISATEUR:  CAPACITES.GERER_REFERENTIELS, // gestion d'organisation
  AFFECTER_ROLE:        CAPACITES.GERER_REFERENTIELS,
  RETIRER_ROLE:         CAPACITES.GERER_REFERENTIELS,
  DESACTIVER_UTILISATEUR: CAPACITES.GERER_REFERENTIELS,
  PUBLIER_REFERENTIEL:  CAPACITES.GERER_REFERENTIELS,
});

/**
 * Détermine si un acteur (par ses rôles) peut exécuter une commande.
 * @param {string[]} rolesActeur rôles de l'utilisateur qui tente la commande
 * @param {string} commande clé de COMMANDES
 * @returns {boolean}
 */
export function peutExecuter(rolesActeur, commande) {
  const capaciteRequise = COMMANDES[commande];
  if (!capaciteRequise) return false; // commande inconnue : refus par défaut
  return aCapacite(rolesActeur, capaciteRequise);
}

/**
 * Garde d'exécution : renvoie un résultat typé plutôt qu'un booléen nu, pour
 * que l'appelant (fonction SQL ou service) sache POURQUOI c'est refusé — utile
 * au journal d'audit et aux messages côté interface.
 * @param {string[]} rolesActeur
 * @param {string} commande
 * @returns {{autorise: boolean, capaciteRequise: string|null, raison: string|null}}
 */
export function verifierCommande(rolesActeur, commande) {
  const capaciteRequise = COMMANDES[commande] || null;
  if (!capaciteRequise) {
    return { autorise: false, capaciteRequise: null, raison: "commande_inconnue" };
  }
  if (!aCapacite(rolesActeur, capaciteRequise)) {
    return { autorise: false, capaciteRequise, raison: "capacite_manquante" };
  }
  return { autorise: true, capaciteRequise, raison: null };
}
