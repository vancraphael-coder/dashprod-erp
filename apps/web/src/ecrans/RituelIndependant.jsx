// =============================================================================
// RITUEL DE L'INDÉPENDANT — l'écran d'arrivée, et rien de plus.
//
// CE QUE CET ÉCRAN N'EST PAS. Pas un tableau de bord. Pas de chiffre
// d'affaires, pas de graphique, pas de moyenne mensuelle. Un indépendant
// ouvre son téléphone à 6 h du matin, souvent en route : il a trois questions,
// dans cet ordre, et une seule action possible.
//
//   1. Je vais où aujourd'hui ?
//   2. Est-ce qu'on me demande quelque chose ?
//   3. Est-ce qu'on me doit de l'argent ?
//
// TROIS BLOCS, PAS QUATRE. Le plafond est dans le registre (`blocs: 3`) et un
// test le tient. Ce n'est pas une préférence esthétique : au-delà de trois,
// l'écran redevient quelque chose à lire, et on ne lit pas debout dans un
// camion.
//
// IL SE TERMINE. Une fois les demandes traitées, l'écran n'a plus rien à dire
// et le dit. « Rien à confirmer » est une réponse complète — souvent la
// meilleure nouvelle de la journée. Un tableau de bord, lui, ne finit jamais :
// c'est ce qui le rend anxiogène.
//
// AUCUN CHIFFRE QU'ON NE PEUT PAS DÉCIDER. « 3 missions ce mois » n'appelle
// aucune décision et ne figure donc pas. « 2 factures impayées depuis plus de
// 30 jours » en appelle une, et figure.
//
// UNE DEMANDE À LA FOIS. Les propositions arrivent en pile, la plus urgente
// devant. Répondre fait disparaître la carte et présente la suivante. Afficher
// les cinq d'un coup transformerait une décision en corvée de tri.
// =============================================================================

import React, { useEffect, useState } from "react";
import { mesEngagements, repondreEngagement } from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

const euros = (centimes) =>
  `${(centimes / 100).toFixed(2).replace(".", ",")} €`;

const UNITES = {
  heure: "de l'heure", demi_journee: "la demi-journée",
  journee: "la journée", forfait: "forfait",
};

/** Aujourd'hui, demain, ou la date en clair. On ne fait pas calculer. */
function quand(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  const jours = Math.round((d - auj) / 86400000);
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "demain";
  if (jours === -1) return "hier";
  if (jours > 1 && jours < 7) {
    return d.toLocaleDateString("fr-BE", { weekday: "long" });
  }
  return d.toLocaleDateString("fr-BE", { day: "numeric", month: "long" });
}

export default function RituelIndependant({ versEngagement }) {
  const [tout, setTout] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(null);
  const [refus, setRefus] = useState(null);     // id en cours de motivation
  const [motif, setMotif] = useState("");

  function charger() {
    mesEngagements()
      .then((l) => setTout(l.filter((e) => e.sens === "recue")))
      .catch((e) => { setErreur(e?.message || "Lecture impossible"); setTout([]); });
  }
  useEffect(charger, []);

  async function repondre(id, accepte) {
    setErreur(null);
    setEnCours(id);
    try {
      const r = await repondreEngagement(id, accepte, accepte ? null : motif);
      if (r && r.ok === false) setErreur(r.motif);
      setRefus(null);
      setMotif("");
      charger();
    } catch (e) {
      setErreur(e?.message || "Réponse refusée");
    } finally {
      setEnCours(null);
    }
  }

  if (tout === null) return null;

  const aujourdhui = new Date().toISOString().slice(0, 10);
  // Bloc 1 : ce qui est confirmé et qui tombe aujourd'hui ou après.
  const aVenir = tout
    .filter((e) => e.etat === "acceptee" && e.date >= aujourdhui)
    .sort((a, b) => a.date.localeCompare(b.date));
  const duJour = aVenir.filter((e) => e.date === aujourdhui);
  const suivante = aVenir.find((e) => e.date > aujourdhui);

  // Bloc 2 : ce qu'on me demande. La plus proche en premier — c'est celle qui
  // bloque le reste de mon agenda.
  const aConfirmer = tout
    .filter((e) => e.etat === "proposee")
    .sort((a, b) => a.date.localeCompare(b.date));

  const sousTitre = { fontSize: 12, color: C.muet, marginTop: 2 };
  const bloc = { ...S.carte };
  const enTeteBloc = {
    fontSize: 10.5, fontWeight: 800, color: C.muet,
    textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 10,
  };

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={S.titre}>Ma journée</div>
        <div style={sousTitre}>
          {duJour.length > 0
            ? `${duJour.length} intervention${duJour.length > 1 ? "s" : ""} aujourd'hui`
            : "Rien de prévu aujourd'hui"}
        </div>
      </div>

      {erreur && (
        <div style={{ ...bloc, color: C.encreRouge, background: C.teinteRouge,
                      border: `1px solid ${C.filetRouge}`, fontSize: 13 }}>
          {erreur}
        </div>
      )}

      {/* ── BLOC 1 — Où je vais ─────────────────────────────────────────── */}
      <div style={bloc}>
        <div style={enTeteBloc}>Aujourd'hui</div>
        {duJour.length === 0 ? (
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.encre }}>
              Aucune intervention.
            </div>
            {/* Le vide se dit, et il dit la suite : sinon la personne ouvre
                trois autres écrans pour vérifier qu'elle n'a rien oublié. */}
            <div style={{ fontSize: 12.5, color: C.muet, marginTop: 4, lineHeight: 1.5 }}>
              {suivante
                ? `Prochaine : ${quand(suivante.date)} à ${suivante.ville}.`
                : "Rien de confirmé pour les jours à venir."}
            </div>
          </div>
        ) : duJour.map((e) => (
          <div key={e.id} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: C.encre }}>
              {e.heure ? e.heure.slice(0, 5) : "Heure à confirmer"} · {e.ville}
            </div>
            {/* L'adresse n'existe qu'après l'accord — elle est donc toujours
                présente ici, puisque ce bloc ne montre que de l'accepté. */}
            {e.adresse && (
              <div style={{ fontSize: 13.5, color: C.encre, marginTop: 3 }}>
                {e.adresse}
              </div>
            )}
            {e.contact && (
              <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
                Sur place : {e.contact}
              </div>
            )}
            <div style={{ fontSize: 12.5, color: C.muet, marginTop: 4, lineHeight: 1.5 }}>
              {e.nature} — pour {e.contrepartie}
            </div>
          </div>
        ))}
      </div>

      {/* ── BLOC 2 — Ce qu'on me demande ────────────────────────────────── */}
      <div style={bloc}>
        <div style={enTeteBloc}>
          À confirmer{aConfirmer.length > 0 && ` · ${aConfirmer.length}`}
        </div>

        {aConfirmer.length === 0 ? (
          <div style={{ fontSize: 13.5, color: C.muet }}>
            Rien à confirmer. C'est à jour.
          </div>
        ) : (
          <PropositionUne
            e={aConfirmer[0]}
            restantes={aConfirmer.length - 1}
            enCours={enCours === aConfirmer[0].id}
            refusEnCours={refus === aConfirmer[0].id}
            motif={motif}
            setMotif={setMotif}
            surRefuser={() => setRefus(aConfirmer[0].id)}
            surAnnulerRefus={() => { setRefus(null); setMotif(""); }}
            surAccepter={() => repondre(aConfirmer[0].id, true)}
            surConfirmerRefus={() => repondre(aConfirmer[0].id, false)}
          />
        )}
      </div>

      {/* ── BLOC 3 — Ce qu'on me doit ───────────────────────────────────── */}
      <BlocEncours tout={tout} versEngagement={versEngagement} />
    </div>
  );
}

/**
 * UNE proposition, pas la pile. Répondre fait apparaître la suivante.
 *
 * Le prix est affiché tel qu'il a été convenu — c'est une copie du tarif
 * publié au moment de la proposition, pas une lecture du tarif actuel. Changer
 * ses tarifs ne réécrit donc aucune proposition en cours, et l'indépendant
 * voit exactement ce sur quoi il s'engage.
 */
function PropositionUne({
  e, restantes, enCours, refusEnCours, motif, setMotif,
  surRefuser, surAnnulerRefus, surAccepter, surConfirmerRefus,
}) {
  return (
    <div>
      <div style={{ fontSize: 15.5, fontWeight: 800, color: C.encre }}>
        {quand(e.date)}
        {e.heure && ` à ${e.heure.slice(0, 5)}`}
      </div>
      <div style={{ fontSize: 13.5, color: C.encre, marginTop: 3 }}>
        {e.ville} {e.codePostal} — {e.nature}
      </div>
      <div style={{ fontSize: 12.5, color: C.muet, marginTop: 3 }}>
        Demandé par {e.contrepartie}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6,
                    marginTop: 10, padding: "8px 12px", borderRadius: 10,
                    background: C.teinteVerte,
                    border: `1px solid ${C.filetVert}` }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: C.encreVert }}>
          {euros(e.prixHtvaCentimes)}
        </span>
        <span style={{ fontSize: 12, color: C.encreVert }}>
          HTVA {UNITES[e.unite] || e.unite}
        </span>
      </div>

      {/* L'adresse n'est pas cachée : elle n'existe pas encore. On le dit,
          sinon l'absence passe pour un oubli de l'application. */}
      <div style={{ fontSize: 11.5, color: C.muet, marginTop: 8, lineHeight: 1.5 }}>
        L'adresse exacte et le contact sur place vous seront transmis dès que
        vous aurez accepté.
      </div>

      {!refusEnCours ? (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button style={{ ...S.boutonPlein, flex: 1, opacity: enCours ? 0.5 : 1 }}
                  disabled={enCours} onClick={surAccepter}>
            {enCours ? "…" : "J'accepte"}
          </button>
          <button style={{ ...S.boutonSecondaire }} disabled={enCours}
                  onClick={surRefuser}>
            Refuser
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          {/* Un refus se motive : la contrainte l'impose en base, et c'est ce
              qui permet au donneur d'ordre de reproposer utilement. */}
          <label style={S.label}>Pourquoi ce refus ?</label>
          <input style={{ ...S.input, marginTop: 0 }} value={motif}
                 autoFocus placeholder="Déjà pris ce jour-là"
                 onChange={(ev) => setMotif(ev.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={{ ...S.boutonPlein, flex: 1,
                             opacity: motif.trim() && !enCours ? 1 : 0.5 }}
                    disabled={!motif.trim() || enCours}
                    onClick={surConfirmerRefus}>
              Envoyer le refus
            </button>
            <button style={S.boutonSecondaire} onClick={surAnnulerRefus}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {restantes > 0 && (
        <div style={{ fontSize: 11.5, color: C.muet, marginTop: 12 }}>
          {restantes} autre{restantes > 1 ? "s" : ""} demande
          {restantes > 1 ? "s" : ""} après celle-ci.
        </div>
      )}
    </div>
  );
}

/**
 * Ce qu'on me doit. Un seul chiffre, et seulement s'il appelle une décision.
 *
 * Le montant total réalisé n'y figure pas : savoir qu'on a gagné 4 200 € ce
 * mois-ci ne fait rien faire. Savoir qu'une intervention réalisée n'est pas
 * facturée, si.
 */
function BlocEncours({ tout, versEngagement }) {
  const realisees = tout.filter((e) => e.etat === "realisee");
  const total = realisees.reduce((s, e) => s + e.prixHtvaCentimes, 0);

  return (
    <div style={S.carte}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: C.muet,
                    textTransform: "uppercase", letterSpacing: ".04em",
                    marginBottom: 10 }}>
        À facturer
      </div>
      {realisees.length === 0 ? (
        <div style={{ fontSize: 13.5, color: C.muet }}>
          Rien en attente de facturation.
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: C.encre }}>
            {realisees.length} intervention{realisees.length > 1 ? "s" : ""} réalisée
            {realisees.length > 1 ? "s" : ""}, non facturée
            {realisees.length > 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: 12.5, color: C.muet, marginTop: 3 }}>
            {euros(total)} HTVA à émettre.
          </div>
          {versEngagement && (
            <button style={{ ...S.boutonLien, marginTop: 8, padding: 0 }}
                    onClick={() => versEngagement(realisees[0].id)}>
              Facturer la plus ancienne
            </button>
          )}
        </div>
      )}
    </div>
  );
}
