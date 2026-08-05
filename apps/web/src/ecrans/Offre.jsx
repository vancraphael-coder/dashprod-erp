// =============================================================================
// Écran — Offre & Signature.
// Trois temps : (1) APERÇU vivant du contrat, tant que rien n'est envoyé ;
// (2) ENVOI = instanciation figée (contenu gelé + empreinte + C.B.D. jointe,
// S6/C-02) — le contrat rendu vient dès lors du contenu FIGÉ, plus de la base
// courante ; (3) SIGNATURE (C-26) qui déverrouille la transition vers
// « confirmé » — aucun autre chemin n'y mène.
// Impression : window.print() + CSS ciblant .contrat-imprimable (index.html).
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  obtenirAffaire, composerOffre, envoyerOffre, obtenirInstance, certificatSignature,
} from "../lib/adaptateur.js";
import { instanceIntacte } from "@domaine/documents/instances.js";
import { ACOMPTE_PCT } from "@domaine/documents/cgv.js";
import Contrat from "./Contrat.jsx";
import CertificatSignature from "./CertificatSignature.jsx";
import { C, S, euros } from "../lib/theme.jsx";

const TYPE_PAR_FORMULE = {
  tarifaire: "offre_tarifaire", emballage: "offre_emballage", forfait: "offre_forfait",
};

export default function Offre({ affaireId, retour, versMail }) {
  const [affaire, setAffaire] = useState(null);
  const [instance, setInstance] = useState(null);
  const [apercu, setApercu] = useState(null);   // contenu composé, avant envoi
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [certificat, setCertificat] = useState(null);
  const [voirCertificat, setVoirCertificat] = useState(false);

  async function recharger() {
    setAffaire(await obtenirAffaire(affaireId));
    const inst = await obtenirInstance(affaireId);
    setInstance(inst);
    if (!inst) setApercu(await composerOffre(affaireId));
    // Le certificat n'existe que si le document a été signé. On l'ignore en
    // silence sinon : ce n'est pas une erreur, c'est l'état normal d'une offre
    // pas encore approuvée.
    if (inst?.statut === "signee") {
      certificatSignature(affaireId).then(setCertificat).catch(() => setCertificat(null));
    } else {
      setCertificat(null);
    }
  }
  useEffect(() => { recharger(); }, [affaireId]);

  async function envoyer() {
    setErreur(null); setEnCours(true);
    try {
      const contenu = await composerOffre(affaireId);   // recomposé à l'instant du gel
      const type = TYPE_PAR_FORMULE[contenu.formule] || "offre_tarifaire";
      await envoyerOffre(affaireId, { type, contenu });
      await recharger();
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  if (!affaire) return null;

  const contenu = instance?.contenu || apercu;
  const signee = instance?.statut === "signee";
  const chiffree = affaire.tvac_centimes != null;
  const intacte = instance?.contenu
    ? instanceIntacte({
        contenu: instance.contenu,
        empreinte: instance.empreinte_sha256 || instance.empreinte,
      })
    : null;
  const acompte = contenu ? Math.round(contenu.tvac_centimes * ACOMPTE_PCT / 100) : 0;

  return (
    <div style={S.page}>
      <div style={{ ...S.entete }} className="no-print">
        <button style={S.boutonLien} onClick={retour}>← Dossier</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={S.titre}>Offre — {affaire.client?.nom || "…"}</div>
          {instance && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
              background: signee ? "#ECFDF5" : "#EFF6FF",
              color: signee ? "#065F46" : "#1E40AF",
            }}>{signee ? "SIGNÉE" : "ENVOYÉE"}</span>
          )}
        </div>
      </div>

      {!chiffree && (
        <div style={{ ...S.carte, color: C.muet, fontSize: 13 }}>
          Cette affaire n'est pas encore chiffrée — établissez le devis d'abord.
        </div>
      )}

      {/* Le document lui-même : aperçu vivant, puis contenu figé après envoi. */}
      {chiffree && contenu && (
        <Contrat contenu={contenu} signature={instance?.signature} />
      )}

      {/* Preuve d'intégrité (spécifique Dashprod, discret, hors impression) */}
      {instance && (
        <div className="no-print" style={{ ...S.carte, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11.5, color: C.muet }}>
              Document scellé · C.B.D. jointe
            </span>
            {intacte != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: intacte ? C.vert : C.rouge }}>
                {intacte ? "✓ intègre" : "⚠ altéré"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.fantome, marginTop: 4, wordBreak: "break-all" }}>
            {instance.empreinte_sha256 || instance.empreinte}
          </div>
        </div>
      )}

      {erreur && (
        <div className="no-print" style={{ margin: "0 16px 10px", fontSize: 12.5, color: C.rouge }}>
          {erreur}
        </div>
      )}

      {/* Actions */}
      <div className="no-print" style={{ margin: "0 16px 20px" }}>
        {!instance && chiffree && (
          <>
            <button style={S.boutonPlein} disabled={enCours} onClick={envoyer}>
              {enCours ? "Instanciation…" : "Envoyer l'offre (fige le document)"}
            </button>
            <div style={{ fontSize: 11.5, color: C.muet, marginTop: 8, textAlign: "center",
                          lineHeight: 1.5 }}>
              L'envoi gèle le document et calcule son empreinte : plus rien ne pourra
              le modifier, même si les tarifs changent.
            </div>
          </>
        )}

        {instance && !signee && (
          <div style={{ padding: "12px 13px", borderRadius: 12, marginBottom: 10,
                        background: "#EFF6FF", border: `1px solid ${C.bord}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.encre }}>
              Faire signer le client
            </div>
            <div style={{ fontSize: 11.5, color: C.muet, marginTop: 3,
                          lineHeight: 1.5 }}>
              Le code de signature s'envoie depuis l'écran <b>Mail</b>, avec le
              message et les pièces jointes. Un seul endroit pour un seul geste.
            </div>
            {versMail && (
              <button onClick={() => versMail(affaireId)} style={{
                ...S.boutonPlein, marginTop: 10 }}>
                Préparer l'envoi au client →
              </button>
            )}
          </div>
        )}

        {signee && (
          <div style={{ padding: "12px 13px", background: "#ECFDF5",
                        border: "1px solid #A7F3D0", borderRadius: 10,
                        marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#065F46" }}>
              ✓ Offre signée — définitive
            </div>
            {instance?.signature && (
              <div style={{ fontSize: 12, color: "#065F46", marginTop: 4 }}>
                Par <b>{instance.signature.nom}</b>
                {instance.signature.date && (
                  <> le {new Date(instance.signature.date).toLocaleDateString("fr-BE",
                    { day: "2-digit", month: "long", year: "numeric" })}</>
                )}
                {instance.signature.canal === "client_en_ligne" && " · en ligne"}
              </div>
            )}
            <div style={{ fontSize: 12, color: "#065F46", marginTop: 6 }}>
              Le dossier est confirmé. Acompte de {ACOMPTE_PCT} % à réclamer :{" "}
              <b>{euros(acompte)}</b>.
            </div>
            <div style={{ fontSize: 11, color: "#047857", marginTop: 6,
                          lineHeight: 1.5 }}>
              Ce document ne peut plus être modifié ni remplacé. Pour repartir
              sur de nouvelles bases, reprenez le dossier depuis sa fiche.
            </div>
            {certificat?.signe && (
              <button onClick={() => setVoirCertificat((v) => !v)} style={{
                width: "100%", marginTop: 10, padding: "10px", borderRadius: 9,
                cursor: "pointer", border: "1.5px solid #065F46",
                background: "#fff", color: "#065F46",
                fontSize: 12.5, fontWeight: 700 }}>
                {voirCertificat ? "Masquer" : "📜 Voir le certificat de signature"}
              </button>
            )}
          </div>
        )}

        {/* Le certificat : la preuve opposable. Un badge dans une application
            ne se produit pas devant un juge — il faut un document qui
            s'imprime et se relit seul. */}
        {signee && certificat?.signe && voirCertificat && (
          <>
            <CertificatSignature certificat={certificat} />
            {/* L'offre et le certificat portent la même classe imprimable :
                l'impression produit donc les DEUX. C'est voulu — le document
                signé et sa preuve forment un dossier complet, et les séparer
                obligerait à les rapprocher plus tard. */}
            <button className="no-print" onClick={() => window.print()} style={{
              width: "100%", padding: "12px", borderRadius: 11, cursor: "pointer",
              fontSize: 13.5, fontWeight: 700, border: `1.5px solid ${C.bleu}`,
              background: C.bleuClair, color: C.bleu, marginBottom: 10 }}>
              🖨️ Imprimer l'offre signée et son certificat
            </button>
            <div className="no-print" style={{ fontSize: 11, color: C.fantome,
              margin: "0 16px 12px", lineHeight: 1.5, textAlign: "center" }}>
              Conservez ce dossier : c'est ce qui se produit en cas de
              contestation.
            </div>
          </>
        )}

        {instance && (
          <>
            {/* UN SEUL rendu de l'offre (décision D2) : ce qui s'imprime est
                exactement ce qui s'affiche. Auparavant un second générateur PDF
                produisait un document divergent — d'où le « document
                secondaire » constaté. Le navigateur imprime le composant
                Contrat, ou l'enregistre en PDF via sa propre boîte de dialogue. */}
            <button onClick={() => window.print()} style={{
              width: "100%", padding: "12px", borderRadius: 11, cursor: "pointer",
              fontSize: 13.5, fontWeight: 700, border: `1.5px solid ${C.bleu}`,
              background: C.bleuClair, color: C.bleu, marginTop: 10 }}>
              🖨️ Imprimer / Enregistrer en PDF
            </button>
            <div style={{ fontSize: 11, color: C.fantome, marginTop: 6,
                          textAlign: "center", lineHeight: 1.5 }}>
              Copie exacte du document ci-dessus. Dans la boîte d'impression,
              choisissez « Enregistrer au format PDF » comme destination.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
