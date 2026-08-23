// =============================================================================
// Écran — Relevé volumétrique.
// Projection du module Relevé (S9) : on ajoute les meubles par pièce, le volume
// total s'accumule en direct (volumeTotal), et une composition est SUGGÉRÉE
// (suggererComposition) — proposition, pas décision : le devis reste souverain.
// Aligné sur le modèle validé roovers-mobile.jsx (catalogue, quantités).
// =============================================================================

import React, { useEffect, useMemo, useState, useRef} from "react";
import {
  obtenirAffaire, enregistrerReleve, obtenirReleve,
  listerVehicules, obtenirCamionsAffaire,
} from "../lib/adaptateur.js";
import { capaciteFlotte, jaugeCapacite } from "@domaine/flotte/vehicules.js";
import {
  volumeTotal, grouperParPiece, volumeUnitaire,
  articlesADemonter, articlesARemonter,
} from "@domaine/releve/volumetrie.js";
import { obtenirCatalogues } from "../lib/adaptateur.js";
import { catalogue } from "@domaine/stocks/catalogues.js";
import { meublesDePiece } from "@domaine/stocks/meubles-piece.js";
import { C, S, declarerModifs} from "../lib/theme.jsx";
import ReleveDoc from "./ReleveDoc.jsx";
import { obtenirOrganisation } from "../lib/adaptateur.js";

// Catalogue par pièce (roovers-mobile.jsx, CATALOGUE).

function uid() { return "i" + Math.random().toString(36).slice(2, 9); }

export default function Releve({ affaireId, retour, versDevis, modeTerrain }) {
  const [affaire, setAffaire] = useState(null);
  const [inv, setInv] = useState([]);
  const [piece, setPiece] = useState("Salon");
  // Les pièces viennent de Paramètres → Catalogues, plus celles ajoutées à la
  // volée pour ce relevé précis. Une seule source de vérité, réglable.
  const [cats, setCats] = useState({});
  const [piecesAdHoc, setPiecesAdHoc] = useState([]);
  // Article déplié : options et remarque. La ligne reste compacte par défaut —
  // un relevé se fait debout, chez le client, sur un téléphone.
  const [deplie, setDeplie] = useState(null);
  const [nouvellePiece, setNouvellePiece] = useState("");
  useEffect(() => { obtenirCatalogues().then(setCats).catch(() => {}); }, []);
  const [org, setOrg] = useState({});
  useEffect(() => { obtenirOrganisation().then(setOrg).catch(() => {}); }, []);
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
    marquerTouche();
  }
  const [libre, setLibre] = useState("");
  const [camionsSel, setCamionsSel] = useState([]);
  const [sauve, setSauve] = useState(false);
  // `sauve` signale « vient d'être enregistré » ; il vaut false à l'ouverture,
  // il ne peut donc pas servir de drapeau « modifié ». D'où `touche`, mis à
  // vrai par la première modification réelle.
  const [touche, setTouche] = useState(false);
  const [apercu, setApercu] = useState(false);   // aperçu du document PDF (sans m³)
  const sauverRef = useRef(null);

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
  const aRemonter = useMemo(() => articlesARemonter(inv), [inv]);
  // Meubles proposés pour la pièce en cours : réglés dans Paramètres → Pièces
  // du relevé, à défaut le socle livré avec le produit.
  const suggestions = useMemo(() => meublesDePiece(cats, piece), [cats, piece]);

  function ajouter(nom) {
    setInv((v) => {
      // regroupe si déjà présent dans la même pièce
      const existe = v.find((it) => it.nom === nom && it.piece === piece);
      if (existe) return v.map((it) => it === existe ? { ...it, quantite: it.quantite + 1 } : it);
      return [...v, { id: uid(), nom, piece, quantite: 1 }];
    });
    marquerTouche();
  }
  function quantite(id, delta) {
    setInv((v) => v.map((it) => it.id === id
      ? { ...it, quantite: Math.max(1, it.quantite + delta) } : it));
    marquerTouche();
  }
  function retirer(id) { setInv((v) => v.filter((it) => it.id !== id)); marquerTouche(); }

  /** Ajuste le volume UNITAIRE d'un article (le volume saisi prime sur la référence). */
  function ajusterVolume(id, delta) {
    setInv((v) => v.map((it) => {
      if (it.id !== id) return it;
      const actuel = it.vol != null ? it.vol : volumeUnitaire(it.nom);
      return { ...it, vol: Math.max(0, Math.round((actuel + delta) * 100) / 100) };
    }));
    marquerTouche();
  }
  /** Marque un article à démonter/remonter — alimente l'offre et le terrain. */
  function basculerDemontage(id) {
    setInv((v) => v.map((it) => it.id === id ? { ...it, demont: !it.demont } : it));
    marquerTouche();
  }
  /** Remontage : distinct du démontage — voir articlesARemonter (domaine). */
  function basculerRemontage(id) {
    setInv((v) => v.map((it) => it.id === id ? { ...it, remont: !it.remont } : it));
    marquerTouche();
  }
  /** La phrase qui évite la mauvaise surprise le jour J. */
  function definirRemarque(id, texte) {
    setInv((v) => v.map((it) => it.id === id ? { ...it, remarque: texte } : it));
    marquerTouche();
  }
  function toutDemonter() {
    const tous = inv.length > 0 && inv.every((it) => it.demont);
    setInv((v) => v.map((it) => ({ ...it, demont: !tous })));
    marquerTouche();
  }
  function ajouterLibre() {
    const nom = libre.trim();
    if (!nom) return;
    ajouter(nom);
    setLibre("");
  }

  /** Une modification réelle : le garde-fou s'arme. */
  function marquerTouche() { setSauve(false); setTouche(true); }

  // Garde de modifications — AVANT tout return conditionnel (règle des hooks).
  // Toute navigation, y compris la flèche retour, demandera d'abord
  // « Enregistrer / Annuler les modifications ».
  useEffect(() => {
    declarerModifs(touche, () => sauverRef.current && sauverRef.current());
    return () => declarerModifs(false, null);
  }, [touche]);
  sauverRef.current = enregistrer;

  async function enregistrer() {
    await enregistrerReleve(affaireId, inv);
    setSauve(true); setTouche(false);
  }

  return (
    <div style={S.page}>
      {/* Aperçu du document imprimable / PDF — la liste des biens, SANS m³. */}
      {apercu && (
        <div style={{ paddingTop: 12 }}>
          <div className="no-print" style={{ display: "flex", gap: 8,
                margin: "0 16px 10px", alignItems: "center" }}>
            <button style={S.boutonLien} onClick={() => setApercu(false)}>← Retour au relevé</button>
            <button onClick={() => window.print()} style={{
              marginLeft: "auto", padding: "9px 14px", borderRadius: 10,
              border: "none", background: C.bleu, color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              🖨️ Imprimer / Enregistrer en PDF
            </button>
          </div>
          <div className="no-print" style={{ margin: "0 16px 10px", fontSize: 11.5,
                color: C.muet, lineHeight: 1.5 }}>
            Ce document liste les biens sans le volume estimé : il peut être remis
            au client sans dévoiler notre chiffrage.
          </div>
          <ReleveDoc organisation={org} client={affaire?.client}
            reference={affaire?.reference} inventaire={inv} />
        </div>
      )}

      <div style={{ display: apercu ? "none" : "block" }}>
      <div style={S.entete}>
        {!modeTerrain && (
          <button style={S.boutonLien} onClick={retour}>← Dossiers</button>
        )}
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
          <div style={{ height: 8, borderRadius: 999, background: C.teinteNeutre, overflow: "hidden" }}>
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
        {suggestions.length === 0 && (
          <div style={{ fontSize: 11.5, color: C.fantome, marginBottom: 8,
                        lineHeight: 1.45 }}>
            Aucun meuble proposé pour « {piece} ». Réglez-les dans
            Paramètres → Pièces du relevé, ou ajoutez-les à la main ci-dessous.
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {suggestions.map((nom) => (
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
            const ouvertIci = deplie === it.id;
            const aUneRemarque = !!String(it.remarque ?? "").trim();
            return (
              <div key={it.id} style={{
                padding: "8px 9px", marginBottom: 6, borderRadius: 10,
                background: it.demont || it.remont ? C.teinteBleue : C.teinteNeutre,
                border: `1px solid ${it.demont || it.remont ? C.filetBleu : "transparent"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Chevron : la ligne reste compacte, les options se déplient.
                      Un relevé se fait debout, chez le client, sur un téléphone. */}
                  <button onClick={() => setDeplie(ouvertIci ? null : it.id)}
                          aria-label={ouvertIci ? "Replier" : "Options"}
                          style={{ ...btnQ, width: 26, borderColor: "transparent",
                                   background: "transparent", color: C.muet,
                                   fontSize: 12,
                                   // En consultation terrain, tout est gelé sauf
                                   // ce chevron : le chef déroule pour lire la
                                   // remarque, sans rien pouvoir modifier.
                                   ...(modeTerrain ? { pointerEvents: "auto" } : null) }}>
                    {ouvertIci ? "▾" : "▸"}
                  </button>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C.encre }}>
                    {it.nom}
                    {(it.demont || it.remont || aUneRemarque) && (
                      <span style={{ marginLeft: 6, fontSize: 10.5, color: C.fantome }}>
                        {it.demont ? "🔧" : ""}{it.remont ? "🔩" : ""}
                        {aUneRemarque ? "💬" : ""}
                      </span>
                    )}
                  </span>
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
                                 background: C.blanc, border: `1px solid ${C.bord}`,
                                 borderRadius: 6, padding: "1px 4px", marginLeft: "auto" }}>
                    <button onClick={() => ajusterVolume(it.id, -0.1)} style={btnVol}>−</button>
                    <span style={{ fontSize: 11, fontWeight: 600, minWidth: 58,
                                   textAlign: "center", color: C.encre }}>
                      {(unitaire * it.quantite).toFixed(2)} m³
                    </span>
                    <button onClick={() => ajusterVolume(it.id, +0.1)} style={btnVol}>+</button>
                  </span>
                </div>

                {/* Options dépliées. Démonter et remonter sont DEUX drapeaux :
                    une armoire peut partir démontée au garde-meuble sans être
                    remontée, un lit neuf se remonte sans avoir été démonté.
                    Les confondre fausse le temps annoncé. */}
                {ouvertIci && (
                  <div style={{ marginTop: 8, paddingTop: 8,
                                borderTop: `1px solid ${C.bord}` }}>
                    {modeTerrain ? (
                      /* Terrain : lecture seule. Le chef déroule pour voir ce
                         qui a été noté, il ne modifie pas le relevé. */
                      <div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {it.demont && <span style={puceLecture(C.bleu)}>🔧 À démonter</span>}
                          {it.remont && <span style={puceLecture(C.vert)}>🔩 À remonter</span>}
                        </div>
                        <div style={{ marginTop: it.demont || it.remont ? 6 : 0,
                          fontSize: 12.5, color: it.remarque ? C.encre : C.fantome,
                          lineHeight: 1.45 }}>
                          {it.remarque || "Aucune remarque."}
                        </div>
                      </div>
                    ) : (
                    <>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => basculerDemontage(it.id)}
                        style={{ ...btnOption,
                          borderColor: it.demont ? C.bleu : C.bord,
                          background: it.demont ? C.bleu : "#fff",
                          color: it.demont ? "#fff" : C.muet }}>
                        🔧 Démonter
                      </button>
                      <button onClick={() => basculerRemontage(it.id)}
                        style={{ ...btnOption,
                          borderColor: it.remont ? C.vert : C.bord,
                          background: it.remont ? C.vert : "#fff",
                          color: it.remont ? "#fff" : C.muet }}>
                        🔩 Remonter
                      </button>
                    </div>
                    <input value={it.remarque || ""}
                      placeholder="Remarque : accès, fragilité, particularité…"
                      onChange={(e) => definirRemarque(it.id, e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box", marginTop: 6,
                        padding: "8px 10px", borderRadius: 8, fontSize: 12.5,
                        border: `1px solid ${C.bord}`, background: C.blanc,
                        color: C.encre, outline: "none" }} />
                    </>
                    )}
                  </div>
                )}
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
        {!modeTerrain && (
          <button style={{ ...S.boutonLien, width: "100%", textAlign: "center", marginTop: 8 }}
                  onClick={() => setApercu(true)}>
            📄 Aperçu / PDF (liste sans volume)
          </button>
        )}
        {sauve && versDevis && (
          <button style={{ ...S.boutonLien, width: "100%", textAlign: "center", marginTop: 8 }}
                  onClick={() => versDevis(affaireId)}>
            Aller au devis →
          </button>
        )}
      </div>
      </div>
    </div>
  );
}

const btnQ = {
  width: 30, height: 30, borderRadius: 8, border: `1.5px solid #DCE4F0`,
  background: C.blanc, fontSize: 15, fontWeight: 700, cursor: "pointer", color: C.encre,
};
const btnOption = {
  flex: 1, padding: "8px 10px", borderRadius: 9, cursor: "pointer",
  border: "1.5px solid", fontSize: 12.5, fontWeight: 700,
};

const btnVol = {
  border: "none", background: "none", cursor: "pointer", color: "#64748B",
  fontWeight: 700, fontSize: 14, lineHeight: 1, padding: "0 4px",
};

/** Pastille de lecture seule (consultation terrain) : un état, pas un bouton. */
const puceLecture = (couleur) => ({
  fontSize: 11, fontWeight: 700, color: couleur,
  background: couleur + "18", borderRadius: 999, padding: "3px 9px",
});
