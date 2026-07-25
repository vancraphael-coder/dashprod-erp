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
  obtenirAffaire, composerOffre, envoyerOffre, obtenirInstance,
  creerLienSignature,
} from "../lib/adaptateur.js";
import { instanceIntacte } from "@domaine/documents/instances.js";
import { ACOMPTE_PCT } from "@domaine/documents/cgv.js";
import Contrat from "./Contrat.jsx";
import { genererCode } from "@domaine/portail/acces.js";
import { pdfOffre, nomFichierOffre, telecharger } from "../lib/pdfOffre.js";
import { C, S, euros } from "../lib/theme.jsx";

const TYPE_PAR_FORMULE = {
  tarifaire: "offre_tarifaire", emballage: "offre_emballage", forfait: "offre_forfait",
};

export default function Offre({ affaireId, retour }) {
  const [affaire, setAffaire] = useState(null);
  const [instance, setInstance] = useState(null);
  const [apercu, setApercu] = useState(null);   // contenu composé, avant envoi
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [lien, setLien] = useState(null);
  const [pdfEnCours, setPdfEnCours] = useState(false);

  async function recharger() {
    setAffaire(await obtenirAffaire(affaireId));
    const inst = await obtenirInstance(affaireId);
    setInstance(inst);
    if (!inst) setApercu(await composerOffre(affaireId));
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
                          marginBottom: 10, lineHeight: 1.5 }}>
              La signature se fait côté client : il lit l'offre et les conditions,
              recopie « Lu et approuvé » et indique son nom. Envoyez-lui ce code.
            </div>
            {!lien ? (
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
            ) : (
              <div>
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 20,
                              fontWeight: 800, color: C.encre, letterSpacing: ".1em",
                              textAlign: "center", padding: "10px 0" }}>
                  {lien.code}
                </div>
                <button style={{ ...S.boutonPlein }} onClick={() => {
                  navigator.clipboard?.writeText(lien.url).catch(() => {});
                }}>Copier le lien à envoyer par e-mail</button>
                <div style={{ fontSize: 11, color: C.fantome, marginTop: 6,
                              lineHeight: 1.5 }}>
                  Valable 30 jours, utilisable une seule fois. Notez le code :
                  il ne sera plus affiché en entier.
                </div>
              </div>
            )}
          </div>
        )}

        {signee && (
          <div style={{ padding: "10px 12px", background: "#ECFDF5", border: "1px solid #A7F3D0",
                        borderRadius: 10, fontSize: 12.5, color: "#065F46", fontWeight: 600,
                        marginBottom: 10 }}>
            Offre acceptée — le dossier est confirmé. Acompte de {ACOMPTE_PCT} % à
            réclamer : <b>{euros(acompte)}</b>.
          </div>
        )}

        {instance && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {/* Le PDF généré est LA pièce jointe envoyée au client (même
                contenu que l'écran) ; l'impression reste pour le papier. */}
            <button disabled={pdfEnCours} onClick={async () => {
                      setPdfEnCours(true);
                      try {
                        const contenu = await composerOffre(affaireId);
                        telecharger(await pdfOffre(contenu, instance?.numero),
                                    nomFichierOffre(contenu));
                      } catch (e) { setErreur(e.message); }
                      setPdfEnCours(false);
                    }}
                    style={{ flex: 1, textAlign: "center", padding: "11px",
                             borderRadius: 11, cursor: "pointer", fontSize: 13,
                             fontWeight: 700, border: `1.5px solid ${C.bleu}`,
                             background: C.bleuClair, color: C.bleu }}>
              {pdfEnCours ? "Génération…" : "📄 Télécharger le PDF"}
            </button>
            <button style={{ ...S.boutonLien, textAlign: "center",
                             border: `1.5px solid ${C.bord}`, borderRadius: 11,
                             padding: "11px 14px" }}
                    onClick={() => window.print()}>
              🖨️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
