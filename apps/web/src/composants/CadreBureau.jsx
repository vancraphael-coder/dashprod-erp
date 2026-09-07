// =============================================================================
// CADRE BUREAU — l'identité DESKTOP de Dashprod.
//
// Sur mobile, Dashprod est une colonne avec une barre en bas : parfait au pouce.
// Sur un ordinateur, ce n'est plus une question de largeur — c'est une autre
// FAÇON d'habiter l'écran. On abandonne le ruban centré pour un vrai poste de
// travail :
//
//   · un RAIL vertical à gauche, toujours là, qui remplace la barre du bas.
//     Replié il ne montre que les icônes ; au survol il se déploie en douceur et
//     révèle les libellés. L'onglet actif porte un galet lumineux qui GLISSE d'un
//     item à l'autre, et l'icône se trace au feutre à l'activation ;
//   · un CANVAS à droite, un plan de travail qui respire, où l'écran courant
//     s'installe à sa largeur de lecture, posé dans l'espace au lieu d'y flotter.
//
// Rien de tout cela ne touche les écrans : le shell les ENVELOPPE. Sur mobile,
// le composant est transparent (il rend ses enfants tels quels) et la barre du
// bas reprend la main. Le basculement se fait à un seuil, pas à tâtons.
//
// L'exigence : que ce soit fluide et juste, pas clinquant. Le mouvement sert la
// lisibilité (on suit l'onglet qui bouge), il ne se montre pas pour lui-même.
// =============================================================================

import React, { useState, useEffect } from "react";
import { C, APP } from "../lib/theme.jsx";
import { rgbAccent } from "../lib/apparence.js";

const SEUIL = 1024;   // px : en-deçà, on rend le mobile tel quel (rail masqué)

/** Est-on sur un écran de bureau ? Réactif au redimensionnement. */
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

// Le tracé des icônes du rail. Repris de la barre (mêmes dessins), autonome ici
// pour que le shell ne dépende pas de main.jsx.
function traceRail(nom) {
  switch (nom) {
    case "dossiers":
      return <path pathLength="1" d="M4 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />;
    case "planning":
      return (<><rect pathLength="1" x="3" y="4" width="18" height="18" rx="2" /><line pathLength="1" x1="16" y1="2" x2="16" y2="6" /><line pathLength="1" x1="8" y1="2" x2="8" y2="6" /><line pathLength="1" x1="3" y1="10" x2="21" y2="10" /></>);
    case "stockage":
      return (<><path pathLength="1" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline pathLength="1" points="3.27 6.96 12 12.01 20.73 6.96" /><line pathLength="1" x1="12" y1="22.08" x2="12" y2="12" /></>);
    case "messages":
      return (<><path pathLength="1" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline pathLength="1" points="22,6 12,13 2,6" /></>);
    case "ressources":
      return (<><path pathLength="1" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle pathLength="1" cx="9" cy="7" r="4" /><path pathLength="1" d="M23 21v-2a4 4 0 0 0-3-3.87" /><path pathLength="1" d="M16 3.13a4 4 0 0 1 0 7.75" /></>);
    case "compte":
      return (<><path pathLength="1" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle pathLength="1" cx="12" cy="7" r="4" /></>);
    default: return null;
  }
}

// Le style du shell. Le rail se déploie au survol (72 → 232 px) sans pousser le
// canvas : il flotte au-dessus, ombre portée, pour que l'espace de travail ne
// tressaille jamais. Le galet actif glisse (top animé). Le feutre se trace.
function styleShell(nuit, rgb) {
  const railBg = nuit
    ? "linear-gradient(180deg, rgba(13,18,32,.96), rgba(9,12,22,.98))"
    : "linear-gradient(180deg, rgba(255,255,255,.9), rgba(244,247,254,.94))";
  const bord = nuit ? "rgba(255,255,255,.07)" : "rgba(15,23,42,.08)";
  const off = nuit ? "rgba(255,255,255,.5)" : "rgba(15,23,42,.5)";
  const on = `rgb(${rgb})`;
  const galet = nuit ? `rgba(${rgb},.16)` : `rgba(${rgb},.12)`;
  const canvasBg = nuit
    ? `radial-gradient(1200px 700px at 30% -10%, rgba(${rgb},.10), transparent 55%), #05070f`
    : `radial-gradient(1200px 700px at 30% -10%, rgba(${rgb},.06), transparent 55%), #eef2fb`;
  return `
    .dp-bureau { display: flex; min-height: 100vh;
      --rail: 76px; --rail-ouvert: 232px; }
    .dp-canvas { flex: 1; min-width: 0; margin-left: var(--rail);
      background: ${canvasBg}; background-attachment: fixed; }
    /* La colonne d'app posée dans le canvas — un peu d'air en haut, pas de
       barre en bas (le rail l'a remplacée) donc on récupère l'espace. */
    .dp-canvas > div { padding-bottom: 40px !important; }

    .dp-rail { position: fixed; top: 0; left: 0; bottom: 0; z-index: 40;
      width: var(--rail); background: ${railBg};
      border-right: 1px solid ${bord};
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      display: flex; flex-direction: column; padding: 14px 0;
      transition: width .28s cubic-bezier(.4,0,.2,1);
      box-shadow: 0 0 0 rgba(0,0,0,0); overflow: hidden; }
    .dp-rail:hover { width: var(--rail-ouvert);
      box-shadow: 24px 0 60px -30px rgba(0,0,0,.5); }

    .dp-rail-marque { display: flex; align-items: center; gap: 12px;
      padding: 6px 22px 18px; }
    .dp-rail-logo { width: 30px; height: 30px; border-radius: 9px; flex: 0 0 auto;
      background: linear-gradient(135deg, rgb(${rgb}), rgba(${rgb},.6));
      box-shadow: 0 8px 20px -8px rgba(${rgb},.7); }
    .dp-rail-nom { font-weight: 800; font-size: 16px; color: ${on};
      white-space: nowrap; opacity: 0; transform: translateX(-6px);
      transition: opacity .2s ease .06s, transform .2s ease .06s; }
    .dp-rail:hover .dp-rail-nom { opacity: 1; transform: none; }

    .dp-rail-liste { position: relative; display: flex; flex-direction: column;
      gap: 4px; padding: 4px 12px; }
    /* Le galet actif : une seule pastille qui GLISSE derrière l'item courant. */
    .dp-galet { position: absolute; left: 12px; right: 12px; height: 46px;
      border-radius: 13px; background: ${galet};
      border: 1px solid rgba(${rgb},.3);
      transition: top .34s cubic-bezier(.34,1.3,.5,1); pointer-events: none; }

    .dp-rail-item { position: relative; display: flex; align-items: center;
      gap: 14px; height: 46px; padding: 0 12px; border: none; background: none;
      cursor: pointer; border-radius: 13px; color: ${off};
      transition: color .2s ease; z-index: 1; }
    .dp-rail-item:hover { color: ${on}; }
    .dp-rail-item.actif { color: ${on}; }
    .dp-rail-item svg { width: 22px; height: 22px; flex: 0 0 auto;
      stroke: currentColor; fill: none; stroke-width: 2.1;
      stroke-linecap: round; stroke-linejoin: round; }
    .dp-rail-lib { white-space: nowrap; font-size: 14px; font-weight: 700;
      opacity: 0; transform: translateX(-6px);
      transition: opacity .2s ease .04s, transform .2s ease .04s; }
    .dp-rail:hover .dp-rail-lib { opacity: 1; transform: none; }

    /* Le feutre : le tracé se dessine à l'activation de l'item. */
    .dp-rail-item svg * { stroke-dasharray: 1; stroke-dashoffset: 1; }
    .dp-rail-item.actif svg * { stroke-dashoffset: 0;
      transition: stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1); }

    .dp-rail-plus { margin: 8px 12px 14px; display: flex; align-items: center;
      gap: 14px; height: 46px; padding: 0 13px; border-radius: 13px;
      cursor: pointer; border: none; color: #fff;
      background: linear-gradient(135deg, rgb(${rgb}), rgba(${rgb},.78));
      box-shadow: 0 10px 24px -10px rgba(${rgb},.7); }
    .dp-rail-plus span { white-space: nowrap; font-size: 14px; font-weight: 800;
      opacity: 0; transition: opacity .2s ease .04s; }
    .dp-rail:hover .dp-rail-plus span { opacity: 1; }
    .dp-rail-plus svg { width: 22px; height: 22px; flex: 0 0 auto; }

    .dp-rail-bas { margin-top: auto; }
    @media (prefers-reduced-motion: reduce) {
      .dp-rail, .dp-galet, .dp-rail-item svg * { transition: none !important; }
    }
  `;
}

/**
 * Enveloppe l'application dans le shell desktop. Sur mobile (< seuil), rend
 * simplement `children` (le mobile est intact, la barre du bas reprend la main).
 *
 * @param {object} p
 * @param {[string,string,string][]} p.items   [cle, icôneMobile, libellé]
 * @param {string} p.actif       cle de l'écran courant
 * @param {(cle:string)=>void} p.aller
 * @param {()=>void} p.creer      action du bouton « + »
 * @param {string} p.nomOrg
 * @param {React.ReactNode} p.children  l'écran courant
 */
export default function CadreBureau({ items = [], actif, aller, creer, nomOrg,
                                     children }) {
  const bureau = useEstBureau();
  if (!bureau) return children;            // mobile : rien à envelopper

  const rgb = rgbAccent(APP.accent);
  const nuit = APP.mode === "nuit";
  const TRACE = { liste: "dossiers", planning: "planning", stockage: "stockage",
                  conversations: "messages", equipe: "ressources", compte: "compte" };

  const idx = Math.max(0, items.findIndex(([cle]) => cle === actif));
  // Position du galet : chaque item fait 46px + 4px de gap ; l'entête du bloc
  // liste commence après le « + » (offset).
  const galetTop = idx * 50;

  return (
    <div className="dp-bureau">
      <style>{styleShell(nuit, rgb)}</style>
      <aside className="dp-rail" aria-label="Navigation">
        <div className="dp-rail-marque">
          <div className="dp-rail-logo" />
          <span className="dp-rail-nom">{nomOrg || "Dashprod"}</span>
        </div>

        {creer && (
          <button className="dp-rail-plus" onClick={creer} aria-label="Créer">
            <svg viewBox="0 0 24 24" stroke="currentColor" fill="none"
              strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nouveau</span>
          </button>
        )}

        <nav className="dp-rail-liste">
          <div className="dp-galet" style={{ top: galetTop }} aria-hidden="true" />
          {items.map(([cle, , lib]) => {
            const tn = TRACE[cle] || "dossiers";
            const estActif = actif === cle;
            return (
              <button key={cle} onClick={() => aller(cle)}
                className={`dp-rail-item${estActif ? " actif" : ""}`}
                aria-current={estActif ? "page" : undefined} title={lib}>
                <svg viewBox="0 0 24 24">{traceRail(tn)}</svg>
                <span className="dp-rail-lib">{lib}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="dp-canvas">{children}</main>
    </div>
  );
}
