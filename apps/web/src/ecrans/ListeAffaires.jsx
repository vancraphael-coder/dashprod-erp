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
import { regrouperParHorizon, compteurUrgent } from "@domaine/crm/horizons.js";
import { C, S, Badge, ZONES_MARGE, ETATS_UI, euros } from "../lib/theme.jsx";

// Le cycle ENTIER est filtrable : sans « facturé / payé / clos », la fin de
// parcours était invisible depuis la liste ; sans « reporté / annulé », les
// désistements aussi. La barre défile horizontalement sur mobile.
// « À s'occuper » est le mode par DÉFAUT : c'est la question qu'on se pose en
// ouvrant l'écran le matin. « Tous » reste accessible pour retrouver un vieux
// dossier. Les états « facture » et « paye » ont disparu de la liste : depuis
// la séparation des cycles (0064), ce ne sont plus des états du déménagement —
// les proposer en filtre ne rendait jamais aucun résultat.
const FILTRES = ["a_soccuper", "tous", "devis", "envoye", "confirme", "planifie",
                 "en_cours", "effectue", "clos", "reporte", "annule"];
const LIBELLES_FILTRE = { a_soccuper: "À s'occuper", tous: "Tous" };

export default function ListeAffaires({ ouvrirAffaire, nouvelleAffaire }) {
  const [affaires, setAffaires] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("a_soccuper");

  useEffect(() => { listerAffaires().then(setAffaires); }, []);

  const visibles = useMemo(() => affaires
    .filter((a) => filtre === "tous" || filtre === "a_soccuper" || a.etat === filtre)
    .filter((a) => !recherche ||
      (a.client?.nom || "").toLowerCase().includes(recherche.toLowerCase())),
  [affaires, recherche, filtre]);

  // Regroupement par horizon : en retard / aujourd'hui / demain / cette
  // semaine / semaines nommées / mois. Une liste plate ne dit pas ce qui presse.
  const groupes = useMemo(() => regrouperParHorizon(visibles, {
    // En mode « à s'occuper », les dossiers terminés sortent d'eux-mêmes.
    // Sur un filtre d'état précis, on montre ce qui est demandé.
    seulementActifs: filtre === "a_soccuper",
  }), [visibles, filtre]);

  const urgent = useMemo(() => compteurUrgent(affaires), [affaires]);

  // CA signé : le module Pilotage, pas un calcul local (une seule implémentation).
  const ca = useMemo(() => caSigne(
    affaires.map((a) => ({ etat: a.etat, tvac_centimes: a.tvac_centimes || 0 }))
  ), [affaires]);

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={S.titre}>Dossiers</div>
          <div style={{ fontSize: 12.5, color: C.muet }}>
            {urgent.total > 0 ? (
              <span style={{ color: urgent.retard > 0 ? C.rouge : C.bleu,
                             fontWeight: 700 }}>
                {urgent.retard > 0 && `${urgent.retard} en retard`}
                {urgent.retard > 0 && urgent.aujourdhui > 0 && " · "}
                {urgent.aujourdhui > 0 && `${urgent.aujourdhui} aujourd'hui`}
              </span>
            ) : (
              <>CA signé&nbsp;<b style={{ color: C.encre }}>{euros(ca)}</b></>
            )}
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
              {LIBELLES_FILTRE[f] || ETATS_UI[f]?.libelle || f}
            </button>
          ))}
        </div>
      </div>

      {groupes.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13,
                      lineHeight: 1.5 }}>
          {filtre === "a_soccuper"
            ? "Rien à traiter. Tous vos dossiers sont à jour."
            : "Aucun dossier — le bouton « + » en crée un."}
        </div>
      )}

      {groupes.map((g) => (
        <div key={g.cle}>
          {/* L'en-tête d'horizon. Le retard se signale : c'est ce qui coûte. */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8,
                        padding: "12px 20px 6px" }}>
            <span style={{ fontSize: 12, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: ".05em",
              color: g.cle === "retard" ? C.rouge
                   : g.cle === "aujourdhui" ? C.bleu : C.fantome }}>
              {g.titre}
            </span>
            <span style={{ fontSize: 11.5, color: C.fantome }}>
              {g.dossiers.length}
            </span>
          </div>
          {g.dossiers.map((a) => (
        <div key={a.id} style={{ ...S.carte, cursor: "pointer" }} onClick={() => ouvrirAffaire(a.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.encre }}>
              {a.client?.nom || "Client inconnu"}
            </div>
            {a.etat === "brouillon" && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6D28D9",
                  background: "#F5F3FF", borderRadius: 999, padding: "2px 7px", marginRight: 4 }}>
                  à valider
                </span>
              )}
              <Badge etat={a.etat} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ fontSize: 12.5,
                          color: a.date_souhaitee ? C.encre : C.muet,
                          fontWeight: a.date_souhaitee ? 600 : 400 }}>
              {a.date_souhaitee
                ? "📅 " + new Date(a.date_souhaitee + "T00:00:00")
                    .toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" })
                : "Date à définir"}
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

        </div>
          ))}
        </div>
      ))}

      <button style={S.flottant} onClick={nouvelleAffaire} aria-label="Nouveau dossier">+</button>
    </div>
  );
}
