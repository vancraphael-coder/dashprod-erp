// =============================================================================
// MOLETTES DE COULEUR — le choix de l'accent, à la main.
//
// Deux disques que l'on tourne, dans l'esprit du variateur de la vitrine :
//   • à gauche, la TEINTE : un arc-en-ciel complet, 360 crans, tout s'y trouve ;
//   • à droite, le DÉGRADÉ : du pastel au sombre en passant par la couleur
//     pleine, le long d'un dégradé qui montre exactement ce qu'on obtient.
//
// Entre les deux, un carré d'aperçu : la couleur retenue, sa version foncée, et
// le voile pâle utilisé en fond.
//
// Chaque molette se manipule à la souris, au doigt ET au clavier (flèches,
// Origine/Fin) : un réglage qu'on ne peut atteindre qu'au pointeur exclut une
// partie des gens.
// =============================================================================

import React, { useCallback, useEffect, useRef } from "react";
import { hslVersHex, gammeDegrade } from "@domaine/noyau/couleurs.js";

const TAILLE = 132;
const EPAISSEUR = 18;

export default function MolettesCouleur({ teinte, degrade, onChange, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 14, flexWrap: "wrap" }}>
      <Molette
        libelle="Couleur" valeur={teinte} max={360} unite="°"
        fond={arcEnCiel()}
        curseurCouleur={hslVersHex(teinte, 85, 52)}
        onChange={(v) => onChange({ teinte: Math.round(v) })} />

      <Apercu accent={accent} />

      <Molette
        libelle="Dégradé" valeur={degrade} max={100} unite="%"
        fond={rampeDegrade(teinte)}
        curseurCouleur={accent.vif}
        onChange={(v) => onChange({ degrade: Math.round(v) })} />
    </div>
  );
}

/** Un disque gradué : l'angle porte la valeur. */
function Molette({ libelle, valeur, max, unite, fond, curseurCouleur, onChange }) {
  const ref = useRef(null);
  const actif = useRef(false);

  const depuisPoint = useCallback((clientX, clientY) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // 0 en haut, sens horaire — comme on lit un cadran.
    let a = Math.atan2(clientX - cx, cy - clientY) * (180 / Math.PI);
    if (a < 0) a += 360;
    onChange((a / 360) * max);
  }, [max, onChange]);

  useEffect(() => {
    const bouger = (e) => {
      if (!actif.current) return;
      const t = e.touches?.[0];
      depuisPoint(t ? t.clientX : e.clientX, t ? t.clientY : e.clientY);
      if (e.cancelable) e.preventDefault();
    };
    const relacher = () => { actif.current = false; };
    window.addEventListener("mousemove", bouger);
    window.addEventListener("mouseup", relacher);
    window.addEventListener("touchmove", bouger, { passive: false });
    window.addEventListener("touchend", relacher);
    return () => {
      window.removeEventListener("mousemove", bouger);
      window.removeEventListener("mouseup", relacher);
      window.removeEventListener("touchmove", bouger);
      window.removeEventListener("touchend", relacher);
    };
  }, [depuisPoint]);

  function saisir(e) {
    actif.current = true;
    const t = e.touches?.[0];
    depuisPoint(t ? t.clientX : e.clientX, t ? t.clientY : e.clientY);
  }

  function touche(e) {
    const pas = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { onChange(Math.min(max, valeur + pas)); e.preventDefault(); }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { onChange(Math.max(0, valeur - pas)); e.preventDefault(); }
    if (e.key === "Home") { onChange(0); e.preventDefault(); }
    if (e.key === "End") { onChange(max); e.preventDefault(); }
  }

  const angle = (valeur / max) * 360;
  const rayon = TAILLE / 2 - EPAISSEUR / 2;
  const cx = TAILLE / 2;
  const px = cx + rayon * Math.sin((angle * Math.PI) / 180);
  const py = cx - rayon * Math.cos((angle * Math.PI) / 180);

  return (
    <div style={{ textAlign: "center" }}>
      <div ref={ref} role="slider" tabIndex={0}
        aria-label={libelle} aria-valuemin={0} aria-valuemax={max}
        aria-valuenow={Math.round(valeur)}
        onMouseDown={saisir} onTouchStart={saisir} onKeyDown={touche}
        style={{ position: "relative", width: TAILLE, height: TAILLE,
                 cursor: "grab", touchAction: "none", userSelect: "none",
                 borderRadius: "50%" }}>
        {/* la couronne colorée */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, borderRadius: "50%", background: fond,
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${EPAISSEUR}px), #000 calc(100% - ${EPAISSEUR}px))`,
          mask: `radial-gradient(farthest-side, transparent calc(100% - ${EPAISSEUR}px), #000 calc(100% - ${EPAISSEUR}px))`,
          boxShadow: "inset 0 2px 6px rgba(0,0,0,.25)" }} />
        {/* le curseur */}
        <div aria-hidden style={{
          position: "absolute", left: px - 11, top: py - 11,
          width: 22, height: 22, borderRadius: "50%",
          background: curseurCouleur, border: "3px solid #fff",
          boxShadow: "0 3px 10px rgba(0,0,0,.4)" }} />
        {/* la valeur au centre */}
        <div aria-hidden style={{
          position: "absolute", inset: EPAISSEUR + 6, borderRadius: "50%",
          display: "grid", placeItems: "center",
          background: "rgba(15,23,42,.04)" }}>
          <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 13,
                         fontWeight: 700, color: "#0F172A" }}>
            {Math.round(valeur)}{unite}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, marginTop: 8,
                    textTransform: "uppercase", letterSpacing: ".1em",
                    color: "#64748B" }}>{libelle}</div>
    </div>
  );
}

/** Le carré d'aperçu : la couleur, sa version foncée, son voile. */
function Apercu({ accent }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 74, height: 74, borderRadius: 16, overflow: "hidden",
                    border: "1px solid rgba(15,23,42,.12)",
                    boxShadow: `0 10px 24px -10px ${accent.vif}`,
                    display: "grid", gridTemplateRows: "1fr 22px" }}>
        <div style={{ background: `linear-gradient(135deg, ${accent.vif}, ${accent.fonce})` }} />
        <div style={{ background: accent.voileClair }} />
      </div>
      <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 10.5,
                    color: "#64748B", marginTop: 8 }}>
        {accent.vif}
      </div>
    </div>
  );
}

/** L'arc-en-ciel complet : 360 teintes, rien n'est exclu. */
function arcEnCiel() {
  const paliers = [];
  for (let h = 0; h <= 360; h += 30) {
    paliers.push(`${hslVersHex(h, 85, 52)} ${(h / 360) * 100}%`);
  }
  return `conic-gradient(${paliers.join(", ")})`;
}

/** La rampe du dégradé, pour la teinte en cours : pastel → plein → sombre. */
function rampeDegrade(teinte) {
  const paliers = [];
  for (let p = 0; p <= 100; p += 10) {
    const { s, l } = gammeDegrade(p);
    paliers.push(`${hslVersHex(teinte, s, l)} ${p}%`);
  }
  return `conic-gradient(${paliers.join(", ")})`;
}
