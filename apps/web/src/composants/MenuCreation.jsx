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
import { matiereSurface } from "../lib/matiere-bille.js";
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
  demenagement: { vif: "#3B82F6", sombre: C.encreBleu },
  sous_traitance: { vif: "#F87171", sombre: "#DC2626" },
  lift: { vif: "#F59E0B", sombre: C.encreAmbre },
  boxe: { vif: "#34D399", sombre: C.encreVert },
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
          {/* Vente rapide : une ACTION, pas un métier. En tête, style distinct
              (fournitures au comptoir ou livrées). */}
          <button role="menuitem"
            onClick={() => { basculer(false); choisir("vente"); }}
            data-champ="" className="option-verre"
            style={{
              display: "flex", alignItems: "center", gap: 11,
              textAlign: "left", padding: "13px 15px", borderRadius: 16,
              cursor: "pointer", border: "1px solid rgba(255,255,255,.55)",
              background: `linear-gradient(135deg,
                rgba(226,242,255,.92) 0%, rgba(214,235,255,.78) 100%)`,
              backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
              boxShadow: `0 10px 26px -14px rgba(8,12,26,.45),
                          inset 0 1px 0 rgba(255,255,255,.9)`,
              ...matiereSurface(false),
            }}>
            <span style={{ fontSize: 22, marginTop: 1 }}>🧾</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: C.encre }}>
                Vente rapide
              </span>
              <span style={{ display: "block", fontSize: 11.5, color: C.muet,
                             marginTop: 4, lineHeight: 1.45 }}>
                Fournitures — cartons, emballage. Au comptoir ou livrée, facturée
                en quelques gestes.
              </span>
            </span>
          </button>

          {natures.map((n, i) => {
            const t = ETIQ[n.cle] || ETIQ.demenagement;
            return (
              <button key={n.cle} role="menuitem"
                onClick={() => { basculer(false); choisir(n.cle); }}
                // Le menu n'est pas fait de cartes : sans ce marqueur, ses
                // pastilles resteraient les seules billes éteintes de l'app.
                // `data-champ` déclare la surface qui les éclaire.
                data-champ=""
                className="option-verre"
                style={{
                  display: "flex", alignItems: "flex-start", gap: 11,
                  textAlign: "left", padding: "13px 15px", borderRadius: 16,
                  cursor: "pointer",
                  // Le MÊME verre que la bille : translucide, flouté, avec un
                  // liseré de lumière en haut. Une option opaque à côté d'une
                  // bille de verre trahit deux mains différentes.
                  border: "1px solid rgba(255,255,255,.55)",
                  background: `linear-gradient(135deg,
                    rgba(255,255,255,.86) 0%, rgba(255,255,255,.72) 100%)`,
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  boxShadow: `0 10px 26px -14px rgba(8,12,26,.45),
                              inset 0 1px 0 rgba(255,255,255,.9)`,
                  ...matiereSurface(false),
                  // Les entrées arrivent l'une après l'autre, du bas vers le
                  // haut : on suit le menu du regard depuis le bouton au lieu
                  // de le voir surgir d'un bloc.
                  animation: `entreeMenu 210ms cubic-bezier(.16,.9,.3,1) `
                           + `${(natures.length - 1 - i) * 34}ms both`,
                }}>
                {/* La pastille du métier : une bulle, comme le bouton. */}
                <Bille taille="jeton" ton={TONS_METIER[n.cle] || "bleu"}
                       style={{ marginTop: 2 }} />
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

      {/* Le « + » EST une bille. C'était une bulle dessinée à part, avec sa
          propre recette de dégradé et d'ombre — donc condamnée à diverger de
          la mascotte qu'elle imitait. Elle est maintenant la même matière que
          toutes les autres, en taille bouton : huile, verre, reflet mobile,
          profondeur. Le signe passe de « + » à « croix » à l'ouverture, et la
          rotation reste sur le conteneur. */}
      <span style={{ ...S.flottant, zIndex: 42, border: "none", padding: 0,
                     background: "none", boxShadow: "none",
                     display: "grid", placeItems: "center",
                     // La surface qui l'éclaire : le bouton flotte seul,
                     // sans carte sous lui.
                     ...matiereSurface(false) }}
            data-champ="">
        <Bille taille="bouton" ton="bleu" signe={ouvert ? "croix" : "plus"}
               actif={ouvert} deplie={ouvert}
               onClick={() => basculer(!ouvert)}
               titre={ouvert ? "Fermer le menu de création" : "Créer"}
               style={{
                 transform: ouvert ? "rotate(90deg)" : "none",
                 transition: "transform 220ms cubic-bezier(.16,.9,.3,1)",
               }} />
      </span>

      <style>{`
        @keyframes entreeMenu {
          from { opacity: 0; transform: translateY(14px) scale(.96); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes voileEntre {
          from { opacity: 0; } to { opacity: 1; }
        }
        /* Les options bougent comme la bille : elles avancent d'un cheveu et
           leur verre s'éclaircit. Même courbe, même durée — sinon le menu et
           sa mascotte n'ont pas l'air d'appartenir au même objet. */
        .option-verre {
          transition: transform .22s cubic-bezier(.34,1.4,.64,1),
                      box-shadow .22s ease-out, background .22s ease-out;
        }
        .option-verre:hover {
          transform: translateY(-2px) scale(1.015);
          background: linear-gradient(135deg,
            rgba(255,255,255,.96) 0%, rgba(255,255,255,.84) 100%);
          box-shadow: 0 16px 32px -16px rgba(8,12,26,.5),
                      inset 0 1px 0 rgba(255,255,255,1);
        }
        @media (prefers-reduced-motion: reduce) {
          /* Une animation subie donne le mal des transports à qui y est
             sensible : on garde l'apparition, on retire le mouvement. */
          @keyframes entreeMenu { from { opacity: 0; } to { opacity: 1; } }
          @keyframes voileEntre { from { opacity: 0; } to { opacity: 1; } }
          .option-verre, .option-verre:hover { transition: none; transform: none; }
        }
      `}</style>
    </div>
  );
}
