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
  obtenirTextes, creerLienSignature,
} from "../lib/adaptateur.js";
import { emailOffre, urlMailto } from "@domaine/communication/brief.js";
import { genererCode } from "@domaine/portail/acces.js";
import { C, S } from "../lib/theme.jsx";

export default function Mail({ affaireId, retour, versOffre }) {
  const [mail, setMail] = useState(null);
  const [instance, setInstance] = useState(null);
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [lien, setLien] = useState(null);      // { code, url } une fois généré
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [affaire, contact, inst, org, textes] = await Promise.all([
          obtenirAffaire(affaireId),
          obtenirContact(affaireId).catch(() => null),
          obtenirInstance(affaireId).catch(() => null),
          obtenirOrganisation().catch(() => ({})),
          obtenirTextes().catch(() => ({})),
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
          textes,                       // modèles réglés dans Compte → Textes
          lienSignature: lien?.url || null,
          codeSignature: lien?.code || null,
        }));
      } catch (e) { setErreur(e.message); }
    })();
  }, [affaireId, lien]);

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

      {/* Signature en ligne — plus de pièce jointe. Le client lit l'offre et
          les conditions sur la page de signature, puis approuve. */}
      <div style={S.carte}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 8,
                      textTransform: "uppercase", letterSpacing: ".03em" }}>
          Signature en ligne
        </div>
        <div style={{ fontSize: 12, color: C.muet, lineHeight: 1.55, marginBottom: 10 }}>
          L'offre et les conditions générales ne sont plus jointes au mail. Le
          client les consulte en ligne et les approuve d'un « Lu et approuvé ».
          Générez le code, il s'insère dans le message ci-dessous.
        </div>

        {!instance && (
          <button style={{ ...S.boutonLien, paddingLeft: 0 }}
                  onClick={() => versOffre(affaireId)}>
            Préparer et figer l'offre d'abord →
          </button>
        )}

        {instance && !lien && (
          <button style={S.boutonPlein} disabled={enCours} onClick={async () => {
            setEnCours(true); setErreur(null);
            try {
              const code = genererCode();
              await creerLienSignature(affaireId, code, 30);
              setLien({ code, url: `${location.origin}/?signer=`
                + encodeURIComponent(code.replace(/-/g, "")) });
            } catch (e) { setErreur(e.message); }
            finally { setEnCours(false); }
          }}>
            {enCours ? "Génération…" : "Générer le code de signature"}
          </button>
        )}

        {lien && (
          <div style={{ padding: "10px 12px", borderRadius: 10,
                        background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
            <div style={{ fontSize: 11.5, color: "#065F46", fontWeight: 700 }}>
              Code inséré dans le message
            </div>
            <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 18,
                          fontWeight: 800, color: C.encre, textAlign: "center",
                          letterSpacing: ".1em", padding: "6px 0" }}>
              {lien.code}
            </div>
            <div style={{ fontSize: 11, color: C.fantome, lineHeight: 1.5 }}>
              Valable 30 jours, une seule utilisation. Notez-le : il ne sera plus
              affiché en entier.
            </div>
          </div>
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
