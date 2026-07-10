// =============================================================================
// Écran — Équipe (invitations).
// Réservé à qui détient gerer_referentiels (S3) : le master invite un email et
// choisit son secteur — un rôle de la matrice S3, une seule vérité (ROLES,
// noyau/permissions.js). Résout la demande : « c'est lui qui décide qui est
// dans quel secteur de son entreprise ».
// =============================================================================

import React, { useEffect, useState } from "react";
import { listerMembres, inviterMembre } from "../lib/adaptateur.js";
import { ROLES } from "@domaine/noyau/permissions.js";
import { C, S } from "../lib/theme.jsx";

const LIBELLES_ROLE = {
  direction: "Direction", coordination: "Coordination", commercial: "Commercial",
  chef_equipe: "Chef d'équipe", demenageur: "Déménageur",
};

export default function Equipe({ retour }) {
  const [membres, setMembres] = useState([]);
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [role, setRole] = useState("demenageur");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);

  function recharger() { listerMembres().then(setMembres).catch(() => {}); }
  useEffect(recharger, []);

  async function inviter() {
    setErreur(null); setSucces(null); setEnCours(true);
    try {
      await inviterMembre({ email, nom, roleCle: role });
      setSucces(`${email} invité·e — secteur ${LIBELLES_ROLE[role]}.`);
      setEmail(""); setNom("");
      recharger();
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Dossiers</button>
        <div style={S.titre}>Équipe</div>
      </div>

      <div style={S.carte}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 4 }}>
          Inviter un membre
        </div>
        <div style={{ fontSize: 12, color: C.muet }}>
          Vous décidez du secteur : l'accès et les écrans s'adaptent automatiquement.
        </div>

        <label style={S.label}>Nom</label>
        <input style={S.input} value={nom} onChange={(e) => setNom(e.target.value)}
               placeholder="Jean Dupont" />
        <label style={S.label}>Email Google</label>
        <input style={S.input} type="email" value={email}
               onChange={(e) => setEmail(e.target.value)} placeholder="jean@gmail.com" />
        <label style={S.label}>Secteur</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.keys(ROLES).map((cle) => (
            <button key={cle} onClick={() => setRole(cle)} style={{
              padding: "7px 12px", borderRadius: 999, cursor: "pointer",
              border: `1.5px solid ${role === cle ? C.bleu : C.bord}`,
              background: role === cle ? "#E7EFFC" : C.blanc,
              color: role === cle ? C.bleu : C.muet, fontSize: 12, fontWeight: 600,
            }}>{LIBELLES_ROLE[cle] || cle}</button>
          ))}
        </div>

        {erreur && (
          <div style={{ marginTop: 12, padding: "9px 12px", background: "#FEF2F2",
                        border: "1px solid #FECACA", borderRadius: 9, color: "#991B1B",
                        fontSize: 12.5 }}>{erreur}</div>
        )}
        {succes && (
          <div style={{ marginTop: 12, padding: "9px 12px", background: "#ECFDF5",
                        border: "1px solid #A7F3D0", borderRadius: 9, color: "#065F46",
                        fontSize: 12.5 }}>{succes}</div>
        )}

        <button style={{ ...S.boutonPlein, marginTop: 14 }} disabled={!email || enCours}
                onClick={inviter}>
          {enCours ? "Invitation…" : "Inviter"}
        </button>
      </div>

      <div style={{ padding: "0 16px 8px", fontSize: 12, fontWeight: 700, color: C.muet }}>
        MEMBRES ({membres.length})
      </div>
      {membres.map((m) => (
        <div key={m.id} style={{ ...S.carte, padding: 12, display: "flex",
                                  justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.encre }}>{m.nom || m.email}</div>
            <div style={{ fontSize: 12, color: C.muet }}>{m.email}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {m.roles.length === 0 && (
              <span style={{ fontSize: 11, color: C.rouge }}>en attente</span>
            )}
            {m.roles.map((r) => (
              <span key={r} style={{ fontSize: 10.5, fontWeight: 700, color: C.bleu,
                background: "#E7EFFC", borderRadius: 999, padding: "3px 8px" }}>
                {LIBELLES_ROLE[r] || r}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
