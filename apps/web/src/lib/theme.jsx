// =============================================================================
// Thème — langage visuel partagé des écrans.
// Source : design system de l'app validée (Réf. 2, annexe F : chaque couleur a
// un sens fixe, identique partout). Un seul endroit pour les couleurs et les
// badges : les écrans consomment, ne redéfinissent jamais.
// =============================================================================

import React from "react";

export const C = {
  encre: "#0F172A", muet: "#64748B", fantome: "#94A3B8",
  bleu: "#2563EB", bleuFonce: "#1D4ED8", bleuClair: "#EFF6FF",
  bord: "#E4ECFC", fond: "#F4F7FE", doux: "#F1F5FD", blanc: "#FFFFFF",
  vert: "#059669", ambre: "#D97706", rouge: "#DC2626",
  violet: "#7C3AED", indigo: "#6366F1", navy: "#0F172A",
};

// Typographie du modèle validé (roovers-mobile) : Fira Sans pour le texte,
// Fira Code pour les libellés techniques et les montants. Injectées une fois.
export const FS = "'Fira Sans', system-ui, sans-serif";
export const FC = "'Fira Code', ui-monospace, monospace";
if (typeof document !== "undefined" && !document.getElementById("polices-roovers")) {
  const l = document.createElement("link");
  l.id = "polices-roovers"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;600;700;800&family=Fira+Code:wght@500;700&display=swap";
  document.head.appendChild(l);
}

/** États d'affaire → libellé + couleur (Réf. 2, annexe F). */
export const ETATS_UI = {
  brouillon: { libelle: "Brouillon", couleur: C.fantome },
  devis:     { libelle: "Devis",     couleur: C.muet },
  envoye:    { libelle: "Envoyé",    couleur: C.bleu },
  confirme:  { libelle: "Confirmé",  couleur: C.bleu },
  planifie:  { libelle: "Planifié",  couleur: C.bleu },
  en_cours:  { libelle: "En cours",  couleur: C.ambre },
  effectue:  { libelle: "Effectué",  couleur: C.vert },
  facture:   { libelle: "Facturé",   couleur: C.vert },
  paye:      { libelle: "Payé",      couleur: C.vert },
  clos:      { libelle: "Clos",      couleur: C.fantome },
  reporte:   { libelle: "Reporté",   couleur: C.ambre },
  annule:    { libelle: "Annulé",    couleur: C.rouge },
};

/** Zones de marge → couleur (Réf. 2 : rouge / vert / indigo premium). */
export const ZONES_MARGE = {
  sous_cible: C.rouge,
  dans_cible: C.vert,
  premium: C.indigo,
};

export function Badge({ etat }) {
  const e = ETATS_UI[etat] || { libelle: etat, couleur: C.fantome };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: "#fff", background: e.couleur,
      borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap",
    }}>{e.libelle}</span>
  );
}

export function euros(centimes) {
  return (Math.round(centimes) / 100).toLocaleString("fr-BE", {
    style: "currency", currency: "EUR",
  });
}

/** Styles de base réutilisés par tous les écrans. */
export const S = {
  page: { minHeight: "100vh", background: C.fond, fontFamily: FS,
          maxWidth: 520, margin: "0 auto", paddingBottom: 96, color: C.encre },
  entete: { position: "sticky", top: 0, zIndex: 5, background: "rgba(244,247,254,.92)",
            backdropFilter: "blur(8px)", padding: "16px 16px 10px",
            borderBottom: `1px solid ${C.bord}` },
  titre: { fontSize: 19, fontWeight: 800, color: C.encre, fontFamily: FS,
           letterSpacing: "-.01em" },
  carte: { background: C.blanc, borderRadius: 14, padding: 16, margin: "0 16px 12px",
           border: `1px solid ${C.bord}`, boxShadow: "0 1px 3px rgba(15,23,42,.05)" },
  label: { display: "block", fontSize: 10.5, fontWeight: 700, color: C.muet,
           textTransform: "uppercase", letterSpacing: ".05em", fontFamily: FC,
           marginTop: 12, marginBottom: 5 },
  input: { width: "100%", boxSizing: "border-box", padding: "11px 12px",
           border: `1.5px solid ${C.bord}`, borderRadius: 10, fontSize: 14,
           minHeight: 46, background: C.blanc, fontFamily: FS, color: C.encre },
  boutonPlein: { width: "100%", padding: "13px", border: "none", borderRadius: 11,
                 background: `linear-gradient(135deg, ${C.bleu}, ${C.bleuFonce})`,
                 color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                 fontFamily: FS, boxShadow: "0 4px 14px -4px rgba(37,99,235,.5)" },
  boutonLien: { background: "none", border: "none", color: C.bleu, fontSize: 13,
                fontWeight: 600, cursor: "pointer", padding: 6, fontFamily: FS },
  flottant: { position: "fixed", right: 18, bottom: 84, width: 56, height: 56,
              borderRadius: 16, border: "none",
              background: `linear-gradient(135deg, ${C.bleu}, ${C.bleuFonce})`,
              color: "#fff", fontSize: 26, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 10px 24px -6px rgba(37,99,235,.55)" },
};

// ── Icônes de navigation (SVG sobres — trait fin, bleu, sélection verte) ──────
const TRACES = {
  dossiers: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  fiche: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 8h6 M9 12h6 M9 16h4",
  releve: "M21 8l-9-5-9 5 9 5 9-5z M3 8v8l9 5 9-5V8 M12 13v8",
  materiel: "M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z M9 21V12h6v9",
  devis: "M12 2v20 M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  offre: "M17 3l4 4L8 20H4v-4z M14 6l4 4",
  mail: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M3 7l9 6 9-6",
  facture: "M6 2h12v20l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6",
  planning: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M16 3v4 M8 3v4 M4 11h16",
  ressources: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M15 3.13a4 4 0 0 1 0 7.75",
  compte: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0",
  chantiers: "M2 20h20 M5 20V9l7-5 7 5v11 M9 20v-6h6v6",
  outils: "M12 5v14 M5 12h14",
  profil: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0",
  heures: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 3",
};

/** Icône de navigation : trait fin, sobre. */
export function Icone({ nom, taille = 20, couleur = C.bleu }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none"
         stroke={couleur} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
         style={{ display: "block", margin: "0 auto" }}>
      {(TRACES[nom] || TRACES.fiche).split(" M").map((d, i) => (
        <path key={i} d={(i === 0 ? "" : "M") + d} />
      ))}
    </svg>
  );
}

/**
 * Confirmation en deux temps, réutilisable partout (archiver, retirer,
 * modifications non sauvées) : deux boutons côte à côte — action (couleur
 * forte) / Annuler. Aucun window.confirm : tout reste dans le geste tactile.
 */
export function Confirmation({ question, action, couleur = C.rouge, onConfirmer, onAnnuler }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 11, background: "#fff",
                  border: `1.5px solid ${couleur}33`, marginTop: 8 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.encre, marginBottom: 8 }}>
        {question}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onConfirmer} style={{
          flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer",
          background: couleur, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FS,
        }}>{action}</button>
        <button onClick={onAnnuler} style={{
          flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
          border: `1.5px solid ${C.bord}`, background: "#fff",
          color: C.muet, fontSize: 13, fontWeight: 700, fontFamily: FS,
        }}>Annuler</button>
      </div>
    </div>
  );
}

// ── Garde de modifications non sauvées ───────────────────────────────────────
// Un écran d'édition s'enregistre ici (sale ? comment sauvegarder ?) ; toute
// navigation passe par demanderAvantDeQuitter : si des modifications sont en
// attente, l'utilisateur choisit Sauvegarder ou Annuler les modifications
// avant de partir — plus de perte par inadvertance.
export const gardeModifs = { sale: false, sauvegarder: null };

export function declarerModifs(sale, sauvegarder) {
  gardeModifs.sale = sale;
  gardeModifs.sauvegarder = sauvegarder || null;
}
