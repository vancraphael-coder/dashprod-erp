// =============================================================================
// LES SIX PAGES D'UN DOSSIER — aperçus schématiques pour la vitrine.
//
// On montre l'ARCHITECTURE d'un dossier, pas des chiffres : des blocs, des
// lignes, une silhouette d'écran. Aucune donnée inventée n'est affichée — un
// prospect comprend la structure du produit sans qu'on lui vende un faux client.
//
// Les six pages sont celles du cycle réel : Relevé, Devis, Offre, Matériel,
// Facture, Journal.
// =============================================================================

import React from "react";
import { V, MONO } from "./theme-vitrine.jsx";

export const PAGES_DOSSIER = [
  { cle: "releve", titre: "Relevé", role: "Les biens, pièce par pièce" },
  { cle: "devis", titre: "Devis", role: "Le calcul, heures et barème" },
  { cle: "offre", titre: "Offre", role: "Le document signé en ligne" },
  { cle: "materiel", titre: "Matériel", role: "Emballage enlevé et repris" },
  { cle: "facture", titre: "Facture", role: "Émission, paiement, Peppol" },
  { cle: "journal", titre: "Journal", role: "Qui a fait quoi, et quand" },
];

/** Un aperçu d'écran : cadre sombre, en-tête, et une silhouette de contenu. */
export function VignetteEcran({ page }) {
  return (
    <div style={{
      height: "100%", borderRadius: 20, overflow: "hidden",
      background: "linear-gradient(180deg, #16233B 0%, #0C1424 100%)",
      border: `1px solid ${V.bordNuit}`,
      boxShadow: "0 30px 70px rgba(0,0,0,.5)",
      display: "flex", flexDirection: "column" }}>

      {/* Barre de titre de l'écran */}
      <div style={{ display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 16px",
                    borderBottom: `1px solid ${V.bordNuit}`,
                    background: "rgba(255,255,255,.03)" }}>
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999,
                                   background: V.sangle }} />
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700,
                       letterSpacing: ".12em", textTransform: "uppercase",
                       color: "#fff" }}>{page.titre}</span>
        <span style={{ marginLeft: "auto", fontSize: 10.5,
                       color: "rgba(255,255,255,.4)" }}>{page.role}</span>
      </div>

      {/* Silhouette du contenu, propre à chaque page */}
      <div style={{ flex: 1, padding: 16, display: "flex",
                    flexDirection: "column", gap: 10 }}>
        {page.cle === "releve" && <Releve />}
        {page.cle === "devis" && <Devis />}
        {page.cle === "offre" && <Offre />}
        {page.cle === "materiel" && <Materiel />}
        {page.cle === "facture" && <Facture />}
        {page.cle === "journal" && <Journal />}
      </div>
    </div>
  );
}

/* ── Silhouettes ─────────────────────────────────────────────────────────── */

const Bloc = ({ h = 10, w = "100%", couleur = "rgba(255,255,255,.10)", r = 5 }) => (
  <span aria-hidden style={{ display: "block", height: h, width: w,
    background: couleur, borderRadius: r }} />
);

const Rangee = ({ children, ...s }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, ...s }}>{children}</div>
);

function Piece({ nom, n }) {
  return (
    <div style={{ borderTop: `1px solid ${V.bordNuit}`, paddingTop: 8 }}>
      <Rangee style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.55)",
                       textTransform: "uppercase", letterSpacing: ".08em" }}>{nom}</span>
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10,
                       color: V.routeVif }}>{n}</span>
      </Rangee>
      <div style={{ display: "grid", gap: 5 }}>
        <Bloc w="82%" /><Bloc w="64%" />
      </div>
    </div>
  );
}

const Releve = () => (<><Piece nom="Salon" n="—" /><Piece nom="Cuisine" n="—" /><Piece nom="Chambre" n="—" /></>);

const Devis = () => (
  <>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
      {["Heures", "Équipe", "Camion"].map((t) => (
        <div key={t} style={{ background: "rgba(0,0,0,.28)", borderRadius: 12,
              padding: "10px 8px", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,.42)",
                        textTransform: "uppercase", letterSpacing: ".06em" }}>{t}</div>
          <div style={{ marginTop: 6 }}><Bloc h={8} w="60%" couleur="rgba(96,165,250,.5)"
            r={4} /></div>
        </div>
      ))}
    </div>
    <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
      <Bloc w="90%" /><Bloc w="72%" /><Bloc w="80%" />
    </div>
    <Rangee style={{ marginTop: "auto", paddingTop: 10,
                     borderTop: `1px dashed ${V.bordNuit}` }}>
      <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.5)" }}>Total</span>
      <span style={{ marginLeft: "auto" }}>
        <Bloc h={12} w={64} couleur="rgba(255,255,255,.28)" r={6} />
      </span>
    </Rangee>
  </>
);

const Offre = () => (
  <>
    <div style={{ height: 34, borderRadius: 10,
                  background: "linear-gradient(135deg, #0F172A, #1e3a5f)" }} />
    <div style={{ display: "grid", gap: 6 }}>
      <Bloc w="94%" /><Bloc w="88%" /><Bloc w="70%" />
    </div>
    <div style={{ marginTop: "auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.4)", marginBottom: 4 }}>
          Signature
        </div>
        <div style={{ height: 30, borderRadius: 8,
                      border: `1px dashed ${V.bordNuit}` }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 9.5, color: "#34D399",
                     paddingBottom: 8 }}>✓ scellée</span>
    </div>
  </>
);

const Materiel = () => (
  <div style={{ display: "grid", gap: 8 }}>
    {["Cartons", "Papier bulle", "Housses", "Adhésif"].map((t) => (
      <Rangee key={t} style={{ borderTop: `1px solid ${V.bordNuit}`, paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.72)" }}>{t}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <Bloc h={9} w={26} couleur="rgba(96,165,250,.4)" r={4} />
          <Bloc h={9} w={26} couleur="rgba(217,119,6,.4)" r={4} />
        </span>
      </Rangee>
    ))}
  </div>
);

const Facture = () => (
  <>
    <Rangee>
      <Bloc h={9} w={70} couleur="rgba(255,255,255,.22)" r={4} />
      <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9.5,
                     color: "#34D399", border: "1px solid rgba(52,211,153,.4)",
                     borderRadius: 999, padding: "2px 8px" }}>PEPPOL</span>
    </Rangee>
    <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
      <Bloc w="88%" /><Bloc w="76%" /><Bloc w="82%" />
    </div>
    <div style={{ marginTop: "auto", background: "rgba(0,0,0,.3)", borderRadius: 12,
                  padding: 10, display: "grid", gap: 6 }}>
      <Rangee><span style={{ fontSize: 10, color: "rgba(255,255,255,.45)" }}>TVA</span>
        <span style={{ marginLeft: "auto" }}><Bloc h={8} w={40} r={4} /></span></Rangee>
      <Rangee><span style={{ fontSize: 10.5, color: "#fff", fontWeight: 700 }}>TVAC</span>
        <span style={{ marginLeft: "auto" }}>
          <Bloc h={11} w={58} couleur="rgba(96,165,250,.55)" r={5} /></span></Rangee>
    </div>
  </>
);

const Journal = () => (
  <div style={{ display: "grid", gap: 9 }}>
    {[0, 1, 2, 3].map((i) => (
      <Rangee key={i} style={{ alignItems: "flex-start" }}>
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999,
          background: i === 0 ? V.sangle : "rgba(255,255,255,.25)", marginTop: 4 }} />
        <span style={{ flex: 1, display: "grid", gap: 4 }}>
          <Bloc h={8} w={`${86 - i * 10}%`} />
          <Bloc h={6} w={`${52 - i * 6}%`} couleur="rgba(255,255,255,.06)" />
        </span>
      </Rangee>
    ))}
  </div>
);
