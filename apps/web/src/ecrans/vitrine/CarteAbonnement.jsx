// =============================================================================
// CARTE D'ABONNEMENT — la carte de visite du produit.
//
// Matière : verre dépoli sur fond de nuit, filet lumineux en haut, halo qui
// suit le curseur, et une inclinaison 3D légère au survol. La bulle centrale
// (sphère irisée + chevron) déplie le détail des modules.
//
// Le parti pris est PRATIQUE : replié, on voit ce qui décide — le prix, la
// promesse, ce qu'on gagne. Le détail exhaustif est à un clic, pas imposé.
//
// Sobriété technique : l'inclinaison ne s'active qu'au pointeur fin (souris),
// jamais au doigt, et se coupe si la personne a demandé « mouvement réduit ».
// =============================================================================

import React, { useRef, useState, useCallback } from "react";
import { V, MONO } from "./theme-vitrine.jsx";

const TILT_MAX = 9;      // degrés — au-delà, l'effet devient un gadget
const DECALAGE = 6;      // parallaxe du chevron dans la bulle

const mouvementReduit = () =>
  typeof window !== "undefined"
  && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const pointeurFin = () =>
  typeof window !== "undefined"
  && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

/**
 * @param {{plan, vedette, ouverte, gains, aVenir, socle, essaiJours,
 *          heritage, onSouscrire, verrouMotif}} props
 */
export default function CarteAbonnement({
  plan, vedette = false, ouverte = true, gains = [], aVenir = [],
  socle = null, essaiJours, heritage = null, onSouscrire, verrouMotif,
}) {
  const ref = useRef(null);
  const [deplie, setDeplie] = useState(false);
  const [st, setSt] = useState({ rx: 0, ry: 0, gx: "50%", gy: "50%",
                                 huile: 135, sx: 0, sy: 0 });

  const bouger = useCallback((e) => {
    if (!pointeurFin() || mouvementReduit()) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const nx = (x / r.width) * 2 - 1, ny = (y / r.height) * 2 - 1;
    setSt({
      rx: -ny * TILT_MAX, ry: nx * TILT_MAX,
      gx: `${x}px`, gy: `${y}px`,
      huile: Math.atan2(ny, nx) * (180 / Math.PI) + 90,
      sx: Math.sin(nx * Math.PI / 2) * DECALAGE,
      sy: Math.sin(ny * Math.PI / 2) * DECALAGE,
    });
  }, []);

  const quitter = useCallback(() => {
    setSt({ rx: 0, ry: 0, gx: "50%", gy: "50%", huile: 135, sx: 0, sy: 0 });
  }, []);

  const prix = Math.round(plan.prix_centimes / 100);
  const places = plan.utilisateurs
    ? `${plan.utilisateurs} utilisateur${plan.utilisateurs > 1 ? "s" : ""}`
    : "Sans limite";
  const nbModules = (gains.length + (socle ? socle.length : 0)) || plan.modules.length;

  return (
    <div style={{ perspective: 1200 }}>
      <article ref={ref} onMouseMove={bouger} onMouseLeave={quitter}
        style={{
          position: "relative", borderRadius: 26, padding: "26px 22px",
          display: "flex", flexDirection: "column", alignItems: "center",
          // Verre : plus lumineux pour la vedette.
          background: vedette
            ? "linear-gradient(145deg, rgba(59,130,246,.16) 0%, rgba(255,255,255,.02) 100%)"
            : "linear-gradient(145deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.01) 100%)",
          border: `1px solid ${vedette ? "rgba(147,197,253,.34)" : "rgba(255,255,255,.12)"}`,
          borderTop: `1px solid ${vedette ? "rgba(191,219,254,.6)" : "rgba(255,255,255,.3)"}`,
          backdropFilter: "blur(25px)", WebkitBackdropFilter: "blur(25px)",
          transform: `rotateX(${st.rx}deg) rotateY(${st.ry}deg)`,
          transformStyle: "preserve-3d", willChange: "transform",
          transition: "transform .25s cubic-bezier(.1,1,.1,1)",
          boxShadow: vedette
            ? "0 34px 70px -20px rgba(37,99,235,.55), inset 0 1px 0 rgba(255,255,255,.25)"
            : "0 30px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.18)",
          opacity: ouverte ? 1 : .72,
        }}>

        {/* Halo qui suit le curseur */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, borderRadius: 26, pointerEvents: "none",
          background: `radial-gradient(420px circle at ${st.gx} ${st.gy},
                       rgba(59,130,246,.16), transparent 42%)` }} />

        {/* En-tête : palier + état */}
        <header style={{ width: "100%", display: "flex", alignItems: "center",
                         justifyContent: "space-between", gap: 8,
                         transform: "translateZ(20px)", zIndex: 2 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700,
            letterSpacing: ".16em", textTransform: "uppercase",
            color: vedette ? "#93C5FD" : "rgba(255,255,255,.55)",
            background: vedette ? "rgba(59,130,246,.14)" : "rgba(255,255,255,.05)",
            border: `1px solid ${vedette ? "rgba(147,197,253,.3)" : "rgba(255,255,255,.1)"}`,
            padding: "4px 10px", borderRadius: 999 }}>
            {plan.nom}
          </span>
          {vedette && <Pastille texte="Le plus choisi" />}
          {!ouverte && (
            <span style={{ fontSize: 10.5, fontWeight: 600,
              color: "rgba(255,255,255,.5)" }}>Bientôt</span>
          )}
        </header>

        {/* Bulle : le geste. Elle déplie le détail des modules. */}
        <button type="button" onClick={() => setDeplie((v) => !v)}
          aria-expanded={deplie}
          aria-label={deplie ? `Masquer le détail ${plan.nom}`
                             : `Voir le détail de l'offre ${plan.nom}`}
          style={{ position: "relative", width: 84, height: 84, margin: "18px 0 4px",
                   border: "none", background: "none", padding: 0, cursor: "pointer",
                   transform: "translateZ(35px)", transformStyle: "preserve-3d",
                   zIndex: 10 }}>
          <span aria-hidden style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: `linear-gradient(${st.huile}deg,
              rgba(59,130,246,.38) 0%, rgba(217,119,6,.22) 50%, rgba(59,130,246,.38) 100%)`,
            border: "1px solid rgba(255,255,255,.4)",
            boxShadow: `inset 0 0 15px rgba(255,255,255,.28),
                        inset 6px 6px 18px rgba(59,130,246,.28),
                        0 12px 25px rgba(0,0,0,.45)`,
            backdropFilter: "blur(4px)",
            transform: deplie ? "scale(1.06)" : "scale(1)",
            transition: "transform .4s cubic-bezier(.34,1.56,.64,1)" }} />
          {/* reflet spéculaire */}
          <span aria-hidden style={{
            position: "absolute", top: "8%", left: "15%", width: "70%", height: "35%",
            borderRadius: "50%", pointerEvents: "none",
            background: "linear-gradient(to bottom, rgba(255,255,255,.65), transparent)" }} />
          {/* chevron avec parallaxe */}
          <span aria-hidden style={{
            position: "absolute", inset: 0, display: "grid", placeItems: "center",
            transform: `translate3d(${st.sx}px, ${st.sy}px, 15px)`,
            transition: "transform .1s ease-out" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="#fff" strokeWidth="2.5" strokeLinecap="round"
                 strokeLinejoin="round"
                 style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,.6))",
                          transform: deplie ? "rotate(-180deg) scale(1.12)" : "none",
                          transition: "transform .5s cubic-bezier(.34,1.56,.64,1)" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        {/* Corps */}
        <div style={{ width: "100%", transform: "translateZ(25px)", zIndex: 2,
                      textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline",
                        justifyContent: "center", gap: 4 }}>
            <span className="v-display" style={{ fontSize: 44, color: "#fff" }}>{prix}</span>
            <span className="v-display" style={{ fontSize: 20, color: "#93C5FD" }}>€</span>
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", marginTop: 2 }}>
            HTVA / mois · par entreprise
          </div>

          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff",
                        marginTop: 14, lineHeight: 1.4 }}>
            {plan.promesse}
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.58)",
                        marginTop: 6, lineHeight: 1.5 }}>
            {plan.pour}
          </div>

          {/* Métriques : ce qui se compare d'un coup d'œil */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 6, background: "rgba(0,0,0,.28)", padding: "11px 8px",
                        borderRadius: 16, border: "1px solid rgba(255,255,255,.06)",
                        margin: "16px 0 0" }}>
            <Metrique label="Places" valeur={places} />
            <Metrique label="Modules" valeur={nbModules} />
            <Metrique label="Essai" valeur={`${essaiJours} j`} />
          </div>

          {/* Tiroir : le détail, à la demande */}
          <div style={{ display: "grid",
                        gridTemplateRows: deplie ? "1fr" : "0fr",
                        transition: "grid-template-rows .5s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ overflow: "hidden", textAlign: "left",
                          opacity: deplie ? 1 : 0,
                          transform: deplie ? "translateY(0)" : "translateY(6px)",
                          transition: "opacity .4s ease, transform .4s ease",
                          paddingTop: deplie ? 14 : 0 }}>
              {heritage && (
                <div style={{ fontSize: 11.5, color: "#93C5FD", marginBottom: 6 }}>
                  Tout {heritage}, plus :
                </div>
              )}
              {socle && socle.map((t) => <Ligne key={t} texte={t} />)}
              {gains.map((g) => <Ligne key={g.cle} texte={g.titre} />)}
              {aVenir.map((g) => <Ligne key={g.cle} texte={g.titre} aVenir />)}
            </div>
          </div>

          {ouverte ? (
            <button onClick={onSouscrire} style={{
              width: "100%", marginTop: 18, padding: "13px",
              borderRadius: 980, cursor: "pointer",
              border: `1px solid ${vedette ? "transparent" : "rgba(255,255,255,.18)"}`,
              background: vedette ? "#fff" : "rgba(255,255,255,.06)",
              color: vedette ? V.route : "#fff",
              fontSize: 14, fontWeight: 700,
              backdropFilter: "blur(10px)", transform: "translateZ(20px)",
              boxShadow: vedette ? "0 12px 30px rgba(0,0,0,.35)" : "none",
              transition: "background .3s, box-shadow .3s" }}>
              Essayer {essaiJours} jours
            </button>
          ) : (
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)",
                          marginTop: 18, lineHeight: 1.5, textAlign: "left" }}>
              {verrouMotif}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

function Pastille({ texte }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, color: "#0A1428",
      background: "linear-gradient(135deg, #BFDBFE, #fff)", borderRadius: 999,
      padding: "4px 10px", letterSpacing: ".04em", textTransform: "uppercase",
      boxShadow: "0 6px 18px rgba(147,197,253,.35)" }}>{texte}</span>
  );
}

function Metrique({ label, valeur }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <span style={{ fontSize: 9.5, textTransform: "uppercase",
        letterSpacing: ".08em", color: "rgba(255,255,255,.42)" }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", marginTop: 3 }}>
        {valeur}
      </span>
    </div>
  );
}

function Ligne({ texte, aVenir = false }) {
  return (
    <div style={{ display: "flex", gap: 9, padding: "5px 0",
                  borderBottom: "1px dashed rgba(255,255,255,.08)",
                  fontSize: 12.5,
                  color: aVenir ? "rgba(255,255,255,.42)" : "rgba(255,255,255,.82)" }}>
      <span style={{ color: aVenir ? "rgba(255,255,255,.35)" : "#60A5FA",
                     fontWeight: 800, flexShrink: 0 }}>{aVenir ? "◦" : "✓"}</span>
      <span>{texte}</span>
    </div>
  );
}
