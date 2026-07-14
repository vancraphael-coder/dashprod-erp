// =============================================================================
// Écran — Mail (envoi de l'offre).
// Alignement page 07 : dix mails par semaine, identiques à 90 % — le template
// supprime l'oubli (validité, dates) et uniformise le ton. Flux v1 assumé
// manuel : générer le PDF de l'offre (impression) puis le joindre au mail
// ouvert par mailto:. L'envoi SMTP réel viendra comme adaptateur au bord (D-1).
// Le formatage vient du domaine (emailOffre) — une implémentation, testée.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  obtenirAffaire, obtenirContact, obtenirInstance, obtenirOrganisation,
} from "../lib/adaptateur.js";
import { emailOffre, urlMailto } from "@domaine/communication/brief.js";
import { C, S } from "../lib/theme.jsx";

export default function Mail({ affaireId, retour, versOffre }) {
  const [mail, setMail] = useState(null);
  const [instance, setInstance] = useState(null);
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [affaire, contact, inst, org] = await Promise.all([
          obtenirAffaire(affaireId),
          obtenirContact(affaireId).catch(() => null),
          obtenirInstance(affaireId).catch(() => null),
          obtenirOrganisation().catch(() => ({})),
        ]);
        setInstance(inst);
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
        }));
      } catch (e) { setErreur(e.message); }
    })();
  }, [affaireId]);

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

      {/* Pièce jointe : l'offre, préparée via l'impression PDF */}
      <div style={S.carte}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📎</span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.encre }}>
                Offre de prix (PDF)
              </div>
              <div style={{ fontSize: 11.5, color: C.muet }}>À joindre au mail</div>
            </div>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
            background: signee ? "#ECFDF5" : instance ? "#FFFBEB" : "#F1F5F9",
            color: signee ? "#065F46" : instance ? "#92400E" : C.muet }}>
            {signee ? "Signée" : instance ? "Non signée" : "Pas encore émise"}
          </span>
        </div>
        <button style={{ ...S.boutonLien, paddingLeft: 0, marginTop: 8 }}
                onClick={() => versOffre(affaireId)}>
          {instance ? "Ouvrir l'offre pour l'imprimer en PDF →" : "Préparer l'offre d'abord →"}
        </button>
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
