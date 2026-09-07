// =============================================================================
// CARTE D'OFFRE SECTORIELLE — les métiers de l'écosystème.
//
// Distincte de CarteAbonnement (les paliers déménageur) : ici, chaque carte est
// un MÉTIER, pas une taille. On n'affiche donc ni « ce que vous gagnez par
// rapport au précédent », ni hiérarchie — ces offres ne se succèdent pas, elles
// se côtoient.
//
// RÈGLE TENUE ICI : une offre non disponible porte un badge « Bientôt » et son
// bouton n'engage à rien (liste d'attente). On n'annonce jamais « souscrire »
// sur un parcours qui n'existe pas — la landing doit dire la vérité du produit.
// =============================================================================

import React from "react";
import { V } from "./theme-vitrine.jsx";

const euros = (c) => (c / 100).toLocaleString("fr-BE",
  { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function CarteOffreSecteur({ offre, onInteret }) {
  const gratuite = offre.prix_centimes === 0;
  const bientot = offre.statut !== "disponible";

  return (
    <article style={{
      display: "flex", flexDirection: "column", gap: 12,
      padding: "22px 20px", borderRadius: 18,
      background: "rgba(255,255,255,.045)",
      border: `1px solid ${gratuite ? "rgba(96,165,250,.45)" : "rgba(255,255,255,.12)"}`,
      backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
      position: "relative",
    }}>
      {/* Le statut, dit franchement et sans le cacher. */}
      {bientot && (
        <span style={{
          position: "absolute", top: 14, right: 14,
          fontSize: 10, fontWeight: 800, letterSpacing: .4,
          textTransform: "uppercase", padding: "4px 9px", borderRadius: 999,
          background: "rgba(217,119,6,.22)", color: "#FCD34D",
          border: "1px solid rgba(217,119,6,.4)",
        }}>Bientôt</span>
      )}

      <div>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: .6,
                      textTransform: "uppercase", color: "rgba(255,255,255,.45)" }}>
          {offre.secteur}
        </div>
        <h3 className="v-display" style={{ margin: "5px 0 0", fontSize: 20,
                                           color: "#fff" }}>{offre.nom}</h3>
      </div>

      {/* Le prix. Gratuit se dit gratuit, sans astérisque. */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
        <span className="v-display" style={{ fontSize: 30, fontWeight: 800,
                                             color: gratuite ? "#60A5FA" : "#fff" }}>
          {gratuite ? "Gratuit" : euros(offre.prix_centimes)}
        </span>
        {!gratuite && (
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)" }}>
            HTVA {offre.unite}
          </span>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "#fff",
                  lineHeight: 1.45 }}>{offre.promesse}</p>
      <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.62)",
                  lineHeight: 1.55 }}>{offre.pour}</p>

      {/* Les produits vendables, quand l'offre en a (l'indépendant). */}
      {offre.produits && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {offre.produits.map((p) => (
            <span key={p} style={{ fontSize: 11.5, padding: "4px 9px",
              borderRadius: 999, background: "rgba(255,255,255,.07)",
              color: "rgba(255,255,255,.78)",
              border: "1px solid rgba(255,255,255,.1)" }}>{p}</span>
          ))}
        </div>
      )}

      {/* CE QU'ON VEND VRAIMENT : les récurrents qui ne seront plus litigieux.
          Pas un temps gagné inventé — des points vérifiables. */}
      {offre.recurrents && (
        <div style={{ marginTop: 2 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .3,
                        color: "rgba(255,255,255,.5)", marginBottom: 7,
                        textTransform: "uppercase" }}>
            Ne sera plus jamais contesté
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none",
                       display: "grid", gap: 6 }}>
            {offre.recurrents.map((r) => (
              <li key={r} style={{ display: "flex", gap: 8, fontSize: 13,
                                   color: "rgba(255,255,255,.82)" }}>
                <span style={{ color: "#4ADE80", fontWeight: 800 }}>✓</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {offre.note_prix && (
        <p style={{ margin: "2px 0 0", fontSize: 11.5, lineHeight: 1.5,
                    color: "rgba(255,255,255,.45)" }}>{offre.note_prix}</p>
      )}

      <div style={{ marginTop: "auto", paddingTop: 12 }}>
        <button onClick={() => onInteret && onInteret(offre)}
          style={{
            width: "100%", padding: "12px", borderRadius: 12, cursor: "pointer",
            fontSize: 13.5, fontWeight: 800,
            border: bientot ? "1px solid rgba(255,255,255,.22)" : "none",
            background: bientot ? "transparent" : "#2563EB",
            color: "#fff",
          }}>
          {/* On ne dit JAMAIS « souscrire » sur un parcours inexistant. */}
          {bientot ? "Être prévenu au lancement" : "Découvrir l'offre"}
        </button>
      </div>
    </article>
  );
}
