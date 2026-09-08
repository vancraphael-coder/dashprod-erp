// =============================================================================
// CADRE BUREAU — la SCÈNE desktop de Dashprod, et sa signature visuelle.
//
// Le mobile reste linéaire (colonne + barre au pouce) : parfait ainsi. Le PC est
// autre chose — une ZONE D'EXPRESSION. On y quitte la ligne pour une COMPOSITION :
//   · un ESPACE ambiant profond en fond (halos lents, matière, vignettage doux) ;
//   · la ROULETTE en EMBLÈME : agrandie, dans son puits de lumière, elle tourne
//     quand on change d'écran — le geste-signature du projet, mis en valeur ;
//   · le CONTENU qui se POSE dans une carte de verre qui respire.
//
// Rien de tout cela ne touche les 40 écrans : le shell les ENVELOPPE, et sous le
// seuil il s'efface (mobile intact). Le mouvement sert le confort : lent, ample.
// =============================================================================

import React, { useState, useEffect } from "react";
import { APP } from "../lib/theme.jsx";
import { rgbAccent } from "../lib/apparence.js";
import SelecteurRotatif from "./SelecteurRotatif.jsx";

const SEUIL = 1024;

export function useEstBureau() {
  const [bureau, setBureau] = useState(
    typeof window !== "undefined"
      && window.matchMedia?.(`(min-width: ${SEUIL}px)`).matches);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width: ${SEUIL}px)`);
    const on = (e) => setBureau(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return bureau;
}

function styleScene(nuit, rgb) {
  const fond = nuit
    ? `radial-gradient(1400px 900px at 18% 8%, rgba(${rgb},.14), transparent 55%),
       radial-gradient(1100px 800px at 92% 100%, rgba(${rgb},.08), transparent 60%),
       linear-gradient(160deg, #070b16 0%, #04060d 100%)`
    : `radial-gradient(1400px 900px at 18% 8%, rgba(${rgb},.10), transparent 55%),
       radial-gradient(1100px 800px at 92% 100%, rgba(${rgb},.06), transparent 60%),
       linear-gradient(160deg, #eef2fb 0%, #e5ebf7 100%)`;
  const carte = nuit ? "rgba(13,18,32,.72)" : "rgba(255,255,255,.82)";
  const carteBord = nuit ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.9)";
  const carteOmbre = nuit
    ? "0 40px 100px -40px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.04)"
    : "0 40px 100px -44px rgba(15,23,42,.34), 0 0 0 1px rgba(15,23,42,.04)";
  const puits = nuit
    ? `radial-gradient(circle at 50% 46%, rgba(${rgb},.22), transparent 62%)`
    : `radial-gradient(circle at 50% 46%, rgba(${rgb},.16), transparent 62%)`;
  const nom = nuit ? "rgba(255,255,255,.9)" : "rgba(15,23,42,.9)";
  const sous = nuit ? "rgba(255,255,255,.42)" : "rgba(15,23,42,.42)";
  return `
    .dp-scene { position: relative; min-height: 100vh;
      display: grid; grid-template-columns: 300px minmax(0, 1fr);
      background: ${fond}; background-attachment: fixed; overflow-x: hidden; }
    .dp-scene::before { content: ""; position: fixed; inset: -20% -10% auto -10%;
      height: 60vh; pointer-events: none; z-index: 0;
      background: radial-gradient(60% 60% at 20% 0%, rgba(${rgb},.10), transparent 70%);
      animation: dp-derive 22s ease-in-out infinite alternate; }
    @keyframes dp-derive {
      from { transform: translate3d(-4%, -2%, 0) scale(1); }
      to   { transform: translate3d(6%, 3%, 0) scale(1.08); } }
    .dp-embleme { position: relative; z-index: 2; display: flex;
      flex-direction: column; align-items: center; padding: 40px 24px; }
    .dp-embleme-tete { text-align: center; margin-bottom: 8px; }
    .dp-embleme-logo { width: 40px; height: 40px; border-radius: 12px; margin: 0 auto 12px;
      background: linear-gradient(135deg, rgb(${rgb}), rgba(${rgb},.6));
      box-shadow: 0 14px 30px -10px rgba(${rgb},.7); }
    .dp-embleme-nom { font-weight: 800; font-size: 17px; color: ${nom}; }
    .dp-embleme-sous { font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
      color: ${sous}; margin-top: 3px; }
    .dp-puits { position: relative; margin: auto 0;
      display: grid; place-items: center; width: 240px; height: 240px; }
    .dp-puits::before { content: ""; position: absolute; inset: -30px;
      background: ${puits}; filter: blur(6px);
      animation: dp-pulse 6s ease-in-out infinite alternate; }
    @keyframes dp-pulse { from { opacity: .7; } to { opacity: 1; transform: scale(1.05); } }
    .dp-puits .selecteur-rotatif { transform: scale(1.55); z-index: 2; }
    .dp-embleme-pied { margin-top: auto; padding-top: 24px; text-align: center;
      font-size: 10.5px; color: ${sous}; letter-spacing: .06em; }
    .dp-plateau { position: relative; z-index: 1;
      padding: 34px 40px 34px 8px; display: flex; }
    .dp-carte { position: relative; width: 100%; max-width: 720px; margin: 0 auto;
      background: ${carte}; border: 1px solid ${carteBord};
      border-radius: 24px; box-shadow: ${carteOmbre};
      backdrop-filter: blur(20px) saturate(1.15);
      -webkit-backdrop-filter: blur(20px) saturate(1.15);
      overflow: hidden; min-height: calc(100vh - 68px);
      animation: dp-pose .5s cubic-bezier(.22,1,.36,1); }
    @keyframes dp-pose {
      from { opacity: 0; transform: translateY(14px) scale(.985); }
      to   { opacity: 1; transform: none; } }
    .dp-carte > div { min-height: auto !important; padding-bottom: 28px !important; }
    @media (max-width: 1200px) {
      .dp-scene { grid-template-columns: 232px minmax(0, 1fr); }
      .dp-puits { width: 190px; height: 190px; }
      .dp-puits .selecteur-rotatif { transform: scale(1.15); }
    }
    @media (prefers-reduced-motion: reduce) {
      .dp-scene::before, .dp-puits::before, .dp-carte { animation: none !important; }
    }
  `;
}

export default function CadreBureau({ rotatif = [], actif, aller, nomOrg, children }) {
  const bureau = useEstBureau();
  if (!bureau) return children;

  const rgb = rgbAccent(APP.accent);
  const nuit = APP.mode === "nuit";
  const actuel = rotatif.find((o) => o.cle === actif);

  return (
    <div className="dp-scene">
      <style>{styleScene(nuit, rgb)}</style>
      <div className="dp-embleme">
        <div className="dp-embleme-tete">
          <div className="dp-embleme-logo" />
          <div className="dp-embleme-nom">{nomOrg || "Dashprod"}</div>
          <div className="dp-embleme-sous">{actuel?.label || ""}</div>
        </div>
        <div className="dp-puits">
          <SelecteurRotatif onglets={rotatif} actif={actif} aller={aller} />
        </div>
        <div className="dp-embleme-pied">Dashprod</div>
      </div>
      <div className="dp-plateau">
        <div className="dp-carte" key={actif}>{children}</div>
      </div>
    </div>
  );
}
