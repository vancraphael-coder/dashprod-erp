// =============================================================================
// Point d'entrée du shell applicatif — routage des écrans (S9).
// Règle d'accès : base branchée → connexion (T3) puis écrans ; base absente →
// MODE DÉMONSTRATION direct (bandeau visible, données locales) pour voir et
// manipuler le produit sans attendre le branchement. Aucun react-router : un
// routage d'état minimal suffit à ce stade.
// =============================================================================

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { sessionCourante, configPresente } from "./lib/supabase.js";
import { modeDonnees } from "./lib/adaptateur.js";
import Connexion from "./ecrans/Connexion.jsx";
import Diagnostic from "./ecrans/Diagnostic.jsx";
import ListeAffaires from "./ecrans/ListeAffaires.jsx";
import NouvelleAffaire from "./ecrans/NouvelleAffaire.jsx";
import Devis from "./ecrans/Devis.jsx";

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
  const [charge, setCharge] = useState(false);
  const [route, setRoute] = useState({ ecran: "liste", affaireId: null });

  useEffect(() => {
    sessionCourante().then((s) => { setSession(s); setCharge(true); });
  }, []);

  if (!charge) return null;

  // Base branchée mais pas de session : connexion obligatoire (T3).
  if (configPresente && !session) {
    return <Connexion onConnecte={() => sessionCourante().then(setSession)} />;
  }

  const nav = {
    liste: () => setRoute({ ecran: "liste", affaireId: null }),
    nouvelle: () => setRoute({ ecran: "nouvelle", affaireId: null }),
    devis: (id) => setRoute({ ecran: "devis", affaireId: id }),
    diagnostic: () => setRoute({ ecran: "diagnostic", affaireId: null }),
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
  } else if (route.ecran === "nouvelle") {
    ecran = <NouvelleAffaire retour={nav.liste} versDevis={nav.devis} />;
  } else if (route.ecran === "devis") {
    ecran = <Devis affaireId={route.affaireId} retour={nav.liste} />;
  } else {
    ecran = <ListeAffaires ouvrirAffaire={nav.devis} nouvelleAffaire={nav.nouvelle} />;
  }

  return (
    <div>
      <BandeauDemo versDiagnostic={nav.diagnostic} />
      {ecran}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
