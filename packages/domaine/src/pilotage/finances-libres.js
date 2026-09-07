// =============================================================================
// PILOTAGE FINANCIER — la santé de l'entreprise en pourcentage des recettes.
//
// L'IDÉE (Raphaël) : la compta voit les recettes ; il manquait une lecture
// simple des SORTIES pour savoir ce qui reste vraiment. Pas un bilan
// comptable — un tableau de bord de dirigeant : « pour 100 € encaissés, où va
// l'argent ? ».
//
// Le pourcentage sur recettes est le bon repère parce qu'il est COMPARABLE dans
// le temps et entre secteurs : un carburant à 8 % des recettes dit quelque
// chose ; 3 000 € ne dit rien sans le contexte. C'est la lecture qu'un patron
// fait d'instinct, rendue automatique.
//
// Module PUR : il agrège des montants qu'on lui donne, il ne lit aucune table.
// =============================================================================

/** Deux centimes en pourcentage, borné et arrondi à une décimale. Recettes
 *  nulles → 0 % (jamais une division qui explose). */
export function pourcentDesRecettes(montantCentimes, recettesCentimes) {
  const r = Number(recettesCentimes);
  const m = Number(montantCentimes);
  if (!Number.isFinite(r) || r <= 0) return 0;
  if (!Number.isFinite(m)) return 0;
  return Math.round((m / r) * 1000) / 10;
}

/**
 * Le bilan financier d'une période : recettes, dépenses ventilées par
 * catégorie, chaque poste en % des recettes, le reste (marge brute de
 * trésorerie), et les dettes en cours.
 *
 * @param {object} p
 * @param {number} p.recettes_centimes   encaissé (ou émis, selon le choix appelant)
 * @param {Array<{categorie:string, montant_centimes:number, regle?:boolean}>} p.depenses
 * @returns {object} bilan lisible
 */
export function bilanFinancier({ recettes_centimes = 0, depenses = [] } = {}) {
  const recettes = Math.max(0, Number(recettes_centimes) || 0);

  // Ventilation par catégorie : on regroupe, on ne liste pas cent lignes.
  const parCategorie = new Map();
  let totalDepenses = 0;
  let totalDettes = 0;                     // dépenses non réglées = à payer
  for (const d of depenses || []) {
    const m = Math.max(0, Number(d?.montant_centimes) || 0);
    const cat = String(d?.categorie || "divers");
    parCategorie.set(cat, (parCategorie.get(cat) || 0) + m);
    totalDepenses += m;
    if (d?.regle === false) totalDettes += m;
  }

  const postes = [...parCategorie.entries()]
    .map(([categorie, montant_centimes]) => ({
      categorie,
      montant_centimes,
      pct_recettes: pourcentDesRecettes(montant_centimes, recettes),
    }))
    .sort((a, b) => b.montant_centimes - a.montant_centimes);   // le plus lourd d'abord

  const reste = recettes - totalDepenses;

  return {
    recettes_centimes: recettes,
    depenses_centimes: totalDepenses,
    dettes_centimes: totalDettes,
    reste_centimes: reste,
    // Les deux chiffres qu'un patron regarde en premier.
    pct_depenses: pourcentDesRecettes(totalDepenses, recettes),
    pct_reste: pourcentDesRecettes(reste, recettes),
    postes,
  };
}

/**
 * Une alerte de santé, en clair. On SIGNALE, on ne juge pas : un seuil dépend du
 * métier. Mais un « reste » négatif ou une dette qui dépasse les recettes
 * méritent d'être dits sans détour.
 *
 * @returns {{niveau: "ok"|"attention"|"critique", message: string|null}}
 */
export function santeFinanciere(bilan) {
  if (!bilan || bilan.recettes_centimes <= 0) {
    return { niveau: "attention", message: "Aucune recette sur la période." };
  }
  if (bilan.reste_centimes < 0) {
    return { niveau: "critique",
      message: "Les dépenses dépassent les recettes sur la période." };
  }
  if (bilan.dettes_centimes > bilan.recettes_centimes) {
    return { niveau: "critique",
      message: "Les dettes en cours dépassent les recettes de la période." };
  }
  if (bilan.pct_reste < 10) {
    return { niveau: "attention",
      message: `Il ne reste que ${bilan.pct_reste} % des recettes.` };
  }
  return { niveau: "ok", message: null };
}

/** Les catégories proposées à la saisie. Libres, mais suggérées pour que la
 *  ventilation reste comparable dans le temps. */
export const CATEGORIES_DEPENSE = Object.freeze([
  { cle: "carburant", libelle: "Carburant" },
  { cle: "entretien", libelle: "Entretien véhicules" },
  { cle: "materiel", libelle: "Matériel & fournitures" },
  { cle: "loyer", libelle: "Loyer & locaux" },
  { cle: "salaires", libelle: "Salaires & charges" },
  { cle: "assurance", libelle: "Assurances" },
  { cle: "sous_traitance", libelle: "Sous-traitance" },
  { cle: "administratif", libelle: "Administratif & taxes" },
  { cle: "divers", libelle: "Divers" },
]);
