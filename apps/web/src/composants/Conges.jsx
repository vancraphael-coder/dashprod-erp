// =============================================================================
// Congés — la demande chez le membre, la décision au bureau.
//
// Deux portes sur une même table :
//   · un membre demande POUR LUI et attend ;
//   · le bureau tranche, et peut poser directement un congé pour quelqu'un
//     d'autre (ce qui vaut approbation immédiate).
//
// La règle que la base fait respecter, et qu'on rappelle ici : on ne décide
// jamais de son propre congé. « La confirmation se fait au bureau » n'aurait
// aucun sens si quelqu'un du bureau validait ses propres vacances.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  listerConges, demanderConge, deciderConge, annulerConge,
} from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

const ETATS = {
  demande: { libelle: "En attente", couleur: "ambre" },
  approuve: { libelle: "Approuvé", couleur: "vert" },
  refuse: { libelle: "Refusé", couleur: "rouge" },
  annule: { libelle: "Annulé", couleur: "muet" },
};

/** La demande, telle qu'un membre la pose pour lui-même. */
export function DemanderConge({ onFait }) {
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [motif, setMotif] = useState("");
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);

  async function envoyer() {
    setErr(null); setOk(false);
    try {
      await demanderConge({ debut, fin, motif });
      setOk(true); setDebut(""); setFin(""); setMotif("");
      onFait && onFait();
    } catch (e) { setErr(e.message); }
  }

  // Une fin antérieure au début est une faute de saisie : on le dit avant
  // l'envoi plutôt que de laisser la base rendre une erreur sèche.
  const inverse = debut && fin && fin < debut;
  const pret = debut && fin && !inverse;

  return (
    <div style={S.carte}>
      <Titre>Demander un congé</Titre>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Du</label>
          <input style={S.input} type="date" value={debut}
                 onChange={(e) => setDebut(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Au</label>
          <input style={S.input} type="date" value={fin} min={debut || undefined}
                 onChange={(e) => setFin(e.target.value)} />
        </div>
      </div>
      <label style={S.label}>Motif (facultatif)</label>
      <input style={S.input} value={motif} onChange={(e) => setMotif(e.target.value)}
             placeholder="Vacances, rendez-vous…" />

      {inverse && (
        <div style={{ fontSize: 12, color: C.rouge, marginTop: 6 }}>
          La fin ne peut pas précéder le début.
        </div>
      )}
      {err && <div style={{ fontSize: 12, color: C.rouge, marginTop: 6 }}>{err}</div>}
      {ok && (
        <div style={{ fontSize: 12, color: C.vert, marginTop: 6 }}>
          Demande envoyée. Le bureau vous répondra.
        </div>
      )}

      <button style={{ ...S.boutonPlein, marginTop: 10, opacity: pret ? 1 : 0.5 }}
              disabled={!pret} onClick={envoyer}>
        Envoyer la demande
      </button>
      <div style={{ fontSize: 11.5, color: C.muet, marginTop: 6 }}>
        Votre demande n'est pas un congé tant que le bureau ne l'a pas
        confirmée : ne réservez rien avant la réponse.
      </div>
    </div>
  );
}

/** Mes congés, tous états confondus — pour savoir où en est sa demande. */
export function MesConges({ rafraichir }) {
  const [liste, setListe] = useState(null);
  const [err, setErr] = useState(null);

  async function charger() {
    try {
      const tous = await listerConges(["demande", "approuve", "refuse"]);
      setListe(tous.filter((c) => c.le_mien));
    } catch (e) { setErr(e.message); setListe([]); }
  }
  useEffect(() => { charger(); }, [rafraichir]);

  async function retirer(id) {
    try { await annulerConge(id); charger(); }
    catch (e) { setErr(e.message); }
  }

  if (!liste) return null;
  if (!liste.length && !err) return null;

  return (
    <div style={S.carte}>
      <Titre>Mes congés</Titre>
      {err && <div style={{ fontSize: 12, color: C.rouge }}>{err}</div>}
      {liste.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8,
                                 padding: "7px 0",
                                 borderTop: `1px solid ${C.bord}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: C.encre }}>
              {periode(c.debut, c.fin)}
            </div>
            {c.motif && (
              <div style={{ fontSize: 11.5, color: C.muet }}>{c.motif}</div>
            )}
            {c.etat === "refuse" && c.motif_decision && (
              <div style={{ fontSize: 11.5, color: C.rouge }}>
                Motif du refus : {c.motif_decision}
              </div>
            )}
          </div>
          <Pastille etat={c.etat} />
          {c.etat === "demande" && (
            <button style={{ ...S.boutonLien, fontSize: 12 }}
                    onClick={() => retirer(c.id)}>Retirer</button>
          )}
        </div>
      ))}
    </div>
  );
}

/** La corbeille du bureau : les demandes à trancher. */
export function DemandesConges({ rafraichir }) {
  const [liste, setListe] = useState(null);
  const [err, setErr] = useState(null);
  const [refus, setRefus] = useState(null);   // id en cours de refus
  const [motif, setMotif] = useState("");

  async function charger() {
    try { setListe(await listerConges(["demande"])); }
    catch (e) { setErr(e.message); setListe([]); }
  }
  useEffect(() => { charger(); }, [rafraichir]);

  async function decider(id, oui, m) {
    setErr(null);
    try {
      await deciderConge(id, oui, m);
      setRefus(null); setMotif("");
      charger();
    } catch (e) { setErr(e.message); }
  }

  if (!liste) return null;

  return (
    <div style={S.carte}>
      <Titre>Demandes à confirmer ({liste.length})</Titre>
      {err && <div style={{ fontSize: 12, color: C.rouge, marginBottom: 6 }}>{err}</div>}
      {!liste.length && (
        <div style={{ fontSize: 12.5, color: C.muet }}>Aucune demande en attente.</div>
      )}
      {liste.map((c) => (
        <div key={c.id} style={{ padding: "9px 0", borderTop: `1px solid ${C.bord}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.encre }}>
                {c.nom}
              </div>
              <div style={{ fontSize: 12, color: C.muet }}>
                {periode(c.debut, c.fin)}{c.motif ? ` — ${c.motif}` : ""}
              </div>
            </div>
          </div>

          {/* `decidable` vient de la base : elle sait, elle, qu'on ne tranche
              pas sa propre demande. On n'affiche pas des boutons qui
              échoueraient. */}
          {c.decidable ? (
            refus === c.id ? (
              <div style={{ marginTop: 8 }}>
                <label style={S.label}>Motif du refus</label>
                <input style={S.input} value={motif} autoFocus
                       onChange={(e) => setMotif(e.target.value)}
                       placeholder="Période chargée, effectif insuffisant…" />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button style={{ ...S.boutonPlein, background: C.rouge }}
                          onClick={() => decider(c.id, false, motif)}>
                    Confirmer le refus
                  </button>
                  <button style={S.boutonLien}
                          onClick={() => { setRefus(null); setMotif(""); }}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button style={S.boutonPlein}
                        onClick={() => decider(c.id, true, null)}>Approuver</button>
                <button style={{ ...S.boutonLien, color: C.rouge }}
                        onClick={() => setRefus(c.id)}>Refuser</button>
              </div>
            )
          ) : (
            <div style={{ fontSize: 11.5, color: C.muet, marginTop: 6 }}>
              {c.le_mien
                ? "C'est votre demande : quelqu'un d'autre doit la trancher."
                : "Hors de votre périmètre."}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Petits éléments ─────────────────────────────────────────────────────── */

const Titre = ({ children }) => (
  <div style={{ fontSize: 11.5, fontWeight: 800, color: C.muet, marginBottom: 8,
                textTransform: "uppercase", letterSpacing: ".03em" }}>{children}</div>
);

function Pastille({ etat }) {
  const e = ETATS[etat] || ETATS.annule;
  const couleur = C[e.couleur] || C.muet;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 9px",
                   borderRadius: 999, color: couleur,
                   background: `${couleur}1F`, whiteSpace: "nowrap" }}>
      {e.libelle}
    </span>
  );
}

/** « du 3 au 7 mars » — et « le 3 mars » quand c'est un seul jour. */
function periode(debut, fin) {
  const fmt = (d) => new Date(d + "T12:00:00")
    .toLocaleDateString("fr-BE", { day: "numeric", month: "long" });
  if (!debut) return "";
  if (debut === fin) return `Le ${fmt(debut)}`;
  return `Du ${fmt(debut)} au ${fmt(fin)}`;
}
