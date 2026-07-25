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

// =============================================================================
// FEC — Fichier des Écritures Comptables (France).
//
// Format légal français (art. A47 A-1 du LPF), réclamé par l'administration et
// par les cabinets comptables français. Structure fixe : 18 champs obligatoires,
// séparés par tabulation, dans un ordre imposé.
//
// On le génère depuis le MÊME journal des ventes à double entrée que le reste :
// une seule source, une représentation de plus. Le FEC n'invente aucune donnée,
// il reformate les écritures canoniques selon la norme.
//
// Réservé aux clients qui opèrent en France. Pour la Belgique, le journal des
// ventes et le CSV suffisent aux cabinets ; le FEC n'y a pas d'équivalent
// obligatoire.
// =============================================================================

const fecDate = (iso) => String(iso || "").replace(/-/g, "").slice(0, 8);

/**
 * Écritures FEC depuis un lot de factures.
 * `journal` : code et libellé du journal des ventes (par défaut VE / Ventes).
 * Chaque écriture reprend les 18 colonnes réglementaires.
 */
export function ecrituresFec(factures, options = {}) {
  const journalCode = options.journalCode || "VE";
  const journalLib = options.journalLib || "Journal des ventes";
  const comptes = { ...COMPTES_DEFAUT, ...(options.comptes || {}) };

  const lignes = [];
  let numero = Number(options.numeroDepart) || 1;

  for (const f of factures || []) {
    const dateCompta = fecDate(f.date_emission);
    const piece = f.numero;
    // Le libellé identifie la pièce et le tiers.
    const libelle = `${f.acheteur?.nom || "Client"} - ${piece}`;
    // Compte client : on le rattache au tiers par sa TVA quand elle existe.
    const compAux = f.acheteur?.tva || "";
    const signe = f.type === "avoir" ? -1 : 1;

    const ecrire = (compte, compteLib, debit, credit) => {
      lignes.push({
        JournalCode: journalCode,
        JournalLib: journalLib,
        EcritureNum: String(numero),
        EcritureDate: dateCompta,
        CompteNum: compte,
        CompteLib: compteLib,
        CompAuxNum: compte === comptes.clients ? compAux : "",
        CompAuxLib: compte === comptes.clients ? (f.acheteur?.nom || "") : "",
        PieceRef: piece,
        PieceDate: dateCompta,
        EcritureLib: libelle,
        Debit: debit ? montantFec(debit) : "0,00",
        Credit: credit ? montantFec(credit) : "0,00",
        EcritureLet: "",
        DateLet: "",
        ValidDate: dateCompta,
        Montantdevise: "",
        Idevise: "",
      });
    };

    // Débit client TVAC, crédit ventes HT par taux + crédit TVA par taux.
    ecrire(comptes.clients, "Clients", signe * f.total.tvac_centimes, 0);
    for (const t of f.ventilation_tva || []) {
      ecrire(comptes.ventes, `Ventes ${t.taux}%`, 0, signe * t.base_centimes);
      ecrire(comptes.tva_due, `TVA collectée ${t.taux}%`, 0, signe * t.tva_centimes);
    }
    numero += 1;
  }
  return lignes;
}

/** Montant FEC : décimal à virgule, jamais négatif dans la colonne (le sens est
 *  porté par débit/crédit). */
function montantFec(centimes) {
  return (Math.abs(Math.round(centimes)) / 100).toFixed(2).replace(".", ",");
}

/** Les 18 en-têtes réglementaires, dans l'ordre imposé. */
export const FEC_COLONNES = Object.freeze([
  "JournalCode", "JournalLib", "EcritureNum", "EcritureDate", "CompteNum",
  "CompteLib", "CompAuxNum", "CompAuxLib", "PieceRef", "PieceDate",
  "EcritureLib", "Debit", "Credit", "EcritureLet", "DateLet", "ValidDate",
  "Montantdevise", "Idevise",
]);

/**
 * Fichier FEC complet, séparateur tabulation (le plus sûr : les libellés
 * peuvent contenir des points-virgules).
 */
export function versFec(factures, options = {}) {
  const champ = (v) => String(v ?? "").replace(/[\t\r\n]/g, " ");
  const lignes = ecrituresFec(factures, options)
    .map((e) => FEC_COLONNES.map((c) => champ(e[c])).join("\t"));
  return [FEC_COLONNES.join("\t"), ...lignes].join("\r\n");
}
