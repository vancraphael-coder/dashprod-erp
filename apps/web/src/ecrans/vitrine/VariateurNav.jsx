// =============================================================================
// VARIATEUR ROTATIF — la boussole de la page.
//
// Rangé en bas à droite, discret au repos, il se réveille au survol. Chaque
// cran est une section : l'aiguille ambre pointe TOUJOURS l'icône active, et
// la molette rejoint sa position par le chemin le plus court.
//
// Deux pièges évités :
//  • Pendant un défilement déclenché par un clic, on VERROUILLE l'observation :
//    sinon les sections traversées feraient hésiter l'aiguille en chemin.
//  • L'observateur est monté une seule fois (l'index actif est lu dans une
//    référence) : le recréer à chaque changement le rendait nerveux.
// =============================================================================

import React, { useEffect, useRef, useState, useCallback } from "react";
import { V } from "./theme-vitrine.jsx";

const AIGUILLE = V.sangle;       // ambre — l'aiguille de précision

// Icônes minimalistes (traits) — une par section.
const I = {
  accueil: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  produit: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  commander: '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
  tarifs: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  avis: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  contact: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
};

const TAILLE = 168;              // compact : c'est une boussole, pas un panneau
const RAYON = 64;                // distance des icônes au centre
const MOLETTE = 74;
const C = TAILLE / 2;

export default function VariateurNav({ sections }) {
  const items = (sections || []).filter((s) => I[s.icone]);
  const N = items.length;

  const [actif, setActif] = useState(0);
  const [angle, setAngle] = useState(0);
  const actifRef = useRef(0);
  const angleRef = useRef(0);
  const verrou = useRef(false);       // vrai pendant un défilement programmatique
  const minuteur = useRef(null);

  // Place la molette sur un index, par le chemin le plus court.
  const versIndex = useCallback((i) => {
    if (i == null || i < 0 || i === actifRef.current) return;
    const pas = 360 / N;
    let diff = (i * pas) - (angleRef.current % 360);
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    angleRef.current += diff;
    actifRef.current = i;
    setAngle(angleRef.current);
    setActif(i);
  }, [N]);

  function aller(i) {
    // On fige l'observation le temps que le défilement aboutisse : sinon
    // l'aiguille suivrait chaque section traversée en chemin.
    verrou.current = true;
    clearTimeout(minuteur.current);
    versIndex(i);
    document.getElementById(items[i].id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    minuteur.current = setTimeout(() => { verrou.current = false; }, 900);
  }

  // Le défilement libre fait tourner la molette sur la section la plus en vue.
  useEffect(() => {
    const ids = items.map((s) => s.id);
    const obs = new IntersectionObserver((entries) => {
      if (verrou.current) return;
      const vue = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!vue) return;
      const i = ids.indexOf(vue.target.id);
      if (i >= 0) versIndex(i);
    }, { threshold: [.2, .5, .8], rootMargin: "-15% 0px -45% 0px" });

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    const t = minuteur;
    return () => { obs.disconnect(); clearTimeout(t.current); };
    // Monté une seule fois : versIndex est stable, l'actif est lu par référence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, versIndex]);

  return (
    <nav className="variateur" aria-label="Navigation par section">
      <div style={{ position: "relative", width: TAILLE, height: TAILLE }}>
        <Graduations />

        {/* Molette : l'aiguille pointe l'icône active. */}
        <div aria-hidden style={{
          position: "absolute", left: C - MOLETTE / 2, top: C - MOLETTE / 2,
          width: MOLETTE, height: MOLETTE, borderRadius: "50%",
          background: "linear-gradient(135deg, #1f2a3c 0%, #111824 100%)",
          border: "1px solid #28374e",
          boxShadow: `0 14px 30px rgba(0,0,0,.6),
                      inset 0 2px 4px rgba(255,255,255,.09),
                      inset 0 -8px 16px rgba(0,0,0,.55)`,
          transform: `rotate(${angle}deg)`,
          transition: "transform .5s cubic-bezier(.34,1.25,.64,1)",
          zIndex: 5 }}>
          <span style={{
            position: "absolute", top: 8, left: "50%", width: 3, height: 16,
            transform: "translateX(-50%)", borderRadius: 3,
            background: AIGUILLE, boxShadow: `0 0 10px ${AIGUILLE}` }} />
        </div>

        {/* Libellé au centre, lisible quelle que soit la rotation. */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          zIndex: 6, pointerEvents: "none" }}>
          <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 8.5,
            letterSpacing: ".12em", color: "#94A9C6", textTransform: "uppercase",
            textAlign: "center", maxWidth: 58, lineHeight: 1.25 }}>
            {items[actif]?.label}
          </span>
        </div>

        {/* Couronne d'icônes */}
        {items.map((s, i) => {
          const a = (i * 2 * Math.PI / N) - Math.PI / 2;
          const x = C + RAYON * Math.cos(a);
          const y = C + RAYON * Math.sin(a);
          const on = i === actif;
          return (
            <button key={s.id} type="button" onClick={() => aller(i)}
              aria-current={on ? "true" : undefined} title={s.label}
              aria-label={`Aller à ${s.label}`}
              style={{
                position: "absolute", left: x - 17, top: y - 17,
                width: 34, height: 34, borderRadius: "50%", border: "none",
                background: on ? "rgba(37,99,235,.16)" : "transparent",
                display: "grid", placeItems: "center", cursor: "pointer",
                color: on ? "#7FB0FF" : "#54637C",
                filter: on ? "drop-shadow(0 0 7px rgba(37,99,235,.5))" : "none",
                transition: "color .3s, background .3s", zIndex: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="1.7"
                   strokeLinecap="round" strokeLinejoin="round"
                   dangerouslySetInnerHTML={{ __html: I[s.icone] }} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Anneau de graduations, calé juste en dehors de la molette. */
function Graduations() {
  const R = MOLETTE / 2 + 7;
  return (
    <svg width={TAILLE} height={TAILLE} aria-hidden="true"
         style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      {Array.from({ length: 48 }).map((_, i) => {
        const major = i % 4 === 0;
        const a = (i * 7.5) * Math.PI / 180;
        const r2 = R + (major ? 7 : 3.5);
        return (
          <line key={i}
            x1={C + R * Math.cos(a)} y1={C + R * Math.sin(a)}
            x2={C + r2 * Math.cos(a)} y2={C + r2 * Math.sin(a)}
            stroke={major ? "#3b5070" : "#1e2a3b"}
            strokeWidth={major ? 1.6 : 1.2} strokeLinecap="round" />
        );
      })}
    </svg>
  );
}
