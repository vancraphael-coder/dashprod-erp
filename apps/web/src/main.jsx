// =============================================================================
// Point d'entrée du shell applicatif — routage des écrans (S9).
// Flux d'accès (T3) : base branchée + pas de session → Connexion (email/mdp ou
// Google). Session Google fraîche → réclamation d'invitation (cmd_reclamer_
// invitation) : succès → profil chargé, capacités déterminent la navigation ;
// échec → écran Non invité (aucune auto-inscription libre). Base absente →
// MODE DÉMONSTRATION direct (bandeau visible, données locales).
// =============================================================================

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { sessionCourante, configPresente } from "./lib/supabase.js";
import { modeDonnees, reclamerInvitation, monProfil } from "./lib/adaptateur.js";
import Connexion from "./ecrans/Connexion.jsx";
import Diagnostic from "./ecrans/Diagnostic.jsx";
import NonInvite from "./ecrans/NonInvite.jsx";
import ListeAffaires from "./ecrans/ListeAffaires.jsx";
import NouvelleAffaire from "./ecrans/NouvelleAffaire.jsx";
import Devis from "./ecrans/Devis.jsx";
import Offre from "./ecrans/Offre.jsx";
import Releve from "./ecrans/Releve.jsx";
import Planning from "./ecrans/Planning.jsx";
import Equipe from "./ecrans/Equipe.jsx";

function BandeauDemo({ versDiagnostic }) {
  if (modeDonnees() !== "demo") return null;
  return (
    <div style={{
      background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600,
      textAlign: "center", padding: "7px 10px",
    }}>
      Mode démonstration — base non branchée, données locales.{" "}
      <button onClick={versDiagnostic} style={{
        background: "none", border: "none", color: "#fff", textDecoration: "underline",
        cursor: "pointer", fontSize: 12, fontWeight: 700,
      }}>Diagnostic</button>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [profil, setProfil] = useState(null);      // {org_id, nom, email, capacites}
  const [nonInvite, setNonInvite] = useState(null); // email refusé, ou null
  const [charge, setCharge] = useState(false);
  const [route, setRoute] = useState({ ecran: "liste", affaireId: null });

  useEffect(() => {
    sessionCourante().then(async (s) => {
      setSession(s);
      if (s && modeDonnees() === "reel") {
        try {
          await reclamerInvitation();          // idempotent : lie ou confirme le lien
          const p = await monProfil();
          if (!p) { setNonInvite(s.user?.email || "cet email"); }
          else setProfil(p);
        } catch (e) {
          setNonInvite(s.user?.email || "cet email");
        }
      }
      setCharge(true);
    });
  }, []);

  if (!charge) return null;

  // Base branchée mais pas de session : connexion obligatoire (T3).
  if (configPresente && !session) {
    return <Connexion onConnecte={() => window.location.reload()} />;
  }
  // Session Google sans invitation correspondante : refus propre.
  if (configPresente && nonInvite) {
    return <NonInvite email={nonInvite} />;
  }

  const capacites = profil?.capacites || [];
  const nav = {
    liste: () => setRoute({ ecran: "liste", affaireId: null }),
    nouvelle: () => setRoute({ ecran: "nouvelle", affaireId: null }),
    devis: (id) => setRoute({ ecran: "devis", affaireId: id }),
    offre: (id) => setRoute({ ecran: "offre", affaireId: id }),
    releve: (id) => setRoute({ ecran: "releve", affaireId: id }),
    planning: () => setRoute({ ecran: "planning", affaireId: null }),
    diagnostic: () => setRoute({ ecran: "diagnostic", affaireId: null }),
    equipe: () => setRoute({ ecran: "equipe", affaireId: null }),
  };

  let ecran;
  if (route.ecran === "diagnostic") {
    ecran = (
      <div>
        <Diagnostic />
        <div style={{ textAlign: "center", marginTop: -40, paddingBottom: 30 }}>
          <button onClick={nav.liste} style={{
            background: "none", border: "none", color: "#2563EB",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>← Retour aux dossiers</button>
        </div>
      </div>
    );
  } else if (route.ecran === "planning") {
    ecran = <Planning retour={nav.liste} />;
  } else if (route.ecran === "equipe") {
    ecran = <Equipe retour={nav.liste} />;
  } else if (route.ecran === "nouvelle") {
    ecran = <NouvelleAffaire retour={nav.liste} versDevis={nav.devis} />;
  } else if (route.ecran === "devis") {
    ecran = <Devis affaireId={route.affaireId} retour={nav.liste} versOffre={nav.offre} versReleve={nav.releve} />;
  } else if (route.ecran === "releve") {
    ecran = <Releve affaireId={route.affaireId} retour={nav.liste} versDevis={nav.devis} />;
  } else if (route.ecran === "offre") {
    ecran = <Offre affaireId={route.affaireId} retour={nav.liste} />;
  } else {
    ecran = (
      <ListeAffaires
        ouvrirAffaire={nav.devis} nouvelleAffaire={nav.nouvelle}
        peutGererEquipe={capacites.includes("gerer_referentiels")}
        ouvrirEquipe={nav.equipe}
        ouvrirPlanning={nav.planning}
      />
    );
  }

  return (
    <div>
      <BandeauDemo versDiagnostic={nav.diagnostic} />
      {ecran}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
