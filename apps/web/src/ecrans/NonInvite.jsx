// =============================================================================
// Écran — Non invité.
// Refus propre quand l'email Google connecté n'a pas d'invitation en attente
// (cmd_reclamer_invitation a échoué). L'accès se fait uniquement sur invitation
// du master — jamais d'auto-inscription libre.
// =============================================================================

import React from "react";
import { deconnecter } from "../lib/supabase.js";
import { C, S } from "../lib/theme.jsx";

export default function NonInvite({ email }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center",
                  background: C.fond, fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <div style={{ ...S.carte, margin: 0, maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 6 }}>✉️</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.encre }}>
          Aucune invitation trouvée
        </div>
        <div style={{ fontSize: 13, color: C.muet, marginTop: 8, lineHeight: 1.6 }}>
          L'adresse <b style={{ color: C.encre }}>{email}</b> n'a pas encore été
          invitée sur Dashprod. Demandez à votre administrateur de vous ajouter,
          puis reconnectez-vous.
        </div>
        <button style={{ ...S.boutonPlein, marginTop: 20 }} onClick={() => deconnecter()}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
