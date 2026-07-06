// =============================================================================
// Écran de diagnostic — état du branchement (Réf. 3 · T10 : observabilité).
// Affiche l'état de configuration et le résultat du test de vie de la base.
// C'est l'écran qui confirme, visuellement, que Vercel + Supabase sont branchés.
// =============================================================================

import React, { useEffect, useState } from "react";
import { configPresente, testerConnexion } from "../lib/supabase.js";

export default function Diagnostic() {
  const [etat, setEtat] = useState({ ok: null, message: "Vérification…" });

  useEffect(() => {
    testerConnexion().then(setEtat);
  }, []);

  const pastille = etat.ok === null ? "#94A3B8" : etat.ok ? "#059669" : "#DC2626";

  return (
    <div style={S.wrap}>
      <div style={S.carte}>
        <div style={S.titre}>Dashprod ERP — diagnostic</div>

        <Ligne label="Variables d'environnement"
               valeur={configPresente ? "présentes" : "absentes"}
               ok={configPresente} />
        <Ligne label="Base de données"
               valeur={etat.message}
               ok={etat.ok} pastille={pastille} />
        {etat.organisation && (
          <Ligne label="Organisation visible" valeur={etat.organisation.nom} ok />
        )}

        <div style={S.aide}>
          {configPresente
            ? "Le shell est branché. La connexion et les modules s'activent au fil de leur livraison."
            : "Renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel, puis redéploie."}
        </div>
      </div>
    </div>
  );
}

function Ligne({ label, valeur, ok, pastille }) {
  const couleur = pastille ?? (ok ? "#059669" : "#DC2626");
  return (
    <div style={S.ligne}>
      <span style={{ ...S.point, background: couleur }} />
      <span style={S.label}>{label}</span>
      <span style={S.valeur}>{valeur}</span>
    </div>
  );
}

const ENCRE = "#0F172A", MUET = "#64748B", BORD = "#DCE4F0";
const S = {
  wrap: { minHeight: "100vh", display: "grid", placeItems: "center",
          background: "#F1F5FB", fontFamily: "system-ui, sans-serif", padding: 16 },
  carte: { width: "100%", maxWidth: 440, background: "#fff", borderRadius: 16,
           padding: "26px 24px", boxShadow: "0 8px 30px rgba(15,23,42,.08)" },
  titre: { fontSize: 17, fontWeight: 800, color: ENCRE, marginBottom: 18 },
  ligne: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
           borderTop: `1px solid ${BORD}` },
  point: { width: 9, height: 9, borderRadius: "50%", flex: "0 0 auto" },
  label: { fontSize: 13, fontWeight: 600, color: ENCRE, flex: "0 0 auto", minWidth: 170 },
  valeur: { fontSize: 12.5, color: MUET, wordBreak: "break-word" },
  aide: { marginTop: 16, fontSize: 12, color: MUET, lineHeight: 1.55 },
};
