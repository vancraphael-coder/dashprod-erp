// =============================================================================
// OUTIL DE RAPPROCHEMENT — d'une communication reçue à sa facture.
//
// On colle la communication d'un virement (l'OGM ou le numéro de facture) ; on
// retrouve la facture qu'elle désigne, parmi celles de la période chargée. Le
// travail est PUR (facturation/rapprochement.js) : aucune requête, tout est
// local. C'est l'inverse de l'émission — de la communication vers la facture.
// =============================================================================

import React, { useState } from "react";
import { rapprocherCommunication } from "@domaine/facturation/rapprochement.js";
import { C, S, euros } from "../lib/theme.jsx";

export default function OutilRapprochement({ factures = [] }) {
  const [saisie, setSaisie] = useState("");
  const [resultat, setResultat] = useState(null);

  function chercher() {
    if (!saisie.trim()) { setResultat(null); return; }
    setResultat(rapprocherCommunication(saisie, factures));
  }

  const msg = {
    communication: { texte: "Facture trouvée par sa communication.", couleur: C.vert },
    numero: { texte: "Facture retrouvée par son numéro (communication non stockée).", couleur: C.vert },
    introuvable: { texte: "Aucune facture de la période ne correspond à cette communication.", couleur: C.ambre },
    ambigu: { texte: "Plusieurs factures correspondent : rapprochement impossible sans lever le doute.", couleur: C.rouge },
    illisible: { texte: "Communication non reconnue (ni OGM, ni numéro de facture).", couleur: C.rouge },
  };

  return (
    <div style={{ ...S.carte, borderLeft: `3px solid ${C.bleu}` }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: C.encre, marginBottom: 4 }}>
        Rapprocher un virement
      </div>
      <div style={{ fontSize: 11.5, color: C.fantome, marginBottom: 10 }}>
        Collez la communication d'un virement reçu — l'OGM (+++…+++) ou le numéro
        de facture — pour retrouver la facture qu'elle règle.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && chercher()}
          placeholder="+++123/4567/89012+++ ou 2026-000007"
          style={{ ...S.input, flex: 1, minWidth: 200, fontFamily: "ui-monospace, monospace" }} />
        <button onClick={chercher} disabled={!saisie.trim()}
          style={{ ...S.boutonPlein, width: "auto", padding: "8px 16px", fontSize: 13,
                   opacity: saisie.trim() ? 1 : 0.5 }}>
          Rapprocher
        </button>
      </div>

      {resultat && (
        <div style={{ marginTop: 12 }}>
          {resultat.facture ? (
            <div style={{ padding: 12, borderRadius: 10, background: C.doux || "#F1F5F9" }}>
              <div style={{ fontSize: 12, color: msg[resultat.motif].couleur,
                            fontWeight: 700, marginBottom: 6 }}>
                {msg[resultat.motif].texte}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.encre,
                               fontFamily: "ui-monospace, monospace" }}>
                  {resultat.facture.numero}
                </span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
                  {euros(resultat.facture.total?.tvac_centimes
                    ?? resultat.facture.tvac_centimes ?? 0)}
                </span>
              </div>
              {resultat.facture.communication && (
                <div style={{ fontSize: 11, color: C.fantome, marginTop: 4,
                              fontFamily: "ui-monospace, monospace" }}>
                  {resultat.facture.communication}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, fontWeight: 700,
                          color: msg[resultat.motif].couleur }}>
              {msg[resultat.motif].texte}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
