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
import { demandesReseau, prendreDemandeReseau, monReseau, rejoindreReseau }
  from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

export default function DemandesReseau({ retour }) {
  // Le vide doit dire sa cause. « Aucune demande » et « vous n'êtes pas
  // inscrit au réseau » sont deux situations opposées, et l'écran les
  // affichait pareil.
  const [reseau, setReseau] = useState(null);
  const [bascule, setBascule] = useState(false);
  const [liste, setListe] = useState(null);
  const [err, setErr] = useState(null);

  async function recharger() {
    try { setListe(await demandesReseau()); }
    catch (e) { setErr(e.message); setListe([]); }
  }
  useEffect(() => { recharger(); }, []);
  useEffect(() => {
    monReseau().then(setReseau).catch(() => setReseau({ inscrit: false }));
  }, []);

  async function prendre(id) {
    try { const r = await prendreDemandeReseau(id);
      if (!r.ok && r.message) setErr(r.message);
      await recharger();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {/* Cet écran n'était atteignable QUE par un aller simple : ni bouton de
            retour, ni barre de navigation (absent de RACINES). On y entrait et
            on n'en sortait plus. Signalé à la première mise en service. */}
        {retour && <button style={S.boutonLien} onClick={retour}>← Compte</button>}
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
      {reseau && !reseau.inscrit && (
        <div style={{ ...S.carte, background: C.teinteAmbre,
                      border: `1px solid ${C.filetAmbre}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.encreAmbre }}>
            Votre société n'est pas inscrite au réseau.
          </div>
          <div style={{ fontSize: 12.5, color: C.encreAmbre, marginTop: 5,
                        lineHeight: 1.55 }}>
            Tant qu'elle ne l'est pas, aucune demande ne vous parvient — ce
            n'est pas qu'il n'y en a aucune, c'est qu'elles ne vous sont pas
            présentées. L'inscription est un choix : être visible, c'est
            accepter que d'autres sociétés voient que vous prenez des
            chantiers.
          </div>
          <button style={{ ...S.boutonPlein, marginTop: 12,
                           opacity: bascule ? 0.5 : 1 }}
                  disabled={bascule}
                  onClick={async () => {
                    setBascule(true);
                    try {
                      await rejoindreReseau(true);
                      const r = await monReseau();
                      setReseau(r);
                      recharger();
                    } catch (e) { setErr(e?.message || "Inscription refusée"); }
                    finally { setBascule(false); }
                  }}>
            {bascule ? "…" : "Rejoindre le réseau"}
          </button>
        </div>
      )}

      {reseau?.inscrit && liste && liste.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.fantome, fontSize: 13 }}>
          Aucune demande pour le moment. Vous êtes bien inscrit au réseau.
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
  border: "1px solid #DBEAFE", background: C.teinteBleue, borderRadius: 999,
  padding: "6px 11px",
};

function horodate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-BE", { day: "2-digit", month: "short" });
  } catch { return ""; }
}
