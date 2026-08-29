// =============================================================================
// PHOTOS DE CONSTAT — galerie + ajout, réutilisable terrain et bureau.
//
// Le terrain attache la preuve visuelle ; le bureau la consulte. Même composant,
// deux contextes. `peutAjouter` distingue qui peut téléverser. Le bucket est
// privé : chaque photo s'ouvre via une URL signée courte.
// =============================================================================

import React, { useEffect, useState, useRef } from "react";
import {
  photosConstat, ajouterPhotoConstat, urlPhotoConstat, supprimerPhotoConstat,
} from "../lib/adaptateur.js";
import { trierPhotos, MAX_PHOTOS_CONSTAT } from "@domaine/operations/photos-constat.js";

export default function PhotosConstat({ constatId, peutAjouter = false, sombre = false }) {
  const [photos, setPhotos] = useState([]);
  const [urls, setUrls] = useState({});      // id → URL signée
  const [err, setErr] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [apercu, setApercu] = useState(null); // URL en grand
  const [info, setInfo] = useState(null);     // confirmation d'envoi
  const inputRef = useRef(null);              // l'input fichier, déclenché par le bouton

  async function charger() {
    try {
      const liste = await photosConstat(constatId);
      setPhotos(liste);
      // URL signée pour chaque vignette.
      const u = {};
      for (const p of liste) {
        try { u[p.id] = await urlPhotoConstat(p.chemin); } catch { /* ignore */ }
      }
      setUrls(u);
    } catch { setPhotos([]); }
  }
  useEffect(() => { charger(); }, [constatId]);

  async function ajouter(e) {
    setErr(null);
    const choisis = Array.from(e.target.files || []);
    e.target.value = "";   // permet de re-choisir le même fichier
    if (!choisis.length) return;
    const tri = trierPhotos(choisis, photos.length);
    if (tri.message) setErr(tri.message);
    if (!tri.retenues.length) return;
    setEnCours(true);
    try {
      for (const f of tri.retenues) await ajouterPhotoConstat(constatId, f);
      await charger();
      setInfo(`${tri.retenues.length} photo(s) envoyée(s).`);
      setTimeout(() => setInfo(null), 2500);
    } catch (ex) { setErr(ex.message); }
    finally { setEnCours(false); }
  }

  async function retirer(p) {
    setErr(null);
    try { await supprimerPhotoConstat(p.id, p.chemin); await charger(); }
    catch (ex) { setErr(ex.message); }
  }

  const muet = sombre ? "#94A3B8" : "#64748B";
  const bord = sombre ? "#334155" : "#E2E8F0";

  if (!peutAjouter && photos.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {photos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {photos.map((p) => (
            <div key={p.id} style={{ position: "relative" }}>
              {urls[p.id] ? (
                <img src={urls[p.id]} alt={p.nom}
                  onClick={() => setApercu(urls[p.id])}
                  style={{ width: 64, height: 64, objectFit: "cover",
                           borderRadius: 8, border: `1px solid ${bord}`,
                           cursor: "pointer" }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 8,
                              border: `1px solid ${bord}`, background: "#0F172A" }} />
              )}
              {peutAjouter && (
                <button onClick={() => retirer(p)} title="Retirer"
                  style={{ position: "absolute", top: -6, right: -6, width: 18,
                    height: 18, borderRadius: 999, border: "none", cursor: "pointer",
                    background: "#EF4444", color: "#fff", fontSize: 11,
                    lineHeight: "18px", padding: 0 }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {peutAjouter && photos.length < MAX_PHOTOS_CONSTAT && (
        <div style={{ marginTop: photos.length ? 8 : 0 }}>
          {/* Un VRAI bouton : il déclenche l'input par programme (inputRef.click).
              Le montage « label + input display:none » ne s'ouvrait pas sur
              certains navigateurs mobiles. */}
          <button type="button" onClick={() => inputRef.current && inputRef.current.click()}
            disabled={enCours}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 9, cursor: enCours ? "default" : "pointer",
              fontSize: 13, fontWeight: 700,
              border: `1.5px solid ${sombre ? "#38BDF8" : "#2563EB"}`,
              background: sombre ? "#0C4A6E" : "#EFF6FF",
              color: sombre ? "#fff" : "#2563EB",
              opacity: enCours ? 0.6 : 1,
            }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>📷</span>
            {enCours ? "Envoi…" : "Ajouter une photo"}
          </button>
          {/* L'input reste hors flux mais PAS en display:none (certains
              navigateurs refusent .click() sur un input display:none). */}
          <input ref={inputRef} type="file" accept="image/*" multiple
            onChange={ajouter} disabled={enCours}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0,
                     overflow: "hidden", pointerEvents: "none" }} />
        </div>
      )}

      {err && <div style={{ fontSize: 11, color: "#F87171", marginTop: 4 }}>{err}</div>}
      {info && <div style={{ fontSize: 11, color: "#4ADE80", marginTop: 4 }}>{info}</div>}

      {/* Aperçu plein écran au clic. */}
      {apercu && (
        <div onClick={() => setApercu(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
                   display: "flex", alignItems: "center", justifyContent: "center",
                   zIndex: 1000, cursor: "zoom-out", padding: 20 }}>
          <img src={apercu} alt="" style={{ maxWidth: "100%", maxHeight: "100%",
                                            borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}
