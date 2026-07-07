// =============================================================================
// Stocks — Contrôle E/U/R et valorisation
// Source : Réf. 2 (C-09 : consommables distincts de l'outillage ; C-18 : contrôle
// Enlevé = Utilisé + Repris, matériel utilisé injecté dans la facture).
// Logique PURE : détecter l'écart de solde, et valoriser le consommé au tarif.
// =============================================================================

/**
 * Vérifie le solde d'un article : Enlevé doit égaler Utilisé + Repris.
 * Un écart signale du matériel resté chez le client ou perdu (C-18).
 * @param {{enleve: number, utilise: number, repris: number}} mouvement
 * @returns {{coherent: boolean, ecart: number}}
 */
export function controleSolde({ enleve = 0, utilise = 0, repris = 0 }) {
  const ecart = enleve - (utilise + repris);
  return { coherent: ecart === 0, ecart };
}

/**
 * Valorise le matériel utilisé d'une mission : pour chaque article, quantité
 * utilisée × prix unitaire. Produit les lignes injectables dans la facture et
 * le total (C-18). Montants en centimes.
 * @param {{articleId: string, nom: string, utilise: number, prixUnitaireEuros: number}[]} lignes
 * @returns {{lignes: {articleId: string, nom: string, quantite: number, montant_centimes: number}[], total_centimes: number}}
 */
export function valoriserConsomme(lignes) {
  const resultat = (lignes || [])
    .filter((l) => (l.utilise || 0) > 0)
    .map((l) => ({
      articleId: l.articleId,
      nom: l.nom,
      quantite: l.utilise,
      montant_centimes: Math.round((l.utilise || 0) * (l.prixUnitaireEuros || 0) * 100),
    }));
  const total = resultat.reduce((a, l) => a + l.montant_centimes, 0);
  return { lignes: resultat, total_centimes: total };
}

/**
 * Liste les articles en écart pour une mission (pour l'alerte de solde).
 * @param {{articleId: string, nom: string, enleve: number, utilise: number, repris: number}[]} articles
 * @returns {{articleId: string, nom: string, ecart: number}[]}
 */
export function articlesEnEcart(articles) {
  return (articles || [])
    .map((a) => ({ ...a, ...controleSolde(a) }))
    .filter((a) => !a.coherent)
    .map((a) => ({ articleId: a.articleId, nom: a.nom, ecart: a.ecart }));
}
