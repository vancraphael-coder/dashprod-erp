// =============================================================================
// IDENTITÉ D'ENTREPRISE — étage pur.
//
// Premier étage du moteur de vérification d'identité : normaliser, typer,
// contrôler, formater. Aucun réseau, aucune base, aucune dépendance. Tout ce
// qui suivra (interrogation de la BCE, du VIES, recherche Peppol, statut de
// confiance persisté) s'appuie sur ces fonctions et ne les redéfinit jamais.
//
// POURQUOI UN MODULE À PART. Le contrôle vivait éparpillé : une expression
// régulière dans `identite.js`, un champ libre dans le formulaire, rien du tout
// côté base. Résultat mesuré en production : deux organisations, deux formats
// incompatibles dans la même colonne — « BE 0478.363.616 » et « 1033973082 ».
// Un identifiant qui s'écrit de deux façons n'est plus un identifiant.
//
// LE DÉFAUT QUI A DÉCLENCHÉ CE MODULE. L'ancienne règle exigeait `BE0` suivi de
// neuf chiffres. Or la série des numéros commençant par 0 est épuisée : depuis
// le 19 septembre 2023, la BCE attribue des numéros commençant par 1. Toute
// entreprise créée depuis cette date était donc refusée à l'inscription — y
// compris la première société de l'éditeur. C'est le piège classique du préfixe
// codé en dur ; le vrai contrôle structurel est le modulo 97, pas le préfixe.
//
// LE CONTRÔLE. Les deux derniers chiffres sont une clé : 97 moins le reste de
// la division des huit premiers chiffres par 97. Même règle pour les séries 0
// et 1. Il détecte les fautes de frappe et les numéros inventés — il ne dit
// PAS que l'entreprise existe, ni qu'elle est active, ni qu'elle est assujettie
// à la TVA. Ces trois questions-là relèvent des sources officielles.
// =============================================================================

/** Caractères de présentation admis autour d'un numéro. */
const SEPARATEURS = /[\s.\-/_]/g;

const vide = (v) => v == null || String(v).trim() === "";

/**
 * Les préfixes de TVA de l'Union — ensemble FERMÉ, volontairement.
 * Une règle ouverte du type « deux lettres suivies d'alphanumérique » classait
 * « bonjour » comme numéro de TVA européen. Un identifiant qui accepte
 * n'importe quel mot n'identifie plus rien. EL = Grèce, XI = Irlande du Nord.
 */
export const PREFIXES_TVA_UE = Object.freeze([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR",
  "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO",
  "SE", "SI", "SK", "XI",
]);

/**
 * Réduit une saisie à sa forme comparable : majuscules, sans séparateurs.
 * Ne juge rien, ne complète rien.
 */
export function normaliserSaisie(v) {
  return String(v ?? "").toUpperCase().replace(SEPARATEURS, "");
}

/**
 * Le type d'identifiant reconnu dans une saisie. Une seule réponse, jamais un
 * défaut inventé.
 *
 *   "bce"     — 10 chiffres commençant par 0 ou 1, sans préfixe pays
 *   "tva_be"  — les mêmes 10 chiffres précédés de BE
 *   "tva_ue"  — un préfixe pays de l'Union autre que BE, suivi d'un identifiant
 *   "inconnu" — tout le reste, y compris le vide
 */
export function typeIdentifiant(v) {
  const n = normaliserSaisie(v);
  if (n === "") return "inconnu";
  if (/^[01]\d{9}$/.test(n)) return "bce";
  if (/^BE[01]\d{9}$/.test(n)) return "tva_be";
  // Préfixe reconnu ET un identifiant qui contient au moins un chiffre.
  if (PREFIXES_TVA_UE.includes(n.slice(0, 2))
      && /^[A-Z0-9]{2,12}$/.test(n.slice(2))
      && /\d/.test(n.slice(2))) return "tva_ue";
  return "inconnu";
}

/**
 * Les 10 chiffres nus, quelle que soit la façon dont le numéro a été écrit.
 * `null` si la saisie n'est pas un identifiant belge — jamais une chaîne
 * tronquée qui donnerait l'illusion d'avoir compris.
 */
export function normaliserBce(v) {
  const t = typeIdentifiant(v);
  if (t !== "bce" && t !== "tva_be") return null;
  const n = normaliserSaisie(v);
  return t === "tva_be" ? n.slice(2) : n;
}

/**
 * Contrôle modulo 97 sur les 10 chiffres. Structure seule : il ne dit rien de
 * l'existence ni de l'activité de l'entreprise.
 */
export function cleModulo97Valide(v) {
  const n = normaliserBce(v);
  if (n === null) return false;
  const attendue = 97 - (Number(n.slice(0, 8)) % 97);
  return attendue === Number(n.slice(8));
}

/** Numéro d'entreprise belge bien formé ET cohérent. Vide = non jugé. */
export function bceValide(v) {
  if (vide(v)) return true;
  return cleModulo97Valide(v);
}

/**
 * Numéro de TVA belge bien formé ET cohérent. Vide = non jugé.
 * Remplace l'ancienne règle `BE0` + 9 chiffres, qui refusait la série 1.
 */
export function tvaBelgeValide(v) {
  if (vide(v)) return true;
  // Contrat historique conservé : la question posée est « est-ce un numéro
  // de TVA BELGE valide ». Un numéro français ne l'est pas — c'est à
  // l'appelant, s'il ouvre un jour l'international, de poser une autre
  // question avec `typeIdentifiant`.
  const t = typeIdentifiant(v);
  if (t !== "tva_be" && t !== "bce") return false;
  return cleModulo97Valide(v);
}

/** Forme lisible du numéro d'entreprise : 0478.363.616 */
export function formaterBce(v) {
  const n = normaliserBce(v);
  if (n === null) return null;
  return `${n.slice(0, 4)}.${n.slice(4, 7)}.${n.slice(7)}`;
}

/** Forme canonique du numéro de TVA : BE0478363616 */
export function formaterTvaBe(v) {
  const n = normaliserBce(v);
  return n === null ? null : `BE${n}`;
}

/**
 * Identifiant Peppol belge : le schéma 0208 (registre des entreprises belges)
 * suivi des 10 chiffres. C'est cette forme, et pas le numéro de TVA, qui sert
 * à chercher une entreprise sur le réseau.
 */
export function identifiantPeppol(v) {
  const n = normaliserBce(v);
  return n === null ? null : `0208:${n}`;
}

/**
 * Le niveau de confiance qu'on peut afficher sur une identité.
 *
 * Quatre valeurs, et l'ordre compte — chacune dit exactement ce qui a été
 * établi, ni plus :
 *
 *   "absent"    — aucun identifiant fourni
 *   "invalide"  — fourni mais la clé de contrôle ne tombe pas juste
 *   "structure" — cohérent, jamais confronté à une source officielle
 *   "officiel"  — confirmé par une source officielle, et pas périmé
 *
 * `verifieLe` et `maintenant` sont des dates ISO ou des Date. Une vérification
 * plus vieille que `validiteJours` retombe à "structure" : une confirmation
 * datée d'il y a deux ans ne dit rien de l'entreprise d'aujourd'hui, et
 * l'afficher comme officielle serait une confiance fabriquée.
 */
export function statutConfiance({
  numero, sourceOfficielle = false, verifieLe = null,
  maintenant = new Date(), validiteJours = 180,
} = {}) {
  if (vide(numero)) return "absent";
  if (!cleModulo97Valide(numero)) return "invalide";
  if (!sourceOfficielle || !verifieLe) return "structure";
  const d = verifieLe instanceof Date ? verifieLe : new Date(verifieLe);
  if (Number.isNaN(d.getTime())) return "structure";
  const jours = (new Date(maintenant).getTime() - d.getTime()) / 86400000;
  if (jours < 0) return "structure";          // date future : on ne s'y fie pas
  return jours <= validiteJours ? "officiel" : "structure";
}

/** Libellés d'affichage. Un statut sans libellé retomberait sur sa clé. */
export const LIBELLES_CONFIANCE = Object.freeze({
  absent: "Non renseigné",
  invalide: "Numéro incohérent",
  structure: "Numéro cohérent, non vérifié",
  officiel: "Vérifié auprès de la source officielle",
});
