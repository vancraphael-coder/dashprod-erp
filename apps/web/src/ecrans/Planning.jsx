// =============================================================================
// Écran — Planning (calendrier mensuel + journée).
// Deux niveaux (alignement page 09) : la GRILLE du mois donne la densité d'un
// coup d'œil (pastilles) ; toucher un jour ouvre ses missions, avec affectation
// et détection de conflits en direct (C-20 : le système signale, l'humain
// décide). Le bureau raisonne en mois, pas en liste infinie.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listerMissions, listerMembresSimples, basculerAffectation, composerBrief,
  listerConges, listerFermetures, listerVehicules, basculerVehiculeMission, partagerMission,
  definirHorairesMission,
} from "../lib/adaptateur.js";
import { urlWhatsApp } from "@domaine/communication/brief.js";
import { grilleMois, missionsDuJour, chargeDuJour } from "@domaine/operations/agenda.js";
import { disponibiliteRessource, verdictMission }
  from "@domaine/operations/missions.js";
import { qualifierJour } from "@domaine/planning/jours-feries.js";
import { hhmm, resumeHoraires, verifierHoraires, HEURE_DEFAUT }
  from "@domaine/operations/horaires.js";
import { C, S, Confirmation, couleurPlanning } from "../lib/theme.jsx";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
              "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS_COURTS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

function aujourdhui() { return new Date().toISOString().slice(0, 10); }

function dateLongue(iso) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long",
    });
  } catch { return iso; }
}

const bandeauStyle = (fond, bord, couleur) => ({
  padding: "9px 12px", borderRadius: 10, fontSize: 12, lineHeight: 1.4,
  background: fond, border: `1px solid ${bord}`, color: couleur,
});

/**
 * Agenda partagé bureau ↔ terrain.
 *
 * `lectureSeule` : le terrain voit le MÊME agenda que le bureau — mêmes
 * missions, mêmes congés, mêmes fériés, mêmes fermetures — mais ne pilote
 * rien. Deux différences, et elles sont voulues :
 *   1. aucune action (affecter, partager, changer un véhicule) : le planning
 *      se décide au bureau ;
 *   2. seules les missions PARTAGÉES sont visibles. Une mission préparée mais
 *      non publiée reste au bureau — c'est la règle posée en 0044, et la
 *      contourner ici viderait le partage de son sens.
 */
export default function Planning({ ouvrirDossier, lectureSeule = false }) {
  const [missions, setMissions] = useState([]);
  const [membres, setMembres] = useState([]);       // actifs (sélection)
  const [tousMembres, setTousMembres] = useState([]); // + archivés (affichage)
  const [conges, setConges] = useState([]);
  const [fermetures, setFermetures] = useState([]);
  const [flotte, setFlotte] = useState([]);
  // Sélection en attente : 1er clic choisit, 2e confirme (Retirer/Ajouter).
  const [selection, setSelection] = useState(null); // {missionId, type, id, nom, present}
  const now = new Date();
  const [annee, setAnnee] = useState(now.getFullYear());
  const [mois, setMois] = useState(now.getMonth());
  const [jourSel, setJourSel] = useState(aujourdhui());
  const [ouvert, setOuvert] = useState(null);
  const [copie, setCopie] = useState(null); // id de mission dont le brief vient d'être copié

  async function recharger() {
    const toutes = await listerMissions();
    // Le terrain ne voit que ce que le bureau a publié.
    setMissions(lectureSeule ? toutes.filter((m) => m.partagee) : toutes);
    setMembres(await listerMembresSimples());
    setTousMembres(await listerMembresSimples(true).catch(() => []));
    // Les DEMANDES sont chargées avec les congés accordés : une absence
    // probable doit se voir au planning, sinon on affecte quelqu'un sur une
    // période qu'il vient justement de demander. Elles ne bloquent pas —
    // elles avertissent.
    setConges(await listerConges(["approuve", "demande"]).catch(() => []));
    setFermetures(await listerFermetures().catch(() => []));
    setFlotte(await listerVehicules().catch(() => []));
  }
  useEffect(() => { recharger(); }, []);

  const grille = useMemo(() => grilleMois(annee, mois, missions), [annee, mois, missions]);
  const duJour = useMemo(() => missionsDuJour(missions, jourSel), [missions, jourSel]);
  const charge = useMemo(() => chargeDuJour(duJour), [duJour]);

  function moisPrecedent() {
    if (mois === 0) { setMois(11); setAnnee(annee - 1); } else setMois(mois - 1);
  }
  function moisSuivant() {
    if (mois === 11) { setMois(0); setAnnee(annee + 1); } else setMois(mois + 1);
  }

  /** Le membre est-il déjà pris sur une AUTRE mission le même jour ? (C-20) */
  /**
   * Disponibilité d'un MEMBRE pour une mission.
   * Calculée en toutes circonstances — y compris s'il est déjà affecté ici :
   * c'est ce qui rend un doublon visible au lieu de le masquer dès sa
   * création (INC-19).
   */
  function dispoMembre(membreId, mission) {
    const engagements = missions
      .filter((m) => (m.affectations || []).some((a) => a.utilisateur_id === membreId))
      .map((m) => ({ missionId: m.id, date: m.date }));
    // SEULS les congés ACCORDÉS rendent indisponible. Une demande en attente
    // n'est pas une absence : bloquer dessus reviendrait à laisser le membre
    // décider seul de son planning, alors que la décision revient au bureau.
    // Elle est signalée ailleurs (pastille creuse au calendrier).
    const congesMembre = conges
      .filter((c) => c.utilisateur_id === membreId && c.etat !== "demande")
      .map((c) => ({ debut: c.debut, fin: c.fin }));
    return disponibiliteRessource({
      date: mission.date, missionId: mission.id,
      conges: congesMembre, affectations: engagements,
    });
  }

  /**
   * Disponibilité d'un VÉHICULE. Aucun contrôle n'existait : un camion pouvait
   * être posé sur deux chantiers le même jour sans que rien ne le signale.
   */
  function dispoCamion(camionId, mission) {
    const engagements = missions
      .filter((m) => (m.camions || []).includes(camionId))
      .map((m) => ({ missionId: m.id, date: m.date }));
    return disponibiliteRessource({
      date: mission.date, missionId: mission.id, affectations: engagements,
    });
  }

  /** Verdict d'ensemble d'une mission, pour l'alerte en tête de carte. */
  function verdictDe(mission) {
    const affectes = (mission.affectations || []).map((a) => a.utilisateur_id);
    return verdictMission({
      date: mission.date, missionId: mission.id,
      membres: affectes.map((id) => ({
        nom: (tousMembres.find((x) => x.id === id) || {}).nom || "Membre",
        affectations: missions
          .filter((m) => (m.affectations || []).some((a) => a.utilisateur_id === id))
          .map((m) => ({ missionId: m.id, date: m.date })),
        conges: conges.filter((c) => c.utilisateur_id === id)
          .map((c) => ({ debut: c.debut, fin: c.fin })),
      })),
      vehicules: (mission.camions || []).map((id) => ({
        nom: (flotte.find((v) => v.id === id) || {}).nom || "Véhicule",
        type: "vehicule",
        affectations: missions
          .filter((m) => (m.camions || []).includes(id))
          .map((m) => ({ missionId: m.id, date: m.date })),
      })),
    });
  }

  // Trois niveaux, trois couleurs. Le congé (rouge) dit « la personne n'est
  // pas là » ; le doublon (orange) dit « elle est déjà prise ailleurs » — un
  // avertissement, pas une interdiction : le bureau décide.
  // Les fonds sont des VOILES de la couleur d'état (suffixe alpha), pas des
  // pastels opaques : `#FFFBEB` posait un rectangle blanc sur le fond nuit.
  // Les couleurs elles-mêmes viennent d'Apparence → Planning, donc un réglage
  // de l'utilisateur se répercute ici sans retoucher cet écran.
  const cDouble = couleurPlanning("double");
  const cConge = couleurPlanning("conge");
  const cDemande = couleurPlanning("demande");
  const COULEURS_DISPO = {
    libre:        { bord: C.bord,        fond: C.blanc,      texte: C.encre, signe: "" },
    double:       { bord: `${cDouble}66`, fond: `${cDouble}1F`, texte: cDouble, signe: "⚠ " },
    indisponible: { bord: `${cConge}66`,  fond: `${cConge}1F`,  texte: cConge,  signe: "⛔ " },
  };

  function choisir(missionId, type, id, nom, present) {
    setSelection((s) =>
      s && s.missionId === missionId && s.type === type && s.id === id
        ? null : { missionId, type, id, nom, present });
  }
  async function confirmerSelection() {
    if (!selection) return;
    if (selection.type === "membre") {
      await basculerAffectation(selection.missionId, selection.id, "demenageur");
    } else {
      await basculerVehiculeMission(selection.missionId, selection.id);
    }
    setSelection(null);
    await recharger();
  }

  async function brief(m) {
    const noms = (m.affectations || [])
      .map((a) => membres.find((x) => x.id === a.utilisateur_id)?.nom)
      .filter(Boolean);
    return composerBrief(m.affaire_id, { date: m.date, heure: m.heure, equipeNoms: noms });
  }
  async function copierBrief(m) {
    const texte = await brief(m);
    try { await navigator.clipboard.writeText(texte); setCopie(m.id); }
    catch { window.prompt("Copiez le brief :", texte); }
    setTimeout(() => setCopie(null), 2000);
  }
  async function whatsappBrief(m) {
    const texte = await brief(m);
    window.open(urlWhatsApp(texte), "_blank");
  }

  return (
    <div style={S.page}>
      {/* Navigation du mois */}
      <div style={{ ...S.entete, display: "flex", justifyContent: "space-between",
                    alignItems: "center" }}>
        <button onClick={moisPrecedent} style={btnFleche}>←</button>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.encre }}>
          {MOIS[mois]} {annee}
        </div>
        <button onClick={moisSuivant} style={btnFleche}>→</button>
      </div>

      {/* Grille du mois */}
      <div style={{ ...S.carte, padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3,
                      textAlign: "center" }}>
          {JOURS_COURTS.map((j) => (
            <div key={j} style={{ fontSize: 9.5, fontWeight: 700, color: C.fantome,
                                   padding: "4px 0" }}>{j}</div>
          ))}
          {Array.from({ length: grille.decalage }).map((_, i) => <div key={"v" + i} />)}
          {grille.jours.map((j) => {
            const estAujourdhui = j.date === aujourdhui();
            const selectionne = j.date === jourSel;
            const q = qualifierJour(j.date, fermetures);
            const duJour = conges.filter((c) =>
              c.debut && c.fin && j.date >= c.debut && j.date <= c.fin);
            const nbConges = duJour.filter((c) => c.etat !== "demande").length;
            const nbDemandes = duJour.filter((c) => c.etat === "demande").length;
            // Priorité visuelle : fermeture entreprise, puis férié légal.
            // Teintes TRANSLUCIDES et non des pastels opaques : en nuit,
            // #FEF2F2 posait un pavé blanc sur un fond presque noir. Un voile
            // laisse passer le fond et fonctionne dans les deux modes.
            const fondSpecial = q.ferme ? `${C.rouge}22`
                              : q.ferie ? `${C.ambre}22` : null;
            return (
              <button key={j.date} onClick={() => { setJourSel(j.date); setOuvert(null); }}
                style={{
                  position: "relative", aspectRatio: "1", borderRadius: 9,
                  border: selectionne ? `2px solid ${C.bleu}` : "1.5px solid transparent",
                  // `#E7EFFC` était écrit en dur : un bleu TRÈS clair. En nuit,
                  // l'encre est quasi blanche — le numéro du jour disparaissait
                  // dans le fond. Le jeton `bleuClair` suit le mode.
                  background: estAujourdhui ? C.bleu : selectionne ? C.bleuClair
                    : fondSpecial || "transparent",
                  color: estAujourdhui ? C.blanc : C.encre,
                  fontSize: 13.5, fontWeight: (estAujourdhui || selectionne) ? 700 : 500,
                  cursor: "pointer",
                }}>
                {j.jour}
                {(q.ferie || q.ferme) && !estAujourdhui && (
                  <span style={{ position: "absolute", top: 3, right: 4,
                    fontSize: 8, lineHeight: 1,
                    color: q.ferme ? C.rouge : C.ambre }}>●</span>
                )}
                {(j.nb > 0 || nbConges > 0 || nbDemandes > 0) && (
                  <span style={{ position: "absolute", bottom: 5, left: "50%",
                    transform: "translateX(-50%)", display: "flex", gap: 2 }}>
                    {j.nb > 0 && (
                      <span style={{ width: 5, height: 5, borderRadius: "50%",
                        background: estAujourdhui ? C.blanc : C.ambre }} />
                    )}
                    {nbConges > 0 && (
                      // La couleur du congé est RÉGLABLE (Apparence → Planning).
                      // `C.violet` en dur ignorait purement et simplement ce
                      // réglage : on passe par l'assistant prévu pour ça.
                      <span style={{ width: 5, height: 5, borderRadius: "50%",
                        background: estAujourdhui ? C.blanc : couleurPlanning("conge") }} />
                    )}
                    {nbDemandes > 0 && (
                      // Une DEMANDE n'est pas une absence : elle se distingue
                      // par sa couleur et par son contour creux, pour ne pas
                      // se lire comme un congé acquis.
                      <span style={{ width: 5, height: 5, borderRadius: "50%",
                        border: `1.5px solid ${estAujourdhui ? C.blanc : couleurPlanning("demande")}`,
                        boxSizing: "border-box" }} />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Journée sélectionnée */}
      <div style={{ padding: "4px 20px 8px", display: "flex", justifyContent: "space-between",
                    alignItems: "baseline" }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.encre,
                       textTransform: "capitalize" }}>
          {dateLongue(jourSel)}
        </span>
        {charge.nbMissions > 0 && (
          <span style={{ fontSize: 11.5, color: C.muet }}>
            {charge.nbMissions} mission{charge.nbMissions > 1 ? "s" : ""} · {charge.effectif} affecté·s
          </span>
        )}
      </div>

      {(() => {
        const q = qualifierJour(jourSel, fermetures);
        // « X en congé » ne compte que les congés ACCORDÉS : annoncer une
        // demande comme une absence ferait renoncer à un chantier pour rien.
        const surLeJour = conges
          .filter((c) => c.debut && c.fin && jourSel >= c.debut && jourSel <= c.fin);
        const nommer = (c) => {
          const m = tousMembres.find((x) => x.id === c.utilisateur_id);
          return { nom: m?.nom || "Membre", motif: c.motif };
        };
        const enConge = surLeJour.filter((c) => c.etat !== "demande").map(nommer);
        const enDemande = surLeJour.filter((c) => c.etat === "demande").map(nommer);
        if (!q.ferie && !q.ferme && enConge.length === 0
            && enDemande.length === 0) return null;
        return (
          <div style={{ margin: "0 16px 10px", display: "flex",
                        flexDirection: "column", gap: 6 }}>
            {q.ferme && (
              <div style={bandeauStyle(`${C.rouge}1F`, `${C.rouge}55`, C.rouge)}>
                <b>Entreprise fermée</b>
                {q.motif_fermeture ? ` — ${q.motif_fermeture}` : ""}
              </div>
            )}
            {q.ferie && (
              <div style={bandeauStyle(`${C.ambre}1F`, `${C.ambre}55`, C.ambre)}>
                <b>Jour férié</b> — {q.ferie}
              </div>
            )}
            {enConge.length > 0 && (
              <div style={bandeauStyle(`${cConge}1F`, `${cConge}55`, cConge)}>
                <b>{enConge.length} en congé</b> :{" "}
                {enConge.map((e) => e.nom.split(" ")[0]).join(", ")}
              </div>
            )}
            {enDemande.length > 0 && (
              <div style={bandeauStyle(`${cDemande}1F`, `${cDemande}55`, cDemande)}>
                <b>{enDemande.length} en attente</b> :{" "}
                {enDemande.map((e) => e.nom.split(" ")[0]).join(", ")}
                {" — à confirmer au bureau."}
              </div>
            )}
          </div>
        );
      })()}

      {duJour.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Aucune mission ce jour.
        </div>
      )}

      {duJour.map((m) => {
        const affectes = (m.affectations || []).map((a) => a.utilisateur_id);
        const ouvertIci = ouvert === m.id;
        return (
          <div key={m.id} style={{ ...S.carte,
            borderLeft: `4px solid ${m.type === "emballage" ? "#6366F1" : C.bleu}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div onClick={() => ouvrirDossier && m.affaire_id && ouvrirDossier(m.affaire_id)}
                   style={{ cursor: ouvrirDossier ? "pointer" : "default", flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: C.encre }}>
                  {(m.heure || "").slice(0, 5)} · {m.client || "—"}
                </div>
                <div style={{ fontSize: 12, color: C.muet, textTransform: "capitalize" }}>
                  {m.type}
                </div>
              </div>
              {lectureSeule ? (
                <span style={{ fontSize: 12, color: C.muet, fontWeight: 700,
                               padding: "6px 10px" }}>
                  {affectes.length} affecté·s
                </span>
              ) : (
                <button style={{ ...S.boutonLien, border: `1.5px solid ${C.bord}`,
                                 borderRadius: 9, padding: "6px 10px" }}
                        onClick={() => setOuvert(ouvertIci ? null : m.id)}>
                  {affectes.length} affecté·s
                </button>
              )}
            </div>

            {affectes.length === 0 && !ouvertIci && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: C.ambre, fontWeight: 600 }}>
                ⚠ Aucune équipe affectée
              </div>
            )}

            {/* Alerte au niveau de la carte : sans elle, un conflit ne se voit
                qu'en ouvrant le panneau d'affectation — donc jamais, une fois
                l'équipe posée. C'est ce qui laissait passer les doublons. */}
            {(() => {
              const v = verdictDe(m);
              if (v.ok) return null;
              const t = COULEURS_DISPO[v.niveau];
              return (
                <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 9,
                  background: t.fond, border: `1px solid ${t.bord}`,
                  fontSize: 11.5, color: t.texte, fontWeight: 600,
                  lineHeight: 1.45 }}>
                  {t.signe}
                  {v.problemes.map((p) =>
                    `${p.type === "vehicule" ? "🚛 " : ""}${p.nom} · ${p.raison}`
                  ).join(" — ")}
                </div>
              );
            })()}

            {/* Les trois heures du matin. Posées par le bureau, lues par le
                terrain. Aucune n'est devinée : ce qui manque reste vide. */}
            {!lectureSeule && m.type !== "visite" && (
              <HorairesMission mission={m} onEnregistre={recharger} />
            )}

            {/* Partage au terrain — geste distinct de l'affectation. Le bureau
                prépare son planning tranquillement, puis publie quand c'est sûr.
                Sans partage, le déménageur ne voit rien, même affecté. */}
            {!lectureSeule && (
            <button
              onClick={async () => {
                try { await partagerMission(m.id, !m.partagee); await recharger(); }
                catch (e) { alert(e.message); }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                marginTop: 10, padding: "9px 12px", borderRadius: 10, cursor: "pointer",
                border: `1.5px solid ${m.partagee ? "#A7F3D0" : C.bord}`,
                background: m.partagee ? "#ECFDF5" : C.blanc,
                color: m.partagee ? "#065F46" : C.muet,
                fontSize: 12.5, fontWeight: 700, textAlign: "left",
              }}>
              <span>{m.partagee ? "📣" : "🔒"}</span>
              <span style={{ flex: 1 }}>
                {m.partagee ? "Partagée au terrain" : "Non partagée — le terrain ne la voit pas"}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: C.fantome }}>
                {m.partagee ? "Retirer" : "Partager"}
              </span>
            </button>
            )}

            {affectes.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                {affectes.map((id) => {
                  const mem = tousMembres.find((x) => x.id === id);
                  const archive = mem && mem.actif === false;
                  return (
                    <span key={id} style={{ fontSize: 11.5, fontWeight: 600,
                      color: archive ? C.muet : C.bleu,
                      background: archive ? C.doux : C.bleuClair,
                      borderRadius: 999, padding: "3px 9px" }}>
                      {mem?.nom || "Membre supprimé"}{archive ? " (archivé)" : ""}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Brief équipe : LE geste quotidien (alignement 09 §3) */}
            {m.affaire_id && (
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button onClick={() => copierBrief(m)} style={{
                  flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${C.bord}`, background: "#fff",
                  fontSize: 12.5, fontWeight: 700, color: C.encre,
                }}>{copie === m.id ? "✓ Copié" : "📋 Copier le brief"}</button>
                <button onClick={() => whatsappBrief(m)} style={{
                  flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
                  border: "none", background: "#25D366", color: "#fff",
                  fontSize: 12.5, fontWeight: 700,
                }}>💬 WhatsApp</button>
              </div>
            )}

            {ouvertIci && !lectureSeule && (
              <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`, paddingTop: 10 }}>
                <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 8 }}>
                  Touchez un membre pour l'affecter ou le retirer. Un membre déjà pris
                  ce jour-là est signalé en rouge — sans être interdit.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(() => {
                    // Membres proposés : les actifs + tout membre archivé qui est
                    // ENCORE affecté à cette mission (pour pouvoir le retirer).
                    const idsActifs = new Set(membres.map((x) => x.id));
                    const archivesAffectes = affectes
                      .filter((id) => !idsActifs.has(id))
                      .map((id) => tousMembres.find((x) => x.id === id) || { id, nom: "Membre archivé", actif: false });
                    return [...membres, ...archivesAffectes];
                  })().map((mem) => {
                    const estAffecte = affectes.includes(mem.id);
                    const estArchive = mem.actif === false;
                    // Calculé MÊME si déjà affecté : sans ça, un doublon
                    // disparaît de l'écran à l'instant où on le crée (INC-19).
                    const dispo = dispoMembre(mem.id, m);
                    const teinte = COULEURS_DISPO[dispo.niveau];
                    const raison = dispo.raison || (estArchive ? "archivé" : null);
                    const choisi = selection?.missionId === m.id
                      && selection?.type === "membre" && selection?.id === mem.id;
                    return (
                      <button key={mem.id}
                        onClick={() => choisir(m.id, "membre", mem.id, mem.nom, estAffecte)}
                        style={{
                        padding: "7px 12px", borderRadius: 999, cursor: "pointer",
                        fontSize: 12.5, fontWeight: 600,
                        outline: choisi ? `2px solid ${C.vert}` : "none",
                        // Un membre affecté ET en doublon garde la teinte du
                        // problème : c'est justement le cas qu'on veut voir.
                        border: `1.5px solid ${dispo.conflit ? teinte.bord
                                 : estAffecte ? C.bleu : C.bord}`,
                        background: dispo.conflit ? teinte.fond
                                  : estAffecte ? C.bleuClair
                                  : estArchive ? C.doux : C.blanc,
                        color: dispo.conflit ? teinte.texte
                             : estAffecte ? C.bleu
                             : estArchive ? C.muet : C.encre,
                      }}>
                        {estAffecte ? "✓ " : teinte.signe}{mem.nom}
                        {raison ? ` · ${raison}` : ""}
                      </button>
                    );
                  })}
                </div>

                {/* Camions de la mission — même mécanique 2 clics. */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {flotte.map((v) => {
                    const present = (m.camions || []).includes(v.id);
                    // Un camion ne peut pas être à deux chantiers à la fois :
                    // aucun contrôle n'existait auparavant.
                    const dispoV = dispoCamion(v.id, m);
                    const teinteV = COULEURS_DISPO[dispoV.niveau];
                    const choisi = selection?.missionId === m.id
                      && selection?.type === "camion" && selection?.id === v.id;
                    return (
                      <button key={v.id}
                        onClick={() => choisir(m.id, "camion", v.id, v.nom, present)}
                        style={{
                          padding: "7px 12px", borderRadius: 999, cursor: "pointer",
                          fontSize: 12.5, fontWeight: 600,
                          outline: choisi ? `2px solid ${C.vert}` : "none",
                          border: `1.5px solid ${dispoV.conflit ? teinteV.bord
                                   : present ? "#0F766E" : C.bord}`,
                          background: dispoV.conflit ? teinteV.fond
                                    : present ? "#F0FDFA" : C.blanc,
                          color: dispoV.conflit ? teinteV.texte
                               : present ? "#0F766E" : C.encre,
                        }}>
                        {present ? "✓ " : teinteV.signe}🚛 {v.nom}
                        {dispoV.raison ? ` · ${dispoV.raison}` : ""}
                      </button>
                    );
                  })}
                </div>

                {/* Confirmation : 2e clic. */}
                {selection?.missionId === m.id && (
                  <Confirmation
                    question={selection.present
                      ? `Retirer ${selection.nom} de cette mission ?`
                      : `Ajouter ${selection.nom} à cette mission ?`}
                    action={selection.present ? "Retirer" : "Ajouter"}
                    couleur={selection.present ? C.rouge : C.vert}
                    onConfirmer={confirmerSelection}
                    onAnnuler={() => setSelection(null)} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const btnFleche = {
  width: 38, height: 38, borderRadius: 10, border: `1.5px solid ${C.bord}`,
  background: "#fff", cursor: "pointer", fontSize: 16, color: C.encre, fontWeight: 700,
};

/**
 * Les trois heures prévues d'une mission, posées par le bureau.
 *   départ  : les hommes quittent le dépôt
 *   heure   : heure du déménagement liée à la date (généralement 08:00)
 *   arrivée : arrivée à la première adresse (chargement)
 * Le temps de route s'affiche en dessous — il se déduit, il ne se saisit pas.
 */
function HorairesMission({ mission, onEnregistre }) {
  const [edition, setEdition] = useState(false);
  const [f, setF] = useState({
    depart: hhmm(mission.heure_depart_prevue),
    heure: hhmm(mission.heure) || HEURE_DEFAUT,
    arrivee: hhmm(mission.heure_arrivee_prevue),
  });
  const [erreur, setErreur] = useState(null);

  const r = resumeHoraires({
    depart: mission.heure_depart_prevue, heure: mission.heure,
    arrivee: mission.heure_arrivee_prevue,
  });

  async function enregistrer() {
    setErreur(null);
    const v = verifierHoraires(f);
    if (!v.ok) { setErreur(v.message); return; }
    try {
      await definirHorairesMission(mission.id, f);
      setEdition(false);
      await onEnregistre();
    } catch (e) { setErreur(e.message); }
  }

  if (!edition) {
    return (
      <button onClick={() => setEdition(true)} style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        marginTop: 8, padding: "8px 11px", borderRadius: 10, cursor: "pointer",
        border: `1px dashed ${r.complet ? C.bord : C.ambre}`, background: C.blanc,
        textAlign: "left" }}>
        <span>🕗</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600,
                       color: r.complet ? C.encre : C.ambre }}>
          {r.depart || r.arrivee
            ? `Départ ${r.depart || "—"} · sur place ${r.arrivee || "—"}`
              + (r.route ? ` · ${r.route} de route` : "")
            : "Heures de départ et d'arrivée non définies"}
        </span>
        <span style={{ fontSize: 11.5, color: C.fantome }}>
          {r.complet ? "Modifier" : "Définir"}
        </span>
      </button>
    );
  }

  const champ = (cle, libelle, aide) => (
    <div style={{ flex: 1, minWidth: 96 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.encre }}>{libelle}</div>
      {aide && (
        <div style={{ fontSize: 10.5, color: C.fantome, lineHeight: 1.3,
                      marginBottom: 3 }}>{aide}</div>
      )}
      <input type="time" value={f[cle]} aria-label={libelle}
        onChange={(e) => setF((x) => ({ ...x, [cle]: e.target.value }))}
        style={{ ...S.input, margin: 0, padding: "8px 9px" }} />
    </div>
  );

  return (
    <div style={{ marginTop: 8, padding: 11, borderRadius: 10,
                  border: `1px solid ${C.bord}`, background: "#F8FAFC" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {champ("depart", "Départ", "du dépôt")}
        {champ("heure", "Déménagement", "heure client")}
        {champ("arrivee", "Sur place", "1re adresse")}
      </div>
      {erreur && (
        <div style={{ fontSize: 11.5, color: C.rouge, marginTop: 7 }}>{erreur}</div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
        <button onClick={enregistrer} style={{ ...S.boutonPlein, margin: 0,
          padding: "9px 16px", fontSize: 13 }}>Enregistrer</button>
        <button onClick={() => setEdition(false)} style={{ ...S.boutonLien,
          padding: "9px 10px" }}>Annuler</button>
      </div>
    </div>
  );
}
