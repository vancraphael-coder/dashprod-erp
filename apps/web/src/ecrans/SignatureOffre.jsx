// =============================================================================
// Écran — Signature d'une offre par le client (90 % côté client).
//
// Le déménageur ne recueille plus la signature au bureau. Il prépare le
// document (offre + CGV figées) et envoie un code au client. Le client :
//   1. entre le code,
//   2. LIT le document complet — le même que celui préparé au bureau,
//   3. recopie la mention « Lu et approuvé »,
//   4. indique ses nom et prénom,
//   5. signe.
//
// La mention manuscrite recopiée + le nom + l'horodatage + l'empreinte du
// document constituent une signature électronique opposable en droit belge.
// Un simple clic ne suffit pas : sans la mention, la base refuse.
// =============================================================================

import React, { useEffect, useState } from "react";
import { offreApercu, offreSigner } from "../lib/adaptateur.js";
import { formater, formeValide } from "@domaine/portail/acces.js";
import Contrat from "./Contrat.jsx";
import { C, S } from "../lib/theme.jsx";

const eur = (c) => c == null ? "—"
  : (c / 100).toFixed(2).replace(".", ",") + " €";
const MENTION = "Lu et approuvé";

// Tolérante à la casse, aux accents et aux espaces, comme la base.
function mentionOk(saisie) {
  const norm = (s) => String(s || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").trim();
  return norm(saisie).includes("lu et approuve");
}

export default function SignatureOffre({ codeInitial = "", retour }) {
  const [code, setCode] = useState(formater(codeInitial));
  const [apercu, setApercu] = useState(null);
  const [nom, setNom] = useState("");
  const [mention, setMention] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [signee, setSignee] = useState(false);

  const codePret = formeValide(code);
  const signaturePrete = mentionOk(mention) && nom.trim().length >= 3;

  useEffect(() => {
    if (formeValide(codeInitial)) charger(formater(codeInitial));
  }, []);

  async function charger(c = code) {
    setErreur(null); setEnCours(true);
    try {
      const a = await offreApercu(c);
      if (!a?.ok) setErreur(a?.message || "Lien invalide ou expiré.");
      else setApercu(a);
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  async function signer() {
    setErreur(null); setEnCours(true);
    try {
      const r = await offreSigner(code, {
        nom: nom.trim(), mention: mention.trim(),
        empreinte: apercu?.document_empreinte,
      });
      if (!r?.ok) setErreur(r?.message || "Signature impossible.");
      else setSignee(true);
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  if (signee) {
    return (
      <div style={{ ...S.page, paddingTop: 60 }}>
        <div style={S.carte}>
          <div style={{ fontSize: 40, textAlign: "center" }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 800, textAlign: "center",
                        color: C.encre, marginTop: 8 }}>
            Votre signature est enregistrée.
          </div>
          <div style={{ fontSize: 13.5, color: C.muet, textAlign: "center",
                        marginTop: 8, lineHeight: 1.5 }}>
            {apercu?.entreprise} a été notifié. Vous pouvez fermer cette page.
          </div>
        </div>
      </div>
    );
  }

  // Étape 1 : saisie du code.
  if (!apercu) {
    return (
      <div style={{ ...S.page, paddingBottom: 60 }}>
        <div style={{ padding: "34px 20px 8px", maxWidth: 520, margin: "0 auto" }}>
          {retour && <button style={S.boutonLien} onClick={retour}>← Retour</button>}
          <div style={{ fontSize: 13, fontWeight: 700, color: C.bleu, marginTop: 8 }}>
            Signature de votre offre
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "6px 0 8px",
                       letterSpacing: "-.02em", lineHeight: 1.18 }}>
            Confirmez votre déménagement.
          </h1>
          <p style={{ fontSize: 14, color: C.muet, lineHeight: 1.5, margin: 0 }}>
            Entrez le code que votre déménageur vous a transmis par e-mail.
          </p>
        </div>
        <div style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>Votre code</label>
          <input style={{ ...S.input, fontSize: 20, letterSpacing: ".12em",
                          textAlign: "center", fontFamily: "ui-monospace, monospace",
                          textTransform: "uppercase" }}
                 value={code} autoFocus placeholder="ABCD-EFGH-JKMN" maxLength={16}
                 onChange={(e) => { setCode(formater(e.target.value)); setErreur(null); }}
                 onKeyDown={(e) => e.key === "Enter" && codePret && charger()} />
          {erreur && (
            <div style={{ fontSize: 12.5, color: C.rouge, background: "#FEF2F2",
                          border: "1px solid #FECACA", borderRadius: 10,
                          padding: "10px 12px", marginTop: 10 }}>{erreur}</div>
          )}
          <button style={{ ...S.boutonPlein, marginTop: 12, opacity: codePret ? 1 : .5 }}
                  disabled={!codePret || enCours} onClick={() => charger()}>
            {enCours ? "Vérification…" : "Voir mon offre"}
          </button>
        </div>
      </div>
    );
  }

  // Étape 2 : lecture du document + approbation.
  return (
    <div style={{ ...S.page, paddingBottom: 60 }}>
      <div style={{ padding: "28px 20px 4px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.bleu }}>
          {apercu.entreprise}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 6px",
                     letterSpacing: "-.02em" }}>
          Votre offre — {eur(apercu.montant_tvac_centimes)} TVAC
        </h1>
        <p style={{ fontSize: 13, color: C.muet, margin: 0, lineHeight: 1.5 }}>
          Lisez l'offre et les conditions ci-dessous, puis approuvez-les en bas
          de page.
        </p>
      </div>

      {/* Le document complet préparé par le bureau — offre + CGV figées.
          Exactement ce qui a été gelé, pas un résumé. */}
      {apercu.document ? (
        <Contrat contenu={apercu.document} />
      ) : (
        <div style={{ ...S.carte, color: C.muet, fontSize: 13 }}>
          Le document détaillé n'est pas disponible. Contactez votre déménageur.
        </div>
      )}

      {/* Approbation : mention manuscrite + nom. C'est l'acte de signature. */}
      <div style={{ ...S.carte, border: `2px solid ${C.bleu}` }}>
        <label style={{ ...S.label, marginTop: 0 }}>
          Pour signer, recopiez la mention et indiquez votre nom
        </label>

        <div style={{ fontSize: 12.5, color: C.muet, marginBottom: 4 }}>
          Recopiez exactement : <b style={{ color: C.encre }}>{MENTION}</b>
        </div>
        <input style={{ ...S.input,
                 borderColor: mention && !mentionOk(mention) ? C.rouge : undefined }}
               value={mention} placeholder={MENTION}
               onChange={(e) => { setMention(e.target.value); setErreur(null); }} />
        {mention && !mentionOk(mention) && (
          <div style={{ fontSize: 11.5, color: C.rouge, marginTop: 3 }}>
            Recopiez « {MENTION} » pour pouvoir signer.
          </div>
        )}

        <label style={S.label}>Vos nom et prénom</label>
        <input style={S.input} value={nom} placeholder="Prénom Nom"
               onChange={(e) => { setNom(e.target.value); setErreur(null); }} />

        <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 10,
                      lineHeight: 1.5 }}>
          En signant, vous confirmez avoir lu et approuvé l'offre et les
          conditions générales ci-dessus. Votre signature est horodatée et liée
          au document ; l'entreprise en sera informée.
        </div>

        {erreur && (
          <div style={{ fontSize: 12.5, color: C.rouge, background: "#FEF2F2",
                        border: "1px solid #FECACA", borderRadius: 10,
                        padding: "10px 12px", marginTop: 10 }}>{erreur}</div>
        )}

        <button style={{ ...S.boutonPlein, marginTop: 12,
                         opacity: signaturePrete ? 1 : .5 }}
                disabled={!signaturePrete || enCours} onClick={signer}>
          {enCours ? "Signature…" : "Signer l'offre"}
        </button>
      </div>
    </div>
  );
}
