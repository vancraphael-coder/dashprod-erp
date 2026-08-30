// =============================================================================
// CHOIX D'ESPACE À LA CRÉATION (remarque R1).
//
// Quand plusieurs centres existent, créer un dossier ne doit pas être silencieux :
// on demande dans QUEL espace il naît (maison mère ou centre X). Le dossier sera
// rattaché à cet espace, ses ressources en seront reprises, et il portera le
// libellé du centre en maison mère. Petit panneau modal, un choix, on continue.
// =============================================================================

import React from "react";
import { C, S } from "../lib/theme.jsx";

export default function ChoixEspace({ espaces = [], titreNature, onChoisir, onAnnuler }) {
  return (
    <div onClick={onAnnuler} style={{
      position: "fixed", inset: 0, zIndex: 60, background: "rgba(8,12,26,.42)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(360px, 100%)", background: C.blanc, borderRadius: 16,
        border: `1px solid ${C.bord}`, boxShadow: "0 24px 60px -16px rgba(8,12,26,.4)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "16px 18px 10px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
            Dans quel espace créer ce dossier&nbsp;?
          </div>
          <div style={{ fontSize: 12, color: C.muet, marginTop: 4 }}>
            {titreNature ? `${titreNature} — ` : ""}le dossier et ses ressources
            seront rattachés à l'espace choisi.
          </div>
        </div>
        <div style={{ padding: "4px 10px 12px", display: "flex",
                      flexDirection: "column", gap: 6 }}>
          {espaces.map((e) => (
            <button key={e.id ?? "mm"} onClick={() => onChoisir(e.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", textAlign: "left", padding: "12px 14px",
                borderRadius: 11, cursor: "pointer",
                border: `1px solid ${C.bord}`, background: "transparent",
                fontSize: 14, fontWeight: 700, color: C.encre,
              }}>
              {e.nom}
              {e.id === null && (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.fantome }}>
                  vue d'ensemble
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={onAnnuler} style={{
          width: "100%", padding: "11px", border: "none", cursor: "pointer",
          borderTop: `1px solid ${C.bord}`, background: "transparent",
          fontSize: 12.5, fontWeight: 700, color: C.muet,
        }}>Annuler</button>
      </div>
    </div>
  );
}
