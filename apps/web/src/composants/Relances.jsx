// =============================================================================
// RELANCES — les factures échues et non soldées, à réclamer.
//
// On SIGNALE, on n'envoie rien : c'est une liste de travail, pas un automate.
// La décision de relancer (et comment) reste humaine. Chaque ligne donne le
// numéro, le retard et le solde — de quoi décider, pas d'agir dans le dos.
// =============================================================================

import React from "react";
import { facturesARelancer } from "@domaine/facturation/relances.js";
import { C, S, euros } from "../lib/theme.jsx";

export default function Relances({ factures = [], paiements = [] }) {
  const liste = facturesARelancer(factures, paiements);
  if (liste.length === 0) return null;   // rien en retard → on n'encombre pas

  const total = liste.reduce((s, r) => s + r.solde_centimes, 0);

  return (
    <div style={{ ...S.carte, borderLeft: `3px solid ${C.rouge}` }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "baseline", marginBottom: 4 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.encre }}>
          À relancer
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.rouge }}>
          {euros(total)}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: C.fantome, marginBottom: 10 }}>
        {liste.length} facture{liste.length > 1 ? "s" : ""} échue{liste.length > 1 ? "s" : ""}
        {" "}et non soldée{liste.length > 1 ? "s" : ""}. À vous de décider quand relancer —
        rien n'est envoyé automatiquement.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {liste.map((r) => (
          <div key={r.facture.id} style={{ display: "flex",
              justifyContent: "space-between", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 9,
              background: C.doux || "#F1F5F9" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.encre,
                            fontFamily: "ui-monospace, monospace" }}>
                {r.facture.numero}
              </div>
              <div style={{ fontSize: 11, color: C.rouge, fontWeight: 700 }}>
                En retard de {r.jours_retard} jour{r.jours_retard > 1 ? "s" : ""}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.encre,
                          whiteSpace: "nowrap" }}>
              {euros(r.solde_centimes)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
