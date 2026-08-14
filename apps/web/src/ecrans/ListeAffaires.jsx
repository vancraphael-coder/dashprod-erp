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
import { VUES, filtrerParVue, compteursVues, urgencesVues } from "@domaine/crm/vues-dossiers.js";
import MenuCreation from "../composants/MenuCreation.jsx";
import { C, S, Badge, ZONES_MARGE, ETATS_UI, euros } from "../lib/theme.jsx";

// Le cycle ENTIER est filtrable : sans « facturé / payé / clos », la fin de
// parcours était invisible depuis la liste ; sans « reporté / annulé », les
// désistements aussi. La barre défile horizontalement sur mobile.
// « À s'occuper » est le mode par DÉFAUT : c'est la question qu'on se pose en
// ouvrant l'écran le matin. « Tous » reste accessible pour retrouver un vieux
// dossier. Les états « facture » et « paye » ont disparu de la liste : depuis
// la séparation des cycles (0064), ce ne sont plus des états du déménagement —
// les proposer en filtre ne rendait jamais aucun résultat.
// La barre de tri ne s'aligne plus état par état : elle propose quelques VUES
// larges (À traiter · À planifier · Sur le terrain · À clôturer · Tous), chacune
// avec son compteur. On retrouve d'un coup d'œil où est la charge. Les vues
// vivent dans le domaine (crm/vues-dossiers), testées.

export default function ListeAffaires({ ouvrirAffaire, nouvelleAffaire }) {
  const [affaires, setAffaires] = useState([]);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [vue, setVue] = useState("a_cloturer");

  useEffect(() => {
    listerAffaires().then((liste) => {
      setAffaires(liste);
      // À l'ouverture, on se place là où il y a du travail (à clôturer en
      // priorité), sans forcer si la vue a déjà été changée à la main.
      const c = compteursVues(liste);
      const premiere = ["a_cloturer", "a_traiter", "a_planifier", "terrain"]
        .find((k) => c[k] > 0) || "a_traiter";
      setVue(premiere);
    });
  }, []);

  const compteurs = useMemo(() => compteursVues(affaires), [affaires]);
  const urgences = useMemo(() => urgencesVues(affaires), [affaires]);

  const visibles = useMemo(() => filtrerParVue(affaires, vue)
    .filter((a) => !recherche ||
      (a.client?.nom || "").toLowerCase().includes(recherche.toLowerCase())),
  [affaires, recherche, vue]);

  // Regroupement par horizon : en retard / aujourd'hui / demain / cette semaine
  // / semaines nommées / mois. Une liste plate ne dit pas ce qui presse.
  const groupes = useMemo(() => regrouperParHorizon(visibles, {
    // Sur « Tous », on montre aussi les dossiers terminés ; sur une vue métier,
    // ils sont déjà filtrés en amont, donc l'option n'a pas d'effet de bord.
    seulementActifs: vue !== "tous",
  }), [visibles, vue]);

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
          {VUES.map((v) => {
            const actif = vue === v.cle;
            const n = compteurs[v.cle];
            const urg = urgences[v.cle];   // "rouge" | "ambre" | undefined
            const teinteUrg = urg === "rouge" ? C.rouge : urg === "ambre" ? "#D97706" : null;
            return (
              <button key={v.cle} onClick={() => setVue(v.cle)} title={v.aide} style={{
                position: "relative",
                border: `1.5px solid ${actif ? C.bleu : teinteUrg ? teinteUrg + "66" : C.bord}`,
                background: actif ? C.bleu : C.blanc,
                color: actif ? "#fff" : teinteUrg || C.muet,
                borderRadius: 10, padding: "7px 13px", fontSize: 12.5, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
              }}>
                {/* Point d'urgence : la charge se voit sans lire le nombre. */}
                {teinteUrg && !actif && (
                  <span style={{ width: 7, height: 7, borderRadius: 999,
                    background: teinteUrg, flexShrink: 0 }} />
                )}
                {v.libelle}
                {n > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 800,
                    color: actif ? C.bleu : "#fff",
                    background: actif ? "#fff" : (teinteUrg || "#94A3B8"),
                    borderRadius: 999, padding: "0 6px", minWidth: 16, textAlign: "center" }}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {groupes.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13,
                      lineHeight: 1.5 }}>
          {vue === "tous"
            ? "Aucun dossier — le bouton « + » en crée un."
            : "Rien dans cette vue pour le moment."}
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
                   : g.cle === "a_cloturer" ? C.ambre
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
              {a.etat === "effectue" && a.litiges_ouverts > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626",
                  background: "#FEF2F2", borderRadius: 999, padding: "2px 7px", marginRight: 4 }}>
                  {a.litiges_ouverts} litige{a.litiges_ouverts > 1 ? "s" : ""}
                </span>
              )}
              {a.etat === "effectue" && !a.litiges_ouverts && a.solde_centimes > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#B45309",
                  background: "#FFFBEB", borderRadius: 999, padding: "2px 7px", marginRight: 4 }}>
                  impayé
                </span>
              )}
              {a.etat === "effectue" && !a.litiges_ouverts && !a.solde_centimes && !a.a_facture && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#B45309",
                  background: "#FFFBEB", borderRadius: 999, padding: "2px 7px", marginRight: 4 }}>
                  à facturer
                </span>
              )}
              {a.etat === "effectue" && !a.litiges_ouverts && !a.solde_centimes && a.a_facture && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#15803D",
                  background: "#F0FDF4", borderRadius: 999, padding: "2px 7px", marginRight: 4 }}>
                  prêt à clôturer
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

      <MenuCreation ouvert={menuOuvert} basculer={setMenuOuvert}
                    choisir={(nature) => nouvelleAffaire(nature)} />
    </div>
  );
}
