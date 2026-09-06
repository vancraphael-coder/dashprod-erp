// =============================================================================
// LE CMR / LETTRE DE VOITURE — obligation légale du transport de marchandises.
//
// CE QUE DIT LE DROIT (repérage, pas avis juridique) :
//   · La CMR (Convention de Genève, 1956) régit le transport ROUTIER
//     INTERNATIONAL de marchandises contre rémunération. La lettre de voiture
//     CMR y est le document de transport ; son absence n'annule pas le contrat,
//     mais elle est exigée aux contrôles et fait foi des conditions convenues.
//   · En Belgique, le transport NATIONAL de marchandises pour compte d'autrui
//     requiert également un document de transport à bord (lettre de voiture
//     nationale), contrôlable sur route.
//   · Le DÉMÉNAGEMENT pour compte d'autrui est un régime distinct du transport
//     de marchandises classique : il relève d'une réglementation propre et
//     n'exige pas une lettre de voiture CMR au sens du transport de fret.
//
// CONSÉQUENCE POUR DASHPROD : ce n'est pas le déménagement qui appelle le CMR,
// c'est la PRESTATION DE TRANSPORT pour un tiers (l'actuelle « sous-traitance » :
// livrer pour un vendeur de meubles ou un transporteur). C'est exactement le
// métier que Raphaël a identifié comme mal nommé.
//
// ⚠️ REPÉRAGE DE TERRAIN, PAS UN AVIS JURIDIQUE. Les seuils, les régimes
// (compte propre / compte d'autrui), les exemptions et les sanctions doivent
// être confirmés par un conseil qualifié en droit belge du transport. Ce module
// dit CE QU'IL FAUT PRÉPARER, il ne dit pas ce qui est légalement suffisant.
// =============================================================================

/**
 * Les natures qui relèvent du transport de marchandises pour compte d'autrui,
 * et appellent donc un document de transport.
 *
 * - `sous_traitance` : livrer/transporter pour un tiers → OUI.
 * - `demenagement`   : régime déménagement → non (document propre au secteur).
 * - `lift`           : prestation de levage, pas de transport de fret → non.
 * - `boxe` / `zone`  : entreposage, aucun déplacement → non.
 * - `vente`          : une livraison de fournitures peut en relever si elle est
 *                      facturée comme transport ; à la marge, on ne présume pas.
 */
const TRANSPORT_MARCHANDISES = Object.freeze(["sous_traitance"]);

/**
 * Cette nature appelle-t-elle un document de transport (CMR ou national) ?
 * @param {string} cle nature de l'affaire
 * @returns {boolean}
 */
export function exigeDocumentTransport(cle) {
  return TRANSPORT_MARCHANDISES.includes(cle);
}

/**
 * Un transport est-il INTERNATIONAL ? La CMR s'applique dès que le lieu de
 * prise en charge et le lieu de livraison sont dans deux pays différents, dont
 * au moins un partie à la Convention.
 * @param {string} paysDepart  code pays (BE, FR, NL…)
 * @param {string} paysArrivee
 */
export function estInternational(paysDepart, paysArrivee) {
  const a = String(paysDepart || "").trim().toUpperCase();
  const b = String(paysArrivee || "").trim().toUpperCase();
  if (!a || !b) return false;          // inconnu ≠ international
  return a !== b;
}

/**
 * Quel régime de document s'applique ?
 * @returns {"cmr"|"national"|"aucun"}
 */
export function regimeDocument(cle, paysDepart, paysArrivee) {
  if (!exigeDocumentTransport(cle)) return "aucun";
  return estInternational(paysDepart, paysArrivee) ? "cmr" : "national";
}

/**
 * Les mentions qu'une lettre de voiture CMR doit porter (art. 6 de la
 * Convention). Sert à vérifier qu'un document joint est complet AVANT le départ
 * — un CMR incomplet se découvre au contrôle, c'est-à-dire trop tard.
 */
export const MENTIONS_CMR = Object.freeze([
  { cle: "date_lieu_etablissement", libelle: "Date et lieu d'établissement" },
  { cle: "expediteur", libelle: "Nom et adresse de l'expéditeur" },
  { cle: "transporteur", libelle: "Nom et adresse du transporteur" },
  { cle: "destinataire", libelle: "Nom et adresse du destinataire" },
  { cle: "lieu_prise_en_charge", libelle: "Lieu et date de prise en charge" },
  { cle: "lieu_livraison", libelle: "Lieu prévu de livraison" },
  { cle: "nature_marchandise", libelle: "Nature de la marchandise et emballage" },
  { cle: "nombre_colis", libelle: "Nombre de colis, marques et numéros" },
  { cle: "poids_brut", libelle: "Poids brut ou quantité" },
  { cle: "frais", libelle: "Frais afférents au transport" },
  { cle: "instructions_douane", libelle: "Instructions douanières (si applicable)" },
  { cle: "mention_convention", libelle: "Mention que le transport est soumis à la CMR" },
]);

/**
 * Vérifie qu'un document de transport porte les mentions requises.
 * Ne juge PAS de la validité juridique : signale ce qui manque visiblement.
 *
 * @param {object} doc  mentions renseignées (clé → valeur)
 * @param {"cmr"|"national"} regime
 * @returns {{complet: boolean, manquantes: {cle,libelle}[]}}
 */
export function verifierMentions(doc = {}, regime = "cmr") {
  // Le régime national exige moins que la CMR : on ne réclame pas les mentions
  // proprement internationales (douane, mention de la Convention).
  const requises = regime === "cmr"
    ? MENTIONS_CMR
    : MENTIONS_CMR.filter((m) =>
        m.cle !== "instructions_douane" && m.cle !== "mention_convention");
  const manquantes = requises.filter((m) => {
    const v = doc?.[m.cle];
    return v === undefined || v === null || String(v).trim() === "";
  });
  return { complet: manquantes.length === 0, manquantes };
}

/**
 * Un transport peut-il partir ? On SIGNALE, on n'interdit pas — c'est la règle
 * du projet, et le chauffeur peut avoir le document sous une autre forme.
 * Mais on le dit clairement, avant le départ.
 *
 * @returns {{peutPartir: boolean, avertissement: string|null}}
 */
export function controleAvantDepart(cle, paysDepart, paysArrivee, doc) {
  const regime = regimeDocument(cle, paysDepart, paysArrivee);
  if (regime === "aucun") return { peutPartir: true, avertissement: null };
  const { complet, manquantes } = verifierMentions(doc, regime);
  if (complet) return { peutPartir: true, avertissement: null };
  const nom = regime === "cmr" ? "lettre de voiture CMR" : "lettre de voiture";
  return {
    peutPartir: true,   // on signale, on ne bloque pas le terrain
    avertissement: `${nom} incomplète : ${manquantes.length} mention(s) manquante(s) `
      + `(${manquantes.slice(0, 3).map((m) => m.libelle).join(", ")}`
      + `${manquantes.length > 3 ? "…" : ""}). Contrôlable sur route.`,
  };
}
