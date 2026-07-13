// =============================================================================
// Écran — Facture.
// Projection du module Facturation (S9) : compose une facture depuis l'affaire,
// l'émet (numéro légal via cmd_emettre_facture), enregistre les paiements et
// affiche le solde en direct (etatPaiement — C-24). Une facture émise est
// immuable : les corrections passeraient par une note de crédit (domaine prêt).
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  obtenirAffaire, lignesFacturePour, emettreFacture, obtenirFacture, enregistrerPaiement,
  obtenirOrganisation, obtenirContact, obtenirFacturePourAffaire,
} from "../lib/adaptateur.js";
import FactureDoc from "./FactureDoc.jsx";
import { composerTotal, etatPaiement } from "@domaine/facturation/facture.js";
import { C, S, euros } from "../lib/theme.jsx";

const STATUTS_UI = {
  a_payer: { libelle: "À payer", couleur: C.ambre },
  partiel: { libelle: "Partiel", couleur: C.bleu },
  paye: { libelle: "Payé", couleur: C.vert },
};

export default function Facture({ affaireId, factureExistanteId, retour }) {
  const [affaire, setAffaire] = useState(null);
  const [facture, setFacture] = useState(null);
  const [lignes, setLignes] = useState([]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  // Saisie de paiement
  const [montant, setMontant] = useState("");
  const [moyen, setMoyen] = useState("virement");
  const [org, setOrg] = useState(null);
  const [adresses, setAdresses] = useState(null);

  async function recharger() {
    setOrg(await obtenirOrganisation().catch(() => null));
    if (affaireId) {
      const a = await obtenirAffaire(affaireId);
      setAffaire(a);
      setLignes(await lignesFacturePour(affaireId));
      const c = await obtenirContact(affaireId).catch(() => null);
      if (c) setAdresses({
        date: c.date,
        charge: c.charges?.[0]?.adresse || "",
        decharge: c.decharges?.[0]?.adresse || "",
      });
      // Une facture existe-t-elle déjà pour cette affaire ? (retour sur le dossier)
      if (!facture) {
        const existante = await obtenirFacturePourAffaire(affaireId).catch(() => null);
        if (existante) setFacture(existante);
      }
    }
    if (factureExistanteId) {
      setFacture(await obtenirFacture(factureExistanteId));
    }
  }
  useEffect(() => { recharger(); }, [affaireId, factureExistanteId]);

  const totalPropose = useMemo(() => composerTotal(lignes), [lignes]);

  const solde = useMemo(() => {
    if (!facture) return null;
    return etatPaiement(facture.tvac_centimes, facture.paiements || []);
  }, [facture]);

  async function emettre() {
    setErreur(null); setEnCours(true);
    try {
      const { id } = await emettreFacture(affaireId, lignes);
      setFacture(await obtenirFacture(id));
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  async function ajouterPaiement() {
    const cents = Math.round(parseFloat(String(montant).replace(",", ".")) * 100);
    if (!cents) return;
    setEnCours(true);
    try {
      await enregistrerPaiement(facture.id, { montant_centimes: cents, moyen });
      setMontant("");
      setFacture(await obtenirFacture(facture.id));
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Vue 1 : composition + émission (pas encore de facture)
  // ─────────────────────────────────────────────────────────────────────────
  if (!facture) {
    return (
      <div style={S.page}>
        <div style={S.entete}>
          <button style={S.boutonLien} onClick={retour}>← Dossiers</button>
          <div style={S.titre}>Facturer — {affaire?.client?.nom || "…"}</div>
        </div>

        <div style={S.carte}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 8 }}>
            Lignes de la facture
          </div>
          {lignes.length === 0 && (
            <div style={{ fontSize: 13, color: C.muet }}>
              Cette affaire n'a pas encore de chiffrage — établissez le devis d'abord.
            </div>
          )}
          {lignes.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span style={{ fontSize: 13, color: C.encre }}>{l.libelle}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{euros(l.montant_htva_centimes)}</span>
            </div>
          ))}
          {lignes.length > 0 && (
            <div style={{ borderTop: `1px solid ${C.bord}`, marginTop: 8, paddingTop: 8 }}>
              <Ligne l="Total HTVA" v={euros(totalPropose.htva_centimes)} />
              <Ligne l="TVA 21 %" v={euros(totalPropose.tva_centimes)} />
              <Ligne l="Total TVAC" v={euros(totalPropose.tvac_centimes)} gras />
            </div>
          )}
        </div>

        {erreur && <div style={{ margin: "0 16px 10px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}
        <div style={{ margin: "0 16px" }}>
          <button style={{ ...S.boutonPlein, opacity: lignes.length ? 1 : 0.5 }}
                  disabled={!lignes.length || enCours} onClick={emettre}>
            {enCours ? "Émission…" : "Émettre la facture (numéro légal)"}
          </button>
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 8, textAlign: "center" }}>
            Une fois émise, la facture est immuable. Une correction se fait par note de crédit.
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Vue 2 : facture émise + suivi des paiements
  // ─────────────────────────────────────────────────────────────────────────
  const st = STATUTS_UI[solde?.statut] || STATUTS_UI.a_payer;
  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Dossiers</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={S.titre}>Facture {facture.numero}</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: st.couleur,
                         borderRadius: 999, padding: "3px 10px" }}>{st.libelle}</span>
        </div>
      </div>

      {/* Le document lui-même — imprimable seul (classe partagée avec le contrat) */}
      <FactureDoc facture={facture} organisation={org}
                  client={{ nom: facture.client || affaire?.client?.nom }}
                  adresses={adresses} />

      <div className="no-print" style={{ margin: "0 16px 12px" }}>
        <button style={{ ...S.boutonLien, width: "100%", textAlign: "center",
                          border: `1.5px solid ${C.bord}`, borderRadius: 11, padding: "11px" }}
                onClick={() => window.print()}>
          🖨️ Imprimer / Enregistrer en PDF
        </button>
      </div>

      <div style={S.carte}>
        <Ligne l="Total TVAC" v={euros(facture.tvac_centimes)} gras />
        <Ligne l="Déjà payé" v={euros(solde.paye_centimes)} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8,
                      paddingTop: 8, borderTop: `1px solid ${C.bord}` }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.encre }}>Solde</span>
          <span style={{ fontSize: 17, fontWeight: 800,
                         color: solde.solde_centimes <= 0 ? C.vert : C.ambre }}>
            {euros(solde.solde_centimes)}
          </span>
        </div>
      </div>

      {/* Historique des paiements */}
      {(facture.paiements || []).length > 0 && (
        <div style={S.carte}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muet, marginBottom: 6 }}>PAIEMENTS</div>
          {facture.paiements.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontSize: 12.5, color: C.muet }}>
                {p.date} · {p.moyen || "—"}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700,
                             color: p.montant_centimes < 0 ? C.rouge : C.encre }}>
                {euros(p.montant_centimes)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Enregistrer un paiement */}
      {solde.statut !== "paye" && (
        <div style={S.carte}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 4 }}>
            Enregistrer un paiement
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Montant (€)</label>
              <input style={S.input} inputMode="decimal" value={montant}
                     onChange={(e) => setMontant(e.target.value)} placeholder="300" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Moyen</label>
              <select style={S.input} value={moyen} onChange={(e) => setMoyen(e.target.value)}>
                <option value="virement">Virement</option>
                <option value="cash">Espèces</option>
              </select>
            </div>
          </div>
          <button style={{ ...S.boutonPlein, marginTop: 12 }} disabled={enCours || !montant}
                  onClick={ajouterPaiement}>
            Ajouter le paiement
          </button>
        </div>
      )}

      {solde.statut === "paye" && (
        <div style={{ ...S.carte, textAlign: "center" }}>
          <div style={{ fontSize: 28 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.vert, marginTop: 4 }}>
            Facture soldée
          </div>
        </div>
      )}
    </div>
  );
}

function Ligne({ l, v, gras }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ fontSize: 13, color: gras ? C.encre : C.muet, fontWeight: gras ? 800 : 500 }}>{l}</span>
      <span style={{ fontSize: gras ? 15 : 13.5, color: C.encre, fontWeight: gras ? 800 : 600 }}>{v}</span>
    </div>
  );
}
