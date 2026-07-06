// =============================================================================
// Point d'entrée du shell applicatif.
// Tant que les modules d'interface ne sont pas livrés, le shell affiche l'écran
// de connexion (Réf. 3 · T3) et un diagnostic de branchement. Chaque module
// métier viendra se projeter ici selon les capacités de l'utilisateur (S9).
// =============================================================================

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { sessionCourante, configPresente } from "./lib/supabase.js";
import Connexion from "./ecrans/Connexion.jsx";
import Diagnostic from "./ecrans/Diagnostic.jsx";

function App() {
  const [session, setSession] = useState(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    sessionCourante().then((s) => { setSession(s); setCharge(true); });
  }, []);

  if (!charge) return null;

  // Connecté → diagnostic (les tableaux de bord par rôle arrivent avec les
  // modules d'interface). Non connecté → écran de connexion.
  if (session) return <Diagnostic />;
  return <Connexion onConnecte={() => sessionCourante().then(setSession)} />;
}

createRoot(document.getElementById("root")).render(<App />);
