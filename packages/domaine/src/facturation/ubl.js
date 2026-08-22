// =============================================================================
// Adaptateur UBL BIS Billing 3.0 — sérialisation XML réelle.
//
// Ce module transforme une facture canonique en XML UBL. Il ne transmet RIEN :
// l'envoi passe par un point d'accès Peppol certifié, qui n'est pas encore
// configuré. Produire le XML et le transmettre sont deux responsabilités
// distinctes, et les confondre est la faute d'architecture classique.
//
// Ce qui est ici est vrai : la structure suit le profil
// urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0.
// Ce qui n'est pas ici est absent : aucun statut réseau n'est simulé.
// =============================================================================

import { valider } from "./modele.js";

const dec = (centimes) => (Math.round(centimes) / 100).toFixed(2);

/** Échappe le texte destiné à un nœud XML. */
function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/**
 * Schéma d'identifiant Peppol. « 0208:0478363616 » → schemeID 0208.
 * 0208 = numéro d'entreprise belge (BCE). On ne devine jamais le schéma :
 * un identifiant sans préfixe est renvoyé tel quel, sans schemeID inventé.
 */
function idPeppol(valeur) {
  const s = String(valeur ?? "").trim();
  const m = s.match(/^(\d{4}):(.+)$/);
  return m ? { scheme: m[1], id: m[2] } : { scheme: null, id: s };
}

function partieXml(balise, p) {
  const pid = idPeppol(p.peppol_id);
  return `  <cac:${balise}>
    <cac:Party>
${pid.id ? `      <cbc:EndpointID${pid.scheme ? ` schemeID="${esc(pid.scheme)}"` : ""}>${esc(pid.id)}</cbc:EndpointID>\n` : ""}${pid.id ? `      <cac:PartyIdentification><cbc:ID${pid.scheme ? ` schemeID="${esc(pid.scheme)}"` : ""}>${esc(pid.id)}</cbc:ID></cac:PartyIdentification>\n` : ""}      <cac:PartyName><cbc:Name>${esc(p.nom)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(p.rue)}</cbc:StreetName>
        <cbc:CityName>${esc(p.ville)}</cbc:CityName>
        <cbc:PostalZone>${esc(p.cp)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${esc(p.pays || "BE")}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(p.tva)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${esc(p.nom)}</cbc:RegistrationName>
        <cbc:CompanyID>${esc(p.tva)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:${balise}>`;
}

/**
 * Sérialise une facture canonique en UBL BIS Billing 3.0.
 * Refuse si la facture n'est pas valide POUR CE CANAL : mieux vaut une erreur
 * ici qu'un rejet du réseau plusieurs heures après l'envoi.
 */
/**
 * La catégorie et le taux d'une ligne, LUS dans la ventilation qualifiée.
 * `versXmlUBL` ne décide plus rien en matière de TVA : la qualification a eu
 * lieu en amont (facturation/tva.js) et le document ne fait que la transcrire.
 * Si la ligne ne correspond à aucun groupe qualifié, on échoue — jamais de
 * repli sur « S / 21 % », qui produirait un document fiscalement faux.
 */
function categorieLigne(f, l) {
  const groupes = f.ventilation_tva || [];
  if (groupes.length === 0) {
    throw new Error("Aucune ventilation TVA : facture non transmissible.");
  }
  if (l.tva_pct == null) {
    if (groupes.length === 1) return groupes[0];
    throw new Error("Ligne sans taux de TVA sur une facture à plusieurs taux : "
      + "impossible de savoir lequel appliquer.");
  }
  const g = groupes.find((x) => Number(x.taux) === Number(l.tva_pct));
  if (!g) {
    throw new Error(`Taux ${l.tva_pct} % absent de la ventilation qualifiée.`);
  }
  return g;
}

export function versXmlUBL(f) {
  const v = valider(f, "PEPPOL");
  if (!v.valide) {
    throw new Error(`Facture non conforme pour Peppol : ${v.erreurs.join(" · ")}`);
  }

  // PEPPOL-EN16931-R003, drapeau `fatal` : « A buyer reference or purchase
  // order reference MUST be provided ». Sans BuyerReference NI OrderReference,
  // le point d'accès REJETTE le document. On échoue donc ici, avec un motif
  // utile, plutôt que de laisser partir une transmission vouée au rejet.
  // On n'invente pas de valeur de repli : ce serait mettre une donnée fausse
  // dans un document légal (voir §4.16 — rien ne se devine).
  if (!String(f.reference_acheteur ?? "").trim()) {
    throw new Error(
      "Référence de l'acheteur manquante : Peppol l'exige (règle "
      + "PEPPOL-EN16931-R003). Renseignez le bon de commande ou la référence "
      + "interne du client sur la facture.");
  }

  // Un avoir DOIT dire quelle facture il corrige — mention légale, et donnée
  // déjà présente dans le modèle (`facture_corrigee`) mais jamais émise
  // jusqu'ici : l'avoir partait orphelin.
  if (f.type === "avoir" && !String(f.facture_corrigee ?? "").trim()) {
    throw new Error("Un avoir doit référencer la facture qu'il corrige.");
  }

  const typeCode = f.type === "avoir" ? "381" : "380";
  const racine = f.type === "avoir" ? "CreditNote" : "Invoice";
  const nsRacine = f.type === "avoir"
    ? "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
    : "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";
  const baliseLigne = f.type === "avoir" ? "CreditNoteLine" : "InvoiceLine";
  const baliseQte = f.type === "avoir" ? "CreditedQuantity" : "InvoicedQuantity";

  const lignes = f.lignes.map((l, i) => `  <cac:${baliseLigne}>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:${baliseQte} unitCode="C62">${Number(l.quantite).toFixed(3)}</cbc:${baliseQte}>
    <cbc:LineExtensionAmount currencyID="${esc(f.devise)}">${dec(l.montant_htva_centimes)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${esc(l.libelle)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${esc(categorieLigne(f, l).categorie)}</cbc:ID>
        <cbc:Percent>${categorieLigne(f, l).taux.toFixed(2)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${esc(f.devise)}">${dec(l.prix_unitaire_centimes)}</cbc:PriceAmount>
    </cac:Price>
  </cac:${baliseLigne}>`).join("\n");

  const sousTotaux = f.ventilation_tva.map((t) => `    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${esc(f.devise)}">${dec(t.base_centimes)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${esc(f.devise)}">${dec(t.tva_centimes)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${esc(t.categorie)}</cbc:ID>
        <cbc:Percent>${Number(t.taux).toFixed(2)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`).join("\n");

  const htva = Math.abs(f.total.htva_centimes);
  const tva = Math.abs(f.total.tva_centimes);
  const tvac = Math.abs(f.total.tvac_centimes);

  return `<?xml version="1.0" encoding="UTF-8"?>
<${racine} xmlns="${nsRacine}"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${esc(f.numero)}</cbc:ID>
  <cbc:IssueDate>${esc(f.date_emission)}</cbc:IssueDate>
  <cbc:DueDate>${esc(f.echeance)}</cbc:DueDate>
  <cbc:${f.type === "avoir" ? "CreditNoteTypeCode" : "InvoiceTypeCode"}>${typeCode}</cbc:${f.type === "avoir" ? "CreditNoteTypeCode" : "InvoiceTypeCode"}>
  <cbc:DocumentCurrencyCode>${esc(f.devise)}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${esc(f.reference_acheteur)}</cbc:BuyerReference>
${(f.prestation_debut || f.prestation_fin) ? `  <cac:InvoicePeriod>
${f.prestation_debut ? `    <cbc:StartDate>${esc(f.prestation_debut)}</cbc:StartDate>\n` : ""}${f.prestation_fin ? `    <cbc:EndDate>${esc(f.prestation_fin)}</cbc:EndDate>\n` : ""}  </cac:InvoicePeriod>\n` : ""}${f.facture_corrigee ? `  <cac:BillingReference>
    <cac:InvoiceDocumentReference><cbc:ID>${esc(f.facture_corrigee)}</cbc:ID></cac:InvoiceDocumentReference>
  </cac:BillingReference>\n` : ""}${partieXml("AccountingSupplierParty", f.vendeur)}
${partieXml("AccountingCustomerParty", f.acheteur)}
${(f.communication || f.vendeur.iban) ? `  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>31</cbc:PaymentMeansCode>
${f.communication ? `    <cbc:PaymentID>${esc(f.communication)}</cbc:PaymentID>\n` : ""}${f.vendeur.iban ? `    <cac:PayeeFinancialAccount><cbc:ID>${esc(f.vendeur.iban)}</cbc:ID></cac:PayeeFinancialAccount>\n` : ""}  </cac:PaymentMeans>\n` : ""}  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${esc(f.devise)}">${dec(tva)}</cbc:TaxAmount>
${sousTotaux}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${esc(f.devise)}">${dec(htva)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${esc(f.devise)}">${dec(htva)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${esc(f.devise)}">${dec(tvac)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${esc(f.devise)}">${dec(tvac)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lignes}
</${racine}>`;
}

// =============================================================================
// Machine d'états de transmission.
//
// Une transmission avance, elle ne saute pas d'étape et ne revient pas en
// arrière. Un statut ne s'écrit QUE sur retour réel du point d'accès :
// marquer « DELIVREE » sans preuve reviendrait à mentir sur une obligation
// légale.
// =============================================================================

export const PASSAGES = Object.freeze({
  BROUILLON: ["VALIDEE", "ECHEC"],
  VALIDEE:   ["PRETE", "ECHEC"],
  PRETE:     ["SOUMISE", "ECHEC"],
  SOUMISE:   ["ACCEPTEE", "REJETEE", "ECHEC"],
  ACCEPTEE:  ["DELIVREE", "REJETEE", "ECHEC"],
  DELIVREE:  [],
  REJETEE:   [],
  ECHEC:     ["PRETE"],   // seul retour permis : on réessaie après correction
});

export function passagePermis(de, vers) {
  return (PASSAGES[de] || []).includes(vers);
}

/** États terminaux : plus aucune transition possible. */
export function estTermine(etat) {
  return (PASSAGES[etat] || []).length === 0;
}

/**
 * Prépare une transmission. S'arrête à PRETE : la soumission exige un point
 * d'accès configuré, qui n'existe pas encore. On ne fabrique pas de référence
 * de transmission, on dit ce qui manque.
 */
export function preparerTransmission(f, canal = "PEPPOL") {
  const v = valider(f, canal);
  if (!v.valide) {
    return { etat: "ECHEC", erreurs: v.erreurs, charge_utile: null,
             cle_idempotence: null };
  }
  const charge = canal === "PEPPOL" ? versXmlUBL(f) : null;
  return {
    etat: "PRETE",
    erreurs: [],
    charge_utile: charge,
    // Idempotence : même facture + même canal = même clé. Deux envois
    // accidentels ne produisent pas deux factures chez le destinataire.
    cle_idempotence: `${canal}:${f.numero}:${f.date_emission}`,
  };
}
