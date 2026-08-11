// =============================================================================
// VARIATEUR ROTATIF — la navigation de la landing.
//
// Un bouton-molette : chaque cran est une section de la page. Cliquer une icône
// fait tourner la molette (chemin le plus court) et défile en douceur jusqu'à la
// section ; à l'inverse, faire défiler la page tourne la molette sur la section
// visible. C'est le « bling » demandé — mais il reste utilisable : chaque icône
// est un vrai bouton, focusable au clavier, et l'animation se coupe si la
// personne a demandé « mouvement réduit ».
//
// Repris de l'idée d'un variateur haut de gamme (néomorphisme sombre), reteinté
// à la palette Dashprod : bleu route au lieu du cyan néon, ambre pour l'aiguille.
// =============================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { V } from "./theme-vitrine.jsx";

const ACCENT = V.route;          // #2563EB — le bleu produit
const ACCENT_LUEUR = "rgba(37,99,235,.45)";
const AIGUILLE = V.sangle;       // ambre — l'aiguille de précision

// Icônes minimalistes (traits, façon Feather) — chaque section a la sienne.
const I = {
  accueil: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  produit: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  commander: '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
  tarifs: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  avis: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  contact: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
};

/** @param {{sections: {id,label,icone}[]}} props */
export default function VariateurNav({ sections }) {
  const items = useMemo(() => sections.filter((s) => I[s.icone]), [sections]);
  const [actif, setActif] = useState(0);
  const angleRef = useRef(0);           // angle cumulé (pour le chemin court)
  const [angle, setAngle] = useState(0);
  const knobRef = useRef(null);

  const N = items.length;
  const RAYON = 96;                     // distance des icônes au centre
  const TAILLE = 260;                   // diamètre du widget
  const C = TAILLE / 2;

  // Positionne la molette sur un index (chemin le plus court).
  function versIndex(i) {
    const cible = i * (360 / N);
    let diff = cible - (angleRef.current % 360);
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    angleRef.current += diff;
    setAngle(angleRef.current);
    setActif(i);
  }

  function aller(i) {
    versIndex(i);
    const el = document.getElementById(items[i].id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Le scroll fait tourner la molette : on repère la section la plus en vue.
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      const vue = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!vue) return;
      const i = items.findIndex((s) => s.id === vue.target.id);
      if (i >= 0 && i !== actif) versIndex(i);
    }, { threshold: [.25, .5, .75], rootMargin: "-20% 0px -40% 0px" });

    items.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, actif]);

  return (
    <div aria-hidden={false} style={enveloppe}>
      <div style={{ position: "relative", width: TAILLE, height: TAILLE }}>
        {/* graduations */}
        <Graduations taille={TAILLE} />

        {/* molette */}
        <div ref={knobRef} style={{
          position: "absolute", left: C - 62, top: C - 62, width: 124, height: 124,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1f2a3c 0%, #111824 100%)",
          border: "1px solid #28374e",
          boxShadow: "0 20px 40px rgba(0,0,0,.6), inset 0 2px 4px rgba(255,255,255,.09), inset 0 -10px 20px rgba(0,0,0,.55)",
          transform: `rotate(${angle}deg)`,
          transition: "transform .55s cubic-bezier(.34,1.25,.64,1)",
          zIndex: 5,
        }}>
          <div style={{
            position: "absolute", top: 12, left: "50%", width: 4, height: 22,
            transform: "translateX(-50%)", borderRadius: 4,
            background: AIGUILLE, boxShadow: `0 0 12px ${AIGUILLE}` }} />
          <div style={{
            position: "absolute", inset: 0, display: "grid", placeItems: "center",
            transform: `rotate(${-angle}deg)`, transition: "transform .55s cubic-bezier(.34,1.25,.64,1)" }}>
            <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 10,
                           letterSpacing: ".14em", color: "#8FA3C0",
                           textTransform: "uppercase", textAlign: "center",
                           lineHeight: 1.3, maxWidth: 90 }}>
              {items[actif]?.label}
            </span>
          </div>
        </div>

        {/* couronne d'icônes */}
        {items.map((s, i) => {
          const a = (i * 2 * Math.PI / N) - Math.PI / 2;
          const x = C + RAYON * Math.cos(a);
          const y = C + RAYON * Math.sin(a);
          const on = i === actif;
          return (
            <button key={s.id} type="button" onClick={() => aller(i)}
              aria-pressed={on} aria-label={s.label}
              style={{
                position: "absolute", left: x - 23, top: y - 23,
                width: 46, height: 46, borderRadius: "50%", border: "none",
                background: on ? "rgba(37,99,235,.12)" : "transparent",
                display: "grid", placeItems: "center", cursor: "pointer",
                color: on ? ACCENT : "#5C6E88",
                filter: on ? `drop-shadow(0 0 8px ${ACCENT_LUEUR})` : "none",
                transition: "color .3s, background .3s, transform .3s",
                zIndex: 10,
              }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.color = "#93A7C4"; }}
              onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = "#5C6E88"; }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="1.6"
                   strokeLinecap="round" strokeLinejoin="round"
                   dangerouslySetInnerHTML={{ __html: I[s.icone] }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** L'anneau de petites graduations, façon variateur. */
function Graduations({ taille }) {
  const C = taille / 2;
  const R = 74;                          // rayon des graduations
  const ticks = Array.from({ length: 60 });
  return (
    <svg width={taille} height={taille} style={{ position: "absolute", inset: 0,
         pointerEvents: "none", zIndex: 1 }} aria-hidden="true">
      {ticks.map((_, i) => {
        const major = i % 5 === 0;
        const a = (i * 6) * Math.PI / 180;
        const r1 = R;
        const r2 = R + (major ? 10 : 5);
        return (
          <line key={i}
            x1={C + r1 * Math.cos(a)} y1={C + r1 * Math.sin(a)}
            x2={C + r2 * Math.cos(a)} y2={C + r2 * Math.sin(a)}
            stroke={major ? "#3b5070" : "#1e2a3b"} strokeWidth={major ? 2 : 1.5}
            strokeLinecap="round" />
        );
      })}
    </svg>
  );
}

const enveloppe = {
  display: "grid", placeItems: "center", padding: "10px 0",
};
