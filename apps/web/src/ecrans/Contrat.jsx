// =============================================================================
// Composant — Contrat / Offre imprimable.
// LE document que le client lit, comprend et signe (P0 n°1, alignement page 05).
//
// Principe fondamental : ce composant ne connaît QUE le `contenu` qu'on lui
// passe. Avant l'envoi, c'est un aperçu vivant ; après l'envoi, c'est le
// contenu FIGÉ de l'instance (C-02) — donc le document rendu ne peut plus
// bouger, même si les tarifs, les CGV ou l'adresse de la société changent.
// C'est ce qui distingue Dashprod du modèle, qui réédite librement après
// signature.
//
// La classe `contrat-imprimable` est ciblée par le CSS d'impression : seule
// cette zone part sur le papier / le PDF.
// =============================================================================

import React from "react";
import { cgv, PRESTATIONS_INCLUSES, VALIDITE_JOURS_OUVRABLES } from "@domaine/documents/cgv.js";
import { C, euros } from "../lib/theme.jsx";

const NAVY = "#0F172A";

function dateLongue(iso) {
  if (!iso) return "…";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return iso; }
}

/** Une adresse en une ligne lisible : « Rue X 14, 1300 Wavre · étage 2 · ascenseur ». */
function ligneAdresse(a) {
  const bouts = [a.adresse || "…"];
  if (a.etage) bouts.push(`étage ${a.etage}`);
  if (a.ascenseur) bouts.push("ascenseur");
  if (a.monteMeubles) bouts.push("monte-meubles");
  return bouts.join(" · ");
}

/** Taux TVA figé, déduit des montants du document signé — jamais de l'organisation
 *  courante : un contrat signé ne doit pas changer d'affichage si le taux évolue. */
function libelleTvaFige(c) {
  const htva = Number(c?.htva_centimes || 0);
  const tva = Number(c?.tva_centimes || 0);
  if (htva <= 0) return "TVA";
  const pct = Math.round((tva / htva) * 1000) / 10;
  return `TVA ${String(pct).replace(".", ",")} %`;
}

export default function Contrat({ contenu, signature }) {
  if (!contenu) return null;
  const o = contenu.organisation || {};
  const cl = contenu.client || {};
  const horaire = contenu.formule !== "forfait";
  // Priorité au texte FIGÉ dans le document. On ne relit les conditions en
  // vigueur que pour un vieux document composé avant ce mécanisme.
  const articles = Array.isArray(contenu.cgv_articles) && contenu.cgv_articles.length
    ? contenu.cgv_articles
    : cgv(contenu.cgv_version);

  return (
    <div className="contrat-imprimable" style={S.doc}>
      {/* En-tête émetteur */}
      <div style={S.entete}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={S.enteteNom}>{o.nom || "—"}</div>
            <div style={S.enteteSous}>
              Offre / Contrat · {horaire ? "tarif horaire" : "forfait"}
            </div>
          </div>
          <div style={S.enteteDroite}>
            {o.bce || ""}<br />{o.tel || ""}
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <p style={{ margin: "0 0 4px", fontSize: 12.5 }}>
          Madame, Monsieur <b>{cl.nom || "…"}</b>,
        </p>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: C.muet }}>
          Nous avons le plaisir de vous adresser notre offre détaillée pour votre déménagement.
        </p>

        {/* Adresses */}
        <BlocAdresses titre="Chargement" liseré={C.bleu} liste={contenu.charges} />
        <BlocAdresses titre="Déchargement" liseré="#6366F1" liste={contenu.decharges} />

        {/* Volume & équipe */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "11px 0" }}>
          <Case titre="Volume estimé"
                valeur={contenu.volume_m3 ? `${contenu.volume_m3} m³` : "—"} />
          <Case titre="Équipe"
                valeur={contenu.nb_demenageurs ? `${contenu.nb_demenageurs} déménageurs` : "—"} />
        </div>

        {/* Prestations incluses */}
        <div style={{ margin: "12px 0" }}>
          <div style={S.legende}>Prestations incluses</div>
          {PRESTATIONS_INCLUSES.map((p) => <Coche key={p}>{p}</Coche>)}
          {contenu.elevateur && <Coche>Mise en œuvre d'un monte-meubles</Coche>}
        </div>

        {/* Démontage (issu du relevé) */}
        {contenu.a_demonter?.length > 0 && (
          <div style={S.encadreBleu}>
            <div style={{ ...S.legende, color: "#1E40AF" }}>Démontage / remontage prévu</div>
            <div style={{ fontSize: 12, color: "#1E3A8A" }}>
              {contenu.a_demonter.map((it) => `${it.quantite}× ${it.nom}`).join(" · ")}
            </div>
          </div>
        )}

        {/* Prix */}
        <div style={S.blocPrix}>
          {horaire ? (
            <>Pour <b>{contenu.heures || "…"} h</b> avec{" "}
              <b>{contenu.nb_demenageurs || "…"} déménageurs</b> :</>
          ) : "Prix forfaitaire :"}
          {contenu.reduction && (
            <div style={{ fontSize: 12, fontWeight: 700, color: "#FCD34D", marginTop: 4 }}>
              Réduction ({contenu.reduction.motif === "degats"
                ? "geste commercial" : "promotion"}) −{contenu.reduction.pct} % appliquée
            </div>
          )}
          <div style={S.montant}>{euros(contenu.tvac_centimes)} TVAC</div>
          <div style={S.montantSous}>dont {libelleTvaFige(contenu)} : {euros(contenu.tva_centimes)}</div>
        </div>

        {/* Planning */}
        <div style={{ fontSize: 11.5, color: C.muet, lineHeight: 1.6 }}>
          <b style={{ color: C.encre }}>Planning.</b> Déménagement le{" "}
          {dateLongue(contenu.date_dem)}
          {contenu.heure_dem ? ` — arrivée prévue ${contenu.heure_dem}` : ""}.
          {" "}Kilométrage offert. Offre valable {VALIDITE_JOURS_OUVRABLES} jours ouvrables.
        </div>

        {contenu.remarques && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: C.muet, lineHeight: 1.6 }}>
            <b style={{ color: C.encre }}>Remarques.</b> {contenu.remarques}
          </div>
        )}

        {/* Bon pour accord */}
        <div style={S.zoneSignature}>
          <div style={{ fontSize: 11, color: C.muet, lineHeight: 1.6 }}>
            Bon pour accord<br />
            <span style={{ color: C.encre, fontWeight: 600 }}>{signature?.nom || "…"}</span><br />
            {signature?.date ? dateLongue(signature.date.slice(0, 10)) : "date…"}
          </div>
          <div style={{ textAlign: "right" }}>
            {signature?.image
              ? <img src={signature.image} alt="signature"
                     style={{ height: 62, maxWidth: 170, objectFit: "contain" }} />
              : <div style={{ width: 150, height: 48, borderBottom: `1.5px solid ${C.bord}` }} />}
            <div style={{ fontSize: 9.5, color: C.fantome, marginTop: 2 }}>
              Signature précédée de « lu et approuvé »
            </div>
          </div>
        </div>

        {/* CGV — version figée dans le contenu */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${C.bord}` }}>
          <div style={S.legende}>Conditions générales</div>
          <div style={{ fontSize: 9.5, color: C.muet, lineHeight: 1.55 }}>
            {articles.map((t, i) => <p key={i} style={{ margin: "0 0 5px" }}>{t}</p>)}
          </div>
          <div style={S.piedLegal}>
            {o.nom} · {o.adresse}, {o.cp} {o.ville} · BCE/TVA {o.bce}
            {o.iban ? ` · IBAN ${o.iban}` : ""} · {o.tel} · {o.email}
          </div>
        </div>
      </div>
    </div>
  );
}

function BlocAdresses({ titre, liseré, liste }) {
  const l = (liste || []).filter((a) => a.adresse);
  return (
    <div style={{ ...S.blocAdr, borderLeft: `3px solid ${liseré}` }}>
      <div style={S.legende}>{titre}</div>
      {l.length === 0 && <div style={{ fontSize: 12, color: C.fantome }}>…</div>}
      {l.map((a, i) => (
        <div key={a.id || i} style={{ fontSize: 12 }}>
          {l.length > 1 ? `${i + 1}. ` : ""}{ligneAdresse(a)}
        </div>
      ))}
    </div>
  );
}

function Case({ titre, valeur }) {
  return (
    <div style={{ border: `1px solid ${C.bord}`, borderRadius: 9, padding: "8px 10px" }}>
      <div style={{ fontSize: 9.5, color: C.fantome, textTransform: "uppercase" }}>{titre}</div>
      <div style={{ fontWeight: 800, fontSize: 15, color: C.encre }}>{valeur}</div>
    </div>
  );
}

function Coche({ children }) {
  return (
    <div style={{ display: "flex", gap: 7, padding: "2px 0", fontSize: 12, color: C.encre }}>
      <span style={{ color: C.vert, fontWeight: 800 }}>✓</span>{children}
    </div>
  );
}

const S = {
  doc: { background: "#fff", borderRadius: 14, border: `1px solid #E4ECFC`,
         overflow: "hidden", margin: "0 16px 14px" },
  entete: { background: `linear-gradient(135deg, ${NAVY}, #1e3a5f)`, padding: "16px 18px" },
  enteteNom: { color: "#fff", fontWeight: 800, fontSize: 17 },
  enteteSous: { fontSize: 10, color: "#93C5FD", letterSpacing: ".12em",
                textTransform: "uppercase", marginTop: 3 },
  enteteDroite: { textAlign: "right", fontSize: 9.5, color: "rgba(255,255,255,.6)", lineHeight: 1.6 },
  legende: { fontSize: 10, fontWeight: 700, textTransform: "uppercase",
             letterSpacing: ".05em", color: "#64748B", marginBottom: 4 },
  blocAdr: { background: "#F1F5FD", borderRadius: "0 8px 8px 0", padding: "9px 12px",
             marginBottom: 8 },
  encadreBleu: { margin: "11px 0", background: "#EFF6FF", border: "1px solid #BFDBFE",
                 borderRadius: 9, padding: "9px 12px" },
  blocPrix: { background: NAVY, color: "#fff", borderRadius: 10, padding: "13px 15px",
              textAlign: "center", margin: "12px 0", fontSize: 12.5 },
  montant: { fontSize: 19, fontWeight: 800, color: "#93C5FD", marginTop: 5 },
  montantSous: { fontSize: 10, color: "rgba(255,255,255,.5)", marginTop: 2 },
  zoneSignature: { marginTop: 16, paddingTop: 14, borderTop: `1px solid #E4ECFC`,
                   display: "flex", justifyContent: "space-between",
                   alignItems: "flex-end", gap: 16 },
  piedLegal: { marginTop: 8, fontSize: 9, color: "#94A3B8", lineHeight: 1.6 },
};
