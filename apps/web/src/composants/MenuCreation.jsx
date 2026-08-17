// =============================================================================
// Le menu du « + » — une bulle, et cinq métiers.
//
// Le bouton est une BULLE en relief, pas un disque plat : c'est l'élément le
// plus cliqué de l'application, il doit accrocher l'œil sans crier. Le relief
// vient d'un dégradé radial décentré (la lumière tombe d'en haut à gauche),
// d'une ombre interne basse qui creuse le bord, et d'une ombre portée colorée
// plutôt que grise — une ombre grise sous un objet bleu paraît sale.
//
// Les entrées ne sont pas une liste : ce sont CINQ MÉTIERS. Chacune porte sa
// pastille de couleur, son titre et ce qu'elle recouvre vraiment. Se tromper
// de nature engage un mauvais parcours jusqu'à la facture — mieux vaut deux
// lignes de texte qu'un retour en arrière.
//
// Le contenu vient de `@domaine/commercial/natures.js` : ajouter une nature
// là-bas la fait apparaître ici, sans toucher à cet écran.
// =============================================================================

import React, { useEffect, useRef } from "react";
import { naturesDuMenu } from "@domaine/commercial/natures.js";
import { metier } from "@domaine/commercial/adresses.js";
import Bille from "./Bille.jsx";
import { C, S } from "../lib/theme.jsx";

/** Une teinte de BILLE par métier — la mascotte se décline, elle ne se
 *  redessine pas. */
const TONS_METIER = {
  demenagement: "bleu",
  sous_traitance: "rouge",
  lift: "ambre",
  boxe: "vert",
  zone: "gris",
};
/** Les teintes d'étiquette, assorties aux billes. */
const ETIQ = {
  demenagement: { vif: "#3B82F6", sombre: "#1D4ED8" },
  sous_traitance: { vif: "#F87171", sombre: "#DC2626" },
  lift: { vif: "#F59E0B", sombre: "#B45309" },
  boxe: { vif: "#34D399", sombre: "#047857" },
  zone: { vif: "#94A3B8", sombre: "#475569" },
};

export default function MenuCreation({ ouvert, basculer, choisir }) {
  const zone = useRef(null);

  // Un clic à côté referme : sans ça, le menu reste ouvert sous les doigts et
  // masque la liste qu'on voulait consulter.
  useEffect(() => {
    if (!ouvert) return undefined;
    function dehors(e) {
      if (zone.current && !zone.current.contains(e.target)) basculer(false);
    }
    function echap(e) { if (e.key === "Escape") basculer(false); }
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert, basculer]);

  const natures = naturesDuMenu();

  return (
    <div ref={zone}>
      {ouvert && (
        <div onClick={() => basculer(false)} style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(8,12,26,.34)",
          backdropFilter: "blur(2px)",
          animation: "voileEntre 180ms ease-out both",
        }} />
      )}

      {ouvert && (
        <div role="menu" aria-label="Que voulez-vous créer ?" style={{
          position: "fixed", right: 18, bottom: 152, zIndex: 41,
          width: "min(344px, calc(100vw - 36px))",
          display: "flex", flexDirection: "column", gap: 9,
        }}>
          {natures.map((n, i) => {
            const t = ETIQ[n.cle] || ETIQ.demenagement;
            return (
              <button key={n.cle} role="menuitem"
                onClick={() => { basculer(false); choisir(n.cle); }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 11,
                  textAlign: "left", padding: "13px 15px", borderRadius: 16,
                  border: `1px solid ${C.bord}`, background: C.blanc,
                  cursor: "pointer",
                  boxShadow: "0 10px 26px -14px rgba(8,12,26,.45)",
                  // Les entrées arrivent l'une après l'autre, du bas vers le
                  // haut : on suit le menu du regard depuis le bouton au lieu
                  // de le voir surgir d'un bloc.
                  animation: `entreeMenu 210ms cubic-bezier(.16,.9,.3,1) `
                           + `${(natures.length - 1 - i) * 34}ms both`,
                }}>
                {/* La pastille du métier : une bulle, comme le bouton. */}
                <Bille taille={13} ton={TONS_METIER[n.cle] || "bleu"}
                       style={{ marginTop: 3 }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "baseline",
                                 gap: 7, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14.5, fontWeight: 800,
                                   color: C.encre }}>{n.titre}</span>
                    {/* Le métier, en petit : c'est lui qui lève l'ambiguïté
                        entre « lift » l'engin et « lift » la prestation. */}
                    <span style={{ fontSize: 10, fontWeight: 700,
                                   color: t.sombre, background: `${t.vif}1F`,
                                   padding: "2px 7px", borderRadius: 999,
                                   whiteSpace: "nowrap" }}>
                      {metier(n.cle)}
                    </span>
                  </span>
                  <span style={{ display: "block", fontSize: 11.5,
                                 color: C.muet, marginTop: 4,
                                 lineHeight: 1.45 }}>
                    {n.resume}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => basculer(!ouvert)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        aria-label={ouvert ? "Fermer le menu de création" : "Créer"}
        style={{
          ...S.flottant,
          zIndex: 42,
          border: "none",
          // La bulle : lumière en haut à gauche, creux en bas, halo coloré.
          background: `radial-gradient(circle at 34% 26%, #ffffffcc 0%, `
                    + `${C.bleu} 46%, #1D4ED8 100%)`,
          boxShadow: ouvert
            ? `inset 0 2px 6px #1D4ED8cc, 0 4px 12px -4px #1D4ED866`
            : `inset 0 -3px 6px #1D4ED8aa, inset 0 2px 3px #ffffff66, `
              + `0 10px 24px -8px #1D4ED899, 0 3px 8px -2px rgba(8,12,26,.3)`,
          color: "#fff",
          fontWeight: 300,
          display: "grid",
          placeItems: "center",
          lineHeight: 1,
          transform: ouvert ? "rotate(45deg) scale(.94)" : "none",
          transition: "transform 220ms cubic-bezier(.16,.9,.3,1), "
                    + "box-shadow 220ms ease-out",
        }}>
        <span style={{ display: "block", marginTop: -2,
                       textShadow: "0 1px 2px rgba(8,12,26,.35)" }}>+</span>
      </button>

      <style>{`
        @keyframes entreeMenu {
          from { opacity: 0; transform: translateY(14px) scale(.96); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes voileEntre {
          from { opacity: 0; } to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          /* Une animation subie donne le mal des transports à qui y est
             sensible : on garde l'apparition, on retire le mouvement. */
          @keyframes entreeMenu { from { opacity: 0; } to { opacity: 1; } }
          @keyframes voileEntre { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>
    </div>
  );
}
