// =============================================================================
// Document RELEVÉ imprimable / PDF.
//
// Même signature visuelle que l'offre et la facture finale, avec en-tête navy
// et pied de page — pour être envoyé tel quel. IMPORTANT : ce document ne montre PAS les
// volumes en m³. Le relevé est un inventaire ; si le client le transmet à un
// concurrent, il ne doit pas y trouver notre estimation de volume (le cœur du
// chiffrage). On ne livre que la LISTE des biens, pièce par pièce.
// =============================================================================

import React from "react";
import { grouperParPiece } from "@domaine/releve/volumetrie.js";

const NAVY = "#0F172A";

export default function ReleveDoc({ organisation, client, reference, inventaire }) {
  const o = organisation || {};
  const cl = client || {};
  const groupes = grouperParPiece(inventaire || []);
  const totalArticles = (inventaire || []).reduce((n, it) => n + (Number(it.quantite) || 1), 0);

  return (
    <div className="contrat-imprimable" style={S.doc}>
      {/* En-tête émetteur — identique aux autres documents. */}
      <div style={S.entete}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={S.enteteNom}>{o.nom || "—"}</div>
            <div style={S.enteteSous}>Inventaire du déménagement</div>
          </div>
          <div style={S.enteteDroite}>
            {o.bce || ""}<br />{o.tel || ""}
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "baseline", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
            {cl.nom || "—"}
          </div>
          <div style={{ fontSize: 11, color: "#64748B" }}>
            {reference ? `Réf. ${reference}` : ""}
          </div>
        </div>

        {groupes.length === 0 && (
          <div style={{ fontSize: 12.5, color: "#94A3B8" }}>
            Aucun bien relevé pour le moment.
          </div>
        )}

        {groupes.map((g) => (
          <div key={g.piece} style={{ marginBottom: 12 }}>
            <div style={S.legende}>{g.piece}</div>
            {g.articles.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0",
                     borderTop: `1px solid #EEF2F8`, fontSize: 12.5, color: NAVY }}>
                <span style={{ fontWeight: 700, minWidth: 26 }}>
                  {(a.quantite || 1) > 1 ? `${a.quantite}×` : "1×"}
                </span>
                <span style={{ flex: 1 }}>
                  {a.nom}
                  {a.demont && <span style={{ color: "#2563EB" }}> · à démonter</span>}
                  {a.remont && <span style={{ color: "#16A34A" }}> · à remonter</span>}
                  {a.remarque && (
                    <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>
                      {a.remarque}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        ))}

        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `2px solid #E4ECFC`,
                      display: "flex", justifyContent: "space-between",
                      fontSize: 12.5, fontWeight: 800, color: NAVY }}>
          <span>Total des biens</span>
          <span>{totalArticles}</span>
        </div>

        <div style={S.piedLegal}>
          Inventaire établi contradictoirement lors du relevé. La liste ci-dessus
          recense les biens à déménager. Le volume et la composition de l'équipe
          font l'objet de l'offre commerciale, distincte de cet inventaire.
        </div>
      </div>
    </div>
  );
}

const S = {
  doc: { background: "#fff", borderRadius: 14, border: "1px solid #E4ECFC",
         overflow: "hidden", margin: "0 16px 14px" },
  entete: { background: `linear-gradient(135deg, ${NAVY}, #1e3a5f)`, padding: "16px 18px" },
  enteteNom: { color: "#fff", fontWeight: 800, fontSize: 17 },
  enteteSous: { fontSize: 10, color: "#93C5FD", letterSpacing: ".12em",
                textTransform: "uppercase", marginTop: 3 },
  enteteDroite: { textAlign: "right", fontSize: 9.5, color: "rgba(255,255,255,.6)",
                  lineHeight: 1.6 },
  legende: { fontSize: 10, fontWeight: 700, textTransform: "uppercase",
             letterSpacing: ".05em", color: "#64748B", marginBottom: 4 },
  piedLegal: { marginTop: 12, fontSize: 9, color: "#94A3B8", lineHeight: 1.6 },
};
