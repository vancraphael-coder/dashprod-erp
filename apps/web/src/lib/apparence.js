import { accentDepuisMolettes, hexVersRgb } from "@domaine/noyau/couleurs.js";

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

/**
 * Les préréglages d'accent — des points de départ, pas une limite. L'accent
 * réel se choisit sur deux molettes (teinte 0-360 et dégradé 0-100), donc
 * toutes les couleurs sont atteignables.
 */
export const ACCENTS = Object.freeze([
  { cle: "route", nom: "Bleu route", teinte: 221, degrade: 50 },
  { cle: "phare", nom: "Ambre phare", teinte: 32, degrade: 57 },
  { cle: "menthe", nom: "Vert menthe", teinte: 161, degrade: 68 },
  { cle: "aube", nom: "Violet aube", teinte: 262, degrade: 46 },
  { cle: "ardoise", nom: "Ardoise", teinte: 215, degrade: 76 },
  { cle: "brique", nom: "Brique", teinte: 8, degrade: 62 },
  { cle: "sapin", nom: "Sapin", teinte: 150, degrade: 78 },
  { cle: "prune", nom: "Prune", teinte: 300, degrade: 66 },
  { cle: "ocean", nom: "Océan", teinte: 190, degrade: 60 },
  { cle: "rose", nom: "Rose", teinte: 336, degrade: 52 },
]);

/** La PROFONDEUR : à quel point la carte se détache du fond. */
export const PROFONDEURS = Object.freeze([
  { cle: "plat", nom: "Plate", resume: "Un simple filet, aucune ombre." },
  { cle: "relief", nom: "Relief", resume: "Ombre douce — le réglage d'origine." },
  { cle: "flottant", nom: "Flottante", resume: "Ombre portée large, la carte décolle." },
]);

/** La MATIÈRE : de quoi la carte est faite. */
export const MATIERES = Object.freeze([
  { cle: "pleine", nom: "Pleine", resume: "Surface opaque, franche et lisible." },
  { cle: "verre", nom: "Verre",
    resume: "Surface translucide qui retient votre couleur d'accent, et la fait glisser sous la souris." },
]);

export const MODES = Object.freeze([
  { cle: "clair", nom: "Clair", resume: "Pour le travail de jour." },
  { cle: "nuit", nom: "Nuit", resume: "Fond sombre, comme l'espace client." },
]);

export const APPARENCE_DEFAUT = Object.freeze({
  mode: "clair", accent: "route",
  profondeur: "relief", matiere: "pleine",
  rayon: 14, relief: true,
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
    return convertirAncien({ ...APPARENCE_DEFAUT, ...JSON.parse(brut) });
  } catch { return { ...APPARENCE_DEFAUT }; }
}

/**
 * Profondeur et matière étaient un seul réglage (plat / relief / verre). On
 * traduit l'ancien choix vers les deux axes, pour ne pas réinitialiser en
 * silence le réglage de quelqu'un.
 */
function convertirAncien(a) {
  if (a.matiere === "plat") return { ...a, profondeur: "plat", matiere: "pleine" };
  if (a.matiere === "relief") return { ...a, profondeur: "relief", matiere: "pleine" };
  if (a.matiere === "verre" && !a.profondeur) return { ...a, profondeur: "relief" };
  return a;
}

export function ecrireApparence(a) {
  try { localStorage.setItem(CLE, JSON.stringify({ ...APPARENCE_DEFAUT, ...a })); }
  catch { /* navigation privée : on ne bloque pas */ }
}

/**
 * L'accent effectif. On accepte deux formes :
 *  • un réglage complet { teinte, degrade } — le cas courant, molettes libres ;
 *  • une clé de préréglage ("route", "phare"…) — d'anciens réglages enregistrés.
 */
export function accentDe(a) {
  if (a && typeof a === "object" && a.teinte != null) {
    return { ...accentDepuisMolettes(a.teinte, a.degrade ?? 50),
             teinte: a.teinte, degrade: a.degrade ?? 50, nom: "Personnalisée" };
  }
  const p = ACCENTS.find((x) => x.cle === a) || ACCENTS[0];
  return { ...accentDepuisMolettes(p.teinte, p.degrade),
           teinte: p.teinte, degrade: p.degrade, nom: p.nom };
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
 * La surface d'une carte : la MATIÈRE (pleine ou verre) donne le fond et les
 * arêtes, la PROFONDEUR donne l'ombre. Les deux se combinent librement.
 *
 * En verre, la couleur d'accent est réellement « emprisonnée » : elle teinte le
 * fond translucide et l'arête haute, et le moteur des cartes vives la fait
 * glisser sous la souris (voir cartes-vives.js).
 */
export function matiereCarte(app, C) {
  const nuit = app.mode === "nuit";
  const rgb = rgbAccent(app.accent);
  const verre = app.matiere === "verre";

  // ── La matière : fond + arêtes ─────────────────────────────────────────────
  const surface = verre
    ? (nuit ? {
        background: `linear-gradient(145deg, rgba(${rgb},.14) 0%, rgba(255,255,255,.015) 100%)`,
        border: `1px solid rgba(${rgb},.24)`,
        borderTop: "1px solid rgba(255,255,255,.30)",
        backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
      } : {
        background: `linear-gradient(145deg, rgba(${rgb},.07) 0%, rgba(255,255,255,.92) 100%)`,
        border: `1px solid rgba(${rgb},.18)`,
        borderTop: "1px solid #fff",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      })
    : (nuit ? {
        background: `linear-gradient(180deg, #182339, ${C.blanc})`,
        border: `1px solid ${C.bord}`,
        borderTop: "1px solid rgba(255,255,255,.22)",
      } : {
        background: C.blanc,
        border: `1px solid ${C.bord}`,
        borderTop: "1px solid #fff",
      });

  // ── La profondeur ─────────────────────────────────────────────────────────
  //
  // De jour, la profondeur est une OMBRE : la carte assombrit le fond clair.
  //
  // De nuit, ce raisonnement s'effondre. Le fond vaut #070B18, presque noir :
  // une ombre noire posée dessus est INVISIBLE, et les trois profondeurs
  // rendaient exactement la même chose. Sur fond sombre, ce qui est haut est
  // plus CLAIR — c'est la luminance qui porte l'élévation, complétée par une
  // arête haute d'autant plus vive que la carte monte. L'ombre ne sert plus
  // qu'à détacher le bord, resserrée pour rester perceptible.
  const reflet = nuit ? null : "inset 0 1px 0 #fff";

  if (nuit) {
    const paliers = {
      plat:     { haut: "#141C2C", bas: "#101828", rim: 0.08,
                  ombre: "none" },
      relief:   { haut: "#1E2941", bas: "#151E31", rim: 0.20,
                  ombre: "0 2px 5px -1px rgba(0,0,0,.65), 0 14px 30px -22px rgba(0,0,0,1)" },
      flottant: { haut: "#293754", bas: "#1B2540", rim: 0.34,
                  ombre: "0 4px 10px -2px rgba(0,0,0,.75), 0 26px 52px -24px rgba(0,0,0,1)" },
    };
    const p = paliers[app.profondeur] ?? paliers.relief;
    const rimNuit = `inset 0 1px 0 rgba(255,255,255,${p.rim})`;
    const lueur = verre ? `, 0 10px 30px -18px rgba(${rgb},.5)` : "";

    return {
      ...surface,
      // En verre, la teinte d'accent prime : on ne remplace pas son fond, on
      // se contente de faire monter l'arête et l'ombre.
      ...(verre ? {} : {
        background: `linear-gradient(180deg, ${p.haut}, ${p.bas})`,
      }),
      boxShadow: p.ombre === "none" ? rimNuit : `${p.ombre}, ${rimNuit}${lueur}`,
    };
  }

  const ombres = {
    plat: "none",
    relief: "0 6px 18px -10px rgba(15,23,42,.28)",
    flottant: "0 22px 48px -20px rgba(15,23,42,.38)",
  };
  const ombre = ombres[app.profondeur] ?? ombres.relief;
  const lueurVerre = verre ? `, 0 10px 30px -18px rgba(${rgb},.5)` : "";

  return {
    ...surface,
    boxShadow: ombre === "none" ? reflet : `${ombre}, ${reflet}${lueurVerre}`,
  };
}

/** Le fond de page, avec la lueur d'accent du site en mode nuit. */
export function fondPage(app, C) {
  if (app.mode !== "nuit") return C.fond;
  const a = accentDe(app.accent);
  return `radial-gradient(900px 420px at 80% -10%, ${a.voileNuit}, transparent 60%), ${C.fond}`;
}

/** L'accent en composantes rvb, pour composer des rgba() en CSS. */
export function rgbAccent(a) {
  return hexVersRgb(accentDe(a).vif);
}
