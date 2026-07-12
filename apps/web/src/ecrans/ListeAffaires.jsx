// =============================================================================
// Écran — Liste des dossiers.
// Projection du CRM et du Pilotage (S9) : cartes d'affaires avec statut et
// marge colorée, CA signé calculé par le module Pilotage (caSigne), recherche
// et filtre de statut cumulables.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { listerAffaires } from "../lib/adaptateur.js";
import { caSigne } from "@domaine/pilotage/finances.js";
import { zoneMarge } from "@domaine/chiffrage/moteur.js";
import { C, S, Badge, ZONES_MARGE, ETATS_UI, euros } from "../lib/theme.jsx";

const FILTRES = ["tous", "devis", "confirme", "en_cours", "effectue"];

export default function ListeAffaires({ ouvrirAffaire, nouvelleAffaire, peutGererEquipe, ouvrirEquipe, ouvrirPlanning, ouvrirFacture }) {
  const [affaires, setAffaires] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("tous");

  useEffect(() => { listerAffaires().then(setAffaires); }, []);

  const visibles = useMemo(() => affaires
    .filter((a) => filtre === "tous" || a.etat === filtre)
    .filter((a) => !recherche ||
      (a.client?.nom || "").toLowerCase().includes(recherche.toLowerCase())),
  [affaires, recherche, filtre]);

  // CA signé : le module Pilotage, pas un calcul local (une seule implémentation).
  const ca = useMemo(() => caSigne(
    affaires.map((a) => ({ etat: a.etat, tvac_centimes: a.tvac_centimes || 0 }))
  ), [affaires]);

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={S.titre}>Dossiers</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {ouvrirPlanning && (
              <button style={S.boutonLien} onClick={ouvrirPlanning}>Planning</button>
            )}
            {peutGererEquipe && (
              <button style={S.boutonLien} onClick={ouvrirEquipe}>Équipe</button>
            )}
            <div style={{ fontSize: 12.5, color: C.muet }}>
              CA signé&nbsp;
              <b style={{ color: C.encre }}>{euros(ca)}</b>
            </div>
          </div>
        </div>
        <input
          style={{ ...S.input, marginTop: 10 }} placeholder="Rechercher un client…"
          value={recherche} onChange={(e) => setRecherche(e.target.value)}
        />
        <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 4 }}>
          {FILTRES.map((f) => (
            <button key={f} onClick={() => setFiltre(f)} style={{
              border: `1.5px solid ${filtre === f ? C.bleu : C.bord}`,
              background: filtre === f ? "#E7EFFC" : C.blanc,
              color: filtre === f ? C.bleu : C.muet,
              borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 600,
              cursor: "pointer", whiteSpace: "nowrap",
            }}>
              {f === "tous" ? "Tous" : (ETATS_UI[f]?.libelle || f)}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Aucun dossier — le bouton « + » en crée un.
        </div>
      )}

      {visibles.map((a) => (
        <div key={a.id} style={{ ...S.carte, cursor: "pointer" }} onClick={() => ouvrirAffaire(a.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.encre }}>
              {a.client?.nom || "Client inconnu"}
            </div>
            <Badge etat={a.etat} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ fontSize: 12.5, color: C.muet }}>
              {a.client?.tel || "—"} · créé le {a.creeLe || "—"}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.encre }}>
                {a.tvac_centimes != null ? euros(a.tvac_centimes) : "à chiffrer"}
              </div>
              {a.marge_pct != null && (
                <div style={{
                  fontSize: 11.5, fontWeight: 700,
                  color: ZONES_MARGE[zoneMarge(a.marge_pct)],
                }}>
                  marge {a.marge_pct} %
                </div>
              )}
            </div>
          </div>
          {ouvrirFacture && ["effectue", "confirme", "facture", "paye"].includes(a.etat) && (
            <button
              onClick={(e) => { e.stopPropagation(); ouvrirFacture(a.id); }}
              style={{ ...S.boutonLien, marginTop: 8, border: `1.5px solid ${C.bord}`,
                       borderRadius: 9, padding: "6px 12px", width: "100%", textAlign: "center" }}>
              {a.etat === "facture" || a.etat === "paye" ? "Voir la facture" : "Facturer →"}
            </button>
          )}
        </div>
      ))}

      <button style={S.flottant} onClick={nouvelleAffaire} aria-label="Nouveau dossier">+</button>
    </div>
  );
}
