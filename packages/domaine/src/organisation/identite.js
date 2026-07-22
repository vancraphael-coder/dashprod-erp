// =============================================================================
// Identité de l'organisation — source de vérité unique.
//
// Tout ce qu'un module doit savoir de l'entreprise passe par ici : devis, PDF,
// email, facture, Peppol. Aucun module ne redemande, ne redéfinit ni ne code
// en dur une information d'entreprise.
//
// Deux règles :
//   1. Un champ manquant se voit (identiteComplete) au lieu de se deviner.
//      Un devis ne doit pas partir avec un en-tête vide ou approximatif.
//   2. Un réglage absent retombe sur un défaut belge explicite, jamais sur
//      une valeur d'une autre entreprise.
// =============================================================================

/** Réglages de facturation hérités par tous les documents. */
export const FACTURATION_DEFAUT = Object.freeze({
  tva_taux: 21,
  echeance_jours: 30,
  prefixe_numero: "",
  mention_legale: "",
  communication_structuree: false,
});

/** Champs d'identité, dans l'ordre d'affichage. */
export const CHAMPS_IDENTITE = Object.freeze([
  { cle: "nom", label: "Nom légal", requis: true,
    aide: "Tel qu'il figure à la Banque-Carrefour des Entreprises." },
  { cle: "nom_commercial", label: "Nom commercial",
    aide: "Enseigne, si différente du nom légal." },
  { cle: "forme_juridique", label: "Forme juridique", aide: "SRL, SA, indépendant…" },
  { cle: "bce", label: "Numéro d'entreprise (BCE)", requis: true, aide: "BE 0123.456.789" },
  { cle: "tva", label: "Numéro de TVA", requis: true, aide: "BE0123456789" },
  { cle: "adresse", label: "Adresse", requis: true },
  { cle: "cp", label: "Code postal", requis: true },
  { cle: "ville", label: "Ville", requis: true },
  { cle: "pays", label: "Pays" },
  { cle: "tel", label: "Téléphone", requis: true },
  { cle: "email", label: "Email général", requis: true },
  { cle: "site_web", label: "Site internet" },
  { cle: "iban", label: "IBAN", requis: true, aide: "Compte sur lequel les clients paient." },
]);

/** Champs sans lesquels aucun document ne devrait partir chez un client. */
export const CHAMPS_DOCUMENT = Object.freeze(
  ["nom", "bce", "tva", "adresse", "cp", "ville", "tel", "email", "iban"]);

const vide = (v) => v == null || String(v).trim() === "";

/** Normalise un numéro BE : majuscules, sans espaces ni points. */
export function normaliserNumero(v) {
  return String(v ?? "").toUpperCase().replace(/[\s.\-/]/g, "");
}

/** Vrai si le numéro de TVA a la forme belge attendue. Vide = non jugé. */
export function tvaBelgeValide(v) {
  if (vide(v)) return true;
  return /^BE0\d{9}$/.test(normaliserNumero(v));
}

/** Vrai si l'IBAN belge est bien formé ET passe le contrôle modulo 97. */
export function ibanValide(v) {
  if (vide(v)) return true;
  const n = normaliserNumero(v);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(n)) return false;
  const reordonne = n.slice(4) + n.slice(0, 4);
  const numerique = reordonne.replace(/[A-Z]/g, (c) => c.charCodeAt(0) - 55);
  let reste = 0;
  for (const chiffre of numerique) reste = (reste * 10 + Number(chiffre)) % 97;
  return reste === 1;
}

/**
 * État de complétion de l'identité.
 * manquants  : champs requis absents — bloquent l'envoi de documents
 * invalides  : champs présents mais mal formés
 * pretDocuments : vrai si un devis ou une facture peut partir
 */
export function identiteComplete(org) {
  const o = org || {};
  const manquants = CHAMPS_IDENTITE
    .filter((c) => c.requis && vide(o[c.cle]))
    .map((c) => c.cle);

  const invalides = [];
  if (!tvaBelgeValide(o.tva)) invalides.push("tva");
  if (!ibanValide(o.iban)) invalides.push("iban");

  const bloquants = CHAMPS_DOCUMENT.filter((c) => vide(o[c]));
  return {
    manquants,
    invalides,
    complete: manquants.length === 0 && invalides.length === 0,
    pretDocuments: bloquants.length === 0 && invalides.length === 0,
    bloquants,
  };
}

/** Réglages de facturation effectifs : défauts complétés par l'organisation. */
export function facturation(org) {
  const perso = (org || {}).parametres_facturation;
  if (!perso || typeof perso !== "object") return { ...FACTURATION_DEFAUT };
  const f = { ...FACTURATION_DEFAUT, ...perso };
  const taux = Number(f.tva_taux);
  f.tva_taux = Number.isFinite(taux) && taux >= 0 && taux <= 100
    ? taux : FACTURATION_DEFAUT.tva_taux;
  const jours = Number(f.echeance_jours);
  f.echeance_jours = Number.isFinite(jours) && jours >= 0
    ? Math.round(jours) : FACTURATION_DEFAUT.echeance_jours;
  return f;
}

/** Taux de TVA de l'entreprise. Un seul endroit décide. */
export function tauxTva(org) {
  return facturation(org).tva_taux;
}

/** Libellé « TVA 21 % » calculé, jamais écrit en dur dans un écran. */
export function libelleTva(org) {
  const t = tauxTva(org);
  return `TVA ${String(t).replace(".", ",")} %`;
}

/** Nom à imprimer sur les documents : l'enseigne si elle existe. */
export function nomAffiche(org) {
  const o = org || {};
  return (!vide(o.nom_commercial) ? o.nom_commercial : o.nom) || "";
}

/** Bloc d'adresse prêt à imprimer, lignes vides retirées. */
export function lignesEntete(org) {
  const o = org || {};
  const ligneVille = [o.cp, o.ville].filter((x) => !vide(x)).join(" ");
  const contact = [o.tel, o.email].filter((x) => !vide(x)).join(" · ");
  const legal = [
    !vide(o.bce) ? `BCE ${o.bce}` : null,
    !vide(o.tva) ? `TVA ${o.tva}` : null,
  ].filter(Boolean).join(" · ");
  return [o.adresse, ligneVille, contact, legal, o.site_web]
    .filter((l) => !vide(l)).map(String);
}

/**
 * Adresse du dépôt, au format attendu par un service de cartographie.
 *
 * C'est le point de départ ET d'arrivée de tout itinéraire de chantier : les
 * kilomètres facturés en dépendent. Elle vient de l'organisation, jamais d'une
 * constante — une adresse codée en dur ferait facturer les trajets d'une autre
 * entreprise. Renvoie null si l'adresse est incomplète : mieux vaut pas
 * d'itinéraire qu'un itinéraire faux.
 */
export function adresseDepot(org) {
  const o = org || {};
  const rue = String(o.adresse ?? "").trim();
  const ville = String(o.ville ?? "").trim();
  if (!rue || !ville) return null;
  const cp = String(o.cp ?? "").trim();
  const pays = String(o.pays ?? "").trim() || "Belgique";
  return [rue, [cp, ville].filter(Boolean).join(" "), pays].join(", ");
}
