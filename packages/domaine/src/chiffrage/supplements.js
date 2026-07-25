// =============================================================================
// Suppléments variables du barème.
//
// Le barème a des postes fixes (tarif horaire, km, élévateur). Mais chaque
// société a ses propres suppléments récurrents : piano, cave difficile, étage
// sans ascenseur, garde-meuble, démontage de cuisine… On ne peut pas tous les
// prévoir en dur. Ce module gère un CATALOGUE de suppléments que l'entreprise
// définit, et leur SÉLECTION sur un devis.
//
//   Paramètres → Barème → Suppléments   (définition, prix)
//                    │
//                    ▼
//   Devis : on coche les suppléments qui s'appliquent, avec leur quantité
//                    │
//                    ▼
//   Moteur de chiffrage : les additionne au prix
//                    │
//                    ▼
//   Document d'offre : une ligne par supplément retenu
//
// C'est le dernier maillon entre paramétrage et devis : ce que l'entreprise
// règle une fois se retrouve, sans ressaisie, dans chaque chiffrage.
// =============================================================================

const c = (v) => Math.round(Number(v) || 0);

/** Unités de facturation d'un supplément. */
export const UNITES_SUPPLEMENT = Object.freeze([
  { cle: "forfait", nom: "au forfait", pluralisable: false },
  { cle: "unite", nom: "à l'unité", pluralisable: true },     // 3 pianos
  { cle: "etage", nom: "par étage", pluralisable: true },
  { cle: "heure", nom: "par heure", pluralisable: true },
  { cle: "m3", nom: "par m³", pluralisable: true },
]);

/**
 * Normalise un supplément du catalogue.
 * `montant_centimes` est le prix HTVA unitaire. Un libellé vide est rejeté à
 * l'affichage, pas ici — ici on nettoie seulement.
 */
export function supplement(brut) {
  return {
    cle: String(brut?.cle ?? "").trim()
      || `sup_${Math.random().toString(36).slice(2, 8)}`,
    libelle: String(brut?.libelle ?? "").trim(),
    montant_centimes: c(brut?.montant_centimes),
    unite: UNITES_SUPPLEMENT.some((u) => u.cle === brut?.unite)
      ? brut.unite : "forfait",
    actif: brut?.actif !== false,
  };
}

/** Le catalogue de suppléments d'une organisation, nettoyé. */
export function catalogueSupplements(liste) {
  return (Array.isArray(liste) ? liste : []).map(supplement);
}

/** Ajoute un supplément vide au catalogue. */
export function ajouterSupplement(liste, libelle = "") {
  return [...catalogueSupplements(liste),
          supplement({ libelle, unite: "forfait", montant_centimes: 0 })];
}

/** Retire un supplément par sa clé. */
export function retirerSupplement(liste, cle) {
  return catalogueSupplements(liste).filter((s) => s.cle !== cle);
}

/**
 * Convertit une sélection de devis en suppléments chiffrables.
 * `selection` : { [cle]: quantite } — combien de fois chaque supplément
 * s'applique. Une quantité 0 ou absente = supplément non retenu.
 *
 * Renvoie ce que le moteur attend dans `f.supplements`, plus le libellé et
 * l'unité pour que le document d'offre affiche des lignes lisibles.
 */
export function supplementsRetenus(catalogue, selection = {}) {
  return catalogueSupplements(catalogue)
    .filter((s) => s.actif)
    .map((s) => {
      const q = Number(selection?.[s.cle]);
      const quantite = Number.isFinite(q) && q > 0 ? q : 0;
      return { ...s, quantite };
    })
    .filter((s) => s.quantite > 0)
    .map((s) => ({
      cle: s.cle,
      libelle: s.libelle,
      unite: s.unite,
      montant_centimes: s.montant_centimes,
      quantite: s.quantite,
      // Total de la ligne, pour l'affichage. Le moteur, lui, recalcule.
      total_centimes: s.montant_centimes * s.quantite,
    }));
}

/** Total HTVA des suppléments retenus, en centimes. */
export function totalSupplements(catalogue, selection) {
  return supplementsRetenus(catalogue, selection)
    .reduce((t, s) => t + s.total_centimes, 0);
}

/** Libellé d'une ligne de supplément pour le document d'offre. */
export function libelleLigne(sup) {
  const u = UNITES_SUPPLEMENT.find((x) => x.cle === sup.unite);
  if (!u || !u.pluralisable || sup.quantite <= 1) return sup.libelle;
  return `${sup.libelle} (${sup.quantite} ${u.nom.replace(/^(à l'|au |par )/, "")})`;
}
