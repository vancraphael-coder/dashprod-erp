// =============================================================================
// Modèle de facture canonique — LA source de vérité financière.
//
// Principe : une seule facture métier, plusieurs représentations. Le PDF n'est
// pas la facture, c'est une vue de la facture. L'UBL non plus. Tous les canaux
// de sortie dérivent de CE modèle, et aucun ne redéfinit la logique métier.
//
//   Devis → Chantier → Lignes facturables → MODÈLE CANONIQUE
//                                                 │
//                        ┌────────┬───────────────┼──────────┬────────────┐
//                        ▼        ▼               ▼          ▼            ▼
//                       PDF     Email          UBL/Peppol   CSV      Comptable
//
// Ce module ne parle à personne : ni base, ni réseau, ni fichier. Il décrit
// une facture, la valide, et calcule ses totaux. C'est ce qui le rend testable
// et ce qui permet à chaque adaptateur de l'être indépendamment.
// =============================================================================

const c = (v) => Math.round(Number(v) || 0);
const vide = (v) => v == null || String(v).trim() === "";

/** États de transmission. Voir transmission.js pour les passages permis. */
export const ETATS_TRANSMISSION = Object.freeze([
  "BROUILLON", "VALIDEE", "PRETE", "SOUMISE",
  "ACCEPTEE", "DELIVREE", "REJETEE", "ECHEC",
]);

/**
 * Ligne canonique. Le total de ligne est TOUJOURS recalculé depuis quantité ×
 * prix unitaire : un total transmis qui ne correspond pas est une erreur de
 * données, pas une valeur à respecter.
 */
export function ligne({ libelle, quantite = 1, unite = "pièce",
                        prix_unitaire_centimes, tva_pct, type = "prestation" }) {
  const q = Number(quantite);
  const pu = c(prix_unitaire_centimes);
  const quantiteValide = Number.isFinite(q) && q > 0 ? q : 0;
  return {
    type,
    libelle: String(libelle ?? "").trim(),
    quantite: quantiteValide,
    unite: String(unite || "pièce"),
    prix_unitaire_centimes: pu,
    tva_pct: Number.isFinite(Number(tva_pct)) ? Number(tva_pct) : null,
    montant_htva_centimes: Math.round(quantiteValide * pu),
  };
}

/**
 * Ventilation de TVA par taux — exigée par UBL (TaxSubtotal par catégorie).
 * Une facture peut mélanger 21 % (déménagement) et 6 % (certains travaux).
 */
export function ventilationTva(lignes, tauxDefaut) {
  const par = new Map();
  for (const l of lignes || []) {
    const taux = l.tva_pct ?? tauxDefaut;
    if (!Number.isFinite(Number(taux))) continue;
    const cle = Number(taux);
    const acc = par.get(cle) || { taux: cle, base_centimes: 0, tva_centimes: 0 };
    acc.base_centimes += c(l.montant_htva_centimes);
    par.set(cle, acc);
  }
  // TVA calculée sur la base agrégée, pas ligne à ligne : c'est la règle
  // comptable, et arrondir chaque ligne créerait un écart d'un centime.
  for (const v of par.values()) {
    v.tva_centimes = Math.round(v.base_centimes * (v.taux / 100));
  }
  return [...par.values()].sort((a, b) => b.taux - a.taux);
}

/**
 * Construit une facture canonique et calcule ses totaux.
 * Aucun total n'est jamais accepté de l'extérieur : ils sont dérivés.
 */
export function facture({
  numero, date_emission, echeance, devise = "EUR",
  vendeur, acheteur, lignes = [], tva_pct_defaut = 21,
  communication, type = "facture", facture_corrigee = null,
}) {
  const l = lignes.map((x) => (x.montant_htva_centimes != null && x.quantite != null)
    ? x : ligne(x));
  const ventilation = ventilationTva(l, tva_pct_defaut);
  const htva = l.reduce((t, x) => t + c(x.montant_htva_centimes), 0);
  const tva = ventilation.reduce((t, v) => t + v.tva_centimes, 0);

  // Un avoir porte des montants négatifs : c'est le signe qui le distingue,
  // pas un champ à part. UBL utilise un InvoiceTypeCode différent (381).
  const signe = type === "avoir" ? -1 : 1;

  return {
    type,
    numero: String(numero ?? "").trim(),
    date_emission,
    echeance: echeance || date_emission,
    devise,
    vendeur: partie(vendeur),
    acheteur: partie(acheteur),
    lignes: l,
    ventilation_tva: ventilation,
    communication: vide(communication) ? null : String(communication).trim(),
    facture_corrigee,
    total: {
      htva_centimes: signe * htva,
      tva_centimes: signe * tva,
      tvac_centimes: signe * (htva + tva),
    },
  };
}

function partie(p) {
  const o = p || {};
  return {
    nom: String(o.nom ?? "").trim(),
    tva: String(o.tva ?? "").toUpperCase().replace(/[\s.\-/]/g, ""),
    peppol_id: vide(o.peppol_id) ? null : String(o.peppol_id).trim(),
    rue: String(o.rue ?? "").trim(),
    cp: String(o.cp ?? "").trim(),
    ville: String(o.ville ?? "").trim(),
    pays: String(o.pays ?? "BE").trim().toUpperCase().slice(0, 2),
  };
}

/**
 * Valide une facture AVANT toute sortie.
 *
 * `canal` durcit les exigences : un PDF tolère une adresse incomplète, une
 * facture électronique non. Mieux vaut refuser d'émettre que transmettre un
 * document qui sera rejeté par le réseau — un rejet Peppol arrive des heures
 * plus tard et personne ne le voit passer.
 */
export function valider(f, canal = "PDF") {
  const erreurs = [];
  const manque = (v, msg) => { if (vide(v)) erreurs.push(msg); };

  manque(f?.numero, "Numéro de facture manquant");
  manque(f?.date_emission, "Date d'émission manquante");
  manque(f?.vendeur?.nom, "Nom de l'entreprise manquant");
  manque(f?.vendeur?.tva, "Numéro de TVA de l'entreprise manquant");
  manque(f?.acheteur?.nom, "Nom du client manquant");

  if (!f?.lignes || f.lignes.length === 0) erreurs.push("Facture sans ligne");
  for (const [i, l] of (f?.lignes || []).entries()) {
    if (vide(l.libelle)) erreurs.push(`Ligne ${i + 1} : libellé manquant`);
    if (!(l.quantite > 0)) erreurs.push(`Ligne ${i + 1} : quantité nulle`);
  }

  // Cohérence interne : le total doit égaler la somme des lignes.
  const somme = (f?.lignes || []).reduce((t, l) => t + c(l.montant_htva_centimes), 0);
  const attendu = f?.type === "avoir" ? -somme : somme;
  if (f?.total && f.total.htva_centimes !== attendu) {
    erreurs.push("Incohérence : le total ne correspond pas aux lignes");
  }

  if (canal === "PEPPOL") {
    manque(f?.vendeur?.peppol_id, "Identifiant Peppol de l'entreprise manquant");
    manque(f?.acheteur?.peppol_id, "Identifiant Peppol du client manquant");
    manque(f?.acheteur?.tva, "Numéro de TVA du client requis pour Peppol");
    manque(f?.vendeur?.rue, "Adresse de l'entreprise requise pour Peppol");
    manque(f?.vendeur?.ville, "Ville de l'entreprise requise pour Peppol");
    manque(f?.acheteur?.rue, "Adresse du client requise pour Peppol");
    manque(f?.acheteur?.ville, "Ville du client requise pour Peppol");
    manque(f?.echeance, "Date d'échéance requise pour Peppol");
  }

  return { valide: erreurs.length === 0, erreurs };
}

/** Échéance dérivée de la date d'émission et du délai réglé par l'entreprise. */
export function echeanceDepuis(dateEmission, jours = 30) {
  if (vide(dateEmission)) return null;
  const d = new Date(`${dateEmission}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const n = Number(jours);
  d.setUTCDate(d.getUTCDate() + (Number.isFinite(n) && n >= 0 ? Math.round(n) : 30));
  return d.toISOString().slice(0, 10);
}
