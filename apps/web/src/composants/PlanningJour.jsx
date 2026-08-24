// =============================================================================
// LES DEUX OPTIONS DU PLANNING : note rapide, et formation d'équipe.
//
// NOTE RAPIDE — opérationnelle et attachée à UNE journée : « Jean part à 15h »,
// « camion 2 au garage ». À ne pas confondre avec la balise d'atelier (le « i »,
// lot 21) qui sert à corriger le LOGICIEL. Ici, on note la JOURNÉE.
//
// ÉQUIPE — se forme pour la journée et s'affilie aux missions. Toutes les
// règles viennent du domaine (`planning/equipes.js`, éprouvé) : l'écran ne
// rejuge rien, il AFFICHE le verdict. Deux listes distinctes, et c'est
// volontaire :
//   · `bloquant`       → empêche d'enregistrer ;
//   · `avertissements` → s'affichent, n'empêchent rien.
// Le bureau connaît son terrain mieux que la règle.
// =============================================================================

import React, { useState, useEffect, useMemo } from "react";
import {
  equipesDuJour, sauverEquipeJour, supprimerEquipeJour,
  listerModelesEquipe, enregistrerModeleEquipe,
  notesDuJour, ajouterNoteJour, supprimerNoteJour,
} from "../lib/adaptateur.js";
import { verdictEquipe, modeleDepuisEquipe } from "@domaine/planning/equipes.js";
import { grouperVehicules, trierMembres } from "@domaine/metiers/cartes.js";
import { C, S } from "../lib/theme.jsx";

/* ── Note rapide ────────────────────────────────────────────────────────── */

export function NoteRapideJour({ jour }) {
  const [notes, setNotes] = useState([]);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function recharger() {
    setNotes(await notesDuJour(jour).catch(() => []));
  }
  useEffect(() => { recharger(); }, [jour]);

  async function ajouter() {
    if (!texte.trim()) return;
    setEnvoi(true);
    try { await ajouterNoteJour(jour, texte); setTexte(""); await recharger(); }
    finally { setEnvoi(false); }
  }

  return (
    <div style={S.carte}>
      <label style={{ ...S.label, marginTop: 0 }}>Note du jour</label>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input value={texte} onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ajouter(); }}
          placeholder="Jean part à 15h, camion 2 au garage…"
          style={{ ...S.input, flex: 1, margin: 0 }} />
        <button onClick={ajouter} disabled={!texte.trim() || envoi}
          style={{ ...S.boutonPlein, width: "auto", padding: "0 16px", height: 46,
                   opacity: !texte.trim() || envoi ? 0.5 : 1 }}>
          {envoi ? "…" : "Noter"}
        </button>
      </div>

      {notes.map((n) => (
        <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 8,
              padding: "8px 0", borderTop: `1px solid ${C.doux || C.bord}` }}>
          <span style={{ flex: 1, fontSize: 12.5, color: C.encre, lineHeight: 1.45 }}>
            {n.texte}
          </span>
          <button onClick={async () => { await supprimerNoteJour(n.id); recharger(); }}
            title="Retirer cette note"
            style={{ ...S.boutonLien, color: C.fantome, padding: 2 }}>×</button>
        </div>
      ))}
    </div>
  );
}

/* ── Formation d'équipe ─────────────────────────────────────────────────── */

export function EquipesDuJour({
  jour, membres = [], missionsDuJour = [], flotte = [],
}) {
  const [equipes, setEquipes] = useState([]);
  const [modeles, setModeles] = useState([]);
  // {id?, nom, membres[], missions[], vehicules[]}
  const [brouillon, setBrouillon] = useState(null);
  const [erreur, setErreur] = useState(null);

  async function recharger() {
    setEquipes(await equipesDuJour(jour).catch(() => []));
    setModeles(await listerModelesEquipe().catch(() => []));
  }
  useEffect(() => { recharger(); setBrouillon(null); }, [jour]);

  const missionsParId = useMemo(
    () => new Map(missionsDuJour.map((m) => [m.id, m])), [missionsDuJour]);

  /**
   * Ce que chaque personne tient DÉJÀ ce jour-là, dans les AUTRES équipes.
   * C'est l'entrée dont le domaine a besoin pour juger le chevauchement : sans
   * elle, il croirait tout le monde libre.
   */
  const engagementsParMembre = useMemo(() => {
    const par = {};
    for (const e of equipes) {
      if (brouillon && e.id === brouillon.id) continue;   // pas contre soi-même
      const ms = e.missions.map((id) => missionsParId.get(id)).filter(Boolean);
      for (const u of e.membres) (par[u] = par[u] || []).push(...ms);
    }
    return par;
  }, [equipes, brouillon, missionsParId]);

  /**
   * Ce que chaque VÉHICULE tient déjà ce jour-là (0144). Même raisonnement que
   * pour les personnes — et il compte davantage : deux équipes qui se croient
   * chacune propriétaire du même camion ne s'en aperçoivent qu'au dépôt, le
   * matin, quand il n'y en a qu'un.
   */
  const engagementsParVehicule = useMemo(() => {
    const par = {};
    for (const e of equipes) {
      if (brouillon && e.id === brouillon.id) continue;
      const ms = e.missions.map((id) => missionsParId.get(id)).filter(Boolean);
      for (const v of e.vehicules || []) (par[v] = par[v] || []).push(...ms);
    }
    return par;
  }, [equipes, brouillon, missionsParId]);

  const verdict = useMemo(() => {
    if (!brouillon) return null;
    return verdictEquipe(
      { membres: brouillon.membres,
        vehicules: brouillon.vehicules || [],
        missions: brouillon.missions.map((id) => missionsParId.get(id)).filter(Boolean) },
      { membres, flotte, engagementsParMembre, engagementsParVehicule });
  }, [brouillon, missionsParId, membres, flotte,
      engagementsParMembre, engagementsParVehicule]);

  async function enregistrer() {
    if (!verdict?.ok) return;
    setErreur(null);
    try {
      await sauverEquipeJour({ ...brouillon, jour });
      setBrouillon(null);
      await recharger();
    } catch (e) { setErreur(e.message); }
  }

  async function enregistrerModele() {
    const nom = window.prompt("Nom de cette équipe type ?", brouillon?.nom || "");
    if (nom == null) return;
    const r = modeleDepuisEquipe(brouillon, nom);
    if (!r.ok) { setErreur(r.motif); return; }
    try { await enregistrerModeleEquipe(r.modele); await recharger(); }
    catch (e) { setErreur(e.message); }
  }

  const bascule = (liste, v) =>
    liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v];

  return (
    <div style={S.carte}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "baseline", gap: 10 }}>
        <label style={{ ...S.label, marginTop: 0 }}>Équipes du jour</label>
        {!brouillon && (
          <button style={S.boutonLien}
            onClick={() => setBrouillon({ nom: "", membres: [], missions: [], vehicules: [] })}>
            + Former une équipe
          </button>
        )}
      </div>

      {/* Les équipes déjà formées. */}
      {!brouillon && equipes.length === 0 && (
        <div style={{ fontSize: 12.5, color: C.fantome, padding: "6px 0" }}>
          Aucune équipe formée pour ce jour.
        </div>
      )}
      {!brouillon && equipes.map((e) => (
        <div key={e.id} style={{ padding: "9px 0",
              borderTop: `1px solid ${C.doux || C.bord}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.encre }}>
              {e.nom || `Équipe de ${e.membres.length}`}
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <button style={S.boutonLien} onClick={() => setBrouillon({ ...e })}>
                Modifier
              </button>
              <button style={{ ...S.boutonLien, color: C.rouge }}
                onClick={async () => { await supprimerEquipeJour(e.id); recharger(); }}>
                Retirer
              </button>
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
            {e.membres.map((u) => membres.find((m) => m.id === u)?.nom || "?").join(", ")}
            {(e.vehicules || []).length > 0 && (
              <> · {e.vehicules
                .map((id) => flotte.find((v) => v.id === id)?.nom || "?")
                .join(", ")}</>
            )}
            {e.missions.length > 0 && ` · ${e.missions.length} mission${e.missions.length > 1 ? "s" : ""}`}
          </div>
        </div>
      ))}

      {/* Le formateur. */}
      {brouillon && (
        <div style={{ borderTop: `1px solid ${C.bord}`, marginTop: 8, paddingTop: 10 }}>
          <input value={brouillon.nom}
            onChange={(e) => setBrouillon({ ...brouillon, nom: e.target.value })}
            placeholder="Nom de l'équipe (facultatif)"
            style={{ ...S.input, margin: "0 0 10px" }} />

          {/* Reformer une équipe connue : les mêmes personnes travaillent
              souvent ensemble. Le modèle ne rapporte QUE les personnes. */}
          {modeles.length > 0 && (
            <>
              <label style={S.label}>Reformer une équipe type</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                {modeles.map((m) => (
                  <button key={m.id} style={{ ...S.boutonPuce }}
                    onClick={() => setBrouillon({ ...brouillon,
                      nom: brouillon.nom || m.nom, membres: [...(m.membres || [])] })}>
                    {m.nom}
                  </button>
                ))}
              </div>
            </>
          )}

          <label style={S.label}>Qui</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {trierMembres(membres, { affectes: brouillon.membres }).map((m) => {
              const actif = brouillon.membres.includes(m.id);
              return (
                <button key={m.id} style={{ ...S.boutonPuce,
                    border: `1.5px solid ${actif ? C.bleu : C.bord}`,
                    background: actif ? C.bleuClair : C.blanc,
                    color: actif ? C.bleu : C.muet }}
                  onClick={() => setBrouillon({ ...brouillon,
                    membres: bascule(brouillon.membres, m.id) })}>
                  {m.nom}
                </button>
              );
            })}
          </div>

          {/* LE VÉHICULE DE L'ÉQUIPE (0144). Une équipe part avec quelque
              chose : sans ce champ, deux équipes du même jour pouvaient se
              voir attribuer le même camion sans que rien ne le dise — et on
              s'en apercevait au dépôt, le matin.

              Groupés par catégorie comme partout ailleurs : on cherche « le
              lift », pas « un véhicule ». */}
          <label style={S.label}>Avec quoi</label>
          {flotte.length === 0 ? (
            <div style={{ fontSize: 12, color: C.fantome }}>
              Aucun véhicule dans la flotte.
            </div>
          ) : (
            grouperVehicules(flotte, { affectes: brouillon.vehicules || [] })
              .map((g) => (
                <div key={g.cle} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700,
                                color: C.fantome, marginBottom: 5 }}>
                    {g.titre}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {g.vehicules.map((v) => {
                      const actif = (brouillon.vehicules || []).includes(v.id);
                      return (
                        <button key={v.id} style={{ ...S.boutonPuce,
                            border: `1.5px solid ${actif ? C.bleu : C.bord}`,
                            background: actif ? C.bleuClair : C.blanc,
                            color: actif ? C.bleu : C.muet }}
                          onClick={() => setBrouillon({ ...brouillon,
                            vehicules: bascule(brouillon.vehicules || [], v.id) })}>
                          {v.nom}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
          )}

          <label style={S.label}>Sur quelles missions</label>
          {missionsDuJour.length === 0 ? (
            <div style={{ fontSize: 12, color: C.fantome }}>
              Aucune mission ce jour-là.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {missionsDuJour.map((m) => {
                const actif = brouillon.missions.includes(m.id);
                return (
                  <button key={m.id} style={{ ...S.boutonPuce,
                      border: `1.5px solid ${actif ? C.bleu : C.bord}`,
                      background: actif ? C.bleuClair : C.blanc,
                      color: actif ? C.bleu : C.muet }}
                    onClick={() => setBrouillon({ ...brouillon,
                      missions: bascule(brouillon.missions, m.id) })}>
                    {m.libelle || m.type}
                    {m.heure_debut && ` · ${m.heure_debut}`}
                  </button>
                );
              })}
            </div>
          )}

          {/* LE VERDICT. Deux niveaux, jamais mélangés : ce qui empêche, et ce
              qui mérite un regard. */}
          {verdict?.bloquant?.map((b, i) => (
            <div key={i} style={{ fontSize: 12, color: C.rouge, marginTop: 8,
                  lineHeight: 1.45 }}>⛔ {b}</div>
          ))}
          {verdict?.avertissements?.map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: C.ambre, marginTop: 8,
                  lineHeight: 1.45 }}>⚠ {a}</div>
          ))}
          {erreur && (
            <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={enregistrer} disabled={!verdict?.ok}
              style={{ ...S.boutonPlein, width: "auto", padding: "10px 18px",
                       opacity: verdict?.ok ? 1 : 0.5 }}>
              Enregistrer l'équipe
            </button>
            <button onClick={enregistrerModele}
              disabled={!brouillon.membres.length}
              style={{ ...S.boutonSecondaire, width: "auto", padding: "10px 16px",
                       opacity: brouillon.membres.length ? 1 : 0.5 }}>
              Garder comme équipe type
            </button>
            <button style={S.boutonLien} onClick={() => { setBrouillon(null); setErreur(null); }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
