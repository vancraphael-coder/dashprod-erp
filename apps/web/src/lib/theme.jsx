// =============================================================================
// Thème — langage visuel partagé des écrans.
// Source : design system de l'app validée (Réf. 2, annexe F : chaque couleur a
// un sens fixe, identique partout). Un seul endroit pour les couleurs et les
// badges : les écrans consomment, ne redéfinissent jamais.
// =============================================================================

import React from "react";

export const C = {
  encre: "#0F172A", muet: "#64748B", fantome: "#94A3B8",
  bleu: "#2563EB", bord: "#DCE4F0", fond: "#F1F5FB", blanc: "#FFFFFF",
  vert: "#059669", ambre: "#D97706", rouge: "#DC2626",
  violet: "#7C3AED", indigo: "#4F46E5",
};

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
  page: { minHeight: "100vh", background: C.fond, fontFamily: "system-ui, sans-serif",
          maxWidth: 520, margin: "0 auto", paddingBottom: 90 },
  entete: { position: "sticky", top: 0, zIndex: 5, background: C.fond,
            padding: "16px 16px 10px" },
  titre: { fontSize: 20, fontWeight: 800, color: C.encre },
  carte: { background: C.blanc, borderRadius: 14, padding: 16, margin: "0 16px 12px",
           boxShadow: "0 2px 10px rgba(15,23,42,.06)" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: C.encre,
           marginTop: 12, marginBottom: 5 },
  input: { width: "100%", boxSizing: "border-box", padding: "11px 12px",
           border: `1.5px solid ${C.bord}`, borderRadius: 10, fontSize: 14,
           background: C.blanc },
  boutonPlein: { width: "100%", padding: "13px", border: "none", borderRadius: 11,
                 background: C.bleu, color: "#fff", fontSize: 14, fontWeight: 700,
                 cursor: "pointer" },
  boutonLien: { background: "none", border: "none", color: C.bleu, fontSize: 13,
                fontWeight: 600, cursor: "pointer", padding: 6 },
  flottant: { position: "fixed", right: 18, bottom: 18, width: 56, height: 56,
              borderRadius: "50%", border: "none", background: C.bleu, color: "#fff",
              fontSize: 26, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 6px 18px rgba(37,99,235,.4)" },
};
