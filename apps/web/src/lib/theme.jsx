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
