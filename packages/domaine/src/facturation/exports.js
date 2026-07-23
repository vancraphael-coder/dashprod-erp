// =============================================================================
// Adaptateurs d'export comptable.
//
// Tous partent du MODÈLE CANONIQUE, jamais du PDF. Convertir un PDF en écriture
// comptable est la mauvaise architecture : l'information structurée existe en
// amont, il suffit de ne pas la perdre.
//
//   Modèle canonique ──┬──► CSV simple (relevé)
//                      ├──► Journal des ventes (écritures à double entrée)
//                      └──► (adaptateurs éditeurs à brancher au besoin)
//
// Le cœur ne dépend d'aucun logiciel comptable : chaque format est un
// adaptateur, testable seul, remplaçable sans toucher au reste.
// =============================================================================

const dec = (centimes) => (Math.round(centimes) / 100).toFixed(2);

/** Échappe un champ CSV : point-virgule, guillemet ou retour ligne. */
function champ(v) {
  const s = String(v ?? "");
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Relevé CSV — la sortie que tout comptable sait lire.
 * Point-virgule : séparateur attendu par Excel en configuration belge.
 */
export function versCsv(factures, options = {}) {
  const sep = options.separateur || ";";
  const entete = ["Date", "Numero", "Type", "Client", "TVA client",
                  "HTVA", "TVA", "TVAC", "Devise", "Echeance", "Communication"];
  const lignes = (factures || []).map((f) => [
    f.date_emission, f.numero, f.type || "facture",
    f.acheteur?.nom, f.acheteur?.tva,
    dec(f.total.htva_centimes), dec(f.total.tva_centimes), dec(f.total.tvac_centimes),
    f.devise || "EUR", f.echeance || "", f.communication || "",
  ].map(champ).join(sep));
  // BOM UTF-8 : sans lui, Excel casse les accents à l'ouverture.
  return "\uFEFF" + [entete.join(sep), ...lignes].join("\r\n");
}

/**
 * Journal des ventes — écritures à double entrée.
 *
 * Une facture de 1 000 € HTVA à 21 % produit :
 *   Débit  clients            1 210,00
 *   Crédit ventes             1 000,00
 *   Crédit TVA à payer          210,00
 *
 * Les numéros de compte suivent le PCMN belge par défaut, et sont
 * paramétrables : chaque cabinet a son plan.
 */
export const COMPTES_DEFAUT = Object.freeze({
  clients: "400000",      // créances commerciales
  ventes: "700000",       // chiffre d'affaires
  tva_due: "451000",      // TVA à payer
});

export function journalVentes(factures, comptes = COMPTES_DEFAUT) {
  const cpt = { ...COMPTES_DEFAUT, ...(comptes || {}) };
  const ecritures = [];

  for (const f of factures || []) {
    const ref = f.numero;
    const d = f.date_emission;

    ecritures.push({
      date: d, piece: ref, compte: cpt.clients,
      libelle: `${f.acheteur?.nom || "Client"} — ${ref}`,
      debit_centimes: f.total.tvac_centimes, credit_centimes: 0,
    });

    // Une écriture de vente par taux : le comptable ventile la TVA par taux,
    // pas globalement. Une facture mixte 21/6 produit deux lignes de vente.
    for (const t of f.ventilation_tva || []) {
      const signe = f.type === "avoir" ? -1 : 1;
      ecritures.push({
        date: d, piece: ref, compte: cpt.ventes,
        libelle: `Ventes ${t.taux} % — ${ref}`,
        debit_centimes: 0, credit_centimes: signe * t.base_centimes,
      });
      ecritures.push({
        date: d, piece: ref, compte: cpt.tva_due,
        libelle: `TVA ${t.taux} % — ${ref}`,
        debit_centimes: 0, credit_centimes: signe * t.tva_centimes,
      });
    }
  }
  return ecritures;
}

/**
 * Contrôle d'équilibre : total débit = total crédit.
 * Un journal déséquilibré est refusé par tout logiciel comptable ; autant le
 * détecter ici plutôt qu'après l'import.
 */
export function equilibre(ecritures) {
  const debit = (ecritures || []).reduce((t, e) => t + (e.debit_centimes || 0), 0);
  const credit = (ecritures || []).reduce((t, e) => t + (e.credit_centimes || 0), 0);
  return { debit_centimes: debit, credit_centimes: credit,
           equilibre: debit === credit, ecart_centimes: debit - credit };
}

/** Journal des ventes au format CSV. */
export function journalCsv(factures, comptes) {
  const sep = ";";
  const entete = ["Date", "Piece", "Compte", "Libelle", "Debit", "Credit"];
  const lignes = journalVentes(factures, comptes).map((e) => [
    e.date, e.piece, e.compte, e.libelle,
    e.debit_centimes ? dec(e.debit_centimes) : "",
    e.credit_centimes ? dec(e.credit_centimes) : "",
  ].map(champ).join(sep));
  return "\uFEFF" + [entete.join(sep), ...lignes].join("\r\n");
}
