// =============================================================================
// Écran — Mail (envoi de l'offre).
// Alignement page 07 : dix mails par semaine, identiques à 90 % — le template
// supprime l'oubli (validité, dates) et uniformise le ton. Flux v1 assumé
// manuel : télécharger les deux pièces jointes (offre + conditions C.B.D.) puis
// les joindre au mail ouvert par mailto:. Le protocole mailto NE PEUT PAS
// porter de pièce jointe — c'est une limite du standard, pas un raccourci ;
// l'envoi serveur avec PJ automatiques viendra comme adaptateur au bord (D-1).
// Les textes viennent de Compte → Textes ; le formatage du domaine (emailOffre).
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  obtenirAffaire, obtenirContact, obtenirInstance, obtenirOrganisation,
  obtenirTextes, composerOffre, urlConditionsCbd,
} from "../lib/adaptateur.js";
import { pdfOffre, nomFichierOffre, telecharger } from "../lib/pdfOffre.js";
import { emailOffre, urlMailto } from "@domaine/communication/brief.js";
import { C, S } from "../lib/theme.jsx";

export default function Mail({ affaireId, retour, versOffre }) {
  const [mail, setMail] = useState(null);
  const [instance, setInstance] = useState(null);
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [cbd, setCbd] = useState(null);        // URL des conditions, ou null
  const [pdfEnCours, setPdfEnCours] = useState(false);
  const [pdfFait, setPdfFait] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [affaire, contact, inst, org, textes, lienCbd] = await Promise.all([
          obtenirAffaire(affaireId),
          obtenirContact(affaireId).catch(() => null),
          obtenirInstance(affaireId).catch(() => null),
          obtenirOrganisation().catch(() => ({})),
          obtenirTextes().catch(() => ({})),
          urlConditionsCbd().catch(() => null),
        ]);
        setInstance(inst);
        setCbd(lienCbd);
        const faits = affaire?.faits || {};
        setMail(emailOffre({
          client: affaire?.client || {},
          signee: inst?.statut === "signee",
          charges: contact?.charges || [], decharges: contact?.decharges || [],
          formule: faits.formule, heures: faits.heures,
          nbDemenageurs: faits.nbDemenageurs,
          tvacCentimes: affaire?.tvac_centimes || 0,
          date: contact?.date, heure: contact?.heure,
          remarques: contact?.notes,
          organisation: org,
          textes,                       // modèles réglés dans Compte → Textes
        }));
      } catch (e) { setErreur(e.message); }
    })();
  }, [affaireId]);

  /** Génère le PDF de l'offre depuis la MÊME source que l'offre à l'écran. */
  async function telechargerOffre() {
    setErreur(null); setPdfEnCours(true);
    try {
      const contenu = await composerOffre(affaireId);
      const blob = await pdfOffre(contenu, instance?.numero);
      telecharger(blob, nomFichierOffre(contenu));
      setPdfFait(true);
    } catch (e) { setErreur(e.message || "Génération du PDF impossible"); }
    setPdfEnCours(false);
  }

  async function copier() {
    const texte = `À : ${mail.a}\nObjet : ${mail.objet}\n\n${mail.corps}`;
    try { await navigator.clipboard.writeText(texte); setCopie(true); }
    catch { window.prompt("Copiez le mail :", texte); }
    setTimeout(() => setCopie(false), 2000);
  }

  if (!mail) return null;
  const signee = instance?.statut === "signee";

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Dossier</button>
        <div style={S.titre}>Mail — envoi de l'offre</div>
      </div>

      {/* Pièces jointes : l'offre (PDF généré) et les conditions C.B.D. */}
      <div style={S.carte}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 10,
                      textTransform: "uppercase", letterSpacing: ".03em" }}>
          Pièces jointes
        </div>

        {/* 1 — Offre de prix */}
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📎</span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.encre }}>
                Offre de prix (PDF)
              </div>
              <div style={{ fontSize: 11.5, color: C.muet }}>
                {signee ? "Signée par le client" : instance ? "Émise, non signée" : "Pas encore émise"}
              </div>
            </div>
          </div>
          <button onClick={telechargerOffre} disabled={pdfEnCours} style={{
            padding: "8px 14px", borderRadius: 10, cursor: "pointer",
            fontSize: 12.5, fontWeight: 700,
            border: `1.5px solid ${pdfFait ? C.vert : C.bleu}`,
            background: pdfFait ? "#ECFDF5" : C.bleuClair,
            color: pdfFait ? "#065F46" : C.bleu,
          }}>
            {pdfEnCours ? "…" : pdfFait ? "✓ Téléchargée" : "Télécharger"}
          </button>
        </div>

        {/* 2 — Conditions générales C.B.D. */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.encre }}>
                Conditions générales C.B.D.
              </div>
              <div style={{ fontSize: 11.5, color: cbd ? C.muet : C.ambre }}>
                {cbd ? "Document du bureau" : "Non déposé — Compte → Textes"}
              </div>
            </div>
          </div>
          {cbd && (
            <a href={cbd} target="_blank" rel="noreferrer" download style={{
              padding: "8px 14px", borderRadius: 10, textDecoration: "none",
              fontSize: 12.5, fontWeight: 700,
              border: `1.5px solid ${C.bleu}`, background: C.bleuClair, color: C.bleu,
            }}>Télécharger</a>
          )}
        </div>

        <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 9,
          background: "#F8FAFC", border: `1px solid ${C.bord}`,
          fontSize: 11, color: C.muet, lineHeight: 1.5 }}>
          Téléchargez les pièces, puis joignez-les au message : un lien
          « ouvrir dans Mail » ne peut pas transporter de fichier.
        </div>

        {!instance && (
          <button style={{ ...S.boutonLien, paddingLeft: 0, marginTop: 6 }}
                  onClick={() => versOffre(affaireId)}>
            Préparer l'offre d'abord →
          </button>
        )}
      </div>

      {/* En-tête du mail */}
      <div style={S.carte}>
        <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", rowGap: 7, fontSize: 12.5 }}>
          <span style={{ color: C.muet, fontWeight: 700 }}>À</span>
          <span style={{ color: mail.a ? C.encre : C.rouge }}>
            {mail.a || "aucun email client — complétez la fiche"}
          </span>
          <span style={{ color: C.muet, fontWeight: 700 }}>Objet</span>
          <span style={{ color: C.encre }}>{mail.objet}</span>
        </div>
      </div>

      {/* Corps */}
      <div style={{ ...S.carte, maxHeight: 320, overflowY: "auto" }}>
        <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 13, color: C.encre,
                      whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
          {mail.corps}
        </pre>
      </div>

      {erreur && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}

      <div style={{ margin: "0 16px", display: "flex", gap: 8 }}>
        <button onClick={copier} style={{
          flex: 1, padding: "13px", borderRadius: 12, cursor: "pointer",
          border: `1.5px solid ${C.bord}`, background: "#fff",
          fontSize: 13.5, fontWeight: 700, color: C.encre,
        }}>{copie ? "✓ Copié" : "📋 Copier"}</button>
        <a href={urlMailto(mail)} style={{
          flex: 1, padding: "13px", borderRadius: 12, textAlign: "center",
          textDecoration: "none", background: C.bleu, color: "#fff",
          fontSize: 13.5, fontWeight: 700,
        }}>✉️ Ouvrir dans Mail</a>
      </div>
      <div style={{ margin: "10px 16px 0", fontSize: 11, color: C.fantome,
                    textAlign: "center", lineHeight: 1.5 }}>
        Joignez le PDF de l'offre dans votre application mail avant l'envoi.
      </div>
    </div>
  );
}
