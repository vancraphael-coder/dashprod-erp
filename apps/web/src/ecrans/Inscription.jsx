// =============================================================================
// Écran — Créer ma société (inscription autonome).
//
// S'affiche après authentification Google quand le compte n'appartient à
// AUCUNE société. C'est le point d'entrée d'un nouveau déménageur : il arrive
// par la landing, se connecte, crée son entreprise, et repart avec une base
// vierge à lui.
//
// Le garde-fou n'est pas dans cet écran, il est en base : cmd_creer_ma_societe()
// refuse si le compte appartient déjà à une société. Un même compte ne peut
// donc pas créer d'entreprises en série.
//
// Cet écran remplace l'ancien « NonInvite » quand personne n'a invité la
// personne : au lieu d'une impasse, une porte d'entrée.
// =============================================================================

import React, { useState } from "react";
import { creerMaSociete } from "../lib/adaptateur.js";
import { deconnecter } from "../lib/supabase.js";
import { tvaBelgeValide } from "@domaine/organisation/identite.js";
import { C, S } from "../lib/theme.jsx";

export default function Inscription({ email, onCreee }) {
  const [f, setF] = useState({ nom: "", nomAdmin: "", bce: "", tva: "", tel: "" });
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  const tvaOk = tvaBelgeValide(f.tva);
  const pret = f.nom.trim().length > 1 && tvaOk;

  async function creer() {
    setErreur(null); setEnCours(true);
    try {
      await creerMaSociete(f);
      onCreee();
    } catch (e) {
      setErreur(e.message || "Création refusée");
      setEnCours(false);
    }
  }

  return (
    <div style={{ ...S.page, paddingBottom: 60 }}>
      <div style={{ padding: "34px 20px 6px", maxWidth: 520, margin: "0 auto" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.bleu }}>Bienvenue sur Dashprod</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 8px",
                     letterSpacing: "-.02em", lineHeight: 1.15 }}>
          Créez votre société de déménagement.
        </h1>
        <p style={{ fontSize: 14.5, color: C.muet, lineHeight: 1.55, margin: 0 }}>
          Vous démarrez sur une base vierge, rien que la vôtre. Aucun client,
          aucun dossier, aucune donnée d'une autre entreprise.
        </p>
        <div style={{ fontSize: 12, color: C.fantome, marginTop: 10 }}>
          Compte : <b style={{ color: C.encre }}>{email}</b>
        </div>
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>
          Nom de la société <span style={{ color: C.rouge }}>*</span>
        </label>
        <input style={S.input} value={f.nom} autoFocus
               placeholder="Déménagements Dupont SRL"
               onChange={(e) => setF((x) => ({ ...x, nom: e.target.value }))} />

        <label style={S.label}>Votre nom</label>
        <input style={S.input} value={f.nomAdmin} placeholder="Jean Dupont"
               onChange={(e) => setF((x) => ({ ...x, nomAdmin: e.target.value }))} />

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Numéro d'entreprise</label>
            <input style={S.input} value={f.bce} placeholder="BE 0123.456.789"
                   onChange={(e) => setF((x) => ({ ...x, bce: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>TVA</label>
            <input style={{ ...S.input, borderColor: tvaOk ? undefined : C.rouge }}
                   value={f.tva} placeholder="BE0123456789"
                   onChange={(e) => setF((x) => ({ ...x, tva: e.target.value }))} />
          </div>
        </div>
        {!tvaOk && (
          <div style={{ fontSize: 11.5, color: C.rouge, marginTop: 3 }}>
            Format attendu : BE suivi de 10 chiffres.
          </div>
        )}

        <label style={S.label}>Téléphone</label>
        <input style={S.input} value={f.tel} placeholder="0470 00 00 00"
               onChange={(e) => setF((x) => ({ ...x, tel: e.target.value }))} />

        <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 10, lineHeight: 1.5 }}>
          Vous compléterez adresse, IBAN et barème juste après, dans Paramètres.
          Ces informations alimenteront ensuite tous vos devis et factures.
        </div>

        {erreur && (
          <div style={{ fontSize: 12.5, color: C.rouge, background: "#FEF2F2",
                        border: "1px solid #FECACA", borderRadius: 10,
                        padding: "10px 12px", marginTop: 10, lineHeight: 1.5 }}>
            {erreur}
          </div>
        )}

        <button style={{ ...S.boutonPlein, marginTop: 12, opacity: pret ? 1 : .5 }}
                disabled={!pret || enCours} onClick={creer}>
          {enCours ? "Création…" : "Créer ma société"}
        </button>
      </div>

      <div style={{ margin: "0 16px", textAlign: "center" }}>
        <button onClick={async () => { await deconnecter(); window.location.reload(); }}
                style={{ background: "none", border: "none", color: C.muet,
                         fontSize: 12.5, cursor: "pointer", padding: 10 }}>
          Ce n'est pas votre compte ? Se déconnecter
        </button>
      </div>
    </div>
  );
}
