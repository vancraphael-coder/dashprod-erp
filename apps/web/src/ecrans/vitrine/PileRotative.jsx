// =============================================================================
// PILE ROTATIVE — le mouvement commun aux trois nouveaux blocs de la vitrine.
//
// Des cartes empilées en profondeur qui tournent : la carte de tête est droite
// et nette, les suivantes reculent, s'inclinent et s'estompent. Tout le
// mouvement est porté par une seule transition CSS sur `transform` et
// `opacity` — le JavaScript ne fait qu'incrémenter un index. C'est ce qui rend
// le geste fluide : le navigateur compose, il n'anime pas image par image.
//
// Trois usages : les six pages d'un dossier, les avis des organisations du
// réseau, les avis des entreprises sur Dashprod.
//
// Sobriété : la rotation automatique s'arrête au survol, au focus clavier, et
// ne démarre pas du tout si la personne a demandé « mouvement réduit ».
// =============================================================================

import React, { useEffect, useRef, useState, useCallback } from "react";

const mouvementReduit = () =>
  typeof window !== "undefined"
  && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * @param {{items: React.ReactNode[], hauteur?: number, intervalle?: number,
 *          libelle: string, etiquettes?: string[]}} props
 */
export default function PileRotative({
  items, hauteur = 300, intervalle = 4200, libelle, etiquettes = [],
}) {
  const n = items.length;
  const [tete, setTete] = useState(0);
  const [enPause, setEnPause] = useState(false);
  const zone = useRef(null);

  const suivant = useCallback(() => setTete((t) => (t + 1) % n), [n]);
  const precedent = useCallback(() => setTete((t) => (t - 1 + n) % n), [n]);

  // Rotation automatique — suspendue dès qu'on interagit.
  useEffect(() => {
    if (n < 2 || enPause || mouvementReduit()) return;
    const id = setInterval(suivant, intervalle);
    return () => clearInterval(id);
  }, [n, enPause, intervalle, suivant]);

  const touche = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); suivant(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); precedent(); }
  };

  return (
    <div>
      <div ref={zone} tabIndex={0} role="group" aria-label={libelle}
        onKeyDown={touche}
        onMouseEnter={() => setEnPause(true)}
        onMouseLeave={() => setEnPause(false)}
        onFocus={() => setEnPause(true)}
        onBlur={() => setEnPause(false)}
        style={{ position: "relative", height: hauteur, perspective: 1400,
                 outline: "none" }}>
        {items.map((item, i) => {
          // Rang : 0 = en tête, puis 1, 2… en profondeur (cyclique).
          const rang = (i - tete + n) % n;
          const visible = rang < 4;                 // au-delà, inutile de peindre
          const p = Math.min(rang, 3);
          return (
            <div key={i} aria-hidden={rang !== 0}
              style={{
                position: "absolute", inset: 0,
                transform: `translate3d(${p * 16}px, ${p * -10}px, ${p * -90}px)
                            rotateY(${p * -7}deg) rotateZ(${p * 1.4}deg)`,
                opacity: visible ? 1 - p * 0.26 : 0,
                filter: rang === 0 ? "none" : `saturate(.75) brightness(${1 - p * .08})`,
                zIndex: n - rang,
                pointerEvents: rang === 0 ? "auto" : "none",
                transition: "transform .85s cubic-bezier(.22,1,.36,1), opacity .85s ease, filter .85s ease",
                willChange: "transform, opacity",
              }}>
              {item}
            </div>
          );
        })}
      </div>

      {/* Repères : cliquables, et ils disent où l'on en est. */}
      {n > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center",
                      alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
          {items.map((_, i) => {
            const on = i === tete;
            return (
              <button key={i} type="button" onClick={() => setTete(i)}
                aria-label={etiquettes[i] ? `Voir ${etiquettes[i]}` : `Élément ${i + 1}`}
                aria-current={on ? "true" : undefined}
                style={{
                  height: 6, width: on ? 26 : 6, borderRadius: 999, border: "none",
                  padding: 0, cursor: "pointer",
                  background: on ? "#60A5FA" : "rgba(255,255,255,.22)",
                  boxShadow: on ? "0 0 12px rgba(96,165,250,.6)" : "none",
                  transition: "width .5s cubic-bezier(.22,1,.36,1), background .4s ease",
                }} />
            );
          })}
        </div>
      )}
    </div>
  );
}
