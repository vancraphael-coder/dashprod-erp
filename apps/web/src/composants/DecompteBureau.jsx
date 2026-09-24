/**
 * DÉCOMPTE DE FIN DE CHANTIER — côté bureau, dans le Calcul définitif.
 *
 * Le chef d'équipe a validé des heures sur le terrain et appelle. Le bureau
 * voit ici sa proposition, l'ajuste si besoin, donne la VALIDATION FINALE, puis
 * note que le montant a été annoncé au client. Le terrain voit la validation
 * apparaître sans recharger.
 *
 * Le montant est recalculé ici par le MÊME moteur que le devis : si le chiffre
 * du chef ne correspond pas au barème, l'écart est signalé avant de valider.
 * Le bureau peut aussi conclure seul si le terrain n'a rien envoyé.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  montantPourHeures, formaterDuree, MOMENTS, rangEtape, ETAPES,
  reglesDecompte, decrireRegles,
} from "@domaine/operations/decompte-chantier.js";
import * as adaptateur from "../lib/adaptateur.js";
import { C, euros } from "../lib/theme.jsx";

// Accents vifs en dur (lisibles dans les deux modes) ; fonds, filets et
// encres par les jetons du thème, qui suivent le mode nuit.
const OR = "#D97706", VERT = "#059669";
const RAFRAICHIR_MS = 10000;

const heure = (v) => (v ? new Date(v).toLocaleTimeString("fr-BE",
  { hour: "2-digit", minute: "2-digit" }) : "—");
const jour = (v) => (v ? new Date(v).toLocaleDateString("fr-BE",
  { weekday: "short", day: "numeric", month: "short" }) : "");

export default function DecompteBureau({ affaireId, api = adaptateur }) {
  const [missions, setMissions] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [erreur, setErreur] = useState(null);
  const monte = useRef(true);

  async function charger() {
    try {
      const liste = await api.decomptesAffaire(affaireId);
      if (!monte.current) return;
      setMissions(liste);
      // Les entrées du devis et le barème sont les mêmes pour tout le dossier :
      // un seul contexte suffit.
      if (!ctx && liste?.length) {
        const c = await api.decompteContexte(liste[0].mission_id).catch(() => null);
        if (monte.current) setCtx(c);
      }
      setErreur(null);
    } catch (e) { if (monte.current) setErreur(e.message); }
  }

  useEffect(() => {
    monte.current = true;
    charger();
    return () => { monte.current = false; };
  }, [affaireId]);

  const toutAnnonce = (missions || []).every((m) => m.decompte?.statut === "communique");
  useEffect(() => {
    if (!missions || toutAnnonce) return undefined;
    const t = setInterval(charger, RAFRAICHIR_MS);
    return () => clearInterval(t);
  }, [missions && 1, toutAnnonce]);

  if (erreur && !missions) {
    return <Cadre><p style={{ color: C.rouge, fontSize: 13, margin: 0 }}>{erreur}</p></Cadre>;
  }
  if (!missions) return null;
  if (missions.length === 0) return null;

  const entrees = ctx?.entrees || null;
  if (entrees?.formule === "forfait") {
    return (
      <Cadre>
        <Titre />
        <p style={{ fontSize: 13, color: C.muet, margin: 0 }}>
          Forfait : le prix est ferme, il n'y a pas de décompte horaire.
        </p>
      </Cadre>
    );
  }

  return (
    <Cadre attente={missions.some((m) => m.decompte?.statut === "valide_chef")}>
      <Titre />
      {missions.map((m) => (
        <Mission key={m.mission_id} m={m} entrees={entrees}
                 parametres={ctx?.parametres_prix} api={api} recharger={charger}
                 plusieurs={missions.length > 1} />
      ))}
    </Cadre>
  );
}

function Mission({ m, entrees, parametres, api, recharger, plusieurs }) {
  const d = m.decompte || null;
  const statut = d?.statut || null;
  const ref = useMemo(() => adaptateur.refPrixDepuis(parametres), [parametres]);
  const regles = useMemo(() => reglesDecompte(parametres?.decompte), [parametres]);
  // Le bureau ajuste au pas de l'entreprise (¼ h par défaut), jamais sous le minimum.
  const pasH = Math.max(regles.pas_minutes, 1) / 60;
  const plancher = regles.minimum_heures;

  const heuresDepart = d?.heures_final ?? d?.heures_chef ?? entrees?.heures ?? 0;
  const [heures, setHeures] = useState(Number(heuresDepart) || 0);
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  // Quand le chef (re)valide, le bureau repart de SA proposition.
  useEffect(() => { setHeures(Number(heuresDepart) || 0); }, [d?.valide_chef_le, entrees?.heures]);

  const montant = useMemo(() => {
    if (!entrees) return null;
    try { return montantPourHeures(entrees, heures, ref); } catch { return null; }
  }, [entrees, heures, ref]);

  // Le chiffre du chef se retrouve-t-il au barème ? Sinon, on le dit.
  const controleChef = useMemo(() => {
    if (!entrees || d?.heures_chef == null) return null;
    try {
      const attendu = montantPourHeures(entrees, Number(d.heures_chef), ref)?.tvac_centimes;
      return attendu === Number(d.tvac_chef_centimes) ? null : attendu;
    } catch { return null; }
  }, [entrees, d?.heures_chef, d?.tvac_chef_centimes, ref]);

  async function agir(fn) {
    setEnvoi(true); setErreur(null);
    try { await fn(); await recharger(); }
    catch (e) { setErreur(e.message); }
    finally { setEnvoi(false); }
  }

  const rang = rangEtape(statut);
  const l = d?.lignes || {};

  return (
    <div style={{ marginTop: plusieurs ? 14 : 4 }}>
      {plusieurs && (
        <div style={{ fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 6,
                      textTransform: "capitalize" }}>
          {jour(m.date)} · {m.type}
        </div>
      )}
      <Etapes rang={rang} />

      {/* ── Proposition du chef ── */}
      {d?.heures_chef != null ? (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 12,
                      background: C.blanc, border: `1px solid ${C.bord}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10,
                        alignItems: "baseline", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: C.encre }}>
              Chef d'équipe{m.chef ? ` · ${m.chef}` : ""}
            </span>
            <span style={{ fontSize: 11.5, color: C.muet }}>
              validé à {heure(d.valide_chef_le)} · {MOMENTS[d.moment]?.court || ""}
            </span>
          </div>
          <div style={{ display: "grid", gap: 2, marginTop: 8, fontSize: 12.5, color: C.muet }}>
            <Detail l="Écoulé depuis le départ" v={formaterDuree(l.travaillees)} />
            {l.pauses > 0 && <Detail l="Pauses" v={`− ${formaterDuree(l.pauses)}`} />}
            {l.dechargement != null && <Detail l="Déchargement estimé" v={formaterDuree(l.dechargement)} />}
            {l.retour != null && <Detail l="Retour au dépôt" v={formaterDuree(l.retour)} />}
            <Detail l="Facturé" v={formaterDuree(Math.round(Number(d.heures_chef) * 60))} fort />
          </div>
          <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900, color: C.encre,
                        fontVariantNumeric: "tabular-nums" }}>
            {euros(d.tvac_chef_centimes)} <span style={{ fontSize: 12, color: C.muet }}>TVAC</span>
          </div>
          {controleChef != null && (
            <div style={{ marginTop: 6, fontSize: 12, color: C.rouge, fontWeight: 700 }}>
              ⚠ Au barème actuel, ces heures donnent {euros(controleChef)}. Vérifiez avant de valider.
            </div>
          )}
        </div>
      ) : statut !== "valide_bureau" && statut !== "communique" && (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10,
                      background: C.doux, fontSize: 12.5, color: C.muet, lineHeight: 1.45 }}>
          Le chef d'équipe n'a pas encore envoyé son décompte
          {m.depart ? ` (départ pointé à ${heure(m.depart)})` : ""}. Vous pouvez aussi
          conclure ici au téléphone.
        </div>
      )}

      {/* ── Validation finale ── */}
      {(statut == null || statut === "valide_chef") && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: C.teinteAmbre,
                      border: `1.5px solid ${OR}55` }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".07em",
                        textTransform: "uppercase", color: OR }}>Validation finale</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8,
                        flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: C.encreAmbre, flex: "1 1 120px" }}>Heures facturées</span>
            <button aria-label="Moins un pas" onClick={() => setHeures((h) => Math.max(plancher, +(h - pasH).toFixed(2)))}
                    style={pas}>−</button>
            <span style={{ minWidth: 76, textAlign: "center", fontSize: 17, fontWeight: 900,
                           color: C.encreAmbre, fontVariantNumeric: "tabular-nums" }}>
              {formaterDuree(Math.round(heures * 60))}
            </span>
            <button aria-label="Plus un pas" onClick={() => setHeures((h) => +(h + pasH).toFixed(2))}
                    style={pas}>+</button>
          </div>
          <div style={{ fontSize: 11.5, color: C.encreAmbre, marginTop: 6 }}>
            Règle de l'entreprise : {decrireRegles(regles)}
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)}
                 placeholder="Note pour le chef (facultatif)"
                 style={{ width: "100%", boxSizing: "border-box", marginTop: 10,
                          padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${OR}40`,
                          fontSize: 16, background: C.blanc }} />
          <button disabled={envoi || !montant} onClick={() => agir(() => api.decompteValiderBureau(
                    m.mission_id, { heures, htvaCentimes: montant.htva_centimes,
                                    tvacCentimes: montant.tvac_centimes, note }))}
                  style={{ width: "100%", marginTop: 10, minHeight: 50, borderRadius: 12,
                           border: "none", cursor: "pointer", color: "#fff", fontSize: 15,
                           fontWeight: 900, background: `linear-gradient(135deg, ${VERT}, #047857)` }}>
            {envoi ? "Validation…" : montant ? `✓ Valider ${euros(montant.tvac_centimes)} TVAC` : "Barème indisponible"}
          </button>
        </div>
      )}

      {/* ── À annoncer / annoncé ── */}
      {(statut === "valide_bureau" || statut === "communique") && (
        <div style={{ marginTop: 10, padding: "14px 12px", borderRadius: 14, textAlign: "center",
                      background: C.teinteVerte,
                      border: `1.5px solid ${VERT}55` }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".08em",
                        textTransform: "uppercase", color: VERT }}>
            {statut === "communique" ? `✓ Annoncé au client à ${heure(d.communique_le)}`
                                     : "📞 À annoncer au client"}
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: C.encreVert, marginTop: 4,
                        letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>
            {euros(d.tvac_final_centimes)}
          </div>
          <div style={{ fontSize: 12.5, color: C.encreVert }}>
            TVAC · {formaterDuree(Math.round(Number(d.heures_final) * 60))} · validé à {heure(d.valide_bureau_le)}
            {m.bureau ? ` par ${m.bureau}` : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: statut === "valide_bureau" ? "2fr 1fr" : "1fr",
                        gap: 8, marginTop: 12 }}>
            {statut === "valide_bureau" && (
              <button disabled={envoi} onClick={() => agir(() => api.decompteCommunique(m.mission_id))}
                      style={{ minHeight: 48, borderRadius: 12, border: "none", cursor: "pointer",
                               background: VERT, color: "#fff", fontSize: 14, fontWeight: 900 }}>
                Montant annoncé au client
              </button>
            )}
            <button disabled={envoi} onClick={() => agir(() => api.decompteRouvrir(m.mission_id))}
                    style={{ minHeight: 48, borderRadius: 12, cursor: "pointer",
                             border: `1.5px solid ${C.bord}`, background: C.blanc,
                             color: C.muet, fontSize: 13, fontWeight: 700 }}>
              Rouvrir
            </button>
          </div>
        </div>
      )}

      {erreur && (
        <div style={{ marginTop: 8, fontSize: 12.5, color: C.rouge }}>{erreur}</div>
      )}
    </div>
  );
}

function Cadre({ children, attente }) {
  return (
    <section aria-label="Décompte de fin de chantier" style={{
      margin: "0 16px 12px", padding: 16, borderRadius: 16, background: C.teinteAmbre,
      border: `1.5px solid ${attente ? OR : C.filetAmbre}`,
      boxShadow: attente ? `0 0 0 4px ${OR}1F` : "none",
    }}>{children}</section>
  );
}

function Titre() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 900, color: C.encre }}>
        Décompte de fin de chantier
      </span>
      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
                     color: "#fff", background: OR, letterSpacing: ".04em" }}>NOUVEAU</span>
    </div>
  );
}

function Etapes({ rang }) {
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid",
                 gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
      {ETAPES.map((e, i) => {
        const fait = rang > i, courant = rang === i;
        return (
          <li key={e.statut} style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.25,
                color: fait ? VERT : courant ? OR : "#94A3B8" }}>
            <div style={{ height: 4, borderRadius: 4, marginBottom: 5,
                          background: fait ? VERT : courant ? OR : C.filetNeutre }} />
            {fait ? "✓ " : ""}{["Chef d'équipe", "Bureau", "Client"][i]}
          </li>
        );
      })}
    </ol>
  );
}

function Detail({ l, v, fort }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span>{l}</span>
      <span style={{ fontWeight: fort ? 800 : 600, color: fort ? C.encre : C.muet,
                     fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  );
}

const pas = {
  width: 44, height: 44, borderRadius: 11, border: `1.5px solid ${OR}66`, background: C.blanc,
  color: C.encreAmbre, fontSize: 20, fontWeight: 800, cursor: "pointer", lineHeight: 1,
};
