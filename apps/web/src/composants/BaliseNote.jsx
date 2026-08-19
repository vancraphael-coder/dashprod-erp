// =============================================================================
// BALISE NOTE — le petit 'i' de correction, présent sur chaque page.
//
// Un rond 'i' discret. On clique : une note s'ouvre, ancrée sous le bouton
// (pas en bas de l'écran, où elle serait hors de vue). On reclique le 'i' :
// elle se referme. Deux onglets rapides :
//   · Remarque   — ce qui cloche sur CETTE page, à corriger. On écrit, on
//                  envoie : la note part vers le dossier interne.
//   · Historique — les notes déjà déposées sur cette page, plus récentes
//                  d'abord. La mémoire du segment.
//
// La SEULE provenance transmise est `page` (l'écran courant). Aucune donnée
// métier, aucun contexte client : c'est un carnet de corrections, pas un
// rapport. Il sert à Raphaël pour corriger l'app segment par segment, et de
// balise de travail partagée.
// =============================================================================

import React, { useState, useEffect } from "react";
import { noterAtelier, notesPage } from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

export default function BaliseNote({ page, titre }) {
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState("remarque");
  const [texte, setTexte] = useState("");
  const [etat, setEtat] = useState(null);        // null | "envoi" | "ok" | message d'erreur
  const [histo, setHisto] = useState(null);

  // À l'ouverture de l'onglet Historique, on va chercher les notes de la page.
  useEffect(() => {
    if (ouvert && onglet === "historique") {
      setHisto(null);
      notesPage(page).then((n) => setHisto(n || [])).catch(() => setHisto([]));
    }
  }, [ouvert, onglet, page]);

  async function envoyer() {
    if (!texte.trim()) return;
    setEtat("envoi");
    try {
      await noterAtelier(page, "remarque", texte);
      setTexte("");
      setEtat("ok");
      setTimeout(() => setEtat(null), 1800);
    } catch (e) {
      setEtat(e.message || "Échec de l'envoi");
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* LE BOUTON 'i'. Un rond sobre ; il s'allume quand la note est ouverte,
          pour dire « reclique pour fermer ». */}
      <button
        onClick={() => setOuvert((v) => !v)}
        aria-label={ouvert ? "Fermer la note" : "Ouvrir une note sur cette page"}
        aria-expanded={ouvert}
        title={titre ? `Note — ${titre}` : "Note de page"}
        style={{
          width: 24, height: 24, borderRadius: "50%", cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic",
          fontSize: 14, fontWeight: 700, lineHeight: 1,
          border: `1.5px solid ${ouvert ? C.bleu : C.bord}`,
          background: ouvert ? C.bleu : "transparent",
          color: ouvert ? "#fff" : C.muet,
          transition: "all .15s ease",
        }}>
        i
      </button>

      {ouvert && (
        <>
          {/* Un voile transparent : cliquer à côté referme la note, sans
              bloquer la lecture de la page derrière. */}
          <div onClick={() => setOuvert(false)}
               style={{ position: "fixed", inset: 0, zIndex: 40 }} />

          {/* LE PANNEAU. Ancré SOUS le 'i', calé à droite pour ne pas déborder
              hors de l'écran. Largeur lisible, jamais collé au bas. */}
          <div style={{
            position: "absolute", top: 30, right: 0, zIndex: 41,
            width: "min(300px, calc(100vw - 32px))",
            background: C.blanc, border: `1px solid ${C.bord}`,
            borderRadius: 12, boxShadow: "0 12px 32px -8px rgba(15,23,42,.28)",
            overflow: "hidden",
          }}>
            {/* Les deux onglets rapides. */}
            <div style={{ display: "flex", borderBottom: `1px solid ${C.bord}` }}>
              {[["remarque", "Remarque"], ["historique", "Historique"]].map(([cle, lib]) => {
                const actif = onglet === cle;
                return (
                  <button key={cle} onClick={() => setOnglet(cle)} style={{
                    flex: 1, padding: "9px 8px", cursor: "pointer",
                    background: "none", border: "none",
                    borderBottom: `2px solid ${actif ? C.bleu : "transparent"}`,
                    fontSize: 12, fontWeight: 700,
                    color: actif ? C.encre : C.muet,
                  }}>{lib}</button>
                );
              })}
            </div>

            <div style={{ padding: 12 }}>
              {onglet === "remarque" ? (
                <>
                  {/* La provenance, dite en clair : la personne sait ce qui
                      partira avec sa note — la page, rien d'autre. */}
                  <div style={{ fontSize: 10.5, color: C.fantome, marginBottom: 7,
                                fontFamily: "monospace" }}>
                    Page : {titre || page}
                  </div>
                  <textarea
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    autoFocus
                    placeholder="Ce qui cloche ou manque ici…"
                    rows={4}
                    style={{ ...S.input, minHeight: 74, resize: "vertical",
                             fontSize: 13, lineHeight: 1.45 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8,
                                marginTop: 8 }}>
                    <button onClick={envoyer}
                      disabled={!texte.trim() || etat === "envoi"}
                      style={{ ...S.boutonPlein, width: "auto", padding: "8px 16px",
                               fontSize: 13,
                               opacity: !texte.trim() || etat === "envoi" ? .5 : 1 }}>
                      {etat === "envoi" ? "Envoi…" : "Envoyer"}
                    </button>
                    {etat === "ok" && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.vert }}>
                        Noté ✓
                      </span>
                    )}
                    {etat && etat !== "envoi" && etat !== "ok" && (
                      <span style={{ fontSize: 11.5, color: C.rouge }}>{etat}</span>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {histo == null && (
                    <div style={{ fontSize: 12, color: C.muet, textAlign: "center",
                                  padding: "12px 0" }}>Chargement…</div>
                  )}
                  {histo && histo.length === 0 && (
                    <div style={{ fontSize: 12, color: C.fantome, textAlign: "center",
                                  padding: "12px 0" }}>
                      Aucune note sur cette page.
                    </div>
                  )}
                  {(histo || []).map((n) => (
                    <div key={n.id} style={{ padding: "8px 0",
                      borderTop: `1px solid ${C.doux || C.bord}` }}>
                      <div style={{ fontSize: 12.5, color: C.encre, lineHeight: 1.45,
                                    whiteSpace: "pre-wrap" }}>{n.texte}</div>
                      <div style={{ fontSize: 10, color: C.fantome, marginTop: 3 }}>
                        {n.onglet === "historique" ? "Historique" : "Remarque"}
                        {" · "}{datecourte(n.cree_le)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function datecourte(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-BE",
      { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}
