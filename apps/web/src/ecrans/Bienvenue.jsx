// =============================================================================
// Écran d'accueil d'une organisation neuve.
//
// S'affiche quand l'entreprise n'est pas encore prête à produire des documents
// (identiteComplete(org).pretDocuments == false). Il guide l'admin vers la
// configuration UNE fois, dans l'ordre, puis s'efface définitivement.
//
// C'est la pièce qui matérialise le critère de fin : configurer une seule fois,
// puis produire — sans reconfiguration ailleurs.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { obtenirOrganisation } from "../lib/adaptateur.js";
import { identiteComplete } from "@domaine/organisation/identite.js";
import { C, S } from "../lib/theme.jsx";

export default function Bienvenue({ profil, versIdentite, versApp }) {
  const [org, setOrg] = useState(null);

  useEffect(() => { obtenirOrganisation().then(setOrg).catch(() => setOrg({})); }, []);
  const etat = useMemo(() => identiteComplete(org || {}), [org]);

  if (org === null) return null;

  const etapes = [
    { fait: etat.pretDocuments, titre: "Compléter l'identité de l'entreprise",
      detail: "Nom, TVA, adresse, IBAN — repris automatiquement sur tous vos documents.",
      action: versIdentite, cta: "Compléter" },
    { fait: false, titre: "Vérifier votre barème et vos coûts",
      detail: "Prix client et coûts internes. Réglés une fois, appliqués à chaque devis.",
      action: versIdentite, cta: null },
    { fait: false, titre: "Créer votre premier client",
      detail: "Puis un devis : il héritera de tout, sans rien redemander.",
      action: versApp, cta: null },
  ];

  return (
    <div style={{ ...S.page, paddingTop: 8 }}>
      <div style={{ padding: "28px 20px 10px", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.bleu }}>Bienvenue</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 8px",
                     letterSpacing: "-.02em" }}>
          {profil?.nom ? `${profil.nom}, ` : ""}mettons votre entreprise en route.
        </h1>
        <p style={{ fontSize: 14.5, color: C.muet, lineHeight: 1.55, margin: 0 }}>
          Une seule configuration à faire. Ensuite, vos devis et factures reprennent
          ces informations tout seuls.
        </p>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "12px 16px 30px" }}>
        {etapes.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 14, padding: 16, marginTop: 12,
                                borderRadius: 14, background: C.blanc,
                                border: `1px solid ${e.fait ? "#A7F3D0" : C.bord}`,
                                boxShadow: "0 1px 3px rgba(15,23,42,.05)" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                          display: "grid", placeItems: "center", fontSize: 14,
                          fontWeight: 800, color: "#fff",
                          background: e.fait ? "#10B981" : C.bleu }}>
              {e.fait ? "✓" : i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700,
                            color: e.fait ? C.fantome : C.encre,
                            textDecoration: e.fait ? "line-through" : "none" }}>
                {e.titre}
              </div>
              <div style={{ fontSize: 12.5, color: C.muet, marginTop: 3, lineHeight: 1.5 }}>
                {e.detail}
              </div>
              {e.cta && !e.fait && (
                <button onClick={e.action} style={{ ...S.boutonPlein, marginTop: 10,
                  width: "auto", padding: "9px 18px" }}>{e.cta}</button>
              )}
            </div>
          </div>
        ))}

        <button onClick={versApp} style={{ ...S.boutonLien, display: "block",
          width: "100%", marginTop: 18, fontWeight: 600 }}>
          {etat.pretDocuments ? "Entrer dans Dashprod →" : "Explorer d'abord, configurer plus tard"}
        </button>
      </div>
    </div>
  );
}
