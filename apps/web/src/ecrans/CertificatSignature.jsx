// =============================================================================
// Certificat de signature électronique.
//
// La preuve était en base depuis le début — nom, mention recopiée, horodatage
// serveur, empreinte du document — mais rien ne la RESTITUAIT. Le bureau ne
// voyait qu'un badge. Or un badge dans une application ne se produit pas
// devant un juge : il faut un document qui s'imprime et se relit seul.
//
// Ce composant ne calcule rien. Il affiche ce qui a été enregistré au moment
// de la signature. C'est le point juridique : un certificat qui recalculerait
// quoi que ce soit ne prouverait rien.
//
// Les quatre éléments qui font sa valeur en droit belge, chacun nommé
// explicitement pour qu'un lecteur non technicien comprenne ce qu'il lit :
//   1. IDENTITÉ    — nom et prénom recopiés par le signataire ;
//   2. CONSENTEMENT — la mention « Lu et approuvé », exigée en base ;
//   3. DATE CERTAINE — horodatage serveur, hors de portée du client ;
//   4. INTÉGRITÉ   — empreinte du document ; s'il changeait, elle ne
//                    correspondrait plus (et il est verrouillé par ailleurs).
//
// Il s'imprime par le navigateur, comme l'offre (décision D2) : ce qui
// s'imprime est exactement ce qui s'affiche.
// =============================================================================

import React from "react";
import { C } from "../lib/theme.jsx";

const eur = (c) => c == null ? "—"
  : (c / 100).toFixed(2).replace(".", ",") + " €";

function horodatageComplet(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("fr-BE",
      { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    const heure = d.toLocaleTimeString("fr-BE",
      { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return `${date} à ${heure}`;
  } catch { return iso; }
}

export default function CertificatSignature({ certificat }) {
  if (!certificat?.signe) return null;
  const c = certificat;

  return (
    <div className="contrat-imprimable" style={{
      background: "#fff", border: `1px solid ${C.bord}`, borderRadius: 12,
      padding: "26px 24px", margin: "0 16px 12px",
      fontFamily: "Georgia, 'Times New Roman', serif", color: "#111" }}>

      <div style={{ textAlign: "center", borderBottom: "2px solid #111",
                    paddingBottom: 14, marginBottom: 18 }}>
        <div style={{ fontSize: 11, letterSpacing: ".18em",
                      textTransform: "uppercase", color: "#555" }}>
          Certificat de signature électronique
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, marginTop: 6 }}>
          {c.entreprise || "—"}
        </div>
        {c.entreprise_tva && (
          <div style={{ fontSize: 11.5, color: "#555", marginTop: 2 }}>
            TVA {c.entreprise_tva}
          </div>
        )}
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.65, margin: "0 0 18px" }}>
        Le présent certificat atteste qu'une offre a été approuvée par voie
        électronique. Les éléments ci-dessous ont été enregistrés au moment
        même de la signature et n'ont pas été modifiés depuis.
      </p>

      <Bloc n="1" titre="Identité du signataire">
        <Ligne l="Nom et prénom déclarés" v={c.signataire} fort />
        <Ligne l="Client au dossier" v={c.client} />
        {c.client_email && <Ligne l="Adresse e-mail" v={c.client_email} />}
      </Bloc>

      <Bloc n="2" titre="Consentement exprimé">
        <div style={{ padding: "12px 14px", background: "#F8F8F5",
                      border: "1px solid #E0E0D8", borderRadius: 6,
                      margin: "6px 0 8px" }}>
          <div style={{ fontSize: 10.5, color: "#666", marginBottom: 4 }}>
            Mention recopiée par le signataire, reproduite telle quelle :
          </div>
          <div style={{ fontSize: 16, fontStyle: "italic", fontWeight: 600 }}>
            « {c.mention || "—"} »
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: "#444", lineHeight: 1.55, margin: 0 }}>
          Cette mention a été saisie manuellement. Le système refuse toute
          signature sans elle : un simple clic ne suffit pas à engager.
        </p>
      </Bloc>

      <Bloc n="3" titre="Date certaine">
        <Ligne l="Signature enregistrée le" v={horodatageComplet(c.horodatage)} fort />
        <Ligne l="Canal" v={c.canal === "client_en_ligne"
          ? "En ligne, par le client lui-même"
          : c.canal === "ecran" ? "Sur écran, en présence du déménageur" : c.canal} />
        <p style={{ fontSize: 11.5, color: "#444", lineHeight: 1.55,
                    margin: "6px 0 0" }}>
          Horodatage établi par le serveur, hors de portée du signataire comme
          de l'entreprise.
        </p>
      </Bloc>

      <Bloc n="4" titre="Intégrité du document approuvé">
        <Ligne l="Empreinte numérique (SHA-256)"
               v={c.empreinte || "—"} mono />
        <Ligne l="Document scellé" v={c.document_gele ? "Oui" : "Non"} />
        <p style={{ fontSize: 11.5, color: "#444", lineHeight: 1.55,
                    margin: "6px 0 0" }}>
          Cette empreinte identifie de façon unique le document approuvé. Toute
          modification, même d'un seul caractère, produirait une empreinte
          différente. Le document est par ailleurs verrouillé : son contenu ne
          peut plus être modifié ni sa signature retirée.
        </p>
      </Bloc>

      <Bloc n="5" titre="Objet de l'engagement">
        <Ligne l="Montant approuvé" v={`${eur(c.montant_tvac_centimes)} TVAC`} fort />
        {c.date_souhaitee && (
          <Ligne l="Déménagement prévu le" v={c.date_souhaitee} />
        )}
        {c.code_indice && (
          <Ligne l="Code d'accès utilisé" v={`••••-••••-${c.code_indice}`} mono />
        )}
      </Bloc>

      <div style={{ borderTop: "1px solid #DDD", marginTop: 18, paddingTop: 12,
                    fontSize: 10.5, color: "#666", lineHeight: 1.55 }}>
        Signature électronique au sens du règlement (UE) n° 910/2014 (eIDAS) et
        du Code de droit économique belge. Ce certificat vaut commencement de
        preuve écrite ; sa force probante s'apprécie souverainement par le juge
        au regard de l'ensemble des éléments réunis ci-dessus.
        <br /><br />
        Document généré par Dashprod le{" "}
        {new Date().toLocaleDateString("fr-BE",
          { day: "2-digit", month: "long", year: "numeric" })}.
      </div>
    </div>
  );
}

function Bloc({ n, titre, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8,
                    borderBottom: "1px solid #E5E5E0", paddingBottom: 4,
                    marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>{n}.</span>
        <span style={{ fontSize: 12.5, fontWeight: 700,
                       textTransform: "uppercase", letterSpacing: ".06em" }}>
          {titre}
        </span>
      </div>
      {children}
    </div>
  );
}

function Ligne({ l, v, fort, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16,
                  padding: "4px 0", alignItems: "baseline" }}>
      <span style={{ fontSize: 12, color: "#555", flexShrink: 0 }}>{l}</span>
      <span style={{ fontSize: fort ? 14 : 12.5,
                     fontWeight: fort ? 700 : 500,
                     fontFamily: mono ? "ui-monospace, monospace" : "inherit",
                     textAlign: "right", wordBreak: mono ? "break-all" : "normal" }}>
        {v}
      </span>
    </div>
  );
}
