// =============================================================================
// Écran — Textes (Compte). Ce que le CLIENT reçoit, réglable sans développeur.
//
// 1) Les modèles de l'email d'offre (objet, salutation, mentions, signature).
//    Toute clé laissée vide retombe sur le modèle par défaut du domaine : un
//    réglage partiel est valide.
// 2) Le PDF des conditions générales C.B.D. joint à chaque offre.
//
// L'aperçu est calculé par la MÊME fonction que l'envoi réel (emailOffre) :
// ce qui est affiché ici est exactement ce que le client recevra.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  obtenirTextes, sauverTextes, obtenirOrganisation,
  urlConditionsCbd, televerserConditionsCbd, modeDonnees,
} from "../lib/adaptateur.js";
import { emailOffre, TEXTES_OFFRE_DEFAUT } from "@domaine/communication/brief.js";
import { C, S } from "../lib/theme.jsx";

// Exemple figé pour l'aperçu — jamais envoyé, sert à visualiser le rendu.
const EXEMPLE = {
  client: { nom: "Marie Dupont", email: "marie.dupont@exemple.be" },
  tvacCentimes: 94380, heures: 6, nbDemenageurs: 3, formule: "tarifaire",
  charges: [{ adresse: "Rue de l'Exemple 1, 1000 Bruxelles" }],
  decharges: [{ adresse: "Avenue Louise 12, 1050 Bruxelles" }],
  date: "2026-09-14", heure: "08:00",
};

const CHAMPS = [
  { cle: "objet", label: "Objet de l'email", aide: "{client} {organisation}" },
  { cle: "salutation", label: "Salutation", aide: "{famille} = nom de famille" },
  { cle: "intro", label: "Phrase d'introduction", long: true },
  { cle: "intro_signee", label: "Ajout si l'offre est signée", long: true },
  { cle: "mention_km", label: "Mention kilométrage" },
  { cle: "validite", label: "Mention de validité", aide: "{validite} = nombre de jours" },
  { cle: "validite_jours", label: "Validité (jours)", nombre: true },
  { cle: "formule_politesse", label: "Formule de politesse" },
  { cle: "signataire", label: "Signataire" },
  { cle: "pied", label: "Pied de page (facultatif)", long: true },
];

export default function Textes({ retour }) {
  const [textes, setTextes] = useState(null);
  const [org, setOrg] = useState({});
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [cbd, setCbd] = useState(undefined);   // undefined = en cours, null = absent
  const [envoiCbd, setEnvoiCbd] = useState(false);

  useEffect(() => {
    obtenirTextes().then((t) => setTextes(t || {})).catch((e) => {
      setErreur(e.message); setTextes({});
    });
    obtenirOrganisation().then(setOrg).catch(() => {});
    urlConditionsCbd().then(setCbd).catch(() => setCbd(null));
  }, []);

  // Aperçu : mêmes règles que l'envoi. Les champs vides retombent sur le défaut.
  const apercu = useMemo(() => {
    if (!textes) return null;
    const utiles = Object.fromEntries(
      Object.entries(textes).filter(([, v]) => v !== "" && v != null));
    try {
      return emailOffre({ ...EXEMPLE, organisation: org, textes: utiles });
    } catch { return null; }
  }, [textes, org]);

  function maj(cle, valeur) {
    setTextes((t) => ({ ...t, [cle]: valeur }));
    setSauve(false);
  }

  async function enregistrer() {
    setErreur(null);
    try {
      // On ne stocke que ce qui diffère : le domaine complète le reste.
      const utiles = Object.fromEntries(
        Object.entries(textes).filter(([, v]) => v !== "" && v != null));
      await sauverTextes(utiles);
      setSauve(true);
    } catch (e) { setErreur(e.message); }
  }

  async function deposerCbd(fichier) {
    if (!fichier) return;
    setErreur(null); setEnvoiCbd(true);
    try {
      await televerserConditionsCbd(fichier);
      setCbd(await urlConditionsCbd());
    } catch (e) { setErreur(e.message || "Dépôt impossible"); }
    setEnvoiCbd(false);
  }

  if (!textes) return null;

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Compte</button>}
        <div style={S.titre}>Textes de l'offre</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Ce que le client reçoit. Un champ vide garde le texte par défaut.
        </div>
      </div>

      <div style={S.carte}>
        <div style={SousTitre}>Modèles de l'email</div>
        {CHAMPS.map((ch) => (
          <div key={ch.cle} style={{ marginBottom: 10 }}>
            <label style={S.label}>
              {ch.label}
              {ch.aide && (
                <span style={{ fontWeight: 500, color: C.fantome, marginLeft: 6 }}>
                  {ch.aide}
                </span>
              )}
            </label>
            {ch.long ? (
              <textarea style={{ ...S.input, minHeight: 46 }}
                        value={textes[ch.cle] ?? ""}
                        placeholder={String(TEXTES_OFFRE_DEFAUT[ch.cle] ?? "")}
                        onChange={(e) => maj(ch.cle, e.target.value)} />
            ) : (
              <input style={S.input}
                     type={ch.nombre ? "number" : "text"}
                     value={textes[ch.cle] ?? ""}
                     placeholder={String(TEXTES_OFFRE_DEFAUT[ch.cle] ?? "")}
                     onChange={(e) => maj(ch.cle,
                       ch.nombre ? (e.target.value === "" ? "" : Number(e.target.value))
                                 : e.target.value)} />
            )}
          </div>
        ))}
      </div>

      {/* Aperçu réel — même moteur que l'envoi. */}
      {apercu && (
        <div style={S.carte}>
          <div style={SousTitre}>Aperçu (exemple)</div>
          <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 6 }}>
            Objet : <span style={{ color: C.encre, fontWeight: 700 }}>{apercu.objet}</span>
          </div>
          <pre style={{
            margin: 0, padding: 12, borderRadius: 10, background: "#F8FAFC",
            border: `1px solid ${C.bord}`, fontSize: 12, lineHeight: 1.55,
            color: C.encre, whiteSpace: "pre-wrap",
            fontFamily: "ui-monospace, monospace",
          }}>{apercu.corps}</pre>
        </div>
      )}

      {/* Conditions générales C.B.D. — pièce jointe de toute offre. */}
      <div style={S.carte}>
        <div style={SousTitre}>Conditions générales C.B.D.</div>
        <div style={{ fontSize: 11.5, color: C.muet, lineHeight: 1.5, marginBottom: 8 }}>
          PDF joint à chaque offre envoyée au client, à côté de l'offre elle-même.
        </div>
        {cbd === undefined ? null : cbd ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 12px", borderRadius: 10,
                        background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#065F46" }}>
              ✓ Conditions déposées
            </span>
            <a href={cbd} target="_blank" rel="noreferrer"
               style={{ fontSize: 12.5, fontWeight: 700, color: C.bleu }}>Ouvrir</a>
          </div>
        ) : (
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "#FFFBEB",
                        border: "1px solid #FDE68A", fontSize: 12.5, color: "#92400E" }}>
            Aucun document déposé — les offres partiront sans les conditions.
          </div>
        )}
        {modeDonnees() === "reel" && (
          <label style={{ ...S.boutonLien, display: "block", marginTop: 10,
                          cursor: "pointer", fontWeight: 700 }}>
            {envoiCbd ? "Dépôt en cours…" : cbd ? "Remplacer le PDF" : "Déposer le PDF"}
            <input type="file" accept="application/pdf" style={{ display: "none" }}
                   onChange={(e) => deposerCbd(e.target.files?.[0])} />
          </label>
        )}
      </div>

      {erreur && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}
      <div style={{ margin: "0 16px 24px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>
          {sauve ? "✓ Enregistré" : "Enregistrer les textes"}
        </button>
      </div>
    </div>
  );
}

const SousTitre = {
  fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 8,
  textTransform: "uppercase", letterSpacing: ".03em",
};
