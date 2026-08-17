// =============================================================================
// LA BILLE — la mascotte de Dashprod.
//
// Elle vient des cartes d'abonnement de la vitrine, et c'est délibéré : ce que
// le visiteur touche en découvrant Dashprod doit être ce qu'il retrouve tous
// les jours dans l'outil. Une identité visuelle qui s'arrête à la page
// d'accueil n'est pas une identité, c'est une affiche.
//
// CE QUI FAIT LA BILLE, et qu'il ne faut pas simplifier :
//
//   1. LE DÉGRADÉ D'HUILE qui tourne avec le curseur — bleu, ambre, bleu. Il
//      donne la matière ; un aplat donnerait un jeton.
//   2. LE REFLET SPÉCULAIRE en haut, ovale et décentré : c'est lui qui place
//      la source de lumière et rend la sphère convaincante.
//   3. LE CREUX INTERNE en bas (`inset`), qui empêche la bille de paraître
//      collée sur la page.
//   4. LA PARALLAXE DU SIGNE : la flèche, la croix ou le point d'attention se
//      déplacent LÉGÈREMENT à l'inverse du regard, comme s'ils flottaient
//      au-dessus du verre. C'est ce détail-là qui fait le relief — sans lui,
//      on a un rond joli et mort.
//
// Le suivi est désactivé quand la personne demande moins d'animation.
// =============================================================================

import React, { useCallback, useRef, useState } from "react";

/** Les tailles, nommées plutôt que chiffrées : un badge ne « fait pas 18px ». */
export const TAILLES = Object.freeze({
  puce: 14,      // dans une ligne de texte, un état
  jeton: 22,     // à côté d'un titre
  bouton: 44,    // une action qu'on touche
  vedette: 84,   // le geste central d'une carte
});

/** Les teintes. Chacune dit une chose, et une seule. */
export const TONS = Object.freeze({
  bleu: { a: "59,130,246", b: "37,99,235" },       // neutre, action
  vert: { a: "52,211,153", b: "5,150,105" },        // c'est fait
  orange: { a: "251,146,60", b: "234,88,12" },      // attention, incomplet
  rouge: { a: "248,113,113", b: "220,38,38" },      // refus, erreur
  gris: { a: "148,163,184", b: "100,116,139" },     // vide, inactif
  ambre: { a: "245,158,11", b: "180,83,9" },        // le lift, l'énergie
});

/**
 * Les signes. Dessinés en SVG plutôt qu'en police : une police manquante
 * transformerait une croix en carré vide, et un signe illisible sur un bouton
 * d'action est pire que pas de signe du tout.
 */
const SIGNES = {
  chevron: <polyline points="6 9 12 15 18 9" />,
  fleche: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  croix: <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>,
  plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  attention: <><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16.5" x2="12" y2="16.6" /></>,
  coche: <polyline points="5 13 10 18 19 6" />,
};

function animationReduite() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch { return false; }
}

/**
 * @param {"puce"|"jeton"|"bouton"|"vedette"|number} taille
 * @param {keyof TONS} ton
 * @param {keyof SIGNES|null} signe
 * @param {boolean} actif fait tourner le chevron / agrandit légèrement
 */
export default function Bille({
  taille = "jeton", ton = "bleu", signe = null, actif = false,
  onClick, titre, style,
}) {
  const px = typeof taille === "number" ? taille : (TAILLES[taille] || TAILLES.jeton);
  const t = TONS[ton] || TONS.bleu;
  const ref = useRef(null);
  const [st, setSt] = useState({ huile: 135, sx: 0, sy: 0 });
  const fige = animationReduite();

  // Le suivi n'a de sens qu'à partir d'une certaine taille : sur une puce de
  // 14 px, une parallaxe de 2 px est du bruit.
  const suit = px >= TAILLES.bouton && !fige;

  const bouger = useCallback((e) => {
    if (!suit || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setSt({
      huile: 135 + x * 90,
      // À L'INVERSE du curseur : le signe flotte au-dessus du verre, il ne
      // colle pas au doigt. C'est ce qui donne la profondeur.
      sx: -x * (px * 0.07),
      sy: -y * (px * 0.07),
    });
  }, [suit, px]);

  const quitter = useCallback(() => setSt({ huile: 135, sx: 0, sy: 0 }), []);

  const Balise = onClick ? "button" : "span";
  const glyphe = signe && SIGNES[signe];

  return (
    <Balise
      ref={ref}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      onMouseMove={bouger}
      onMouseLeave={quitter}
      aria-label={onClick ? titre : undefined}
      aria-hidden={onClick ? undefined : true}
      title={!onClick && titre ? titre : undefined}
      style={{
        position: "relative", width: px, height: px, flexShrink: 0,
        display: "inline-block", border: "none", padding: 0,
        background: "none", verticalAlign: "middle",
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}>

      {/* 1. la matière : l'huile qui tourne */}
      <span aria-hidden style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: `linear-gradient(${st.huile}deg, rgba(${t.a},.95) 0%, `
                  + `rgba(${t.b},.85) 45%, rgba(${t.a},.95) 100%)`,
        border: "1px solid rgba(255,255,255,.4)",
        boxShadow: `inset 0 0 ${px * 0.18}px rgba(255,255,255,.3), `
                 + `inset ${px * 0.07}px ${px * 0.07}px ${px * 0.21}px rgba(${t.b},.5), `
                 + `0 ${px * 0.14}px ${px * 0.3}px -${px * 0.09}px rgba(${t.b},.55)`,
        transform: actif ? "scale(1.06)" : "scale(1)",
        transition: fige ? "none" : "transform .4s cubic-bezier(.34,1.56,.64,1)",
      }} />

      {/* 2. le reflet : il place la lumière */}
      <span aria-hidden style={{
        position: "absolute", top: "8%", left: "15%", width: "70%", height: "35%",
        borderRadius: "50%", pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(255,255,255,.65), transparent)",
      }} />

      {/* 3. le signe, en parallaxe */}
      {glyphe && (
        <span aria-hidden style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          transform: `translate3d(${st.sx}px, ${st.sy}px, 0)`,
          transition: fige ? "none" : "transform .1s ease-out",
        }}>
          <svg width={px * 0.52} height={px * 0.52} viewBox="0 0 24 24"
               fill="none" stroke="#fff" strokeWidth={2.5}
               strokeLinecap="round" strokeLinejoin="round"
               style={{
                 filter: `drop-shadow(0 ${px * 0.02}px ${px * 0.07}px rgba(0,0,0,.55))`,
                 transform: actif && signe === "chevron"
                   ? "rotate(-180deg) scale(1.1)" : "none",
                 transition: fige ? "none"
                   : "transform .5s cubic-bezier(.34,1.56,.64,1)",
               }}>
            {glyphe}
          </svg>
        </span>
      )}
    </Balise>
  );
}
