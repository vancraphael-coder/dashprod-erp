// =============================================================================
// Calcul définitif — prévu vs réel vs facturé, côte à côte.
//
// Trois colonnes, trois vérités d'un même dossier :
//   — PRÉVU   : ce qu'on avait chiffré (scénario retenu). L'ambition.
//   — RÉEL    : ce que le chantier a coûté (coûts constatés). La dépense.
//   — FACTURÉ : ce qu'on a réellement demandé au client (etat_facturation).
//
// De ces trois, deux marges qui ne se confondent pas :
//   — marge réelle    = facturé − réel   → ce qu'on a vraiment gagné.
//   — écart de devis  = facturé − prévu  → a-t-on tenu le prix annoncé ?
//
// Tout est en centimes en entrée ; ce module ne fait que soustraire et cadrer.
// Aucun arrondi hasardeux, aucune valeur inventée : une colonne sans donnée est
// annoncée « — », pas remplie de zéros trompeurs.
// =============================================================================

import { ouDefaut } from "../noyau/nombres.js";

const n0 = (v) => ouDefaut(v, 0);

/**
 * @param {object} e
 * @param {number|null} e.prevuTvacCentimes    total TVAC du scénario retenu
 * @param {number|null} e.prevuHtvaCentimes    total HTVA du scénario retenu
 * @param {object} e.reel  coûts réels en euros : { mainOeuvre, carburant, materiel, divers, peages }
 * @param {object} e.facturation  sortie de etat_facturation (du_centimes, paye_centimes, solde_centimes)
 */
export function calculDefinitif({ prevuTvacCentimes, prevuHtvaCentimes, reel, facturation } = {}) {
  const f = facturation || {};
  const factureHtva = n0(f.du_centimes);        // etat_facturation raisonne en TVAC ; voir note plus bas
  const facturePaye = n0(f.paye_centimes);
  const factureSolde = n0(f.solde_centimes);

  const reelCentimes = coutReelCentimes(reel);
  const prevuTvac = prevuTvacCentimes == null ? null : n0(prevuTvacCentimes);
  const prevuHtva = prevuHtvaCentimes == null ? null : n0(prevuHtvaCentimes);

  // Le facturé de référence pour les marges est le montant dû (TVAC émis).
  const facture = factureHtva;

  const margeReelle = facture - reelCentimes;           // ce qu'on a gagné
  const ecartDevis = prevuTvac == null ? null : facture - prevuTvac;

  return {
    colonnes: {
      prevu: { tvac: prevuTvac, htva: prevuHtva, connu: prevuTvac != null },
      reel: { total: reelCentimes, detail: detailReel(reel), connu: reel != null },
      facture: {
        du: facture, paye: facturePaye, solde: factureSolde,
        connu: n0(f.factures) > 0 || facture > 0,
        etat: f.etat || "non_facture",
      },
    },
    marges: {
      reelle_centimes: margeReelle,
      reelle_pct: facture > 0 ? Math.round((margeReelle / facture) * 1000) / 10 : null,
      ecart_devis_centimes: ecartDevis,
    },
    alertes: alertes({ prevuTvac, facture, reelCentimes, margeReelle, solde: factureSolde }),
  };
}

function coutReelCentimes(reel) {
  if (!reel) return 0;
  const euros = n0(reel.mainOeuvre) + n0(reel.carburant) + n0(reel.materiel)
              + n0(reel.divers) + n0(reel.peages);
  return Math.round(euros * 100);
}

function detailReel(reel) {
  if (!reel) return [];
  return [
    ["Main-d'œuvre", Math.round(n0(reel.mainOeuvre) * 100)],
    ["Carburant", Math.round(n0(reel.carburant) * 100)],
    ["Matériel", Math.round(n0(reel.materiel) * 100)],
    ["Péages", Math.round(n0(reel.peages) * 100)],
    ["Divers", Math.round(n0(reel.divers) * 100)],
  ].filter(([, c]) => c > 0);
}

/**
 * Les signaux qui méritent l'œil du bureau. Chacun est un fait, pas un jugement :
 * on montre l'écart, on ne dit pas si c'est grave.
 */
function alertes({ prevuTvac, facture, reelCentimes, margeReelle, solde }) {
  const out = [];
  if (facture > 0 && margeReelle < 0) {
    out.push({ ton: "rouge", texte: "Le chantier a coûté plus qu'il n'a été facturé." });
  }
  if (prevuTvac != null && facture > 0 && facture + 50 < prevuTvac) {
    out.push({ ton: "ambre", texte: "Facturé en dessous du devis retenu." });
  }
  if (solde > 0) {
    out.push({ ton: "ambre", texte: "Une partie reste due par le client." });
  }
  if (facture === 0) {
    out.push({ ton: "muet", texte: "Aucune facture émise : le facturé n'est pas encore comparable." });
  }
  return out;
}

/** Formatage euro partagé, pour que l'écran et les tests parlent pareil. */
export function euroCentimes(centimes) {
  if (centimes == null) return "—";
  return (centimes / 100).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
}
