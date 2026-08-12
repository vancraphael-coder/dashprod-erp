// =============================================================================
// APPARENCE DE L'APP — le réglage visuel de l'espace entreprise.
//
// Un seul endroit décide de la matière et des couleurs ; le thème (theme.jsx)
// s'en sert pour construire C et S, que tous les écrans consomment déjà. On
// change donc l'allure de l'app entière sans réécrire un seul écran.
//
// Trois réglages, dans cet ordre d'importance :
//   • le MODE     : clair (travail de jour, par défaut) ou nuit ;
//   • l'ACCENT    : la couleur des actions et des liens ;
//   • la MATIÈRE  : à quel point les cartes se détachent du fond.
//
// Le réglage est enregistré sur l'appareil. Un ERP se regarde huit heures par
// jour : c'est un confort personnel, pas une décision d'entreprise.
// =============================================================================

const CLE = "dashprod-apparence-v1";

/** Les accents disponibles. Chacun porte sa version foncée et son voile. */
export const ACCENTS = Object.freeze([
  { cle: "route", nom: "Bleu route", vif: "#2563EB", fonce: "#1D4ED8",
    voileClair: "#EFF6FF", voileNuit: "rgba(37,99,235,.16)" },
  { cle: "phare", nom: "Ambre phare", vif: "#D97706", fonce: "#B45309",
    voileClair: "#FFFBEB", voileNuit: "rgba(217,119,6,.18)" },
  { cle: "menthe", nom: "Vert menthe", vif: "#059669", fonce: "#047857",
    voileClair: "#ECFDF5", voileNuit: "rgba(5,150,105,.18)" },
  { cle: "aube", nom: "Violet aube", vif: "#7C3AED", fonce: "#6D28D9",
    voileClair: "#F5F3FF", voileNuit: "rgba(124,58,237,.18)" },
  { cle: "ardoise", nom: "Ardoise", vif: "#334155", fonce: "#1E293B",
    voileClair: "#F1F5F9", voileNuit: "rgba(148,163,184,.16)" },
]);

/** La matière des cartes : du plus sobre au plus marqué. */
export const MATIERES = Object.freeze([
  { cle: "plat", nom: "Plat", resume: "Un simple filet, aucune ombre." },
  { cle: "relief", nom: "Relief", resume: "Ombre douce — le réglage d'origine." },
  { cle: "verre", nom: "Verre", resume: "Surface translucide et lumière rasante, comme le site." },
]);

export const MODES = Object.freeze([
  { cle: "clair", nom: "Clair", resume: "Pour le travail de jour." },
  { cle: "nuit", nom: "Nuit", resume: "Fond sombre, comme l'espace client." },
]);

export const APPARENCE_DEFAUT = Object.freeze({
  mode: "clair", accent: "route", matiere: "relief", rayon: 14, relief: true,
  couleurs: {},   // surcharges par utilité (voir UTILITES ci-dessous)
});

/**
 * Les couleurs qui PORTENT UN SENS, réglables une par une. Elles ne suivent pas
 * l'accent : leur rôle est de se distinguer d'un coup d'œil sur un planning ou
 * une liste. On les regroupe par famille pour que le réglage reste lisible.
 */
export const UTILITES = Object.freeze([
  {
    cle: "etats", nom: "Statut des dossiers",
    resume: "La pastille d'état sur les dossiers et les listes.",
    entrees: [
      { cle: "brouillon", nom: "Brouillon", defaut: "#94A3B8" },
      { cle: "devis", nom: "Devis", defaut: "#64748B" },
      { cle: "confirme", nom: "Confirmé", defaut: "#2563EB" },
      { cle: "planifie", nom: "Planifié", defaut: "#2563EB" },
      { cle: "en_cours", nom: "En cours", defaut: "#D97706" },
      { cle: "effectue", nom: "Effectué", defaut: "#059669" },
      { cle: "clos", nom: "Clos", defaut: "#94A3B8" },
      { cle: "annule", nom: "Annulé", defaut: "#DC2626" },
    ],
  },
  {
    cle: "missions", nom: "Types de travail",
    resume: "Les cartes du planning et de la fiche terrain.",
    entrees: [
      { cle: "demenagement", nom: "Déménagement", defaut: "#16A34A" },
      { cle: "visite", nom: "Visite", defaut: "#2563EB" },
      { cle: "emballage", nom: "Emballage", defaut: "#7C3AED" },
    ],
  },
  {
    cle: "planning", nom: "Planning — disponibilité",
    resume: "Congés et indisponibilités des membres et des véhicules.",
    entrees: [
      { cle: "conge", nom: "Congé approuvé", defaut: "#DC2626" },
      { cle: "demande", nom: "Congé demandé", defaut: "#D97706" },
      { cle: "double", nom: "Déjà affecté", defaut: "#D97706" },
      { cle: "libre", nom: "Disponible", defaut: "#059669" },
    ],
  },
]);

/** La couleur retenue pour une utilité : réglage de la personne, sinon défaut. */
export function couleurUtilite(app, famille, cle) {
  const perso = ((app || {}).couleurs || {})[famille] || {};
  if (perso[cle]) return perso[cle];
  const f = UTILITES.find((u) => u.cle === famille);
  return f?.entrees.find((e) => e.cle === cle)?.defaut || "#64748B";
}

/** Écrit (ou efface, si égal au défaut) une couleur d'utilité. */
export function ecrireCouleur(app, famille, cle, valeur) {
  const f = UTILITES.find((u) => u.cle === famille);
  const defaut = f?.entrees.find((e) => e.cle === cle)?.defaut;
  const couleurs = { ...(app.couleurs || {}) };
  const groupe = { ...(couleurs[famille] || {}) };
  if (!valeur || valeur.toLowerCase() === String(defaut).toLowerCase()) delete groupe[cle];
  else groupe[cle] = valeur;
  couleurs[famille] = groupe;
  return { ...app, couleurs };
}

export function lireApparence() {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return { ...APPARENCE_DEFAUT };
    return { ...APPARENCE_DEFAUT, ...JSON.parse(brut) };
  } catch { return { ...APPARENCE_DEFAUT }; }
}

export function ecrireApparence(a) {
  try { localStorage.setItem(CLE, JSON.stringify({ ...APPARENCE_DEFAUT, ...a })); }
  catch { /* navigation privée : on ne bloque pas */ }
}

export function accentDe(cle) {
  return ACCENTS.find((a) => a.cle === cle) || ACCENTS[0];
}

/**
 * Construit les jetons de couleur à partir d'un réglage. Les CLÉS sont
 * identiques dans les deux modes : les écrans n'ont rien à savoir.
 */
export function jetons(app) {
  const a = accentDe(app.accent);
  if (app.mode === "nuit") {
    return {
      encre: "#EEF2F8", muet: "#8E9BB3", fantome: "#5A6580",
      bleu: a.vif, bleuFonce: a.fonce, bleuClair: a.voileNuit,
      bord: "#26324A", fond: "#070B18", doux: "#1B2436", blanc: "#121A2B",
      vert: "#34D399", ambre: "#FFB627", rouge: "#FB7185",
      violet: "#A78BFA", indigo: "#818CF8", navy: "#070B18",
    };
  }
  return {
    encre: "#0F172A", muet: "#64748B", fantome: "#94A3B8",
    bleu: a.vif, bleuFonce: a.fonce, bleuClair: a.voileClair,
    bord: "#E4ECFC", fond: "#F4F7FE", doux: "#F1F5FD", blanc: "#FFFFFF",
    vert: "#059669", ambre: "#D97706", rouge: "#DC2626",
    violet: "#7C3AED", indigo: "#6366F1", navy: "#0F172A",
  };
}

/**
 * La matière d'une carte : fond, bordure, ombre. C'est ce qui rapproche l'app
 * du site — le « verre » y reprend la surface translucide et le filet lumineux.
 */
export function matiereCarte(app, C) {
  const nuit = app.mode === "nuit";
  if (app.matiere === "plat") {
    return { background: C.blanc, border: `1px solid ${C.bord}`, boxShadow: "none" };
  }
  if (app.matiere === "verre") {
    return nuit ? {
      background: "linear-gradient(145deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.015) 100%)",
      border: "1px solid rgba(255,255,255,.12)",
      borderTop: "1px solid rgba(255,255,255,.28)",
      backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
      boxShadow: "0 22px 46px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.16)",
    } : {
      background: "linear-gradient(145deg, rgba(255,255,255,.96), rgba(248,250,255,.86))",
      border: `1px solid ${C.bord}`,
      borderTop: "1px solid #fff",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      boxShadow: "0 14px 34px -18px rgba(15,23,42,.35), inset 0 1px 0 #fff",
    };
  }
  // relief (défaut) — avec la lumière emprisonnée : un filet clair sur l'arête
  // haute et un reflet interne, comme si la carte gardait un peu de jour.
  return nuit ? {
    background: `linear-gradient(180deg, #182339, ${C.blanc})`,
    border: `1px solid ${C.bord}`,
    borderTop: "1px solid rgba(255,255,255,.22)",
    boxShadow: "0 18px 40px -28px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.14)",
  } : {
    background: C.blanc, border: `1px solid ${C.bord}`,
    borderTop: "1px solid #fff",
    boxShadow: "0 6px 18px -10px rgba(15,23,42,.28), inset 0 1px 0 #fff",
  };
}

/** Le fond de page, avec la lueur d'accent du site en mode nuit. */
export function fondPage(app, C) {
  if (app.mode !== "nuit") return C.fond;
  const a = accentDe(app.accent);
  return `radial-gradient(900px 420px at 80% -10%, ${a.voileNuit}, transparent 60%), ${C.fond}`;
}

/** L'accent en composantes rvb, pour composer des rgba() en CSS. */
export function rgbAccent(cle) {
  const h = accentDe(cle).vif.replace("#", "");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
