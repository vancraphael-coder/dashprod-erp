// =============================================================================
// Facturation — Mapping Peppol (UBL BIS 3.0)
// Source : Réf. 3 (T12 : Peppol) et Réf. 2 (facturation structurée).
// La facturation électronique belge (obligation entrante) passe par le réseau
// Peppol au format UBL BIS Billing 3.0. Logique PURE : produire la structure de
// données UBL depuis une facture Dashprod. La sérialisation XML et l'envoi via
// un point d'accès certifié (degré de liberté D-1) sont hors de ce module.
// Les montants sont convertis de centimes vers unités décimales (norme UBL).
// =============================================================================

/** Convertit des centimes en montant décimal chaîne à 2 décimales (norme UBL). */
function dec(centimes) {
  return (Math.round(centimes) / 100).toFixed(2);
}

/**
 * @typedef {Object} PartieUBL
 * @property {string} nom
 * @property {string} tva        numéro de TVA (ex. BE0478363616)
 * @property {string} [rue]
 * @property {string} [ville]
 * @property {string} [cp]
 * @property {string} [pays]     code ISO (défaut BE)
 */

/**
 * Construit la structure UBL BIS 3.0 d'une facture.
 * @param {Object} params
 * @param {string} params.numero          numéro légal de la facture
 * @param {string} params.date            date d'émission ISO (AAAA-MM-JJ)
 * @param {string} [params.echeance]      date d'échéance ISO
 * @param {string} [params.devise="EUR"]
 * @param {PartieUBL} params.vendeur
 * @param {PartieUBL} params.acheteur
 * @param {{type: string, libelle: string, montant_htva_centimes: number}[]} params.lignes
 * @param {number} params.tauxTva
 * @param {{htva_centimes: number, tva_centimes: number, tvac_centimes: number}} params.total
 * @param {string} [params.communication]  communication structurée (OGM/VCS)
 * @returns {Object} document UBL (prêt à sérialiser en XML)
 */
export function versUBL({
  numero, date, echeance, devise = "EUR",
  vendeur, acheteur, lignes, tauxTva, total, communication,
}) {
  if (!numero) throw new Error("versUBL : numéro de facture requis");
  if (!vendeur || !vendeur.tva) throw new Error("versUBL : TVA du vendeur requise");

  return {
    customizationID: "urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0",
    profileID: "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0",
    ID: numero,
    IssueDate: date,
    DueDate: echeance || date,
    InvoiceTypeCode: "380", // facture commerciale
    DocumentCurrencyCode: devise,
    ...(communication ? { PaymentMeans: { PaymentID: communication } } : {}),
    AccountingSupplierParty: partie(vendeur),
    AccountingCustomerParty: partie(acheteur),
    InvoiceLines: (lignes || []).map((l, i) => ({
      ID: String(i + 1),
      Name: l.libelle,
      LineExtensionAmount: { currencyID: devise, value: dec(l.montant_htva_centimes) },
    })),
    TaxTotal: {
      TaxAmount: { currencyID: devise, value: dec(total.tva_centimes) },
      TaxSubtotal: {
        TaxableAmount: { currencyID: devise, value: dec(total.htva_centimes) },
        TaxAmount: { currencyID: devise, value: dec(total.tva_centimes) },
        Percent: tauxTva,
      },
    },
    LegalMonetaryTotal: {
      LineExtensionAmount: { currencyID: devise, value: dec(total.htva_centimes) },
      TaxExclusiveAmount: { currencyID: devise, value: dec(total.htva_centimes) },
      TaxInclusiveAmount: { currencyID: devise, value: dec(total.tvac_centimes) },
      PayableAmount: { currencyID: devise, value: dec(total.tvac_centimes) },
    },
  };
}

function partie(p) {
  if (!p) return null;
  return {
    PartyName: p.nom,
    PostalAddress: {
      StreetName: p.rue || "",
      CityName: p.ville || "",
      PostalZone: p.cp || "",
      Country: { IdentificationCode: p.pays || "BE" },
    },
    PartyTaxScheme: { CompanyID: p.tva, TaxScheme: { ID: "VAT" } },
  };
}
