// =============================================================================
// Le menu du « + » — ce qu'on crée.
//
// Un seul bouton, cinq natures qui se déroulent au premier clic. Le contenu
// vient de `@domaine/commercial/natures.js` : ajouter une nature là-bas la
// fait apparaître ici, sans toucher à cet écran.
//
// Le résumé de chaque nature est AFFICHÉ, pas caché derrière une infobulle :
// « sous-traitance » et « lift » ne veulent pas dire la même chose pour tout
// le monde, et se tromper de nature engage un mauvais parcours jusqu'à la
// facture.
// =============================================================================

import React, { useEffect, useRef } from "react";
import { naturesDuMenu } from "@domaine/commercial/natures.js";
import { C, S } from "../lib/theme.jsx";

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
          background: "rgba(8,12,26,.28)",
          backdropFilter: "blur(1.5px)",
        }} />
      )}

      {ouvert && (
        <div role="menu" aria-label="Que voulez-vous créer ?" style={{
          position: "fixed", right: 18, bottom: 150, zIndex: 41,
          width: "min(340px, calc(100vw - 36px))",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          {natures.map((n, i) => (
            <button key={n.cle} role="menuitem"
              onClick={() => { basculer(false); choisir(n.cle); }}
              style={{
                textAlign: "left", padding: "12px 14px", borderRadius: 14,
                border: `1px solid ${C.bord}`, background: C.blanc,
                cursor: "pointer", boxShadow: "0 8px 20px -10px rgba(8,12,26,.35)",
                // Les entrées arrivent l'une après l'autre : on suit le menu
                // du regard au lieu de le voir apparaître d'un bloc.
                animation: `menuEntre 160ms ease-out ${i * 28}ms both`,
              }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.encre }}>
                {n.titre}
              </div>
              <div style={{ fontSize: 11.5, color: C.muet, marginTop: 3,
                            lineHeight: 1.45 }}>
                {n.resume}
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        style={{ ...S.flottant, zIndex: 42,
                 transform: ouvert ? "rotate(45deg)" : "none",
                 transition: "transform 160ms ease-out" }}
        onClick={() => basculer(!ouvert)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        aria-label={ouvert ? "Fermer le menu de création" : "Créer"}>
        +
      </button>

      <style>{`@keyframes menuEntre {
        from { opacity: 0; transform: translateY(8px) scale(.98); }
        to   { opacity: 1; transform: none; }
      }`}</style>
    </div>
  );
}
