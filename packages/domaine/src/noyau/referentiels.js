// =============================================================================
// Noyau — Référentiels versionnés
// Source : Référence 3 (T2 · referentiels) et Réf. 2 (C-07, I-4).
// Règle fondamentale : on ne modifie jamais une version, on en publie une
// nouvelle ; toute offre mémorise la version qui l'a produite. Ce module gère
// la SÉLECTION de la bonne version — la persistance est en SQL.
// =============================================================================

/**
 * @typedef {Object} Referentiel
 * @property {string} id
 * @property {string} type      famille (ex. "bareme_horaire")
 * @property {string} cle
 * @property {*}      valeur     contenu de la version
 * @property {number} version
 * @property {boolean} actif
 * @property {string} juridiction  code pays (I-4)
 * @property {string} publie_le    ISO 8601
 */

/**
 * Sélectionne la version active d'un référentiel pour un type/clé/juridiction.
 * "Active" = actif===true, version la plus haute. Résout C-07 : le calcul
 * d'une offre s'appuie sur une version déterministe, jamais sur "la dernière
 * valeur en date" ambiguë.
 * @param {Referentiel[]} referentiels
 * @param {string} type
 * @param {string} cle
 * @param {string} [juridiction="BE"]
 * @returns {Referentiel|null}
 */
export function versionActive(referentiels, type, cle, juridiction = "BE") {
  const candidats = (referentiels || []).filter(
    (r) => r.type === type && r.cle === cle && r.actif && r.juridiction === juridiction
  );
  if (candidats.length === 0) return null;
  return candidats.reduce((meilleur, r) =>
    r.version > meilleur.version ? r : meilleur
  );
}

/**
 * Récupère une version PRÉCISE par son identifiant — usage : reconstituer le
 * calcul exact d'une offre déjà émise à partir du bareme_ref qu'elle a mémorisé.
 * @param {Referentiel[]} referentiels
 * @param {string} id
 * @returns {Referentiel|null}
 */
export function versionParId(referentiels, id) {
  return (referentiels || []).find((r) => r.id === id) || null;
}

/**
 * Indique si une offre en préparation s'appuie sur une version périmée
 * (une version plus récente a été publiée depuis). Alimente l'alerte
 * "Barème.Publié → les offres ouvertes signalent l'écart de version" (S10).
 * @param {Referentiel[]} referentiels
 * @param {string} refUtiliseeId  version référencée par le scénario
 * @returns {boolean}
 */
export function versionPerimee(referentiels, refUtiliseeId) {
  const utilisee = versionParId(referentiels, refUtiliseeId);
  if (!utilisee) return false;
  const active = versionActive(
    referentiels, utilisee.type, utilisee.cle, utilisee.juridiction
  );
  return active != null && active.version > utilisee.version;
}
