// =============================================================================
// Porte C — Accéder à mon déménagement (particulier).
//
// Deux chemins, deux besoins :
//   1. SUIVRE son déménagement → connexion Google. La reconnaissance se fait
//      en base : l'e-mail du compte Google correspond au dossier créé par le
//      déménageur. Rien à retenir.
//   2. SIGNER une offre → le code reçu du déménageur. Usage unique, ciblé.
//
// Cette page ne doit JAMAIS mener un particulier vers la création de société :
// le routage post-OAuth s'en charge (résolution client avant tout), la page
// se contente d'expliquer clairement.
// =============================================================================

import React, { useState } from "react";
import { connecterAvecGoogle } from "../../lib/supabase.js";
import { formater, formeValide } from "@domaine/portail/acces.js";
import { V, MONO, NavPublique, PiedPublic, BoutonGoogle, Etiquette }
  from "./theme-vitrine.jsx";

const PAGES_ESPACE = [
  ["Mon dossier", "Dates, adresses, coordonnées de votre déménageur."],
  ["Mes meubles", "L'inventaire numéroté, colis par colis — jusqu'à la liste de colisage pour un départ à l'étranger."],
  ["Mes offres", "Les offres reçues, toutes entreprises confondues. Comparez avant de choisir."],
  ["Mes factures", "Montants, échéances, communication structurée pour payer sans erreur."],
];

export default function PorteClient({ aller, onSigner }) {
  const [erreur, setErreur] = useState(null);
  const [code, setCode] = useState("");
  const codePret = formeValide(code);

  async function entrer() {
    setErreur(null);
    try { await connecterAvecGoogle(); }
    catch (e) { setErreur(e.message || "Connexion impossible."); }
  }

  return (
    <div className="vitrine" style={{ minHeight: "100vh", display: "flex",
      flexDirection: "column", background: V.ivoire, color: V.encre }}>
      <NavPublique page="client" aller={aller} />

      <main style={{ flex: 1 }}>
        <section style={{ maxWidth: 1080, margin: "0 auto",
                          padding: "clamp(44px, 7vw, 84px) 20px 24px",
                          display: "grid", gap: 44,
                          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          <div className="v-lever">
            <Etiquette numero="PORTE C" libelle="particuliers" />
            <h1 className="v-display" style={{ fontSize: "clamp(30px, 4.4vw, 48px)",
                                               margin: "16px 0 0" }}>
              Votre déménagement, sous vos yeux.
            </h1>
            <p style={{ fontSize: 16, color: V.muet, lineHeight: 1.6,
                        margin: "16px 0 0", maxWidth: "50ch" }}>
              Votre déménageur travaille avec Dashprod. Vous, vous suivez :
              dossier, meubles, offres et factures, réunis dans un espace à vous.
            </p>

            <div style={{ marginTop: 24, display: "grid", gap: 0 }}>
              {PAGES_ESPACE.map(([t, d], i) => (
                <div key={t} style={{ display: "flex", gap: 14, padding: "13px 0",
                       borderTop: i ? `1px solid ${V.bord}` : "none" }}>
                  <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700,
                                 color: V.sangle, flexShrink: 0, paddingTop: 2 }}>
                    {String(i + 1).padStart(3, "0")}
                  </span>
                  <span>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t}</span>
                    <span style={{ display: "block", fontSize: 13, color: V.muet,
                                   lineHeight: 1.5, marginTop: 3 }}>{d}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="v-lever-2" style={{ justifySelf: "center",
                width: "min(380px, 100%)", alignSelf: "start", display: "grid", gap: 16 }}>
            {/* Chemin 1 : l'espace de suivi */}
            <div className="v-carte" style={{ padding: 24 }}>
              <div style={{ fontSize: 16.5, fontWeight: 800 }}>Suivre mon déménagement</div>
              <p style={{ fontSize: 13, color: V.muet, lineHeight: 1.55,
                          margin: "8px 0 16px" }}>
                Connectez-vous avec le compte Google dont l'adresse e-mail figure
                sur votre dossier — celle que vous avez donnée à votre déménageur.
                C'est elle qui vous reconnaît.
              </p>
              <BoutonGoogle onClick={entrer} texte="Ouvrir mon espace avec Google" />
              {erreur && (
                <div style={{ fontSize: 12.5, color: "#DC2626", marginTop: 10 }}>{erreur}</div>
              )}
            </div>

            {/* Chemin 2 : la signature par code */}
            <div className="v-carte" style={{ padding: 24, borderStyle: "dashed",
                  borderColor: V.sangle, background: "#FFFDF7" }}>
              <div style={{ display: "flex", alignItems: "center",
                            justifyContent: "space-between" }}>
                <span style={{ fontSize: 16.5, fontWeight: 800 }}>Signer une offre</span>
                <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700,
                               color: "#fff", background: V.sangle,
                               padding: "3px 8px", borderRadius: 6,
                               letterSpacing: ".06em" }}>CODE</span>
              </div>
              <p style={{ fontSize: 13, color: V.muet, lineHeight: 1.55,
                          margin: "8px 0 12px" }}>
                Vous avez reçu un code de votre déménageur ? Il ouvre l'offre à
                lire et à approuver. Une seule utilisation, pas de compte requis.
              </p>
              <input
                style={{ width: "100%", padding: "12px 14px", borderRadius: 11,
                         border: `1.5px solid ${codePret ? V.sangle : V.bord}`,
                         fontFamily: MONO, fontSize: 17, letterSpacing: ".1em",
                         textAlign: "center", textTransform: "uppercase",
                         background: "#fff" }}
                value={code} placeholder="ABCD-EFGH-JKMN" maxLength={16}
                aria-label="Code de signature"
                onChange={(e) => setCode(formater(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && codePret && onSigner(code)} />
              <button className="v-btn v-btn-nuit"
                      style={{ width: "100%", marginTop: 10, padding: "12px 18px",
                               fontSize: 14, opacity: codePret ? 1 : .45 }}
                      disabled={!codePret} onClick={() => onSigner(code)}>
                Lire et signer l'offre
              </button>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 720, margin: "0 auto",
                          padding: "0 20px clamp(40px, 6vw, 64px)" }}>
          <div className="v-carte" style={{ padding: 20, display: "flex", gap: 14,
                alignItems: "flex-start" }}>
            <span aria-hidden="true" style={{ fontSize: 20 }}>🔒</span>
            <p style={{ fontSize: 13, color: V.muet, lineHeight: 1.6, margin: 0 }}>
              Vous ne voyez que <b style={{ color: V.encre }}>vos</b> données :
              votre dossier, vos meubles, vos documents. L'inventaire de votre
              mobilier est supprimé après votre déménagement, passé le délai de
              conservation — seules vos factures sont gardées, comme la loi
              l'impose.
            </p>
          </div>
        </section>
      </main>

      <PiedPublic aller={aller} />
    </div>
  );
}
