// =============================================================================
// PANNEAU DE VERRE — la matière commune des encadrés de la vitrine.
//
// Extraite de la carte d'abonnement pour que toute la page parle la même
// langue : verre dépoli, filet lumineux en haut, halo qui suit le curseur,
// inclinaison 3D discrète au survol.
//
// La BULLE (sphère irisée + chevron) est OPTIONNELLE, et c'est volontaire :
// on ne la met que si un contenu mérite d'être replié. Un encadré qui dit tout
// en trois lignes n'a pas de tiroir — sinon le geste ne veut plus rien dire.
//
// Sobriété : l'inclinaison ne s'active qu'au pointeur fin (souris), jamais au
// doigt, et se coupe si la personne a demandé « mouvement réduit ».
// =============================================================================

import React, { useRef, useState, useCallback } from "react";

const TILT_MAX = 7;      // plus discret que la carte d'abonnement (vedette)
const DECALAGE = 5;

const mouvementReduit = () =>
  typeof window !== "undefined"
  && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const pointeurFin = () =>
  typeof window !== "undefined"
  && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

/**
 * @param {{accent?: string, tilt?: boolean, bulle?: React.ReactNode,
 *          replie?: React.ReactNode, ouvrirLibelle?: string,
 *          padding?: number|string, children: React.ReactNode}} props
 */
export default function PanneauVerre({
  accent = "59,130,246", tilt = true, replie = null,
  ouvrirLibelle = "Voir le détail", padding = 22, style = {}, children,
}) {
  const ref = useRef(null);
  const [deplie, setDeplie] = useState(false);
  const [st, setSt] = useState({ rx: 0, ry: 0, gx: "50%", gy: "50%",
                                 huile: 135, sx: 0, sy: 0 });

  const bouger = useCallback((e) => {
    if (!tilt || !pointeurFin() || mouvementReduit()) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const nx = (x / r.width) * 2 - 1, ny = (y / r.height) * 2 - 1;
    setSt({
      rx: -ny * TILT_MAX, ry: nx * TILT_MAX, gx: `${x}px`, gy: `${y}px`,
      huile: Math.atan2(ny, nx) * (180 / Math.PI) + 90,
      sx: Math.sin(nx * Math.PI / 2) * DECALAGE,
      sy: Math.sin(ny * Math.PI / 2) * DECALAGE,
    });
  }, [tilt]);

  const quitter = useCallback(() => {
    setSt({ rx: 0, ry: 0, gx: "50%", gy: "50%", huile: 135, sx: 0, sy: 0 });
  }, []);

  return (
    <div style={{ perspective: 1200, height: "100%" }}>
      <article ref={ref} onMouseMove={bouger} onMouseLeave={quitter}
        style={{
          position: "relative", borderRadius: 22, padding, height: "100%",
          display: "flex", flexDirection: "column",
          background: "linear-gradient(145deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.012) 100%)",
          border: "1px solid rgba(255,255,255,.12)",
          borderTop: "1px solid rgba(255,255,255,.28)",
          backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
          transform: `rotateX(${st.rx}deg) rotateY(${st.ry}deg)`,
          transformStyle: "preserve-3d", willChange: "transform",
          transition: "transform .25s cubic-bezier(.1,1,.1,1)",
          boxShadow: "0 26px 54px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.16)",
          ...style,
        }}>

        <div aria-hidden style={{
          position: "absolute", inset: 0, borderRadius: 22, pointerEvents: "none",
          background: `radial-gradient(380px circle at ${st.gx} ${st.gy},
                       rgba(${accent},.14), transparent 42%)` }} />

        <div style={{ position: "relative", zIndex: 2, transform: "translateZ(18px)",
                      display: "flex", flexDirection: "column", flex: 1 }}>
          {children}

          {/* Tiroir : présent seulement si un contenu le mérite. */}
          {replie && (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
                <Bulle huile={st.huile} sx={st.sx} sy={st.sy} deplie={deplie}
                       libelle={ouvrirLibelle} accent={accent}
                       onClick={() => setDeplie((v) => !v)} />
              </div>
              <div style={{ display: "grid",
                            gridTemplateRows: deplie ? "1fr" : "0fr",
                            transition: "grid-template-rows .5s cubic-bezier(.16,1,.3,1)" }}>
                <div style={{ overflow: "hidden", opacity: deplie ? 1 : 0,
                              transform: deplie ? "translateY(0)" : "translateY(6px)",
                              transition: "opacity .4s ease, transform .4s ease",
                              paddingTop: deplie ? 12 : 0 }}>
                  {replie}
                </div>
              </div>
            </>
          )}
        </div>
      </article>
    </div>
  );
}

/** La sphère irisée qui ouvre le tiroir. Taille réduite : c'est un accent. */
function Bulle({ huile, sx, sy, deplie, libelle, accent, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={deplie}
      aria-label={deplie ? "Masquer le détail" : libelle}
      style={{ position: "relative", width: 54, height: 54, border: "none",
               background: "none", padding: 0, cursor: "pointer",
               transform: "translateZ(30px)" }}>
      <span aria-hidden style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: `linear-gradient(${huile}deg, rgba(${accent},.4) 0%,
                     rgba(217,119,6,.2) 50%, rgba(${accent},.4) 100%)`,
        border: "1px solid rgba(255,255,255,.38)",
        boxShadow: `inset 0 0 12px rgba(255,255,255,.26),
                    inset 4px 4px 12px rgba(${accent},.26),
                    0 10px 20px rgba(0,0,0,.42)`,
        backdropFilter: "blur(4px)",
        transform: deplie ? "scale(1.07)" : "scale(1)",
        transition: "transform .4s cubic-bezier(.34,1.56,.64,1)" }} />
      <span aria-hidden style={{
        position: "absolute", top: "9%", left: "16%", width: "68%", height: "34%",
        borderRadius: "50%", pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(255,255,255,.6), transparent)" }} />
      <span aria-hidden style={{
        position: "absolute", inset: 0, display: "grid", placeItems: "center",
        transform: `translate3d(${sx}px, ${sy}px, 12px)`,
        transition: "transform .1s ease-out" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff"
             strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
             style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,.6))",
                      transform: deplie ? "rotate(-180deg)" : "none",
                      transition: "transform .5s cubic-bezier(.34,1.56,.64,1)" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </button>
  );
}
