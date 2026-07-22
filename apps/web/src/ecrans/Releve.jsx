// =============================================================================
// Écran — Relevé volumétrique.
// Projection du module Relevé (S9) : on ajoute les meubles par pièce, le volume
// total s'accumule en direct (volumeTotal), et une composition est SUGGÉRÉE
// (suggererComposition) — proposition, pas décision : le devis reste souverain.
// Aligné sur le modèle validé roovers-mobile.jsx (catalogue, quantités).
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  obtenirAffaire, enregistrerReleve, obtenirReleve,
  listerVehicules, obtenirCamionsAffaire,
} from "../lib/adaptateur.js";
import { capaciteFlotte, jaugeCapacite } from "@domaine/flotte/vehicules.js";
import {
  volumeTotal, grouperParPiece, volumeUnitaire,
  articlesADemonter,
} from "@domaine/releve/volumetrie.js";
import { obtenirCatalogues } from "../lib/adaptateur.js";
import { catalogue } from "@domaine/stocks/catalogues.js";
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
  // Les pièces viennent de Paramètres → Catalogues, plus celles ajoutées à la
  // volée pour ce relevé précis. Une seule source de vérité, réglable.
  const [cats, setCats] = useState({});
  const [piecesAdHoc, setPiecesAdHoc] = useState([]);
  const [nouvellePiece, setNouvellePiece] = useState("");
  useEffect(() => { obtenirCatalogues().then(setCats).catch(() => {}); }, []);
  const pieces = useMemo(() => {
    const base = catalogue(cats, "pieces").map(String);
    return [...base, ...piecesAdHoc.filter((p) => !base.includes(p))];
  }, [cats, piecesAdHoc]);
  useEffect(() => {
    if (pieces.length && !pieces.includes(piece)) setPiece(pieces[0]);
  }, [pieces, piece]);

  function ajouterPiece() {
    const nom = nouvellePiece.trim();
    if (!nom || pieces.includes(nom)) { setNouvellePiece(""); return; }
    setPiecesAdHoc((v) => [...v, nom]); setPiece(nom); setNouvellePiece("");
  }
  function retirerPiece() {
    setInv((v) => v.filter((it) => it.piece !== piece));
    setPiecesAdHoc((v) => v.filter((p) => p !== piece));
    setSauve(false);
  }
  const [libre, setLibre] = useState("");
  const [camionsSel, setCamionsSel] = useState([]);
  const [sauve, setSauve] = useState(false);

  useEffect(() => {
    obtenirAffaire(affaireId).then(setAffaire);
    obtenirReleve(affaireId).then((r) => setInv(r || []));
    Promise.all([listerVehicules(), obtenirCamionsAffaire(affaireId)])
      .then(([flotte, ids]) => setCamionsSel(flotte.filter((v) => ids.includes(v.id))))
      .catch(() => {});
  }, [affaireId]);

  const volume = useMemo(() => volumeTotal(inv), [inv]);
  const groupes = useMemo(() => grouperParPiece(inv), [inv]);
  const capacite = useMemo(() => capaciteFlotte(camionsSel), [camionsSel]);
  const jauge = useMemo(() => jaugeCapacite(volume, capacite), [volume, capacite]);
  const aDemonter = useMemo(() => articlesADemonter(inv), [inv]);

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

  /** Ajuste le volume UNITAIRE d'un article (le volume saisi prime sur la référence). */
  function ajusterVolume(id, delta) {
    setInv((v) => v.map((it) => {
      if (it.id !== id) return it;
      const actuel = it.vol != null ? it.vol : volumeUnitaire(it.nom);
      return { ...it, vol: Math.max(0, Math.round((actuel + delta) * 100) / 100) };
    }));
    setSauve(false);
  }
  /** Marque un article à démonter/remonter — alimente l'offre et le terrain. */
  function basculerDemontage(id) {
    setInv((v) => v.map((it) => it.id === id ? { ...it, demont: !it.demont } : it));
    setSauve(false);
  }
  function toutDemonter() {
    const tous = inv.length > 0 && inv.every((it) => it.demont);
    setInv((v) => v.map((it) => ({ ...it, demont: !tous })));
    setSauve(false);
  }
  function ajouterLibre() {
    const nom = libre.trim();
    if (!nom) return;
    ajouter(nom);
    setLibre("");
  }

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

      {/* Jauge capacité : volume relevé vs camions sélectionnés au dossier.
          Évite le « tout ne rentre pas » découvert le jour J (alignement 03 §2). */}
      {capacite > 0 && (
        <div style={S.carte}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.muet }}>
              CAPACITÉ CAMIONS
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 800,
              color: jauge.zone === "surcharge" ? C.rouge
                   : jauge.zone === "serre" ? C.ambre : C.vert }}>
              {volume} / {capacite} m³{jauge.zone === "surcharge" ? " — surchargé" : ""}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "#EEF2F9", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${Math.min(100, jauge.pct)}%`, borderRadius: 999,
              background: jauge.zone === "surcharge" ? C.rouge
                        : jauge.zone === "serre" ? C.ambre : C.vert,
            }} />
          </div>
          <div style={{ fontSize: 11, color: C.fantome, marginTop: 5 }}>
            {camionsSel.map((v) => v.nom).join(" · ")}
          </div>
        </div>
      )}

      {/* Sélecteur de pièce */}
      <div style={{ padding: "0 16px", display: "flex", gap: 6, overflowX: "auto", marginBottom: 10 }}>
        {pieces.map((p) => (
          <button key={p} onClick={() => setPiece(p)} style={{
            border: `1.5px solid ${piece === p ? C.bleu : C.bord}`,
            background: piece === p ? "#E7EFFC" : C.blanc,
            color: piece === p ? C.bleu : C.muet,
            borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap",
          }}>{p}</button>
        ))}
        <input value={nouvellePiece} placeholder="+ pièce"
               onChange={(e) => setNouvellePiece(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && ajouterPiece()}
               style={{ border: `1.5px dashed ${C.bord}`, borderRadius: 999,
                        padding: "6px 12px", fontSize: 12, width: 96,
                        color: C.encre, background: C.blanc, outline: "none" }} />
        <button onClick={retirerPiece} title="Retirer cette pièce et ses éléments"
                style={{ border: `1.5px solid ${C.bord}`, background: C.blanc,
                         color: C.rouge, borderRadius: 999, padding: "6px 11px",
                         fontSize: 12, fontWeight: 700, cursor: "pointer",
                         whiteSpace: "nowrap" }}>✕ pièce</button>
      </div>

      {/* Catalogue de la pièce + article libre */}
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
        {/* Un relevé réel contient toujours des objets hors catalogue (aquarium,
            billard…) : sans ce champ, l'outil est inutilisable sur place. */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input style={{ ...S.input, flex: 1 }} value={libre}
                 onChange={(e) => setLibre(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && ajouterLibre()}
                 placeholder="Autre meuble…" />
          <button style={{ ...S.boutonPlein, width: "auto", padding: "0 16px", marginTop: 0 }}
                  onClick={ajouterLibre}>Ajouter</button>
        </div>
      </div>

      {/* Démontage : barre d'action globale */}
      {inv.length > 0 && (
        <div style={{ padding: "0 16px 8px", display: "flex", justifyContent: "space-between",
                      alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.muet }}>
            {aDemonter.length > 0
              ? `${aDemonter.length} article(s) à démonter`
              : "Aucun démontage prévu"}
          </span>
          <button onClick={toutDemonter} style={{ ...S.boutonLien, padding: "4px 8px" }}>
            🔧 Tout démonter
          </button>
        </div>
      )}

      {/* Inventaire groupé par pièce */}
      {groupes.map((g) => (
        <div key={g.piece} style={S.carte}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>{g.piece}</span>
            <span style={{ fontSize: 12.5, color: C.muet }}>{g.volume} m³</span>
          </div>
          {g.articles.map((it) => {
            const unitaire = it.vol != null ? it.vol : volumeUnitaire(it.nom);
            return (
              <div key={it.id} style={{
                padding: "8px 9px", marginBottom: 6, borderRadius: 10,
                background: it.demont ? "#EFF6FF" : "#F8FAFC",
                border: `1px solid ${it.demont ? "#BFDBFE" : "transparent"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C.encre }}>
                    {it.nom}
                  </span>
                  {/* Le démontage est la variable d'heures la plus sous-estimée :
                      le tracer article par article protège la marge et briefe l'équipe. */}
                  <button onClick={() => basculerDemontage(it.id)} title="Démontage"
                          style={{ ...btnQ, width: 32,
                                   borderColor: it.demont ? C.bleu : C.bord,
                                   background: it.demont ? C.bleu : "#fff",
                                   color: it.demont ? "#fff" : C.muet }}>🔧</button>
                  <button onClick={() => quantite(it.id, -1)} style={btnQ}>−</button>
                  <span style={{ minWidth: 20, textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                    {it.quantite}
                  </span>
                  <button onClick={() => quantite(it.id, +1)} style={btnQ}>+</button>
                  <button onClick={() => retirer(it.id)}
                          style={{ ...btnQ, color: C.rouge, borderColor: "#F3C7C7" }}>×</button>
                </div>
                {/* Volume ajustable : un meuble atypique prime sur la référence. */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                  <span style={{ fontSize: 11, color: C.fantome }}>{it.piece}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 2,
                                 background: "#fff", border: `1px solid ${C.bord}`,
                                 borderRadius: 6, padding: "1px 4px", marginLeft: "auto" }}>
                    <button onClick={() => ajusterVolume(it.id, -0.1)} style={btnVol}>−</button>
                    <span style={{ fontSize: 11, fontWeight: 600, minWidth: 58,
                                   textAlign: "center", color: C.encre }}>
                      {(unitaire * it.quantite).toFixed(2)} m³
                    </span>
                    <button onClick={() => ajusterVolume(it.id, +0.1)} style={btnVol}>+</button>
                  </span>
                </div>
              </div>
            );
          })}
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
  background: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#0F172A",
};
const btnVol = {
  border: "none", background: "none", cursor: "pointer", color: "#64748B",
  fontWeight: 700, fontSize: 14, lineHeight: 1, padding: "0 4px",
};
