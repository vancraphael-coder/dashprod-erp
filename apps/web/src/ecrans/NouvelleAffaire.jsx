// =============================================================================
// Écran — Nouveau dossier.
// Projection du CRM (S9) : à la saisie, la reconnaissance du client existant
// (trouverDoublon, C-01) propose la fiche — correspondance forte (téléphone)
// ou faible (nom). Le client n'est jamais ressaisi deux fois.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { listerClients, creerAffaire } from "../lib/adaptateur.js";
import { trouverDoublon } from "@domaine/crm/clients.js";
import { C, S } from "../lib/theme.jsx";

export default function NouvelleAffaire({ retour, versDevis }) {
  const [clients, setClients] = useState([]);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [email, setEmail] = useState("");
  const [clientRetenu, setClientRetenu] = useState(null); // fiche existante choisie
  const [enCours, setEnCours] = useState(false);

  useEffect(() => { listerClients().then(setClients); }, []);

  // Reconnaissance en direct — le module CRM, pas une devinette locale.
  const doublon = useMemo(() => {
    if (clientRetenu) return null;
    if (!nom && !tel) return null;
    return trouverDoublon({ nom, tel }, clients);
  }, [nom, tel, clients, clientRetenu]);

  async function creer() {
    setEnCours(true);
    const id = await creerAffaire(clientRetenu
      ? { clientId: clientRetenu.id }
      : { clientNom: nom, tel, email });
    setEnCours(false);
    versDevis(id);
  }

  const pret = clientRetenu || nom.trim().length > 1;

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Dossiers</button>
        <div style={S.titre}>Nouveau dossier</div>
      </div>

      <div style={S.carte}>
        {clientRetenu ? (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.vert }}>CLIENT EXISTANT</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.encre, marginTop: 4 }}>
              {clientRetenu.nom}
            </div>
            <div style={{ fontSize: 13, color: C.muet }}>{clientRetenu.tel || "—"}</div>
            <button style={{ ...S.boutonLien, paddingLeft: 0 }}
                    onClick={() => setClientRetenu(null)}>
              Changer / saisir un autre client
            </button>
          </div>
        ) : (
          <div>
            <label style={S.label}>Nom du client</label>
            <input style={S.input} value={nom} onChange={(e) => setNom(e.target.value)}
                   placeholder="Famille Dupont" />
            <label style={S.label}>Téléphone</label>
            <input style={S.input} value={tel} onChange={(e) => setTel(e.target.value)}
                   placeholder="0470 00 00 00" inputMode="tel" />
            <label style={S.label}>Email</label>
            <input style={S.input} value={email} onChange={(e) => setEmail(e.target.value)}
                   placeholder="client@exemple.be" inputMode="email" />

            {doublon && (
              <div style={{
                marginTop: 14, padding: "11px 12px", borderRadius: 10,
                background: doublon.confiance === "forte" ? "#ECFDF5" : "#FFFBEB",
                border: `1px solid ${doublon.confiance === "forte" ? "#A7F3D0" : "#FDE68A"}`,
              }}>
                <div style={{ fontSize: 12.5, color: C.encre }}>
                  {doublon.confiance === "forte"
                    ? "Ce téléphone correspond à un client existant :"
                    : "Un client porte déjà ce nom :"}
                  {" "}<b>{doublon.client.nom}</b>
                </div>
                <button style={{ ...S.boutonLien, paddingLeft: 0 }}
                        onClick={() => setClientRetenu(doublon.client)}>
                  Utiliser sa fiche (recommandé)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ margin: "0 16px" }}>
        <button style={{ ...S.boutonPlein, opacity: pret ? 1 : 0.5 }}
                disabled={!pret || enCours} onClick={creer}>
          {enCours ? "Création…" : "Créer le dossier →"}
        </button>
      </div>
    </div>
  );
}
