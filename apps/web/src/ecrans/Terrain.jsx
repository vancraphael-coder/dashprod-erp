// =============================================================================
// APP TERRAIN — Mes chantiers (l'app des équipes sur le terrain).
// Alignement page 11. Deux apps en une : le BUREAU voit tout ; le TERRAIN voit
// SES chantiers, sans prix ni coûts. Le cloisonnement est RÉEL (RLS +
// capacités), pas une simulation d'affichage.
//
// Cet écran : liste de mes missions triées par date (aujourd'hui en tête),
// fiche chantier repliable (adresses + itinéraire, équipe, camions, à démonter,
// remarques, brief WhatsApp), et chrono sur sessions serveur (supérieur au
// chrono navigateur du modèle, qui se perd si l'app se ferme).
// =============================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  mesMissionsTerrain, pointageDefinir, pauseAjouter, pauseRetirer, terminerChantier,
} from "../lib/adaptateur.js";
import {
  instant, heureDe, corrigerJourSuivant, secondesTravail, formaterDuree,
  etatPointage, verifierPointage, pausesValides,
} from "@domaine/operations/pointage.js";
import { resumeHoraires } from "@domaine/operations/horaires.js";
import { couleurTypeMission, libelleTypeMission } from "@domaine/operations/missions.js";
import RapportChantier from "./RapportChantier.jsx";
import { listerConges, obtenirOrganisation } from "../lib/adaptateur.js";
import { urlVersAdresse } from "@domaine/communication/brief.js";
import { C, S, Confirmation } from "../lib/theme.jsx";

function aujourdhui() { return new Date().toISOString().slice(0, 10); }

function dateLongue(iso) {
  if (!iso) return "Date à définir";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long",
    });
  } catch { return iso; }
}

export default function Terrain({ profil, versConsult }) {
  const [missions, setMissions] = useState([]);
  const [conges, setConges] = useState([]);
  const [org, setOrg] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [chargement, setChargement] = useState(true);

  async function recharger() {
    if (!profil?.utilisateur_id) return;
    // Deux sources distinctes : les chantiers PARTAGÉS par le bureau, et mes
    // congés. Un congé n'est pas une mission — il n'a pas de dossier, pas
    // d'équipe, pas de chrono. Il occupe juste ma journée.
    setMissions(await mesMissionsTerrain(profil.utilisateur_id).catch(() => []));
    setOrg(await obtenirOrganisation().catch(() => null));
    const tous = await listerConges().catch(() => []);
    setConges((tous || []).filter((c) => c.utilisateur_id === profil.utilisateur_id));
    setChargement(false);
  }
  useEffect(() => { recharger(); }, [profil?.utilisateur_id]);

  const triees = useMemo(() => {
    const auj = aujourdhui();
    return [...missions].sort((a, b) => {
      // Aujourd'hui d'abord, puis chronologique.
      const aAuj = a.date === auj, bAuj = b.date === auj;
      if (aAuj && !bAuj) return -1;
      if (bAuj && !aAuj) return 1;
      return (a.date || "").localeCompare(b.date || "");
    });
  }, [missions]);

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={S.titre}>Mes chantiers</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          Bonjour {profil?.nom || ""} — {triees.length} mission{triees.length > 1 ? "s" : ""}
        </div>
      </div>

      {chargement && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet }}>Chargement…</div>
      )}
      {!chargement && triees.length === 0 && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Aucun chantier partagé pour le moment.
        </div>
      )}

      {/* Mes congés — pas des missions : aucun dossier, aucun chrono. */}
      {!chargement && conges.length > 0 && (
        <div style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>Mes congés</label>
          {conges.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10,
                                     padding: "9px 0", borderTop: `1px solid ${C.doux}` }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%",
                             background: C.ambre, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 600,
                               color: C.encre }}>
                  {jourCourt(c.debut)} → {jourCourt(c.fin)}
                </span>
                {c.motif && (
                  <span style={{ display: "block", fontSize: 11.5, color: C.fantome,
                                 marginTop: 2 }}>{c.motif}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {triees.map((m) => (
        <Chantier org={org} key={m.id} mission={m} profil={profil}
                  ouvert={ouvert === m.id}
                  onToggle={() => setOuvert(ouvert === m.id ? null : m.id)}
                  onChrono={recharger} versConsult={versConsult} />
      ))}
    </div>
  );
}

function Chantier({ mission, profil, org, ouvert, onToggle, onChrono, versConsult }) {
  // Clôturer arrête le décompte de toute l'équipe : geste du chef d'équipe.
  const caps = profil?.capacites || [];
  const peutCloturer = caps.includes("cloturer_chantier")
                    || caps.includes("gerer_planning");
  const estAujourdhui = mission.date === aujourdhui();

  // Le pointage vit dans la session « travail » : son début est le départ,
  // sa fin l'arrivée. Les autres sessions sont des pauses déclarées.
  const travail = (mission.sessions || [])
    .find((x) => (x.type || "travail") === "travail") || {};
  const depart = travail.debut ? new Date(travail.debut) : null;
  const arrivee = travail.fin ? new Date(travail.fin) : null;
  const pauses = (mission.sessions || []).filter((x) => x.type === "pause");

  const [saisie, setSaisie] = useState({ depart: "", arrivee: "" });
  const [nouvellePause, setNouvellePause] = useState(null);
  const [erreur, setErreur] = useState(null);

  const etat = etatPointage(depart, arrivee, pauses);

  // Les heures prévues par le bureau. Rien n'est calculé ni deviné : ce que le
  // bureau n'a pas renseigné reste vide.
  const prevu = resumeHoraires({
    depart: mission.heure_depart_prevue,
    heure: mission.heure,
    arrivee: mission.heure_arrivee_prevue,
  });

  // Aucun compteur qui tourne : on n'affiche une durée que lorsque départ ET
  // arrivée sont déclarés. Rien n'est extrapolé depuis l'horloge système.

  // Les champs suivent ce qui est enregistré, tant qu'on n'y touche pas.
  useEffect(() => {
    setSaisie({ depart: heureDe(depart), arrivee: heureDe(arrivee) });
  }, [travail.debut, travail.fin]);

  /** Pose un instant : « maintenant » d'un geste, ou l'heure saisie. */
  async function poser(quoi, valeur) {
    setErreur(null);
    try {
      let t = valeur instanceof Date ? valeur : instant(mission.date, valeur);
      if (!t) { setErreur("Heure incomplète (format 07:30)."); return; }
      if (quoi === "arrivee") t = corrigerJourSuivant(depart, t);

      const v = verifierPointage(quoi === "depart" ? t : depart,
                                 quoi === "arrivee" ? t : arrivee, pauses);
      if (!v.ok) { setErreur(v.message); return; }

      await pointageDefinir(mission.id, { [quoi]: t });
      await onChrono();
    } catch (e) { setErreur(e.message); }
  }
  async function enregistrerPause() {
    setErreur(null);
    try {
      const d = instant(mission.date, nouvellePause?.debut);
      const f = instant(mission.date, nouvellePause?.fin);
      if (!d || !f) { setErreur("Indiquez le début et la fin de la pause."); return; }
      await pauseAjouter(mission.id, d, f);
      setNouvellePause(null);
      await onChrono();
    } catch (e) { setErreur(e.message); }
  }

  async function retirerPause(id) {
    setErreur(null);
    try { await pauseRetirer(id); await onChrono(); }
    catch (e) { setErreur(e.message); }
  }

  const [cloture, setCloture] = useState(false);
  // Le départ vient de l'adresse de l'entreprise (Paramètres → Identité).
  // Sans elle, pas d'itinéraire : un kilométrage faux coûte plus cher qu'un
  // bouton absent.
  const enAttente = mission.etat === "brouillon";
  const termineTerrain = mission.etat === "terminee_terrain";
  const termine = mission.etat === "effectuee";

  // Fin du chantier côté TERRAIN : ferme le chrono et INDIQUE au bureau que
  // c'est terminé. Le dossier ne bascule pas en « effectué » ici — c'est le
  // bureau qui confirmera. Le terrain remonte, il ne tranche pas (0088).
  async function confirmerFin() {
    await terminerChantier(mission.id);
    setCloture(false);
    await onChrono();
  }

  return (
    <div style={{ ...S.carte,
      borderLeft: `4px solid ${couleurTypeMission(mission.type)}` }}>
      {/* Bandeau à valider */}
      {enAttente && (
        <div style={{ margin: "-4px 0 8px", padding: "5px 9px", borderRadius: 8,
          background: "#F5F3FF", color: "#5B21B6", fontSize: 11, fontWeight: 700 }}>
          En attente de validation par le bureau
        </div>
      )}

      <div onClick={onToggle} style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {estAujourdhui && (
            <span style={{ fontSize: 10.5, fontWeight: 800, color: C.vert,
              textTransform: "uppercase", letterSpacing: ".05em" }}>Aujourd'hui</span>
          )}
          {/* Type de chantier : déménagement vert, visite bleu. */}
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase",
            letterSpacing: ".04em", padding: "2px 8px", borderRadius: 999,
            color: couleurTypeMission(mission.type),
            background: couleurTypeMission(mission.type) + "1A" }}>
            {libelleTypeMission(mission.type)}
          </span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.encre, marginTop: 3 }}>
          {mission.client || "—"}
        </div>
        <div style={{ fontSize: 12.5, color: C.muet, textTransform: "capitalize" }}>
          {dateLongue(mission.date)}{mission.heure ? ` · ${(mission.heure || "").slice(0, 5)}` : ""}
        </div>
      </div>

      {ouvert && (
        <div style={{ marginTop: 12 }}>
          {/* DOUBLE MINUTEUR — départ et arrivée déclarés.
              Le bureau prévoit, le terrain déclare. Chaque heure se pose d'un
              geste (« maintenant ») ou se corrige à la main : un téléphone
              oublié dans le camion ne doit pas fausser une paie. */}
          <div style={{ background: "#0F172A", borderRadius: 12, padding: 14,
            marginBottom: 12 }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em",
                textTransform: "uppercase",
                color: etat.phase === "termine" ? "#34D399"
                     : etat.phase === "encours" ? "#FBBF24" : "#94A3B8" }}>
                {etat.phase === "termine" ? "✓ Chantier terminé" : etat.libelle}
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#fff",
                fontFamily: "ui-monospace, monospace", letterSpacing: ".02em",
                marginTop: 2 }}>
                {etat.secondes != null ? formaterDuree(etat.secondes)
                  : etat.encours ? `depuis ${heureDe(depart)}` : "—:—"}
              </div>
              {etat.encours && (
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3, lineHeight: 1.4 }}>
                  La durée sera calculée une fois l'arrivée déclarée.
                </div>
              )}
              {pauses.length > 0 && (
                <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>
                  pauses déduites
                </div>
              )}
            </div>

            {/* Le programme du bureau. Le minuteur, juste en dessous,
                enregistre ce qui s'est réellement passé. */}
            {(prevu.depart || prevu.arrivee) && !arrivee && (
              <div style={{ marginBottom: 10, padding: "9px 12px", borderRadius: 10,
                background: "#1E293B", display: "flex", gap: 14,
                justifyContent: "center", flexWrap: "wrap" }}>
                {prevu.depart && (
                  <span style={{ fontSize: 12.5, color: "#E2E8F0" }}>
                    Départ prévu <b style={{ color: "#FBBF24" }}>{prevu.depart}</b>
                  </span>
                )}
                {prevu.arrivee && (
                  <span style={{ fontSize: 12.5, color: "#E2E8F0" }}>
                    Sur place <b style={{ color: "#FBBF24" }}>{prevu.arrivee}</b>
                  </span>
                )}
                {prevu.route && (
                  <span style={{ fontSize: 11.5, color: "#94A3B8" }}>
                    ({prevu.route} de route)
                  </span>
                )}
              </div>
            )}

            <div style={{ display: "grid", gap: 8,
                          gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))" }}>
              <Minuteur
                titre="Départ" prevu={prevu.depart} valeur={saisie.depart}
                pose={!!depart} accent="#22C55E"
                onSaisir={(v) => setSaisie((x) => ({ ...x, depart: v }))}
                onMaintenant={() => poser("depart", new Date())}
                onValider={() => poser("depart", saisie.depart)} />
              <Minuteur
                titre="Arrivée" prevu={prevu.arrivee} valeur={saisie.arrivee}
                pose={!!arrivee} accent="#3B82F6" inactif={!depart}
                onSaisir={(v) => setSaisie((x) => ({ ...x, arrivee: v }))}
                onMaintenant={() => poser("arrivee", new Date())}
                onValider={() => poser("arrivee", saisie.arrivee)} />
            </div>

            {/* Pauses déclarées : bornées, pas un compteur qu'on oublie. */}
            {pausesValides(pauses, depart, arrivee).map((pz) => (
              <div key={pz.id} style={{ display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: 8, marginTop: 8,
                padding: "7px 10px", borderRadius: 9, background: "#1E293B" }}>
                <span style={{ fontSize: 12.5, color: "#E2E8F0",
                  fontFamily: "ui-monospace, monospace" }}>
                  Pause {heureDe(pz.debut)} → {heureDe(pz.fin)}
                </span>
                <button onClick={() => retirerPause(pz.id)} style={{
                  background: "none", border: "none", color: "#F87171",
                  cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}>
                  Retirer
                </button>
              </div>
            ))}

            {depart && !nouvellePause && (
              <button onClick={() => setNouvellePause({ debut: "", fin: "" })}
                style={{ width: "100%", marginTop: 8, padding: "9px",
                  borderRadius: 9, border: "1px dashed #475569", cursor: "pointer",
                  background: "transparent", color: "#CBD5E1",
                  fontSize: 12.5, fontWeight: 700 }}>
                + Ajouter une pause
              </button>
            )}
            {nouvellePause && (
              <div style={{ marginTop: 8, padding: 10, borderRadius: 9,
                background: "#1E293B" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="time" value={nouvellePause.debut} aria-label="Début de pause"
                    onChange={(e) => setNouvellePause((p) => ({ ...p, debut: e.target.value }))}
                    style={champHeure} />
                  <input type="time" value={nouvellePause.fin} aria-label="Fin de pause"
                    onChange={(e) => setNouvellePause((p) => ({ ...p, fin: e.target.value }))}
                    style={champHeure} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={enregistrerPause} style={{ flex: 1, padding: "9px",
                    borderRadius: 9, border: "none", cursor: "pointer",
                    background: "#FBBF24", color: "#0F172A",
                    fontSize: 13, fontWeight: 800 }}>Enregistrer</button>
                  <button onClick={() => setNouvellePause(null)} style={{ padding: "9px 14px",
                    borderRadius: 9, border: "1px solid #475569", cursor: "pointer",
                    background: "transparent", color: "#CBD5E1",
                    fontSize: 13, fontWeight: 700 }}>Annuler</button>
                </div>
              </div>
            )}

            {erreur && (
              <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 9,
                background: "#7F1D1D", color: "#FEE2E2", fontSize: 12,
                lineHeight: 1.45 }}>{erreur}</div>
            )}
          </div>

          {/* Le rapport de chantier : ce que l'équipe remonte du terrain, et
              surtout les écarts avec ce que le bureau avait prévu. Visible dès
              le départ déclaré — un dommage se constate à l'arrivée, pas à la
              fin. Tout membre affecté peut constater ; seul le chef rédige le
              déroulé. */}
          {depart && (
            <RapportChantier mission={mission} peutRediger={peutCloturer} />
          )}

          {/* TERMINER : la vraie fin. Clôt le pointage de TOUTE l'équipe et
              fait passer le dossier en « effectué » au bureau — la facture
              devient possible. C'est pourquoi la base le réserve au chef
              d'équipe (capacité `cloturer_chantier`) : on n'arrête pas le
              décompte des autres. On masque le bouton plutôt que de laisser
              un déménageur se heurter à un refus après coup. */}
          {!termine && !termineTerrain && depart && !cloture && peutCloturer && (
            <button onClick={() => setCloture(true)} style={{
              width: "100%", padding: "12px", borderRadius: 11, marginBottom: 12,
              border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800,
              background: "linear-gradient(135deg, #059669, #047857)", color: "#fff",
            }}>✓ Terminer le chantier</button>
          )}
          {!termine && !termineTerrain && depart && !peutCloturer && (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10,
              background: "#1E293B", fontSize: 12, color: "#94A3B8",
              lineHeight: 1.45, textAlign: "center" }}>
              Vos heures sont enregistrées. Le chef d'équipe clôture le chantier.
            </div>
          )}
          {cloture && (
            <div style={{ marginBottom: 12 }}>
              <Confirmation
                question="Terminer le chantier ? Le chrono sera clôturé et le bureau recevra le chantier à confirmer."
                action="Terminer" couleur={C.vert}
                onConfirmer={confirmerFin}
                onAnnuler={() => setCloture(false)} />
            </div>
          )}

          {/* Terminé côté terrain, en attente du bureau. Le chef a fait sa part ;
              la décision d'« effectué » revient au bureau. */}
          {termineTerrain && (
            <div style={{ marginBottom: 12, padding: "11px 12px", borderRadius: 10,
              background: "#78350F", fontSize: 12.5, color: "#FDE68A",
              lineHeight: 1.45, textAlign: "center", fontWeight: 700 }}>
              ✓ Chantier remonté au bureau — en attente de confirmation
            </div>
          )}

          {/* Adresses + itinéraire */}
          <Bloc titre="Chargement" liste={mission.charges} couleur={C.bleu} />
          <Bloc titre="Déchargement" liste={mission.decharges} couleur="#6366F1" />

          {/* Équipe & camions */}
          {(mission.equipe.length > 0 || mission.camions.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
              {mission.equipe.map((n) => (
                <span key={n} style={puce(C.bleu)}>👤 {n}</span>
              ))}
              {mission.camions.map((n) => (
                <span key={n} style={puce("#0F766E")}>🚛 {n}</span>
              ))}
            </div>
          )}

          {/* À démonter */}
          {mission.aDemonter.length > 0 && (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE",
              borderRadius: 10, padding: "9px 12px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1E40AF",
                textTransform: "uppercase" }}>À démonter</div>
              <div style={{ fontSize: 12.5, color: "#1E3A8A", marginTop: 2 }}>
                {mission.aDemonter.map((it) => `${it.quantite}× ${it.nom}`).join(" · ")}
              </div>
            </div>
          )}

          {/* Remarques */}
          {mission.remarques && (
            <div style={{ fontSize: 12.5, color: C.muet, marginBottom: 10, lineHeight: 1.5 }}>
              <b style={{ color: C.encre }}>Remarques.</b> {mission.remarques}
            </div>
          )}

          {/* Consultation du dossier : les trois pages du bureau (dossier,
              relevé, matériel) en LECTURE SEULE — la même information, sans
              risque de modification. */}
          {versConsult && (
            <button onClick={() => versConsult(mission.affaire_id)} style={{
              width: "100%", padding: "11px", borderRadius: 10,
              border: `1.5px solid ${C.bleu}`, background: C.bleuClair,
              color: C.bleu, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>📖 Consulter le dossier</button>
          )}
        </div>
      )}
    </div>
  );
}

function Bloc({ titre, liste, couleur }) {
  const l = (liste || []).filter((a) => a.adresse);
  if (l.length === 0) return null;
  return (
    <div style={{ borderLeft: `3px solid ${couleur}`, paddingLeft: 10, marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
        color: "#64748B" }}>{titre}</div>
      {l.map((a, i) => {
        const versMaps = urlVersAdresse(a);
        return (
          <div key={a.id || i} style={{ marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, fontSize: 12.5, color: C.encre }}>
                {l.length > 1 ? `${i + 1}. ` : ""}{a.adresse}
                {a.etage ? ` · étage ${a.etage}` : ""}
                {a.ascenseur ? " · ascenseur" : ""}
                {a.monteMeubles ? " · monte-meubles" : ""}
              </div>
              {/* Un bouton par adresse : ma position → cette adresse dans Maps. */}
              {versMaps && (
                <a href={versMaps} target="_blank" rel="noreferrer" style={{
                  flexShrink: 0, textDecoration: "none", fontSize: 12, fontWeight: 700,
                  color: "#fff", background: couleur, borderRadius: 8,
                  padding: "5px 10px", whiteSpace: "nowrap",
                }}>🧭 Y aller</a>
              )}
            </div>
            {/* Remarques de l'article/pièce, ce qui attend l'équipe sur place. */}
            {a.remarques && (
              <div style={{ fontSize: 11.5, color: C.muet, marginTop: 2, lineHeight: 1.4 }}>
                {a.remarques}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const puce = (couleur) => ({
  fontSize: 11.5, fontWeight: 600, color: couleur,
  background: couleur + "18", borderRadius: 999, padding: "3px 9px",
});

/** Date courte pour l'affichage des congés. */
function jourCourt(iso) {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00")
      .toLocaleDateString("fr-BE", { day: "2-digit", month: "short" });
  } catch { return iso; }
}

/** Un minuteur : l'heure prévue, l'heure réelle, et deux façons de la poser. */
function Minuteur({ titre, prevu, valeur, pose, accent, inactif,
                    onSaisir, onMaintenant, onValider }) {
  return (
    <div style={{ padding: 10, borderRadius: 10, background: "#1E293B",
      opacity: inactif ? .5 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "baseline" }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: "#fff",
          textTransform: "uppercase", letterSpacing: ".05em" }}>{titre}</span>
        {prevu && (
          <span style={{ fontSize: 10.5, color: "#94A3B8" }}>
            prévu {String(prevu).slice(0, 5)}
          </span>
        )}
      </div>
      <input type="time" value={valeur} disabled={inactif} aria-label={titre}
        onChange={(e) => onSaisir(e.target.value)}
        onBlur={() => valeur && onValider()}
        style={{ ...champHeure, marginTop: 6,
          borderColor: pose ? accent : "#475569" }} />
      {!pose && (
        <button onClick={onMaintenant} disabled={inactif} style={{
          width: "100%", marginTop: 6, padding: "8px", borderRadius: 8,
          border: "none", cursor: inactif ? "default" : "pointer",
          background: accent, color: "#0F172A", fontSize: 12.5, fontWeight: 800 }}>
          Maintenant
        </button>
      )}
    </div>
  );
}

const champHeure = {
  width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 8,
  border: "1.5px solid #475569", background: "#0F172A", color: "#fff",
  fontSize: 15, fontFamily: "ui-monospace, monospace", textAlign: "center",
};
