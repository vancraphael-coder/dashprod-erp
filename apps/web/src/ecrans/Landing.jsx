// =============================================================================
// Landing publique — Dashprod.
//
// Vue avant connexion : présente le produit et propose une demande d'accès.
// Un déménageur qui reçoit le lien voit d'abord ceci, puis se connecte.
//
// Volontairement sans dépendance : couleurs et rythme viennent du thème.
// Aucune donnée d'entreprise réelle, aucun tarif en dur — c'est du marketing,
// pas de la config.
// =============================================================================

import React from "react";
import { C } from "../lib/theme.jsx";

const POINTS = [
  { t: "Devis en minutes", d: "Relevé pièce par pièce, chiffrage automatique, offre PDF et email prêts à partir." },
  { t: "Planning sans conflit", d: "Équipes et véhicules affectés, congés et disponibilités pris en compte." },
  { t: "Du chantier à la facture", d: "Heures, photos et signature du terrain remontent jusqu'à la facturation." },
  { t: "Vos données, isolées", d: "Chaque entreprise sur sa base, cloisonnée. Vos clients ne sortent pas de chez vous." },
];

export default function Landing({ onConnexion }) {
  return (
    <div style={{ minHeight: "100vh", background: C.fond || "#F6F8FB",
                  color: C.encre, display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                       padding: "18px 20px", maxWidth: 960, width: "100%", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.bleu,
                        color: "#fff", display: "grid", placeItems: "center",
                        fontSize: 18, fontWeight: 800 }}>D</div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.01em" }}>
            Dashprod
          </span>
        </div>
        <button onClick={onConnexion} style={{
          padding: "9px 16px", borderRadius: 10, border: `1.5px solid ${C.bord}`,
          background: C.blanc, color: C.encre, fontSize: 13.5, fontWeight: 700,
          cursor: "pointer" }}>Se connecter</button>
      </header>

      <main style={{ flex: 1, maxWidth: 960, width: "100%", margin: "0 auto",
                     padding: "16px 20px 48px" }}>
        <section style={{ padding: "42px 0 30px", maxWidth: 620 }}>
          <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700,
                        color: C.bleu, background: C.bleuClair || "#E7EFFC",
                        padding: "5px 11px", borderRadius: 20, marginBottom: 18 }}>
            L'ERP des déménageurs belges
          </div>
          <h1 style={{ fontSize: 34, lineHeight: 1.15, fontWeight: 800, margin: 0,
                       letterSpacing: "-.02em" }}>
            Du premier appel client à la facture payée, au même endroit.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: C.muet, marginTop: 16 }}>
            Devis, planning, chantier, facturation. Une seule saisie de vos
            informations d'entreprise, reprise partout. Pensé pour le déménagement,
            pas adapté à la va-vite.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
            <a href="mailto:contact@dashprod.be?subject=Demande%20d'acc%C3%A8s%20Dashprod&body=Bonjour,%0A%0AJe%20souhaite%20un%20acc%C3%A8s%20%C3%A0%20Dashprod%20pour%20mon%20entreprise%20de%20d%C3%A9m%C3%A9nagement.%0A%0ANom%20de%20l'entreprise%20:%20%0ANum%C3%A9ro%20d'entreprise%20(BCE)%20:%20%0AEmail%20administrateur%20:%20%0AT%C3%A9l%C3%A9phone%20:%20"
               style={{ padding: "13px 22px", borderRadius: 12, background: C.bleu,
                        color: "#fff", fontSize: 15, fontWeight: 700,
                        textDecoration: "none" }}>
              Demander un accès
            </a>
            <button onClick={onConnexion} style={{
              padding: "13px 22px", borderRadius: 12, border: `1.5px solid ${C.bord}`,
              background: C.blanc, color: C.encre, fontSize: 15, fontWeight: 700,
              cursor: "pointer" }}>J'ai déjà un compte</button>
          </div>
        </section>

        <section style={{ display: "grid", gap: 14, marginTop: 20,
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {POINTS.map((p) => (
            <div key={p.t} style={{ padding: 18, borderRadius: 14, background: C.blanc,
                                    border: `1px solid ${C.bord}`,
                                    boxShadow: "0 1px 3px rgba(15,23,42,.05)" }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{p.t}</div>
              <div style={{ fontSize: 13, color: C.muet, marginTop: 6, lineHeight: 1.5 }}>
                {p.d}
              </div>
            </div>
          ))}
        </section>
      </main>

      <footer style={{ borderTop: `1px solid ${C.bord}`, padding: "18px 20px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", fontSize: 12, color: C.fantome,
                      display: "flex", justifyContent: "space-between", flexWrap: "wrap",
                      gap: 8 }}>
          <span>Dashprod — logiciel de gestion pour entreprises de déménagement.</span>
          <span>Hébergement et données en Europe.</span>
        </div>
      </footer>
    </div>
  );
}
