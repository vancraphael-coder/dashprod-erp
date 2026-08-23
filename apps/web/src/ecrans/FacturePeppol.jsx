// =============================================================================
// Section — Envoi de la facture par Peppol (facturation électronique B2B).
//
// L'obligation belge de facturation électronique structurée entre entreprises
// est en vigueur depuis le 1er janvier 2026. Cette section branche le moteur
// (déjà construit) sur l'interface : contrôle de joignabilité, envoi, journal.
//
// Elle est HONNÊTE sur l'état réel :
//   - sans contrat Digiteal configuré, l'envoi s'arrête à « prête » et le dit ;
//   - aucun statut n'est affiché comme délivré sans retour réel du réseau ;
//   - une facture incomplète pour Peppol est refusée AVANT l'envoi, avec la
//     liste de ce qui manque.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  peppolJoignable, peppolTransmettre, listerTransmissions,
} from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

const ETAT_LIB = {
  BROUILLON: "Brouillon", VALIDEE: "Validée", PRETE: "Prête à envoyer",
  SOUMISE: "Transmise au réseau", ACCEPTEE: "Acceptée",
  DELIVREE: "Délivrée au destinataire", REJETEE: "Rejetée", ECHEC: "Échec",
};
const ETAT_COULEUR = {
  DELIVREE: C.encreVert, ACCEPTEE: C.encreVert, SOUMISE: C.bleu,
  PRETE: C.ambre, REJETEE: C.rouge, ECHEC: C.rouge,
};

export default function FacturePeppol({ factureId, affaireId, emise }) {
  const [joign, setJoign] = useState(null);
  const [transmissions, setTransmissions] = useState([]);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState(null);
  const [erreur, setErreur] = useState(null);

  async function rafraichir() {
    setTransmissions(await listerTransmissions(factureId).catch(() => []));
  }
  useEffect(() => { if (emise) rafraichir(); }, [factureId, emise]);

  async function verifier() {
    setErreur(null); setMessage(null); setEnCours(true);
    try {
      const r = await peppolJoignable(factureId, affaireId);
      setJoign(r);
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  async function envoyer() {
    setErreur(null); setMessage(null); setEnCours(true);
    try {
      const r = await peppolTransmettre(factureId, affaireId);
      if (r.etat === "PRETE" && r.configure === false) {
        setMessage("Facture prête et conforme, mais aucun point d'accès Peppol "
          + "n'est configuré. Renseignez vos identifiants Digiteal dans "
          + "Paramètres → Facturation pour l'envoyer réellement.");
      } else if (r.etat === "ECHEC") {
        setErreur((r.erreurs?.length ? r.erreurs.join(" · ") : r.message)
          || "Envoi impossible.");
      } else if (r.etat === "SOUMISE") {
        setMessage("Facture transmise au point d'accès. Le sort final "
          + "(acceptée / délivrée) arrivera du réseau.");
      } else {
        setMessage(ETAT_LIB[r.etat] || "Envoyée.");
      }
      await rafraichir();
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  if (!emise) return null;

  return (
    <div style={S.carte}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.encre,
                    textTransform: "uppercase", letterSpacing: ".03em",
                    marginBottom: 8 }}>
        Facturation électronique (Peppol)
      </div>

      {joign && (
        <div style={{ fontSize: 12.5, marginBottom: 10, lineHeight: 1.5,
          color: joign.joignable ? C.encreVert : C.ambre }}>
          {joign.joignable
            ? "✓ Le client est joignable sur le réseau Peppol."
            : `⚠ ${joign.message || "Le client n'est pas joignable sur Peppol."}`}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ ...S.boutonLien, flex: 1, textAlign: "center",
                         border: `1.5px solid ${C.bord}`, borderRadius: 10,
                         padding: "10px" }}
                disabled={enCours} onClick={verifier}>
          Vérifier le client
        </button>
        <button style={{ ...S.boutonPlein, flex: 1 }}
                disabled={enCours} onClick={envoyer}>
          {enCours ? "…" : "Envoyer par Peppol"}
        </button>
      </div>

      {message && (
        <div style={{ fontSize: 12, color: C.encre, background: C.teinteBleue,
                      border: `1px solid ${C.bord}`, borderRadius: 10,
                      padding: "10px 12px", marginTop: 10, lineHeight: 1.5 }}>
          {message}
        </div>
      )}
      {erreur && (
        <div style={{ fontSize: 12, color: C.rouge, background: C.teinteRouge,
                      border: `1px solid ${C.filetRouge}`, borderRadius: 10,
                      padding: "10px 12px", marginTop: 10, lineHeight: 1.5 }}>
          {erreur}
        </div>
      )}

      {transmissions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.fantome,
                        textTransform: "uppercase", letterSpacing: ".04em",
                        marginBottom: 6 }}>
            Journal des transmissions
          </div>
          {transmissions.map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between",
                   alignItems: "center", gap: 10, padding: "8px 0",
                   borderTop: `1px solid ${C.doux}` }}>
              <span style={{ fontSize: 12, color: C.muet }}>
                {new Date(t.cree_le).toLocaleDateString("fr-BE")} · {t.canal}
                {t.erreur && (
                  <span style={{ display: "block", fontSize: 11, color: C.rouge,
                                 marginTop: 2 }}>{t.erreur}</span>
                )}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 700,
                             color: ETAT_COULEUR[t.etat] || C.muet }}>
                {ETAT_LIB[t.etat] || t.etat}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
