// =============================================================================
// QUALIFICATION TVA — la seule porte par laquelle une opération obtient sa
// catégorie et son taux.
//
// POURQUOI CE MODULE EXISTE
// -------------------------
// Avant lui, la catégorie TVA était écrite en dur (« S », taux normal) dans le
// générateur UBL, et un taux absent devenait 21 % par défaut. Deux conséquences
// mesurées dans le dépôt :
//   · une prestation intracommunautaire partait à 21 % au lieu d'être en
//     autoliquidation — un document fiscalement FAUX, transmis par le réseau
//     officiel Peppol ;
//   · une ligne sans taux était exclue de la ventilation tout en restant
//     comptée dans le HTVA : la facture sous-déclarait la TVA en silence
//     (100 € HTVA → 0 € TVA, sans la moindre erreur).
//
// LA RÈGLE ABSOLUE
// ----------------
//        information TVA absente  →  ERREUR  →  aucune transmission
//        JAMAIS                   →  21 %
//
// Une facture électronique a valeur légale. Un taux inventé n'est pas une
// approximation, c'est une déclaration fiscale inexacte.
//
// CE QUE CE MODULE NE FAIT PAS
// ----------------------------
// Il ne décide PAS le droit fiscal. Il ne qualifie que les situations dont la
// règle a été validée pour Dashprod. Toute autre situation reçoit un REFUS
// motivé, qui nomme ce qui manque — jamais une valeur de repli.
//
// Chaque règle porte son statut :
//   [VALIDÉ]     règle confirmée pour Dashprod
//   [À VALIDER]  emplacement prêt, règle à confirmer par un conseiller TVA
//                ou un expert-comptable avant activation
// =============================================================================

import { estFourni, nombre } from "../noyau/nombres.js";

/**
 * Les catégories TVA du standard EN 16931 (UNTDID 5305), telles qu'un document
 * Peppol les attend. `tauxZeroExige` dit si la catégorie impose un taux de 0 :
 * annoncer « autoliquidation » à 21 % serait contradictoire, et un validateur
 * Peppol le rejetterait.
 */
export const CATEGORIES_TVA = Object.freeze({
  S:  { libelle: "Taux normal ou réduit",           tauxZeroExige: false },
  Z:  { libelle: "Taux zéro",                       tauxZeroExige: true  },
  E:  { libelle: "Exonéré",                         tauxZeroExige: true  },
  AE: { libelle: "Autoliquidation",                 tauxZeroExige: true  },
  K:  { libelle: "Intracommunautaire",              tauxZeroExige: true  },
  G:  { libelle: "Export hors UE",                  tauxZeroExige: true  },
  O:  { libelle: "Hors champ de la TVA",            tauxZeroExige: true  },
});

/** États membres de l'UE — sert à distinguer « UE » de « hors UE ». */
const UE = Object.freeze(new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
]));

/** Un pays au format ISO 2 lettres, ou null si absent/illisible. */
function pays(v) {
  const p = String(v ?? "").trim().toUpperCase().slice(0, 2);
  return /^[A-Z]{2}$/.test(p) ? p : null;
}

function refus(motif) {
  return { ok: false, motif };
}

/**
 * Qualifie une opération : quelle catégorie TVA, quel taux, quelle mention.
 *
 * Rend `{ ok: false, motif }` dès que la situation n'est pas certaine. C'est
 * volontaire et c'est tout l'intérêt du module : un refus motivé se corrige,
 * un taux inventé se découvre au contrôle fiscal.
 *
 * @param {object} ctx
 * @param {string} ctx.paysVendeur      ISO 2 (ex. "BE")
 * @param {string} ctx.paysAcheteur     ISO 2
 * @param {number} ctx.taux             taux en pourcent, tel que saisi
 * @param {boolean} [ctx.acheteurAssujetti]  l'acheteur est-il assujetti TVA ?
 * @param {string}  [ctx.tvaAcheteur]   numéro de TVA de l'acheteur
 * @param {string}  [ctx.motifExoneration] base légale si taux 0 en national
 * @returns {{ok: true, qualification: object} | {ok: false, motif: string}}
 */
export function qualifierTva(ctx = {}) {
  const pv = pays(ctx.paysVendeur);
  const pa = pays(ctx.paysAcheteur);

  if (!pv) return refus("Pays du vendeur inconnu : impossible de qualifier la TVA.");
  if (!pa) return refus("Pays de l'acheteur inconnu : impossible de qualifier la TVA.");

  // ── Cas 1 : opération intérieure belge. [VALIDÉ] ───────────────────────────
  // C'est le cas courant de Dashprod : un déménageur belge facture en Belgique.
  // La catégorie est « S » ; le TAUX reste une donnée d'entreprise (21 %, ou un
  // taux réduit selon la prestation) — le module ne le choisit pas, il exige
  // qu'il soit fourni.
  if (pv === "BE" && pa === "BE") {
    if (!estFourni(ctx.taux)) {
      return refus("Taux de TVA non fourni. Renseignez-le sur la ligne ou dans "
        + "les paramètres de facturation — aucun taux n'est appliqué par défaut.");
    }
    const t = nombre(ctx.taux);
    if (t < 0 || t > 100) return refus(`Taux de TVA hors plage : ${t} %.`);

    if (t === 0) {
      // Un 0 % intérieur n'est pas un taux, c'est une exonération : elle a une
      // base légale, et cette base doit figurer sur la facture. Sans motif, on
      // ne sait pas quelle catégorie annoncer (E ? AE cocontractant ? O ?).
      if (!ctx.motifExoneration) {
        return refus("Un taux de 0 % en Belgique suppose une exonération ou une "
          + "autoliquidation : le motif légal est requis pour qualifier "
          + "l'opération. [À VALIDER par un conseiller TVA]");
      }
      return refus("Exonération intérieure : règle non encore validée pour "
        + "Dashprod. [À VALIDER par un conseiller TVA]");
    }

    return {
      ok: true,
      qualification: {
        categorie: "S",
        taux: t,
        mention: null,
        regime: "BE_interieur",
      },
    };
  }

  // ── Cas 2 : acheteur dans un autre État membre. [À VALIDER] ────────────────
  // Une prestation B2B intracommunautaire relève en principe de
  // l'autoliquidation chez le preneur (catégorie AE, taux 0, mention
  // obligatoire). MAIS le lieu de la prestation dépend de sa NATURE : un
  // transport de biens, un service lié à un immeuble et un service générique
  // ne suivent pas la même règle. Dashprod facture du déménagement, du lift et
  // de la sous-traitance — trois qualifications potentiellement différentes.
  // Décider ici serait exactement l'erreur que ce module existe pour empêcher.
  if (pv === "BE" && UE.has(pa)) {
    return refus(`Opération vers ${pa} (Union européenne) : la qualification TVA `
      + "dépend de la nature de la prestation et du statut de l'acheteur. "
      + "Règle non encore validée pour Dashprod — facture non transmissible "
      + "par Peppol en l'état. [À VALIDER par un conseiller TVA]");
  }

  // ── Cas 3 : acheteur hors UE. [À VALIDER] ─────────────────────────────────
  if (pv === "BE") {
    return refus(`Opération vers ${pa} (hors Union européenne) : règle `
      + "d'exonération à confirmer. [À VALIDER par un conseiller TVA]");
  }

  // ── Cas 4 : vendeur non belge. [À VALIDER] ────────────────────────────────
  return refus(`Vendeur établi en ${pv} : Dashprod n'a qualifié que les `
    + "opérations émises depuis la Belgique. [À VALIDER par un conseiller TVA]");
}

/**
 * Une qualification est-elle cohérente avec son taux ?
 * Garde-fou de dernière minute avant génération du document : annoncer
 * « autoliquidation » avec 21 % ferait rejeter le document par Peppol, et
 * surtout mentirait sur la nature de l'opération.
 */
export function qualificationCoherente(q) {
  if (!q || !CATEGORIES_TVA[q.categorie]) {
    return refus("Catégorie TVA inconnue.");
  }
  const def = CATEGORIES_TVA[q.categorie];
  if (def.tauxZeroExige && nombre(q.taux) !== 0) {
    return refus(`La catégorie ${q.categorie} (${def.libelle}) impose un taux de `
      + `0 %, or ${q.taux} % est annoncé.`);
  }
  if (!def.tauxZeroExige && !(nombre(q.taux) > 0)) {
    return refus(`La catégorie ${q.categorie} (${def.libelle}) impose un taux `
      + "strictement positif.");
  }
  return { ok: true };
}
