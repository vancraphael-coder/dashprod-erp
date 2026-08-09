// =============================================================================
// DEMANDES DU RÉSEAU (côté déménageur).
//
// Le carnet de pistes partagé : les demandes déposées par des particuliers sur
// la landing. Chaque déménageur du réseau les voit, peut appeler/écrire au
// demandeur, et « prendre » une demande — ce qui la retire du pool commun et la
// marque comme sienne. Prendre une demande ne crée pas de dossier
// automatiquement : le déménageur ouvre le sien ensuite, avec ces coordonnées.
// =============================================================================

import React, { useEffect, useState } from "react";
import { demandesReseau, prendreDemandeReseau } from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

export default function DemandesReseau() {
  const [liste, setListe] = useState(null);
  const [err, setErr] = useState(null);

  async function recharger() {
    try { setListe(await demandesReseau()); }
    catch (e) { setErr(e.message); setListe([]); }
  }
  useEffect(() => { recharger(); }, []);

  async function prendre(id) {
    try { const r = await prendreDemandeReseau(id);
      if (!r.ok && r.message) setErr(r.message);
      await recharger();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={S.titre}>Demandes du réseau</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          Les particuliers qui cherchent un déménageur. Prenez celles qui vous
          conviennent.
        </div>
      </div>

      {err && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{err}</div>}
      {liste == null && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Chargement…
        </div>
      )}
      {liste && liste.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.fantome, fontSize: 13 }}>
          Aucune demande pour le moment.
        </div>
      )}

      {(liste || []).map((d) => {
        const prise = d.statut !== "ouverte";
        return (
        <div key={d.id} style={{ ...S.carte,
              opacity: prise && !d.prise_par_moi ? 0.55 : 1,
              border: `1px solid ${d.prise_par_moi ? C.vert : C.bord}` }}>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
              {[d.prenom, d.nom].filter(Boolean).join(" ")}
            </span>
            <span style={{ fontSize: 11, color: C.fantome }}>{horodate(d.cree_le)}</span>
          </div>

          <div style={{ fontSize: 13, color: C.encre, marginTop: 6 }}>
            {d.depart || "?"} <span style={{ color: C.bleu }}>→</span> {d.arrivee || "?"}
          </div>
          <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
            {[d.volume_estime, d.date_souhaitee && `souhait : ${d.date_souhaitee}`]
              .filter(Boolean).join(" · ")}
          </div>
          {d.description && (
            <div style={{ fontSize: 12.5, color: C.encre, marginTop: 8,
                          whiteSpace: "pre-wrap" }}>{d.description}</div>
          )}

          {(prise ? d.prise_par_moi : true) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {d.tel && <a href={`tel:${d.tel}`} style={lien}>📞 {d.tel}</a>}
              {d.email && <a href={`mailto:${d.email}`} style={lien}>✉️ {d.email}</a>}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            {prise ? (
              <span style={{ fontSize: 12, fontWeight: 700,
                color: d.prise_par_moi ? C.vert : C.fantome }}>
                {d.prise_par_moi ? "✓ Vous avez pris cette demande" : "Déjà prise par un confrère"}
              </span>
            ) : (
              <button style={S.boutonPlein} onClick={() => prendre(d.id)}>
                Prendre cette demande
              </button>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}

const lien = {
  fontSize: 12.5, fontWeight: 700, textDecoration: "none", color: "#2563EB",
  border: "1px solid #DBEAFE", background: "#EFF6FF", borderRadius: 999,
  padding: "6px 11px",
};

function horodate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-BE", { day: "2-digit", month: "short" });
  } catch { return ""; }
}
