// =============================================================================
// Porte A — Créer ma société (pré-authentification).
//
// La page qui vend ET qui ouvre. Un patron de déménagement arrive ici depuis
// la landing : il doit comprendre le déroulé (Google → formulaire → base
// vierge), le prix (360 € HTVA/mois), et pouvoir démarrer en un clic.
//
// L'OAuth part d'ici directement. Au retour, le routage central résout :
// pas d'organisation, pas de dossier client → formulaire de création de
// société (Inscription.jsx). Le garde-fou reste en base, pas ici.
// =============================================================================

import React, { useState } from "react";
import { connecterAvecGoogle } from "../../lib/supabase.js";
import {
  PLANS, plan, ESSAI_JOURS, ESSAI_PLAN,
} from "@domaine/commercial/plans.js";
import { V, MONO, NavPublique, PiedPublic, BoutonGoogle, Etiquette }
  from "./theme-vitrine.jsx";

const ETAPES = [
  { t: "Connectez-vous avec Google", d: "Le compte de votre entreprise. Pas de mot de passe à retenir, pas de formulaire interminable." },
  { t: "Créez votre société", d: "Nom, numéro de TVA, téléphone. Deux minutes. Votre base est vierge et à vous seul." },
  { t: "Paramétrez une fois", d: "Barème, suppléments, équipe, textes d'offre. Tout ce que vous réglez ici se retrouve partout." },
  { t: "Travaillez", d: "Premier relevé, premier devis, première offre signée en ligne. Le jour même." },
];

// Ce que l'essai ouvre réellement. La liste vient de l'offre d'essai, pas
// d'un texte figé : promettre « utilisateurs illimités » alors que Regular en
// compte 5 était une contre-vérité que le client découvrait au deuxième
// collaborateur invité.
const INCLUS = [
  "Devis, offres et signature « Lu et approuvé » en ligne",
  "Planning : missions, congés, fermetures, jours fériés",
  "Facturation + envoi Peppol (obligation B2B belge 2026)",
  "Inventaire export : colisage numéroté, poids taxable",
  "Vos données cloisonnées, hébergées en Europe, exportables",
];

export default function PorteSociete({ aller }) {
  const [erreur, setErreur] = useState(null);

  async function demarrer() {
    setErreur(null);
    try { await connecterAvecGoogle(); }
    catch (e) { setErreur(e.message || "Connexion impossible."); }
  }

  return (
    <div className="vitrine" style={{ minHeight: "100vh", display: "flex",
      flexDirection: "column", background: V.ivoire, color: V.encre }}>
      <NavPublique page="societe" aller={aller} />

      <main style={{ flex: 1 }}>
        <section style={{ maxWidth: 1080, margin: "0 auto",
                          padding: "clamp(44px, 7vw, 84px) 20px 20px",
                          display: "grid", gap: 44,
                          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          <div className="v-lever">
            <Etiquette numero="PORTE A" libelle="entreprises" />
            <h1 className="v-display" style={{ fontSize: "clamp(30px, 4.4vw, 48px)",
                                               margin: "16px 0 0" }}>
              Votre société de déménagement, sur Dashprod.
            </h1>
            <p style={{ fontSize: 16, color: V.muet, lineHeight: 1.6,
                        margin: "16px 0 0", maxWidth: "50ch" }}>
              Une base vierge, vos barèmes, vos équipes, vos documents. Aucune
              donnée partagée avec qui que ce soit — chaque entreprise chez elle.
            </p>

            <div style={{ marginTop: 26, display: "grid", gap: 0 }}>
              {ETAPES.map((e, i) => (
                <div key={e.t} style={{ display: "flex", gap: 14,
                       padding: "14px 0",
                       borderTop: i ? `1px solid ${V.bord}` : "none" }}>
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700,
                                 color: V.route, flexShrink: 0, paddingTop: 2 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>
                      {e.t}
                    </span>
                    <span style={{ display: "block", fontSize: 13, color: V.muet,
                                   lineHeight: 1.5, marginTop: 3 }}>{e.d}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* La carte d'action : prix + départ. */}
          <div className="v-lever-2" style={{ justifySelf: "center",
                width: "min(380px, 100%)", alignSelf: "start",
                position: "sticky", top: 76 }}>
            <div className="v-carte" style={{ padding: 26, borderWidth: 2,
                  borderColor: V.route,
                  boxShadow: "0 24px 60px rgba(37,99,235,.14)" }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "baseline" }}>
                <span className="v-display" style={{ fontSize: 44 }}>
                  {ESSAI_JOURS} jours
                </span>
                <span style={{ fontSize: 12.5, color: V.muet }}>offerts</span>
              </div>
              <div style={{ fontSize: 12.5, color: V.muet, marginTop: 2,
                            lineHeight: 1.5 }}>
                Essai complet de l'offre {plan(ESSAI_PLAN)?.nom}, sans carte
                bancaire. Ensuite, à partir de{" "}
                <b style={{ color: V.encre }}>
                  {Math.round(PLANS[0].prix_centimes / 100)} € HTVA / mois
                </b>{" "}
                — {PLANS[0].utilisateurs} utilisateurs, puis{" "}
                {Math.round(plan("regular").prix_centimes / 100)} € pour{" "}
                {plan("regular").utilisateurs}.
              </div>

              <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none",
                           display: "grid", gap: 8 }}>
                {INCLUS.map((x) => (
                  <li key={x} style={{ display: "flex", gap: 9, fontSize: 13,
                                       lineHeight: 1.45 }}>
                    <span style={{ color: V.route, fontWeight: 800 }}>✓</span>{x}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 20 }}>
                <BoutonGoogle onClick={demarrer} texte="Créer ma société avec Google" />
              </div>
              {erreur && (
                <div style={{ fontSize: 12.5, color: "#DC2626", marginTop: 10 }}>
                  {erreur}
                </div>
              )}
              <div style={{ fontSize: 11.5, color: V.brume, marginTop: 12,
                            lineHeight: 1.5 }}>
                Après connexion, vous créez votre société en deux minutes.
                Déjà un compte ?{" "}
                <button onClick={() => aller("connexion")}
                        style={{ background: "none", border: "none", padding: 0,
                                 color: V.route, fontWeight: 700, cursor: "pointer",
                                 fontSize: 11.5 }}>
                  Connectez-vous
                </button>.
              </div>
            </div>
          </div>
        </section>

        {/* Réassurance métier */}
        <section style={{ maxWidth: 1080, margin: "0 auto",
                          padding: "clamp(30px, 5vw, 56px) 20px" }}>
          <div style={{ display: "grid", gap: 14,
                        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {[["Fait pour le métier", "Relevé par pièce, monte-meubles, suppléments piano ou cave : le vocabulaire du déménagement, pas un CRM déguisé."],
              ["Conforme d'origine", "Peppol pour le B2B, « Lu et approuvé » opposable pour les offres, conservation légale des factures : la conformité est dans l'outil."],
              ["Vos données, chez vous", "Cloisonnement par entreprise imposé au niveau de la base. Vos clients et vos marges ne sortent pas de chez vous."]].map(([t, d]) => (
              <div key={t} className="v-carte" style={{ padding: 20 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800 }}>{t}</div>
                <p style={{ fontSize: 13, color: V.muet, lineHeight: 1.55,
                            margin: "8px 0 0" }}>{d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PiedPublic aller={aller} />
    </div>
  );
}
