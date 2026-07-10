// =============================================================================
// Écran — Relevé volumétrique.
// Projection du module Relevé (S9) : on ajoute les meubles par pièce, le volume
// total s'accumule en direct (volumeTotal), et une composition est SUGGÉRÉE
// (suggererComposition) — proposition, pas décision : le devis reste souverain.
// Aligné sur le modèle validé roovers-mobile.jsx (catalogue, quantités).
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { obtenirAffaire, enregistrerReleve, obtenirReleve } from "../lib/adaptateur.js";
import {
  PIECES, volumeTotal, suggererComposition, grouperParPiece, volumeUnitaire,
} from "@domaine/releve/volumetrie.js";
import { C, S } from "../lib/theme.jsx";

// Catalogue par pièce (roovers-mobile.jsx, CATALOGUE).
const CATALOGUE = {
  "Salon": ["Canapé 3pl", "Canapé 2pl", "Fauteuil", "Table basse", "Meuble TV", "Bibliothèque", "Buffet", "TV"],
  "Chambre": ["Armoire 2p", "Armoire 3p", "Lit 160", "Lit 140", "Lit 90", "Commode", "Chevet", "Matelas"],
  "Cuisine": ["Frigo", "Congélateur", "Lave-linge", "Lave-vaisselle", "Four", "Table", "Chaise"],
  "Salle de bain": ["Meuble vasque", "Colonne", "Sèche-linge", "Étagère"],
  "Bureau": ["Bureau", "Chaise", "Bibliothèque", "Caisse"],
  "Cave/Garage": ["Vélo", "Tondeuse", "Coffre", "Caisse", "Établi"],
  "Autre": ["Piano", "Coffre-fort", "Miroir", "Caisse"],
};

function uid() { return "i" + Math.random().toString(36).slice(2, 9); }

export default function Releve({ affaireId, retour, versDevis }) {
  const [affaire, setAffaire] = useState(null);
  const [inv, setInv] = useState([]);
  const [piece, setPiece] = useState("Salon");
  const [sauve, setSauve] = useState(false);

  useEffect(() => {
    obtenirAffaire(affaireId).then(setAffaire);
    obtenirReleve(affaireId).then((r) => setInv(r || []));
  }, [affaireId]);

  const volume = useMemo(() => volumeTotal(inv), [inv]);
  const compo = useMemo(() => suggererComposition(volume), [volume]);
  const groupes = useMemo(() => grouperParPiece(inv), [inv]);

  function ajouter(nom) {
    setInv((v) => {
      // regroupe si déjà présent dans la même pièce
      const existe = v.find((it) => it.nom === nom && it.piece === piece);
      if (existe) return v.map((it) => it === existe ? { ...it, quantite: it.quantite + 1 } : it);
      return [...v, { id: uid(), nom, piece, quantite: 1 }];
    });
    setSauve(false);
  }
  function quantite(id, delta) {
    setInv((v) => v.map((it) => it.id === id
      ? { ...it, quantite: Math.max(1, it.quantite + delta) } : it));
    setSauve(false);
  }
  function retirer(id) { setInv((v) => v.filter((it) => it.id !== id)); setSauve(false); }

  async function enregistrer() {
    await enregistrerReleve(affaireId, inv);
    setSauve(true);
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Dossiers</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={S.titre}>Relevé — {affaire?.client?.nom || "…"}</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.encre }}>{volume} m³</div>
          </div>
        </div>
      </div>

      {/* Suggestion dérivée du volume */}
      <div style={{ ...S.carte, background: "#EEF4FF", border: `1px solid #C7D9F8` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.bleu }}>SUGGESTION (indicative)</div>
        <div style={{ fontSize: 13.5, color: C.encre, marginTop: 4 }}>
          ~ <b>{compo.demenageurs} déménageurs</b> · <b>{compo.camions} camion{compo.camions > 1 ? "s" : ""}</b>
          <span style={{ color: C.muet }}> — à confirmer au devis</span>
        </div>
      </div>

      {/* Sélecteur de pièce */}
      <div style={{ padding: "0 16px", display: "flex", gap: 6, overflowX: "auto", marginBottom: 10 }}>
        {PIECES.map((p) => (
          <button key={p} onClick={() => setPiece(p)} style={{
            border: `1.5px solid ${piece === p ? C.bleu : C.bord}`,
            background: piece === p ? "#E7EFFC" : C.blanc,
            color: piece === p ? C.bleu : C.muet,
            borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap",
          }}>{p}</button>
        ))}
      </div>

      {/* Catalogue de la pièce */}
      <div style={S.carte}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(CATALOGUE[piece] || []).map((nom) => (
            <button key={nom} onClick={() => ajouter(nom)} style={{
              border: `1.5px solid ${C.bord}`, background: C.blanc, color: C.encre,
              borderRadius: 10, padding: "8px 11px", fontSize: 12.5, cursor: "pointer",
            }}>
              + {nom} <span style={{ color: C.fantome, fontSize: 11 }}>{volumeUnitaire(nom)}m³</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inventaire groupé par pièce */}
      {groupes.map((g) => (
        <div key={g.piece} style={S.carte}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>{g.piece}</span>
            <span style={{ fontSize: 12.5, color: C.muet }}>{g.volume} m³</span>
          </div>
          {g.articles.map((it) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
              <span style={{ flex: 1, fontSize: 13.5, color: C.encre }}>{it.nom}</span>
              <button onClick={() => quantite(it.id, -1)} style={btnQ}>−</button>
              <span style={{ minWidth: 22, textAlign: "center", fontWeight: 700, fontSize: 14 }}>{it.quantite}</span>
              <button onClick={() => quantite(it.id, +1)} style={btnQ}>+</button>
              <button onClick={() => retirer(it.id)} style={{ ...btnQ, color: C.rouge, borderColor: "#F3C7C7" }}>×</button>
            </div>
          ))}
        </div>
      ))}

      {inv.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Ajoutez des meubles depuis le catalogue ci-dessus.
        </div>
      )}

      <div style={{ margin: "0 16px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>
          {sauve ? "✓ Relevé enregistré" : "Enregistrer le relevé"}
        </button>
        {sauve && versDevis && (
          <button style={{ ...S.boutonLien, width: "100%", textAlign: "center", marginTop: 8 }}
                  onClick={() => versDevis(affaireId)}>
            Aller au devis →
          </button>
        )}
      </div>
    </div>
  );
}

const btnQ = {
  width: 30, height: 30, borderRadius: 8, border: `1.5px solid #DCE4F0`,
  background: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", color: "#0F172A",
};
