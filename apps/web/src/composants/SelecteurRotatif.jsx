// =============================================================================
// SÉLECTEUR ROTATIF — le geste du variateur de la vitrine, porté dans l'app.
//
// La vitrine a sa boussole (`vitrine/VariateurNav`) : une molette qui tourne,
// aiguille ambre pointant la section active. Raphaël veut LE MÊME mouvement pour
// naviguer dans le bureau, le terrain et l'espace client.
//
// Mais le variateur de la vitrine pilote un DÉFILEMENT entre sections d'une même
// page (IntersectionObserver). Dans l'app, on change d'ÉCRAN : il n'y a rien à
// observer. On réutilise donc le GESTE, pas le code — c'est l'esprit
// « réutiliser, pas copier » : même molette, même aiguille, même rotation par le
// chemin le plus court, mais au service d'un écran actif piloté de l'extérieur.
//
// Se pose en superposition (bas droite), discret, au-dessus de la barre
// d'onglets classique qui reste la commande au pouce. Les deux disent la même
// chose ; le sélecteur ajoute le repère tournant, pas une seconde vérité.
// =============================================================================

import React, { useEffect, useRef, useState } from "react";
import { C, Icone } from "../lib/theme.jsx";

const TAILLE = 150;              // compact : un repère, pas un panneau
const RAYON = 57;               // distance des icônes au centre
const MOLETTE = 66;
const CENTRE = TAILLE / 2;
const AIGUILLE = "#F59E0B";     // ambre — l'aiguille, comme sur la vitrine

/**
 * @param {{cle:string, icone:string, label:string}[]} onglets
 * @param {string} actif  la clé de l'onglet courant
 * @param {(cle:string)=>void} aller  bascule d'écran
 */
export default function SelecteurRotatif({ onglets, actif, aller }) {
  const items = onglets || [];
  const N = items.length;
  const iActif = Math.max(0, items.findIndex((o) => o.cle === actif));

  const [angle, setAngle] = useState(0);
  const angleRef = useRef(0);

  // La molette rejoint l'onglet actif par le chemin le plus court — jamais un
  // tour complet pour un cran voisin. On suit l'index venu de l'extérieur :
  // que le changement vienne d'un clic ici ou de la barre du bas, l'aiguille
  // s'aligne pareil.
  useEffect(() => {
    if (N === 0) return;
    const pas = 360 / N;
    let diff = (iActif * pas) - (angleRef.current % 360);
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    angleRef.current += diff;
    setAngle(angleRef.current);
  }, [iActif, N]);

  if (N === 0) return null;

  return (
    <nav className="selecteur-rotatif" aria-label="Navigation par molette"
         style={{ position: "relative", width: TAILLE, height: TAILLE }}>
      <Graduations />

      {/* Molette : l'aiguille ambre pointe l'icône active. */}
      <div aria-hidden style={{
        position: "absolute", left: CENTRE - MOLETTE / 2, top: CENTRE - MOLETTE / 2,
        width: MOLETTE, height: MOLETTE, borderRadius: "50%",
        background: "linear-gradient(135deg, #1f2a3c 0%, #111824 100%)",
        border: "1px solid #28374e",
        boxShadow: `0 14px 30px rgba(0,0,0,.55),
                    inset 0 2px 4px rgba(255,255,255,.09),
                    inset 0 -8px 16px rgba(0,0,0,.5)`,
        transform: `rotate(${angle}deg)`,
        transition: "transform .5s cubic-bezier(.34,1.25,.64,1)",
        zIndex: 5 }}>
        <span style={{
          position: "absolute", top: 7, left: "50%", width: 3, height: 14,
          transform: "translateX(-50%)", borderRadius: 3,
          background: AIGUILLE, boxShadow: `0 0 10px ${AIGUILLE}` }} />
      </div>

      {/* Libellé au centre, droit quelle que soit la rotation de la molette. */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, display: "grid", placeItems: "center",
        zIndex: 6, pointerEvents: "none" }}>
        <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 8,
          letterSpacing: ".1em", color: "#94A9C6", textTransform: "uppercase",
          textAlign: "center", maxWidth: 52, lineHeight: 1.25 }}>
          {items[iActif]?.label}
        </span>
      </div>

      {/* Couronne d'icônes : un cran par écran. */}
      {items.map((o, i) => {
        const a = (i * 2 * Math.PI / N) - Math.PI / 2;
        const x = CENTRE + RAYON * Math.cos(a);
        const y = CENTRE + RAYON * Math.sin(a);
        const on = i === iActif;
        return (
          <button key={o.cle} type="button" onClick={() => aller(o.cle)}
            aria-current={on ? "true" : undefined} title={o.label}
            aria-label={`Aller à ${o.label}`}
            style={{
              position: "absolute", left: x - 16, top: y - 16,
              width: 32, height: 32, borderRadius: "50%", border: "none",
              background: on ? "rgba(37,99,235,.16)" : "transparent",
              display: "grid", placeItems: "center", cursor: "pointer",
              filter: on ? "drop-shadow(0 0 7px rgba(37,99,235,.5))" : "none",
              transition: "background .3s", zIndex: 10 }}>
            <Icone nom={o.icone} taille={15}
                   couleur={on ? "#7FB0FF" : "#54637C"} />
          </button>
        );
      })}
    </nav>
  );
}

/** Anneau de graduations, calé juste en dehors de la molette (comme la vitrine). */
function Graduations() {
  const R = MOLETTE / 2 + 6;
  return (
    <svg width={TAILLE} height={TAILLE} aria-hidden="true"
         style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
      {Array.from({ length: 48 }).map((_, i) => {
        const major = i % 4 === 0;
        const a = (i * 7.5) * Math.PI / 180;
        const r2 = R + (major ? 6 : 3);
        return (
          <line key={i}
            x1={CENTRE + R * Math.cos(a)} y1={CENTRE + R * Math.sin(a)}
            x2={CENTRE + r2 * Math.cos(a)} y2={CENTRE + r2 * Math.sin(a)}
            stroke={major ? "#3b5070" : "#1e2a3b"}
            strokeWidth={major ? 1.5 : 1.1} strokeLinecap="round" />
        );
      })}
    </svg>
  );
}
