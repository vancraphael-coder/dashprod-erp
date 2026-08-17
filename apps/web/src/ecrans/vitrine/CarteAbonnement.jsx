// =============================================================================
// CARTE D'ABONNEMENT — la carte de visite du produit.
//
// Matière : verre dépoli sur fond de nuit, filet lumineux en haut, halo qui
// suit le curseur, et une inclinaison 3D légère au survol. La bulle centrale
// (sphère irisée + chevron) déplie le détail des modules.
//
// Le parti pris est PRATIQUE : replié, on voit ce qui décide — le prix, la
// promesse, ce qu'on gagne. Le détail exhaustif est à un clic, pas imposé.
//
// Sobriété technique : l'inclinaison ne s'active qu'au pointeur fin (souris),
// jamais au doigt, et se coupe si la personne a demandé « mouvement réduit ».
// =============================================================================

import React, { useRef, useState, useCallback } from "react";
import { V, MONO } from "./theme-vitrine.jsx";
import Bille from "../../composants/Bille.jsx";
import { matiereSurface } from "../../lib/matiere-bille.js";

const TILT_MAX = 9;      // degrés — au-delà, l'effet devient un gadget

const mouvementReduit = () =>
  typeof window !== "undefined"
  && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const pointeurFin = () =>
  typeof window !== "undefined"
  && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

/**
 * @param {{plan, vedette, ouverte, gains, aVenir, socle, essaiJours,
 *          heritage, onSouscrire, verrouMotif}} props
 */
export default function CarteAbonnement({
  plan, vedette = false, ouverte = true, gains = [], aVenir = [],
  socle = null, essaiJours, heritage = null, onSouscrire, verrouMotif,
}) {
  const ref = useRef(null);
  const [deplie, setDeplie] = useState(false);
  const [st, setSt] = useState({ rx: 0, ry: 0, gx: "50%", gy: "50%",
                                 huile: 135, nx: 0, ny: 0, sx: 0, sy: 0 });

  const bouger = useCallback((e) => {
    if (!pointeurFin() || mouvementReduit()) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const nx = (x / r.width) * 2 - 1, ny = (y / r.height) * 2 - 1;
    setSt({
      rx: -ny * TILT_MAX, ry: nx * TILT_MAX,
      gx: `${x}px`, gy: `${y}px`,
      huile: Math.atan2(ny, nx) * (180 / Math.PI) + 90,
      // Deux formes du même regard : BRUT pour le reflet spéculaire, qui glisse
      // linéairement, et ADOUCI en sinus pour la parallaxe du signe — presque
      // immobile au centre, saturé aux bords. C'est cette courbe qui fait la
      // crédibilité du mouvement ; un décalage linéaire est mécanique.
      nx, ny,
      sx: Math.sin(nx * Math.PI / 2), sy: Math.sin(ny * Math.PI / 2),
    });
  }, []);

  const quitter = useCallback(() => {
    setSt({ rx: 0, ry: 0, gx: "50%", gy: "50%", huile: 135,
            nx: 0, ny: 0, sx: 0, sy: 0 });
  }, []);

  const prix = Math.round(plan.prix_centimes / 100);
  const places = plan.utilisateurs
    ? `${plan.utilisateurs} utilisateur${plan.utilisateurs > 1 ? "s" : ""}`
    : "Sans limite";
  const nbModules = (gains.length + (socle ? socle.length : 0)) || plan.modules.length;

  return (
    <div style={{ perspective: 1200 }}>
      <article ref={ref} onMouseMove={bouger} onMouseLeave={quitter}
        style={{
          position: "relative", borderRadius: 26, padding: "26px 22px",
          display: "flex", flexDirection: "column", alignItems: "center",
          // Verre : plus lumineux pour la vedette.
          background: vedette
            ? "linear-gradient(145deg, rgba(59,130,246,.16) 0%, rgba(255,255,255,.02) 100%)"
            : "linear-gradient(145deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.01) 100%)",
          border: `1px solid ${vedette ? "rgba(147,197,253,.34)" : "rgba(255,255,255,.12)"}`,
          borderTop: `1px solid ${vedette ? "rgba(191,219,254,.6)" : "rgba(255,255,255,.3)"}`,
          backdropFilter: "blur(25px)", WebkitBackdropFilter: "blur(25px)",
          transform: `rotateX(${st.rx}deg) rotateY(${st.ry}deg)`,
          transformStyle: "preserve-3d", willChange: "transform",
          // LA CARTE EST LA SOURCE DE LUMIÈRE : elle publie ce qu'elle a déjà
          // calculé, au lieu de le garder pour elle. Les billes qu'elle porte
          // l'héritent en CSS — la vitrine et l'application s'éclairent donc
          // par le MÊME contrat, et la bille ne peut plus diverger d'un côté
          // sans l'autre. C'était exactement le défaut : deux recettes.
          "--carte-angle": `${st.huile}deg`,
          "--carte-nx": st.nx, "--carte-ny": st.ny,
          "--carte-sx": st.sx, "--carte-sy": st.sy,
          // Sur le fond de nuit de la vitrine, la bille est du verre.
          ...matiereSurface(true),
          transition: "transform .25s cubic-bezier(.1,1,.1,1)",
          boxShadow: vedette
            ? "0 34px 70px -20px rgba(37,99,235,.55), inset 0 1px 0 rgba(255,255,255,.25)"
            : "0 30px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.18)",
          opacity: ouverte ? 1 : .72,
        }}>

        {/* Halo qui suit le curseur */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, borderRadius: 26, pointerEvents: "none",
          background: `radial-gradient(420px circle at ${st.gx} ${st.gy},
                       rgba(59,130,246,.16), transparent 42%)` }} />

        {/* En-tête : palier + état */}
        <header style={{ width: "100%", display: "flex", alignItems: "center",
                         justifyContent: "space-between", gap: 8,
                         transform: "translateZ(20px)", zIndex: 2 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700,
            letterSpacing: ".16em", textTransform: "uppercase",
            color: vedette ? "#93C5FD" : "rgba(255,255,255,.55)",
            background: vedette ? "rgba(59,130,246,.14)" : "rgba(255,255,255,.05)",
            border: `1px solid ${vedette ? "rgba(147,197,253,.3)" : "rgba(255,255,255,.1)"}`,
            padding: "4px 10px", borderRadius: 999 }}>
            {plan.nom}
          </span>
          {vedette && <Pastille texte="Le plus choisi" />}
          {!ouverte && (
            <span style={{ fontSize: 10.5, fontWeight: 600,
              color: "rgba(255,255,255,.5)" }}>Bientôt</span>
          )}
        </header>

        {/* Bulle : le geste. Elle déplie le détail des modules. */}
        {/* UNE SEULE définition de bille pour tout le produit : celle-ci était
            l'originale, elle est maintenant DANS le composant partagé. La
            recopier ici, c'était la condamner à diverger — et c'est ce qui est
            arrivé : les billes de l'app avaient perdu l'huile irisée, le verre
            et la profondeur de celle-ci. */}
        <span style={{ margin: "18px 0 4px", transform: "translateZ(35px)",
                       transformStyle: "preserve-3d", zIndex: 10 }}>
          <Bille taille="vedette" ton="bleu" signe="chevron" actif={deplie}
                 onClick={() => setDeplie((v) => !v)} deplie={deplie}
                 titre={deplie ? `Masquer le détail ${plan.nom}`
                               : `Voir le détail de l'offre ${plan.nom}`}
                 style={{ display: "block" }} />
        </span>

        {/* Corps */}
        <div style={{ width: "100%", transform: "translateZ(25px)", zIndex: 2,
                      textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline",
                        justifyContent: "center", gap: 4 }}>
            <span className="v-display" style={{ fontSize: 44, color: "#fff" }}>{prix}</span>
            <span className="v-display" style={{ fontSize: 20, color: "#93C5FD" }}>€</span>
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", marginTop: 2 }}>
            HTVA / mois · par entreprise
          </div>

          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff",
                        marginTop: 14, lineHeight: 1.4 }}>
            {plan.promesse}
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.58)",
                        marginTop: 6, lineHeight: 1.5 }}>
            {plan.pour}
          </div>

          {/* Métriques : ce qui se compare d'un coup d'œil */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 6, background: "rgba(0,0,0,.28)", padding: "11px 8px",
                        borderRadius: 16, border: "1px solid rgba(255,255,255,.06)",
                        margin: "16px 0 0" }}>
            <Metrique label="Places" valeur={places} />
            <Metrique label="Modules" valeur={nbModules} />
            <Metrique label="Essai" valeur={`${essaiJours} j`} />
          </div>

          {/* Tiroir : le détail, à la demande */}
          <div style={{ display: "grid",
                        gridTemplateRows: deplie ? "1fr" : "0fr",
                        transition: "grid-template-rows .5s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ overflow: "hidden", textAlign: "left",
                          opacity: deplie ? 1 : 0,
                          transform: deplie ? "translateY(0)" : "translateY(6px)",
                          transition: "opacity .4s ease, transform .4s ease",
                          paddingTop: deplie ? 14 : 0 }}>
              {heritage && (
                <div style={{ fontSize: 11.5, color: "#93C5FD", marginBottom: 6 }}>
                  Tout {heritage}, plus :
                </div>
              )}
              {socle && socle.map((t) => <Ligne key={t} texte={t} />)}
              {gains.map((g) => <Ligne key={g.cle} texte={g.titre} />)}
              {aVenir.map((g) => <Ligne key={g.cle} texte={g.titre} aVenir />)}
            </div>
          </div>

          {ouverte ? (
            <button onClick={onSouscrire} style={{
              width: "100%", marginTop: 18, padding: "13px",
              borderRadius: 980, cursor: "pointer",
              border: `1px solid ${vedette ? "transparent" : "rgba(255,255,255,.18)"}`,
              background: vedette ? "#fff" : "rgba(255,255,255,.06)",
              color: vedette ? V.route : "#fff",
              fontSize: 14, fontWeight: 700,
              backdropFilter: "blur(10px)", transform: "translateZ(20px)",
              boxShadow: vedette ? "0 12px 30px rgba(0,0,0,.35)" : "none",
              transition: "background .3s, box-shadow .3s" }}>
              Essayer {essaiJours} jours
            </button>
          ) : (
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)",
                          marginTop: 18, lineHeight: 1.5, textAlign: "left" }}>
              {verrouMotif}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

function Pastille({ texte }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, color: "#0A1428",
      background: "linear-gradient(135deg, #BFDBFE, #fff)", borderRadius: 999,
      padding: "4px 10px", letterSpacing: ".04em", textTransform: "uppercase",
      boxShadow: "0 6px 18px rgba(147,197,253,.35)" }}>{texte}</span>
  );
}

function Metrique({ label, valeur }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <span style={{ fontSize: 9.5, textTransform: "uppercase",
        letterSpacing: ".08em", color: "rgba(255,255,255,.42)" }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", marginTop: 3 }}>
        {valeur}
      </span>
    </div>
  );
}

function Ligne({ texte, aVenir = false }) {
  return (
    <div style={{ display: "flex", gap: 9, padding: "5px 0",
                  borderBottom: "1px dashed rgba(255,255,255,.08)",
                  fontSize: 12.5,
                  color: aVenir ? "rgba(255,255,255,.42)" : "rgba(255,255,255,.82)" }}>
      <span style={{ color: aVenir ? "rgba(255,255,255,.35)" : "#60A5FA",
                     fontWeight: 800, flexShrink: 0 }}>{aVenir ? "◦" : "✓"}</span>
      <span>{texte}</span>
    </div>
  );
}
