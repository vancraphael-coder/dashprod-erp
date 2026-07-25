// =============================================================================
// Écran — Signature d'une offre par code.
//
// Le client clique un lien reçu de son déménageur (…?signer=CODE) ou saisit le
// code. Il voit ce qu'il signe AVANT de signer : entreprise, montant, dates.
// La signature est un acte opposable — le consentement doit être éclairé.
//
// Le code ne donne accès à RIEN d'autre : il signe cette offre, puis se
// consomme. L'espace client, lui, passe par une connexion Google.
// =============================================================================

import React, { useEffect, useState } from "react";
import { offreApercu, offreSigner } from "../lib/adaptateur.js";
import { formater, formeValide } from "@domaine/portail/acces.js";
import { C, S } from "../lib/theme.jsx";

const eur = (c) => c == null ? "—"
  : (c / 100).toFixed(2).replace(".", ",") + " €";
const jour = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("fr-BE",
    { day: "2-digit", month: "long", year: "numeric" }); }
  catch { return iso; }
};

export default function SignatureOffre({ codeInitial = "", retour }) {
  const [code, setCode] = useState(formater(codeInitial));
  const [apercu, setApercu] = useState(null);
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [signee, setSignee] = useState(false);

  const pret = formeValide(code);

  // Si un code arrive par l'URL, on charge l'aperçu tout de suite.
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
      const r = await offreSigner(code, nom);
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
      </div>

      {!apercu ? (
        <div style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>Votre code de signature</label>
          <input style={{ ...S.input, fontSize: 20, letterSpacing: ".12em",
                          textAlign: "center", fontFamily: "ui-monospace, monospace",
                          textTransform: "uppercase" }}
                 value={code} autoFocus placeholder="ABCD-EFGH-JKMN" maxLength={16}
                 onChange={(e) => { setCode(formater(e.target.value)); setErreur(null); }}
                 onKeyDown={(e) => e.key === "Enter" && pret && charger()} />
          {erreur && (
            <div style={{ fontSize: 12.5, color: C.rouge, background: "#FEF2F2",
                          border: "1px solid #FECACA", borderRadius: 10,
                          padding: "10px 12px", marginTop: 10 }}>{erreur}</div>
          )}
          <button style={{ ...S.boutonPlein, marginTop: 12, opacity: pret ? 1 : .5 }}
                  disabled={!pret || enCours} onClick={() => charger()}>
            {enCours ? "Vérification…" : "Voir mon offre"}
          </button>
        </div>
      ) : (
        <>
          <div style={S.carte}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
              {apercu.entreprise}
            </div>
            <div style={{ fontSize: 12, color: C.fantome, marginTop: 2 }}>
              Offre {apercu.reference}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", marginTop: 14, padding: "14px 0",
                          borderTop: `1px solid ${C.doux}`,
                          borderBottom: `1px solid ${C.doux}` }}>
              <span style={{ fontSize: 13, color: C.muet }}>Montant total</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.encre }}>
                {eur(apercu.montant_tvac_centimes)}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: C.fantome, textAlign: "right",
                          marginTop: 4 }}>TVAC</div>
            <div style={{ marginTop: 8 }}>
              <L l="Date souhaitée" v={jour(apercu.date_souhaitee)} />
            </div>
          </div>

          <div style={S.carte}>
            <label style={{ ...S.label, marginTop: 0 }}>
              Votre nom, pour signer
            </label>
            <input style={S.input} value={nom} autoFocus
                   placeholder="Prénom Nom"
                   onChange={(e) => setNom(e.target.value)} />
            <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 8,
                          lineHeight: 1.5 }}>
              En signant, vous confirmez accepter cette offre. L'entreprise en
              sera informée et votre déménagement passera en préparation.
            </div>
            {erreur && (
              <div style={{ fontSize: 12.5, color: C.rouge, background: "#FEF2F2",
                            border: "1px solid #FECACA", borderRadius: 10,
                            padding: "10px 12px", marginTop: 10 }}>{erreur}</div>
            )}
            <button style={{ ...S.boutonPlein, marginTop: 12,
                             opacity: nom.trim().length > 1 ? 1 : .5 }}
                    disabled={nom.trim().length < 2 || enCours} onClick={signer}>
              {enCours ? "Signature…" : "Signer et confirmer"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function L({ l, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12,
                  padding: "7px 0" }}>
      <span style={{ fontSize: 12.5, color: C.muet }}>{l}</span>
      <span style={{ fontSize: 12.5, color: C.encre, fontWeight: 600 }}>{v}</span>
    </div>
  );
}
