// =============================================================================
// Point d'entrée — routage des écrans (S9) + barre de navigation.
// Flux d'accès (T3) : base branchée sans session → Connexion ; session sans
// invitation → Non invité ; sinon l'app. Base absente → mode démonstration.
// Navigation : barre en bas (Dossiers · Planning · Équipe · Compte) sur les
// écrans racine ; les écrans d'un dossier reviennent au Dossier (hub).
// =============================================================================

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { sessionCourante, configPresente, deconnecter } from "./lib/supabase.js";
import { modeDonnees, reclamerInvitation, monProfil } from "./lib/adaptateur.js";
import { C } from "./lib/theme.jsx";
import Connexion from "./ecrans/Connexion.jsx";
import Diagnostic from "./ecrans/Diagnostic.jsx";
import NonInvite from "./ecrans/NonInvite.jsx";
import ListeAffaires from "./ecrans/ListeAffaires.jsx";
import NouvelleAffaire from "./ecrans/NouvelleAffaire.jsx";
import Dossier from "./ecrans/Dossier.jsx";
import Releve from "./ecrans/Releve.jsx";
import Devis from "./ecrans/Devis.jsx";
import Offre from "./ecrans/Offre.jsx";
import Facture from "./ecrans/Facture.jsx";
import Planning from "./ecrans/Planning.jsx";
import Ressources from "./ecrans/Ressources.jsx";

function BandeauDemo({ versDiagnostic }) {
  if (modeDonnees() !== "demo") return null;
  return (
    <div style={{ background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600,
                  textAlign: "center", padding: "7px 10px" }}>
      Mode démonstration — base non branchée, données locales.{" "}
      <button onClick={versDiagnostic} style={{ background: "none", border: "none",
        color: "#fff", textDecoration: "underline", cursor: "pointer",
        fontSize: 12, fontWeight: 700 }}>Diagnostic</button>
    </div>
  );
}

/** Barre de navigation inférieure — écrans racine uniquement. */
function BarreNav({ actif, aller, peutGererEquipe }) {
  const items = [
    ["liste", "📁", "Dossiers"],
    ["planning", "📅", "Planning"],
    ...(peutGererEquipe ? [["equipe", "🚛", "Ressources"]] : []),
    ["compte", "⚙️", "Compte"],
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
      display: "flex", background: "#fff", borderTop: `1px solid ${C.bord}`,
      maxWidth: 520, margin: "0 auto",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {items.map(([cle, icone, lib]) => (
        <button key={cle} onClick={() => aller(cle)} style={{
          flex: 1, padding: "9px 4px 7px", border: "none", background: "none",
          cursor: "pointer", color: actif === cle ? C.bleu : C.muet,
        }}>
          <div style={{ fontSize: 18 }}>{icone}</div>
          <div style={{ fontSize: 10.5, fontWeight: 700 }}>{lib}</div>
        </button>
      ))}
    </div>
  );
}

/** Écran Compte — identité, déconnexion, diagnostic. */
function Compte({ profil, versDiagnostic }) {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px 90px",
                  fontFamily: "system-ui, sans-serif" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.encre, marginBottom: 14 }}>Compte</div>
      <div style={{ background: "#fff", borderRadius: 14, padding: 16,
                    boxShadow: "0 2px 10px rgba(15,23,42,.06)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.encre }}>
          {profil?.nom || "—"}
        </div>
        <div style={{ fontSize: 13, color: C.muet }}>{profil?.email || ""}</div>
        {profil?.capacites && (
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 6 }}>
            {profil.capacites.length} capacités actives
          </div>
        )}
      </div>
      <button onClick={versDiagnostic} style={{ background: "none", border: "none",
        color: C.bleu, fontSize: 13, fontWeight: 600, cursor: "pointer",
        padding: "14px 2px 4px" }}>
        Diagnostic de branchement
      </button>
      {modeDonnees() === "reel" && (
        <button onClick={async () => { await deconnecter(); window.location.reload(); }}
          style={{ display: "block", width: "100%", marginTop: 14, padding: 13,
            border: "1.5px solid #FECACA", borderRadius: 11, background: "#FEF2F2",
            color: "#991B1B", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Se déconnecter
        </button>
      )}
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [profil, setProfil] = useState(null);
  const [nonInvite, setNonInvite] = useState(null);
  const [charge, setCharge] = useState(false);
  const [route, setRoute] = useState({ ecran: "liste", affaireId: null });

  useEffect(() => {
    sessionCourante().then(async (s) => {
      setSession(s);
      if (s && modeDonnees() === "reel") {
        try {
          await reclamerInvitation();
          const p = await monProfil();
          if (!p) setNonInvite(s.user?.email || "cet email");
          else setProfil(p);
        } catch (e) {
          setNonInvite(s.user?.email || "cet email");
        }
      }
      setCharge(true);
    });
  }, []);

  if (!charge) return null;
  if (configPresente && !session) {
    return <Connexion onConnecte={() => window.location.reload()} />;
  }
  if (configPresente && nonInvite) {
    return <NonInvite email={nonInvite} />;
  }

  const capacites = profil?.capacites || [];
  const peutGererEquipe = modeDonnees() === "demo" || capacites.includes("gerer_referentiels");
  const peutVoirPrix = modeDonnees() === "demo" || capacites.includes("voir_prix");
  const nav = {
    liste: () => setRoute({ ecran: "liste", affaireId: null }),
    nouvelle: () => setRoute({ ecran: "nouvelle", affaireId: null }),
    dossier: (id) => setRoute({ ecran: "dossier", affaireId: id }),
    releve: (id) => setRoute({ ecran: "releve", affaireId: id }),
    devis: (id) => setRoute({ ecran: "devis", affaireId: id }),
    offre: (id) => setRoute({ ecran: "offre", affaireId: id }),
    facture: (id) => setRoute({ ecran: "facture", affaireId: id }),
    planning: () => setRoute({ ecran: "planning", affaireId: null }),
    equipe: () => setRoute({ ecran: "equipe", affaireId: null }),
    compte: () => setRoute({ ecran: "compte", affaireId: null }),
    diagnostic: () => setRoute({ ecran: "diagnostic", affaireId: null }),
  };
  const retourDossier = () => nav.dossier(route.affaireId);

  const RACINES = ["liste", "planning", "equipe", "compte"];
  let ecran;
  if (route.ecran === "diagnostic") {
    ecran = (
      <div>
        <Diagnostic />
        <div style={{ textAlign: "center", marginTop: -40, paddingBottom: 30 }}>
          <button onClick={nav.liste} style={{ background: "none", border: "none",
            color: "#2563EB", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            ← Retour aux dossiers
          </button>
        </div>
      </div>
    );
  } else if (route.ecran === "compte") {
    ecran = <Compte profil={profil} versDiagnostic={nav.diagnostic} />;
  } else if (route.ecran === "equipe") {
    ecran = <Ressources />;
  } else if (route.ecran === "planning") {
    ecran = <Planning ouvrirDossier={nav.dossier} />;
  } else if (route.ecran === "nouvelle") {
    ecran = <NouvelleAffaire retour={nav.liste} versDevis={nav.dossier} />;
  } else if (route.ecran === "dossier") {
    ecran = <Dossier affaireId={route.affaireId} retour={nav.liste}
                     versReleve={nav.releve} versDevis={nav.devis}
                     versOffre={nav.offre} versFacture={nav.facture} />;
  } else if (route.ecran === "releve") {
    ecran = <Releve affaireId={route.affaireId} retour={retourDossier} versDevis={nav.devis} />;
  } else if (route.ecran === "devis") {
    ecran = <Devis affaireId={route.affaireId} retour={retourDossier}
                   versOffre={nav.offre} versReleve={nav.releve}
                   peutVoirPrix={peutVoirPrix} />;
  } else if (route.ecran === "offre") {
    ecran = <Offre affaireId={route.affaireId} retour={retourDossier} />;
  } else if (route.ecran === "facture") {
    ecran = <Facture affaireId={route.affaireId} retour={retourDossier} />;
  } else {
    ecran = <ListeAffaires ouvrirAffaire={nav.dossier} nouvelleAffaire={nav.nouvelle} />;
  }

  return (
    <div>
      <BandeauDemo versDiagnostic={nav.diagnostic} />
      {ecran}
      {RACINES.includes(route.ecran) && (
        <BarreNav actif={route.ecran} aller={(cle) => nav[cle]()}
                  peutGererEquipe={peutGererEquipe} />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
