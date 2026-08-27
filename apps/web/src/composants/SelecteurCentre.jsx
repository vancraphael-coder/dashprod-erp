// =============================================================================
// LE SÉLECTEUR DE CENTRE — la bascule d'un centre à l'autre.
//
// Secrétaire et au-dessus basculent entre la maison mère et chaque centre ; le
// responsable dépôt est cloisonné au sien (aucun sélecteur ne s'affiche pour
// lui) ; le terrain n'en a pas non plus. La décision vient du domaine
// (`porteeCentres`) — cet écran ne fait qu'afficher ce qu'elle autorise.
//
// « Sans interférer » : choisir un centre ne mélange rien. Chaque écran filtre
// sa liste sur le centre retenu via `filtrerParCentre`.
// =============================================================================

import React from "react";
import { porteeCentres, MAISON_MERE } from "@domaine/organisation/centres.js";
import { C } from "../lib/theme.jsx";

export default function SelecteurCentre({ profil, centres, choisi, onChoisir }) {
  const portee = porteeCentres(
    { poste: profil?.poste, centre_id: profil?.centre_id }, centres || []);

  // Pas de bascule possible → pas de sélecteur. Le responsable dépôt et le
  // terrain travaillent dans leur centre sans avoir à le choisir.
  if (!portee.peutBasculer) return null;

  const options = portee.centresVisibles.map((id) => ({
    id,
    nom: id === MAISON_MERE
      ? "Maison mère"
      : (centres.find((c) => c.id === id)?.nom || "Centre"),
  }));

  const valeur = choisi === undefined ? portee.centreParDefaut : choisi;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8,
                  padding: "0 16px 10px", flexWrap: "wrap" }}>
      <span style={{ fontSize: 11.5, color: C.fantome, fontWeight: 600 }}>
        Centre
      </span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map((o) => {
          const actif = (o.id ?? "mm") === (valeur ?? "mm");
          return (
            <button key={o.id ?? "mm"} onClick={() => onChoisir(o.id)}
              style={{
                border: `1px solid ${actif ? C.encre : C.bord}`,
                background: actif ? C.encre : "transparent",
                color: actif ? "#fff" : C.muet,
                borderRadius: 999, padding: "4px 12px", fontSize: 12,
                fontWeight: actif ? 700 : 500, cursor: "pointer",
              }}>
              {o.nom}
            </button>
          );
        })}
      </div>
    </div>
  );
}
