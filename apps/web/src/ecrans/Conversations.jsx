// =============================================================================
// CONVERSATIONS — la boîte de réception Mailprod du bureau.
//
// Regroupe tous les échanges avec les clients : une ligne par dossier ayant des
// messages, triée par activité récente, avec le dernier message et le nombre de
// non-lus. Ouvrir une ligne affiche le fil complet (FilMessages).
// =============================================================================

import React, { useEffect, useState } from "react";
import { conversations } from "../lib/adaptateur.js";
import FilMessages from "./FilMessages.jsx";
import { C, S } from "../lib/theme.jsx";

export default function Conversations({ ouvrirDossier }) {
  const [liste, setListe] = useState(null);
  const [ouvert, setOuvert] = useState(null);   // {affaire_id, client}
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    conversations().then(setListe).catch((e) => { setErreur(e.message); setListe([]); });
  }, []);

  if (ouvert) {
    return (
      <div style={S.page}>
        <div style={S.entete}>
          <button style={S.boutonLien} onClick={() => setOuvert(null)}>← Conversations</button>
          <div style={S.titre}>{ouvert.client || "Conversation"}</div>
        </div>
        <div style={S.carte}>
          <FilMessages affaireId={ouvert.affaire_id} cote="entreprise" />
          {ouvrirDossier && (
            <button style={{ ...S.boutonLien, paddingLeft: 0, marginTop: 10 }}
                    onClick={() => ouvrirDossier(ouvert.affaire_id)}>
              Ouvrir le dossier →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={S.titre}>Conversations</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          Tous vos échanges avec les clients, au même endroit.
        </div>
      </div>

      {erreur && <div style={{ margin: "0 16px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}
      {liste == null && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Chargement…
        </div>
      )}
      {liste && liste.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.fantome, fontSize: 13 }}>
          Aucune conversation pour le moment.
        </div>
      )}

      {(liste || []).map((c) => (
        <button key={c.affaire_id} onClick={() => setOuvert(c)}
          style={{ ...S.carte, width: "100%", textAlign: "left", cursor: "pointer",
                   border: `1px solid ${c.non_lus > 0 ? C.bleu : C.bord}`,
                   display: "block" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.encre }}>
              {c.client || "—"}
            </span>
            <span style={{ fontSize: 11, color: C.fantome, whiteSpace: "nowrap" }}>
              {horodate(c.dernier_le)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12.5, color: C.muet, overflow: "hidden",
                           textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {c.dernier_role === "entreprise" ? "Vous : " : ""}{c.dernier_message}
            </span>
            {c.non_lus > 0 && (
              <span style={{ fontSize: 11, fontWeight: 800, color: "#fff",
                background: C.bleu, borderRadius: 999, padding: "2px 8px",
                whiteSpace: "nowrap" }}>{c.non_lus}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function horodate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const auj = new Date();
    return d.toDateString() === auj.toDateString()
      ? d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("fr-BE", { day: "2-digit", month: "short" });
  } catch { return ""; }
}
