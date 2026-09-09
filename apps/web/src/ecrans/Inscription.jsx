// =============================================================================
// Après OAuth, compte inconnu — deux publics possibles, une page pour les deux.
//
// Ce compte n'a ni organisation (pas un déménageur) ni dossier client (pas un
// particulier reconnu). Deux explications possibles :
//   A. C'est un NOUVEAU DÉMÉNAGEUR → formulaire de création de société.
//   B. C'est un PARTICULIER dont l'e-mail ne correspond pas au dossier → il ne
//      doit SURTOUT PAS créer une société (parcours payant). On lui explique
//      le rattachement par e-mail et comment le corriger.
//
// Le garde-fou reste en base : cmd_creer_ma_societe() refuse un compte déjà
// rattaché. Cet écran choisit juste la bonne explication.
// =============================================================================

import React, { useState } from "react";
import { deconnecter } from "../lib/supabase.js";
import { prixMensuel } from "@domaine/commercial/plans.js";
import FormulaireSociete from "../composants/FormulaireSociete.jsx";
import { V, MONO, Logo, Etiquette } from "./vitrine/theme-vitrine.jsx";

export default function Inscription({ email, onCreee }) {
  const [volet, setVolet] = useState(null);   // null | "societe" | "client"

  const champ = { width: "100%", boxSizing: "border-box", padding: "12px 14px",
    border: `1.5px solid ${V.bord}`, borderRadius: 11, fontSize: 15, background: "#fff" };
  const label = { display: "block", fontSize: 12.5, fontWeight: 700,
                  color: V.encre, margin: "14px 0 6px" };

  return (
    <div className="vitrine" style={{ minHeight: "100vh", background: V.ivoire,
      color: V.encre, paddingBottom: 40 }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "26px 20px 0" }}>
        <Logo taille={30} />
      </div>

      <div style={{ maxWidth: 620, margin: "0 auto",
                    padding: "clamp(22px, 4vw, 38px) 20px 0" }} className="v-lever">
        <h1 className="v-display" style={{ fontSize: "clamp(25px, 4vw, 34px)", margin: 0 }}>
          Ce compte est nouveau ici.
        </h1>
        <p style={{ fontSize: 14.5, color: V.muet, lineHeight: 1.6, margin: "10px 0 0" }}>
          <b style={{ color: V.encre, fontFamily: MONO, fontSize: 13.5 }}>{email}</b>
          {" "}n'est relié à aucune société ni à aucun dossier de déménagement.
          Dites-nous qui vous êtes :
        </p>
      </div>

      {/* Le choix — la frontière entre les deux publics. */}
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "18px 20px 0",
                    display: "grid", gap: 12,
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))" }}>
        <button onClick={() => setVolet("societe")} className="v-carte v-carte-hover"
                style={{ padding: 18, textAlign: "left", cursor: "pointer",
                         borderWidth: 2,
                         borderColor: volet === "societe" ? V.route : V.bord }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700,
                         letterSpacing: ".1em", color: V.route }}>ENTREPRISE</span>
          <span style={{ display: "block", fontSize: 16.5, fontWeight: 800,
                         margin: "6px 0 4px" }}>Je suis déménageur</span>
          <span style={{ display: "block", fontSize: 12.5, color: V.muet,
                         lineHeight: 1.5 }}>
            Créer ma société sur Dashprod — {prixMensuel("starter")}.
          </span>
        </button>
        <button onClick={() => setVolet("client")} className="v-carte v-carte-hover"
                style={{ padding: 18, textAlign: "left", cursor: "pointer",
                         borderWidth: 2,
                         borderColor: volet === "client" ? V.sangle : V.bord }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700,
                         letterSpacing: ".1em", color: V.sangle }}>PARTICULIER</span>
          <span style={{ display: "block", fontSize: 16.5, fontWeight: 800,
                         margin: "6px 0 4px" }}>Je déménage</span>
          <span style={{ display: "block", fontSize: 12.5, color: V.muet,
                         lineHeight: 1.5 }}>
            Je cherche à suivre mon déménagement.
          </span>
        </button>
      </div>

      {/* Volet A — création de société (la logique d'origine, intacte). */}
      {volet === "societe" && (
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "16px 20px 0" }}>
          <div className="v-carte" style={{ padding: 24 }}>
            <Etiquette numero="2 min" libelle="base vierge, à vous" />

            <div style={{ marginTop: 18 }}>
              <FormulaireSociete
                styles={{
                  champ,
                  label,
                  aide: { fontSize: 11.5, color: V.muet, marginTop: 4, lineHeight: 1.45 },
                  mono: { fontFamily: MONO, letterSpacing: ".05em" },
                  // Vitrine : fond clair assumé dans les deux modes.
                  alerte: { color: "#991B1B", background: "#FEF2F2",
                            border: "1px solid #FECACA" },
                }}
                libelleBouton="Créer ma société"
                boutonProps={{ className: "v-btn v-btn-plein",
                               style: { width: "100%", marginTop: 16 } }}
                onCreee={onCreee} />
            </div>

            <div style={{ fontSize: 11.5, color: V.brume, marginTop: 12, lineHeight: 1.5 }}>
              Adresse, IBAN et barème se complètent juste après, dans Paramètres.
              Ce que vous y réglez alimente ensuite tous vos devis et factures.
            </div>
          </div>
        </div>
      )}

      {/* Volet B — particulier non reconnu : expliquer, ne jamais vendre. */}
      {volet === "client" && (
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "16px 20px 0" }}>
          <div className="v-carte" style={{ padding: 24, borderStyle: "dashed",
                borderColor: V.sangle, background: "#FFFDF7" }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>
              Votre dossier n'est pas relié à cette adresse.
            </div>
            <p style={{ fontSize: 13.5, color: V.muet, lineHeight: 1.6,
                        margin: "10px 0 0" }}>
              Votre espace s'ouvre avec l'adresse e-mail que votre déménageur a
              notée sur votre dossier. Ici, vous êtes connecté avec{" "}
              <b style={{ color: V.encre, fontFamily: MONO, fontSize: 12.5 }}>{email}</b>
              {" "}— et aucun dossier ne porte cette adresse.
            </p>
            <div style={{ marginTop: 14, display: "grid", gap: 8, fontSize: 13.5,
                          color: V.encre }}>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontFamily: MONO, fontWeight: 700, color: V.sangle }}>1.</span>
                Vous avez peut-être un autre compte Google — reconnectez-vous
                avec l'adresse donnée à votre déménageur.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ fontFamily: MONO, fontWeight: 700, color: V.sangle }}>2.</span>
                Sinon, demandez à votre déménageur de noter cette adresse-ci sur
                votre dossier. Votre espace s'ouvrira aussitôt.
              </div>
            </div>
            <button className="v-btn v-btn-nuit"
                    style={{ width: "100%", marginTop: 18, padding: "12px 18px",
                             fontSize: 14 }}
                    onClick={async () => { await deconnecter(); window.location.reload(); }}>
              Changer de compte Google
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 620, margin: "14px auto 0", padding: "0 20px",
                    textAlign: "center" }}>
        <button onClick={async () => { await deconnecter(); window.location.reload(); }}
                style={{ background: "none", border: "none", color: V.muet,
                         fontSize: 12.5, cursor: "pointer", padding: 10 }}>
          Ce n'est pas votre compte ? Se déconnecter
        </button>
      </div>
    </div>
  );
}
