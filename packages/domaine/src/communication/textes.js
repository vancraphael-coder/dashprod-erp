// =============================================================================
// Catalogue des textes réglables — source unique de vérité.
// =============================================================================

import { TEXTES_OFFRE_DEFAUT } from "./brief.js";

export const TEXTES_PDF_DEFAUT = Object.freeze({
  titre: "OFFRE DE PRIX",
  bloc_client: "CLIENT",
  bloc_prestation: "PRESTATION",
  bloc_montant: "MONTANT",
  bloc_remarques: "Remarques",
  formule_forfait: "Formule : forfait",
  elevateur: "Élévateur / lift inclus",
  total_htva: "Total HTVA",
  tva: "TVA 21 %",
  total_tvac: "TOTAL TVAC",
  pied_conditions: "Prestation soumise aux conditions générales de la Chambre Belge des Déménageurs, jointes à cette offre.",
});

export const DEFAUTS_PAR_GROUPE = Object.freeze({
  offre: TEXTES_OFFRE_DEFAUT,
  pdf: TEXTES_PDF_DEFAUT,
});

export const GROUPES_TEXTES = Object.freeze([
  {
    cle: "offre",
    espace: null,
    icone: "✉️",
    titre: "Texte de l'offre",
    resume: "L'email qui accompagne l'offre de prix envoyée au client.",
    apercu: true,
    champs: [
      { cle: "objet", label: "Objet de l'email", aide: "{client} {organisation}" },
      { cle: "salutation", label: "Salutation", aide: "{famille} = nom de famille" },
      { cle: "intro", label: "Phrase d'introduction", long: true },
      { cle: "intro_signee", label: "Ajout si l'offre est signée", long: true },
      { cle: "mention_km", label: "Mention kilométrage" },
      { cle: "validite", label: "Mention de validité", aide: "{validite} = jours" },
      { cle: "validite_jours", label: "Validité (jours)", nombre: true },
      { cle: "formule_politesse", label: "Formule de politesse" },
      { cle: "signataire", label: "Signataire", aide: "nom affiché en bas de l'email" },
      { cle: "pied", label: "Pied de page (facultatif)", long: true },
    ],
  },
  {
    cle: "pdf",
    espace: "pdf",
    icone: "📄",
    titre: "Document PDF de l'offre",
    resume: "Les intitulés imprimés sur le PDF joint à l'offre.",
    champs: [
      { cle: "titre", label: "Titre du document" },
      { cle: "bloc_client", label: "Titre du bloc client" },
      { cle: "bloc_prestation", label: "Titre du bloc prestation" },
      { cle: "bloc_montant", label: "Titre du bloc montant" },
      { cle: "bloc_remarques", label: "Titre du bloc remarques" },
      { cle: "formule_forfait", label: "Mention « forfait »" },
      { cle: "elevateur", label: "Mention élévateur" },
      { cle: "total_htva", label: "Libellé total hors TVA" },
      { cle: "tva", label: "Libellé TVA" },
      { cle: "total_tvac", label: "Libellé total TVA comprise" },
      { cle: "pied_conditions", label: "Mention des conditions générales", long: true },
    ],
  },
  {
    cle: "cgv",
    espace: "cgv",
    icone: "\u2696\ufe0f",
    titre: "Conditions générales de l'offre",
    resume: "Réécrivez chaque article, un par un. Les autres restent intacts.",
    alineas: true,
    champs: [],
  },
  {
    cle: "cbd",
    icone: "📎",
    titre: "Conditions générales C.B.D.",
    resume: "Le PDF joint à chaque offre, à côté de l'offre elle-même.",
    fichier: true,
    champs: [],
  },
]);

export function groupeTextes(cle) {
  return GROUPES_TEXTES.find((g) => g.cle === cle) || null;
}

export function lireGroupe(stockes, groupe) {
  if (!groupe) return {};
  const source = groupe.espace ? (stockes || {})[groupe.espace] : stockes;
  if (!source || typeof source !== "object") return {};
  if (groupe.espace) return { ...source };
  const miennes = new Set(groupe.champs.map((c) => c.cle));
  return Object.fromEntries(Object.entries(source).filter(([k]) => miennes.has(k)));
}

export function ecrireGroupe(stockes, groupe, valeurs) {
  const base = { ...(stockes || {}) };
  const utiles = Object.fromEntries(Object.entries(valeurs || {}).filter(([, v]) => v !== "" && v != null));
  if (groupe.espace) {
    if (Object.keys(utiles).length === 0) delete base[groupe.espace];
    else base[groupe.espace] = utiles;
    return base;
  }
  for (const champ of groupe.champs) delete base[champ.cle];
  return { ...base, ...utiles };
}

export function textesEffectifs(stockes, cleGroupe) {
  const groupe = groupeTextes(cleGroupe);
  if (!groupe) return {};
  return { ...(DEFAUTS_PAR_GROUPE[cleGroupe] || {}), ...lireGroupe(stockes, groupe) };
}