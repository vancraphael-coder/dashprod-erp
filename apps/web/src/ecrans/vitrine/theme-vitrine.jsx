// =============================================================================
// Vitrine — langage visuel des pages publiques (landing + portes d'entrée).
//
// Identité : le monde du déménagement, pas un template SaaS générique.
//   - Signature : l'ÉTIQUETTE DE COLIS. Le produit numérote les colis
//     « 001/025 » (manifeste export) ; la vitrine reprend ce motif : sections
//     numérotées comme des colis, étiquette de colisage dans le hero.
//   - Display : Archivo étiré (l'esprit du lettrage de flanc de camion).
//   - Corps : Fira Sans / Fira Code — les polices du produit. La vitrine et
//     l'app sont le même objet.
//   - Palette : nuit de chargement (hero), bleu route (le bleu produit),
//     ivoire froid, ambre sangle pour les étiquettes.
//
// Tout est ici : les pages consomment, ne redéfinissent jamais.
// =============================================================================

import React from "react";

export const V = {
  nuit: "#0A1428",          // hero, footer — la nuit du chargement à 5 h
  nuitDouce: "#101C36",     // cartes sur fond nuit
  route: "#2563EB",         // bleu produit — continuité vitrine ↔ app
  routeVif: "#3B82F6",
  ciel: "#DBEAFE",
  ivoire: "#F6F8FC",        // sections claires
  blanc: "#FFFFFF",
  encre: "#0F172A",
  muet: "#5B6B84",
  brume: "#94A3B8",
  sangle: "#D97706",        // ambre des étiquettes et sangles
  sangleClair: "#FDE9C8",
  bord: "#E3EAF6",
  bordNuit: "rgba(255,255,255,.10)",
};

export const DISPLAY = "'Archivo', 'Fira Sans', system-ui, sans-serif";
export const CORPS = "'Fira Sans', system-ui, sans-serif";
export const MONO = "'Fira Code', ui-monospace, monospace";

// Polices + styles globaux de la vitrine, injectés une fois.
if (typeof document !== "undefined" && !document.getElementById("vitrine-fonts")) {
  const l = document.createElement("link");
  l.id = "vitrine-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,110..125,600..900"
    + "&family=Fira+Sans:wght@400;500;600;700&family=Fira+Code:wght@500;600;700&display=swap";
  document.head.appendChild(l);

  const s = document.createElement("style");
  s.id = "vitrine-css";
  s.textContent = `
    .vitrine { font-family: ${CORPS}; }
    .vitrine ::selection { background: ${V.route}; color: #fff; }
    .vitrine a { color: inherit; }
    .vitrine button { font-family: ${CORPS}; }
    .vitrine :focus-visible {
      outline: 3px solid ${V.routeVif}; outline-offset: 2px; border-radius: 6px;
    }
    /* Display étiré : le lettrage du flanc de camion. */
    .v-display {
      font-family: ${DISPLAY};
      font-variation-settings: "wdth" 122;
      font-weight: 800; letter-spacing: -.015em; line-height: 1.04;
      text-wrap: balance;
    }
    .v-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 10px;
      border-radius: 12px; border: none; cursor: pointer;
      font-weight: 700; font-size: 15px; padding: 14px 24px;
      transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
    }
    .v-btn:hover { transform: translateY(-1px); }
    .v-btn:active { transform: translateY(0); }
    .v-btn-plein { background: ${V.route}; color: #fff;
      box-shadow: 0 8px 24px rgba(37,99,235,.28); }
    .v-btn-plein:hover { background: ${V.routeVif}; }
    .v-btn-nuit { background: ${V.encre}; color: #fff; }
    .v-btn-blanc { background: #fff; color: ${V.encre};
      border: 1.5px solid ${V.bord}; box-shadow: 0 1px 3px rgba(15,23,42,.06); }
    .v-btn-fantome { background: rgba(255,255,255,.08); color: #fff;
      border: 1px solid ${V.bordNuit}; backdrop-filter: blur(4px); }
    .v-btn-fantome:hover { background: rgba(255,255,255,.14); }
    .v-carte {
      background: #fff; border: 1px solid ${V.bord}; border-radius: 18px;
      transition: transform .18s ease, box-shadow .18s ease;
    }
    .v-carte-hover:hover {
      transform: translateY(-3px);
      box-shadow: 0 16px 40px rgba(15,23,42,.10);
    }
    @keyframes v-lever { from { opacity: 0; transform: translateY(14px); }
                         to { opacity: 1; transform: none; } }
    .v-lever { animation: v-lever .55s ease both; }
    .v-lever-2 { animation: v-lever .55s .08s ease both; }
    .v-lever-3 { animation: v-lever .55s .16s ease both; }
    @media (prefers-reduced-motion: reduce) {
      .v-lever, .v-lever-2, .v-lever-3 { animation: none; }
      .v-btn, .v-carte { transition: none; }
    }
  `;
  document.head.appendChild(s);
}

/**
 * L'étiquette de colis — la signature visuelle de la vitrine.
 * `numero` au format du produit (001/006). Le code-barres est décoratif
 * (aria-hidden) ; l'information est le numéro et le libellé.
 */
export function Etiquette({ numero, libelle, sombre = false, style }) {
  const fond = sombre ? V.nuitDouce : "#fff";
  const trait = sombre ? V.bordNuit : V.bord;
  const texte = sombre ? "#fff" : V.encre;
  return (
    <div style={{
      display: "inline-flex", alignItems: "stretch", borderRadius: 10,
      border: `1px solid ${trait}`, background: fond, overflow: "hidden",
      boxShadow: sombre ? "none" : "0 1px 3px rgba(15,23,42,.06)", ...style }}>
      <span style={{ background: V.sangle, width: 6 }} aria-hidden="true" />
      <span style={{ padding: "7px 10px 7px 12px", display: "flex",
                     flexDirection: "column", gap: 1 }}>
        <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700,
                       color: texte, letterSpacing: ".04em" }}>{numero}</span>
        {libelle && (
          <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".08em",
                         textTransform: "uppercase",
                         color: sombre ? V.brume : V.muet }}>{libelle}</span>
        )}
      </span>
      <span aria-hidden="true" style={{
        margin: "7px 10px 7px 4px", width: 34, alignSelf: "stretch",
        background: `repeating-linear-gradient(90deg, ${texte} 0 2px, transparent 2px 4px,
          ${texte} 4px 5px, transparent 5px 8px, ${texte} 8px 11px, transparent 11px 13px)`,
        opacity: sombre ? .8 : .75, borderRadius: 2 }} />
    </div>
  );
}

/** Le logo — le D dans son colis. */
export function Logo({ sombre = false, taille = 34 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: taille, height: taille, borderRadius: 9,
        background: V.route, color: "#fff", display: "grid", placeItems: "center",
        fontFamily: DISPLAY, fontVariationSettings: '"wdth" 122',
        fontSize: taille * .55, fontWeight: 800,
        boxShadow: "0 4px 14px rgba(37,99,235,.35)" }}>D</span>
      <span className="v-display" style={{ fontSize: taille * .56,
        color: sombre ? "#fff" : V.encre }}>Dashprod</span>
    </span>
  );
}

/** Barre de navigation publique. */
export function NavPublique({ page, aller, sombre = false }) {
  const lien = (cible, texte) => (
    <button onClick={() => aller(cible)} style={{
      background: "none", border: "none", cursor: "pointer", padding: "8px 10px",
      fontSize: 13.5, fontWeight: 600,
      color: page === cible ? (sombre ? "#fff" : V.route)
                            : (sombre ? "rgba(255,255,255,.72)" : V.muet) }}>
      {texte}
    </button>
  );
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 20,
      background: sombre ? "rgba(10,20,40,.85)" : "rgba(255,255,255,.85)",
      backdropFilter: "blur(10px)",
      borderBottom: `1px solid ${sombre ? V.bordNuit : V.bord}` }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 20px",
                    display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={() => aller("accueil")} aria-label="Accueil Dashprod"
                style={{ background: "none", border: "none", cursor: "pointer",
                         padding: 0, marginRight: "auto" }}>
          <Logo sombre={sombre} taille={30} />
        </button>
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {lien("societe", "Déménageurs")}
          {lien("client", "Vous déménagez ?")}
          <button onClick={() => aller("connexion")} className="v-btn"
                  style={{ padding: "9px 16px", fontSize: 13.5, marginLeft: 8,
                           background: sombre ? "#fff" : V.encre,
                           color: sombre ? V.encre : "#fff" }}>
            Se connecter
          </button>
        </nav>
      </div>
    </header>
  );
}

/** Pied de page public. */
export function PiedPublic({ aller }) {
  return (
    <footer style={{ background: V.nuit, color: V.brume, marginTop: "auto" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "34px 20px 26px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24,
                      justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ maxWidth: 320 }}>
            <Logo sombre taille={26} />
            <p style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 12, color: V.brume }}>
              Le logiciel de gestion des entreprises de déménagement.
              Du premier appel à la facture payée.
            </p>
          </div>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <div>
              <div style={pied.titre}>Produit</div>
              <button style={pied.lien} onClick={() => aller("societe")}>Créer ma société</button>
              <button style={pied.lien} onClick={() => aller("connexion")}>Se connecter</button>
            </div>
            <div>
              <div style={pied.titre}>Particuliers</div>
              <button style={pied.lien} onClick={() => aller("client")}>Suivre mon déménagement</button>
              <button style={pied.lien} onClick={() => aller("client")}>Signer une offre</button>
            </div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${V.bordNuit}`, marginTop: 26,
                      paddingTop: 16, display: "flex", flexWrap: "wrap", gap: 8,
                      justifyContent: "space-between", fontSize: 11.5 }}>
          <span>© {new Date().getFullYear()} Dashprod — Belgique.</span>
          <span>Données hébergées en Europe · Facturation Peppol</span>
        </div>
      </div>
    </footer>
  );
}

const pied = {
  titre: { fontSize: 11, fontWeight: 700, letterSpacing: ".1em",
           textTransform: "uppercase", color: "#fff", marginBottom: 10 },
  lien: { display: "block", background: "none", border: "none", cursor: "pointer",
          padding: "4px 0", fontSize: 13, color: V.brume, textAlign: "left" },
};

/** Bouton Google réutilisé sur les trois portes. */
export function BoutonGoogle({ onClick, texte = "Continuer avec Google", nuit = false }) {
  return (
    <button onClick={onClick} className={`v-btn ${nuit ? "v-btn-fantome" : "v-btn-blanc"}`}
            style={{ width: "100%" }}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.2-.15-1.8H9v3.4h4.8c-.2 1.1-.85 2-1.8 2.6v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.4Z"/>
        <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 15.9 5.5 18 9 18Z"/>
        <path fill="#FBBC05" d="M3.9 10.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V4.9H.9C.3 6.1 0 7.5 0 9s.3 2.9.9 4.1l3-2.4Z"/>
        <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.45 3.4 1.35l2.6-2.6C13.5.9 11.4 0 9 0 5.5 0 2.4 2.1.9 4.9l3 2.3C4.6 5.1 6.6 3.6 9 3.6Z"/>
      </svg>
      {texte}
    </button>
  );
}
