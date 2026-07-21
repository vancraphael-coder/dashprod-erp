// =============================================================================
// Composant — Facture imprimable (P0 n°5, alignement page 08 §3).
// Même principe que Contrat.jsx : le composant ne connaît que ce qu'on lui
// passe, et la classe `contrat-imprimable` (partagée) fait que SEUL ce
// document part à l'impression. Une facture émise étant immuable (Module 9),
// ce rendu est stable par construction.
//
// Spécificités belges rendues : communication structurée OGM (générée en
// mod 97 depuis le numéro légal — c'est elle qui permet le rapprochement
// bancaire automatique), mentions légales de l'émetteur, acompte déjà reçu
// et solde restant (le modèle ne savait pas le faire, Dashprod si).
// =============================================================================

import React from "react";
import { genererOGM, decomposerNumero } from "@domaine/facturation/ogm.js";
import { C, euros } from "../lib/theme.jsx";

const NAVY = "#0F172A";

function dateFR(iso) {
  if (!iso) return "…";
  try { return new Date(iso).toLocaleDateString("fr-BE"); } catch { return iso; }
}

import { libelleTva } from "@domaine/organisation/identite.js";

export default function FactureDoc({ facture, organisation, client, adresses }) {
  if (!facture) return null;
  const o = organisation || {};
  const cl = client || {};
  const lignes = facture.lignes || facture.facture_lignes || [];
  const paiements = facture.paiements || [];
  const paye = paiements.reduce((s, p) => s + (p.montant_centimes || 0), 0);
  const solde = (facture.tvac_centimes || 0) - paye;

  const num = decomposerNumero(facture.numero);
  const ogm = num ? genererOGM(num.sequence, num.annee) : null;

  return (
    <div className="contrat-imprimable" style={S.doc}>
      {/* En-tête émetteur */}
      <div style={S.entete}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={S.enteteNom}>{o.nom || "—"}</div>
            <div style={S.enteteSous}>Facture</div>
          </div>
          <div style={S.enteteDroite}>
            N° <b style={{ color: "#93C5FD" }}>{facture.numero}</b><br />
            {dateFR(facture.date_emission)}
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Bloc client */}
        <div style={S.blocClient}>
          <div style={S.legende}>Facturé à</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.encre }}>
            {cl.nom || "—"}
          </div>
          {cl.adresse_facturation && (
            <div style={{ fontSize: 12, color: C.muet }}>{cl.adresse_facturation}</div>
          )}
          {cl.tva && (
            <div style={{ fontSize: 12, color: C.muet }}>TVA {cl.tva}</div>
          )}
        </div>

        {/* Prestation */}
        {adresses && (adresses.charge || adresses.decharge) && (
          <div style={{ fontSize: 12, color: C.muet, margin: "10px 0", lineHeight: 1.6 }}>
            <b style={{ color: C.encre }}>Prestation.</b>{" "}
            Déménagement{adresses.date ? ` du ${dateFR(adresses.date)}` : ""}
            {adresses.charge ? ` — de ${adresses.charge}` : ""}
            {adresses.decharge ? ` vers ${adresses.decharge}` : ""}.
          </div>
        )}

        {/* Lignes */}
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, textAlign: "left" }}>Désignation</th>
              <th style={{ ...S.th, textAlign: "right" }}>HTVA</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                <td style={S.td}>{l.libelle}</td>
                <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                  {euros(l.montant_htva_centimes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totaux */}
        <div style={{ marginTop: 10 }}>
          <Ligne l="Total HTVA" v={euros(facture.htva_centimes)} />
          <Ligne l={libelleTva(o)} v={euros(facture.tva_centimes)} />
          <Ligne l="Total TVAC" v={euros(facture.tvac_centimes)} gras />
          {paye > 0 && (
            <>
              <Ligne l="Acompte / paiements reçus" v={`− ${euros(paye)}`} />
              <Ligne l="Solde à payer" v={euros(Math.max(0, solde))} gras
                     couleur={solde <= 0 ? "#059669" : NAVY} />
            </>
          )}
        </div>

        {/* Paiement */}
        <div style={S.blocPaiement}>
          <div style={{ fontSize: 11.5 }}>
            Paiement par virement au compte <b>{o.iban || "…"}</b>
          </div>
          {ogm && (
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>Communication structurée</span>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: ".06em",
                            fontFamily: "ui-monospace, monospace" }}>
                {ogm}
              </div>
            </div>
          )}
        </div>

        {/* Pied légal */}
        <div style={S.piedLegal}>
          {o.nom} · {o.adresse}, {o.cp} {o.ville} · BCE/TVA {o.bce}
          {o.iban ? ` · IBAN ${o.iban}` : ""} · {o.tel} · {o.email}
        </div>
      </div>
    </div>
  );
}

function Ligne({ l, v, gras, couleur }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
      <span style={{ fontSize: gras ? 13 : 12, color: gras ? C.encre : C.muet,
                     fontWeight: gras ? 800 : 500 }}>{l}</span>
      <span style={{ fontSize: gras ? 15 : 12.5, fontWeight: gras ? 800 : 600,
                     color: couleur || C.encre }}>{v}</span>
    </div>
  );
}

const S = {
  doc: { background: "#fff", borderRadius: 14, border: "1px solid #E4ECFC",
         overflow: "hidden", margin: "0 16px 14px" },
  entete: { background: `linear-gradient(135deg, ${NAVY}, #1e3a5f)`, padding: "16px 18px" },
  enteteNom: { color: "#fff", fontWeight: 800, fontSize: 17 },
  enteteSous: { fontSize: 10, color: "#93C5FD", letterSpacing: ".12em",
                textTransform: "uppercase", marginTop: 3 },
  enteteDroite: { textAlign: "right", fontSize: 11, color: "rgba(255,255,255,.75)",
                  lineHeight: 1.7 },
  legende: { fontSize: 10, fontWeight: 700, textTransform: "uppercase",
             letterSpacing: ".05em", color: "#64748B", marginBottom: 3 },
  blocClient: { background: "#F1F5FD", borderRadius: 9, padding: "10px 12px" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 4 },
  th: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#94A3B8",
        padding: "6px 2px", borderBottom: `1.5px solid #E4ECFC` },
  td: { fontSize: 12.5, color: "#0F172A", padding: "7px 2px",
        borderBottom: "1px solid #F1F5F9" },
  blocPaiement: { marginTop: 14, background: NAVY, color: "#fff", borderRadius: 10,
                  padding: "12px 14px" },
  piedLegal: { marginTop: 12, fontSize: 9, color: "#94A3B8", lineHeight: 1.6 },
};
