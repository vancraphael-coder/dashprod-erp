// =============================================================================
// Documents — Modèles versionnés et C.B.D.
// Source : Réf. 2 (S6 « le modèle est versionné » ; « la C.B.D. est un objet
// stocké, jamais un texte édité »). Le document CBD est NON NÉGOCIABLE : stocké,
// versionné à l'identique, associé et envoyé automatiquement avec chaque offre.
// Logique PURE : sélection de la version de modèle et de la version C.B.D. en
// vigueur ; la règle d'attachement obligatoire pour les offres.
// =============================================================================

/**
 * @typedef {Object} VersionModele
 * @property {string} id
 * @property {string} type         ex. "offre_tarifaire", "facture", "cbd"
 * @property {number} version
 * @property {boolean} actif
 * @property {string} langue       code langue (I-6)
 * @property {string} juridiction  code pays (I-6)
 * @property {string} publie_le    ISO 8601
 */

/**
 * Sélectionne la version active d'un type de modèle pour une langue/juridiction.
 * Déterministe : actif===true, version la plus haute (I-6).
 * @param {VersionModele[]} versions
 * @param {string} type
 * @param {string} [langue="fr"]
 * @param {string} [juridiction="BE"]
 * @returns {VersionModele|null}
 */
export function versionModeleActive(versions, type, langue = "fr", juridiction = "BE") {
  const candidats = (versions || []).filter(
    (v) => v.type === type && v.actif && v.langue === langue && v.juridiction === juridiction
  );
  if (candidats.length === 0) return null;
  return candidats.reduce((meilleur, v) => (v.version > meilleur.version ? v : meilleur));
}

/**
 * Types de modèles qui sont des OFFRES : ils exigent la jointure automatique de
 * la C.B.D. en vigueur (S6). La facture, elle, ne la joint pas.
 */
const TYPES_OFFRE = Object.freeze(["offre_tarifaire", "offre_emballage", "offre_forfait"]);

/**
 * Indique si un type de document doit embarquer la C.B.D.
 * @param {string} typeModele
 * @returns {boolean}
 */
export function exigeCbd(typeModele) {
  return TYPES_OFFRE.includes(typeModele);
}

/**
 * Résout la version C.B.D. à joindre à une offre. Règle absolue : une offre ne
 * peut pas être instanciée sans C.B.D. active — c'est la protection juridique
 * de l'entreprise, non désactivable.
 * @param {VersionModele[]} versions  catalogue (contient les versions "cbd")
 * @param {string} typeModele         type du document instancié
 * @param {string} [langue="fr"]
 * @param {string} [juridiction="BE"]
 * @returns {{requise: boolean, cbdVersionId: string|null, erreur: string|null}}
 */
export function resoudreCbd(versions, typeModele, langue = "fr", juridiction = "BE") {
  if (!exigeCbd(typeModele)) {
    return { requise: false, cbdVersionId: null, erreur: null };
  }
  const cbd = versionModeleActive(versions, "cbd", langue, juridiction);
  if (!cbd) {
    return { requise: true, cbdVersionId: null, erreur: "cbd_active_absente" };
  }
  return { requise: true, cbdVersionId: cbd.id, erreur: null };
}
