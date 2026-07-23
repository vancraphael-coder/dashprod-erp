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
export function versXmlUBL(f) {
  const v = valider(f, "PEPPOL");
  if (!v.valide) {
    throw new Error(`Facture non conforme pour Peppol : ${v.erreurs.join(" · ")}`);
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
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${Number(l.tva_pct ?? f.ventilation_tva[0]?.taux ?? 21).toFixed(2)}</cbc:Percent>
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
        <cbc:ID>S</cbc:ID>
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
${partieXml("AccountingSupplierParty", f.vendeur)}
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
