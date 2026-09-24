/**
 * DÉCOMPTE DE FIN DE CHANTIER — côté terrain, le chef d'équipe.
 *
 * Le geste : avant le déchargement (ou avant de rentrer au dépôt), le chef
 * calcule ce que le client doit, le VALIDE, et appelle le bureau. Le bureau
 * donne la validation finale ; le montant validé apparaît ici, en grand, sans
 * recharger — c'est celui qu'on annonce au client.
 *
 * Même moteur que le devis (domaine/operations/decompte-chantier.js) : le
 * chiffre du terrain est celui que le bureau retrouve, au centime.
 *
 * `api` est injectable pour les tests visuels ; en production, l'adaptateur.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  decompterChantier, MOMENTS, formaterDuree, rangEtape, ETAPES,
  reglesDecompte, decrireRegles,
} from "@domaine/operations/decompte-chantier.js";
import * as adaptateur from "../lib/adaptateur.js";
import { euros } from "../lib/theme.jsx";

// Bloc sombre dans les deux modes, comme le minuteur de pointage juste au-dessus :
// sur un chantier en plein soleil, c'est le contraste qui compte.
const OR = "#FBBF24", VERT = "#34D399", GRIS = "#94A3B8", FOND = "#0F172A",
      PANNEAU = "#1E293B", BLANC = "#fff";
const RAFRAICHIR_MS = 10000;

const heure = (v) => (v ? new Date(v).toLocaleTimeString("fr-BE",
  { hour: "2-digit", minute: "2-digit" }) : "—");

export default function DecompteChef({ missionId, api = adaptateur, maintenant }) {
  const [ctx, setCtx] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [moment, setMoment] = useState(null);
  const [dech, setDech] = useState("");
  const [retour, setRetour] = useState("");
  const [horloge, setHorloge] = useState(() => maintenant || new Date());
  const [confirmer, setConfirmer] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [recalcul, setRecalcul] = useState(false);
  const monte = useRef(true);

  async function charger() {
    try {
      const c = await api.decompteContexte(missionId);
      if (!monte.current) return;
      setCtx(c);
      setErreur(null);
    } catch (e) { if (monte.current) setErreur(e.message); }
  }

  useEffect(() => {
    monte.current = true;
    charger();
    return () => { monte.current = false; };
  }, [missionId]);

  const d = ctx?.decompte || null;
  const statut = d?.statut || null;

  // Synchronisation avec le bureau : tant que le montant n'est pas annoncé,
  // on relit toutes les 10 s. Pas de temps réel à configurer, rien à casser.
  useEffect(() => {
    if (!ctx || statut === "communique") return undefined;
    const t = setInterval(charger, RAFRAICHIR_MS);
    return () => clearInterval(t);
  }, [ctx && 1, statut]);

  // L'horloge du calcul avance tant qu'on n'a pas validé.
  useEffect(() => {
    if (maintenant) return undefined;
    const t = setInterval(() => setHorloge(new Date()), 30000);
    return () => clearInterval(t);
  }, [maintenant]);

  // Reprendre les valeurs du chef quand un décompte existe déjà.
  useEffect(() => {
    if (!d) return;
    setMoment(d.moment || null);
    if (d.lignes?.dechargement != null) setDech(String(d.lignes.dechargement));
    if (d.lignes?.retour != null) setRetour(String(d.lignes.retour));
  }, [d?.valide_chef_le]);

  const ref = useMemo(() => adaptateur.refPrixDepuis(ctx?.parametres_prix), [ctx]);
  const regles = useMemo(() => reglesDecompte(ctx?.parametres_prix?.decompte), [ctx]);

  // Le retour au dépôt habituel de l'entreprise pré-remplit le champ — une
  // seule fois, et jamais par-dessus une valeur déjà saisie ou validée.
  useEffect(() => {
    if (ctx && !ctx.decompte && retour === "" && regles.retour_defaut_minutes != null) {
      setRetour(String(regles.retour_defaut_minutes));
    }
  }, [ctx && 1, regles.retour_defaut_minutes]);
  const calc = useMemo(() => {
    if (!ctx) return null;
    return decompterChantier({
      depart: ctx.depart, instant: horloge, pauses: ctx.pauses, moment,
      minutesDechargement: dech, minutesRetour: retour,
      entrees: ctx.entrees, ref, regles,
    });
  }, [ctx, horloge, moment, dech, retour, ref, regles]);

  if (erreur && !ctx) {
    return <Cadre><Message ton="rouge">{erreur}</Message></Cadre>;
  }
  if (!ctx) return <Cadre><Message>Chargement du décompte…</Message></Cadre>;

  const rang = rangEtape(statut);
  const verrouille = statut === "valide_bureau" || statut === "communique";
  const edition = !verrouille && (statut == null || recalcul);

  async function valider() {
    if (!calc?.pret || !calc.montant) return;
    setEnvoi(true); setErreur(null);
    try {
      await api.decompteValiderChef(missionId, {
        moment, calculeLe: horloge, lignes: calc.lignes, heures: calc.heures,
        htvaCentimes: calc.montant.htva_centimes, tvacCentimes: calc.montant.tvac_centimes,
      });
      setConfirmer(false); setRecalcul(false);
      await charger();
    } catch (e) { setErreur(e.message); }
    finally { setEnvoi(false); }
  }

  return (
    <Cadre action={!verrouille}>
      <Entete rang={rang} />

      {/* ── 3 · VALIDÉ PAR LE BUREAU : le chiffre à annoncer, en très grand ── */}
      {verrouille && (
        <div style={{ textAlign: "center", padding: "14px 10px 12px", borderRadius: 14,
                      background: "linear-gradient(160deg, #064E3B, #065F46)",
                      border: `1px solid ${VERT}55` }}>
          <div style={etiquette(VERT)}>
            {statut === "communique" ? "✓ Annoncé au client" : "✓ Validé par le bureau"}
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#fff", letterSpacing: "-.02em",
                        lineHeight: 1.1, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {euros(d.tvac_final_centimes)}
          </div>
          <div style={{ fontSize: 13, color: VERT, marginTop: 2 }}>
            TVAC · {formaterDuree(Math.round(Number(d.heures_final) * 60))} facturées
          </div>
          {d.heures_chef != null && Number(d.heures_final) !== Number(d.heures_chef) && (
            <div style={{ fontSize: 12, color: "#FCD34D", marginTop: 8 }}>
              Ajusté par le bureau : vous aviez {formaterDuree(Math.round(Number(d.heures_chef) * 60))}
              {" "}· {euros(d.tvac_chef_centimes)}
            </div>
          )}
          {d.note_bureau && (
            <div style={{ fontSize: 12.5, color: "#fff", marginTop: 8, fontStyle: "italic" }}>
              « {d.note_bureau} »
            </div>
          )}
          {statut === "communique" && (
            <div style={{ fontSize: 11.5, color: VERT, marginTop: 8 }}>
              Annoncé à {heure(d.communique_le)}
            </div>
          )}
        </div>
      )}

      {/* ── 2 · VALIDÉ PAR LE CHEF, en attente du bureau ── */}
      {statut === "valide_chef" && !recalcul && (
        <div style={{ padding: "12px", borderRadius: 14, background: PANNEAU,
                      border: `1px solid ${OR}40`, textAlign: "center" }}>
          <div style={etiquette(OR)}>En attente du bureau</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: BLANC, marginTop: 4,
                        fontVariantNumeric: "tabular-nums" }}>
            {euros(d.tvac_chef_centimes)}
          </div>
          <div style={{ fontSize: 12.5, color: GRIS }}>
            {formaterDuree(Math.round(Number(d.heures_chef) * 60))} · validé à {heure(d.valide_chef_le)}
            {" "}· {MOMENTS[d.moment]?.court || ""}
          </div>
          <div style={{ fontSize: 12.5, color: "#FCD34D", marginTop: 10, lineHeight: 1.45 }}>
            📞 Appelez le bureau pour la validation finale.
            Le montant validé s'affichera ici tout seul.
          </div>
          <button onClick={() => setRecalcul(true)} style={boutonSecondaire}>
            Recalculer
          </button>
        </div>
      )}

      {/* ── 1 · LE CALCUL ── */}
      {edition && calc && calc.forfait && (
        <div style={{ padding: 12, borderRadius: 12, background: PANNEAU, textAlign: "center" }}>
          <div style={etiquette(GRIS)}>Prix ferme (forfait)</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: BLANC, marginTop: 4 }}>
            {euros(calc.montant.tvac_centimes)}
          </div>
          <div style={{ fontSize: 12, color: GRIS, marginTop: 4 }}>
            Le montant ne dépend pas des heures : rien à calculer.
          </div>
        </div>
      )}

      {edition && calc && !calc.forfait && (
        <>
          {/* Le moment du calcul */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(MOMENTS).map(([cle, m]) => {
              const actif = moment === cle;
              return (
                <button key={cle} onClick={() => setMoment(cle)} style={{
                  padding: "12px 8px", borderRadius: 12, cursor: "pointer", minHeight: 58,
                  border: `2px solid ${actif ? OR : "#334155"}`,
                  background: actif ? `${OR}1F` : PANNEAU,
                  color: actif ? OR : "#CBD5E1", fontSize: 13.5, fontWeight: 800,
                  lineHeight: 1.2,
                }}>{m.court}</button>
              );
            })}
          </div>

          {moment && (
            <div style={{ marginTop: 12, padding: "4px 12px", borderRadius: 12,
                          background: PANNEAU }}>
              <Ligne libelle={`Écoulé depuis le départ (${heure(ctx.depart)})`}
                     valeur={ctx.depart ? formaterDuree(calc.lignes.travaillees) : "—"} />
              {calc.lignes.pauses > 0 && (
                <Ligne libelle="Pauses déclarées" valeur={`− ${formaterDuree(calc.lignes.pauses)}`} />
              )}
              {MOMENTS[moment].reste.includes("dechargement") && (
                <Pas libelle="Déchargement restant" valeur={dech} onChange={setDech} />
              )}
              <Pas libelle="Retour au dépôt" valeur={retour} onChange={setRetour} />
            </div>
          )}

          {moment && calc.manques.length > 0 && (
            <Message ton="or">{calc.manques.join(" ")}</Message>
          )}

          {moment && calc.pret && calc.montant && (
            <div style={{ marginTop: 12, textAlign: "center", padding: "14px 10px",
                          borderRadius: 14, background: `linear-gradient(160deg, ${OR}26, ${OR}0D)`,
                          border: `1px solid ${OR}66` }}>
              <div style={etiquette(OR)}>À payer par le client</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: "#fff", lineHeight: 1.1,
                            marginTop: 6, letterSpacing: "-.02em",
                            fontVariantNumeric: "tabular-nums" }}>
                {euros(calc.montant.tvac_centimes)}
              </div>
              <div style={{ fontSize: 13, color: "#FCD34D", marginTop: 2 }}>
                TVAC · {formaterDuree(calc.lignes.facturables)} facturées
                {calc.tauxHoraire ? ` · ${calc.nbDemenageurs} dém. à ${calc.tauxHoraire} €/h` : ""}
              </div>
              <div style={{ fontSize: 11.5, color: GRIS, marginTop: 4 }}>
                {euros(calc.montant.htva_centimes)} HTVA · {decrireRegles(calc.regles)}
                {calc.minimumApplique ? " (appliqué)" : ""}
                {calc.heuresDevis ? ` · devis : ${formaterDuree(Math.round(calc.heuresDevis * 60))}` : ""}
              </div>

              {!confirmer ? (
                <button onClick={() => setConfirmer(true)} style={boutonPrincipal}>
                  Valider les heures
                </button>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 13, color: BLANC, marginBottom: 8, lineHeight: 1.4 }}>
                    Valider {formaterDuree(calc.lignes.facturables)} pour{" "}
                    <b>{euros(calc.montant.tvac_centimes)}</b> ?
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button onClick={() => setConfirmer(false)} style={boutonSecondaireLarge}>
                      Annuler
                    </button>
                    <button onClick={valider} disabled={envoi} style={{ ...boutonPrincipal, marginTop: 0 }}>
                      {envoi ? "Envoi…" : "Oui, valider"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {recalcul && (
            <button onClick={() => setRecalcul(false)} style={boutonSecondaire}>
              Garder le décompte déjà validé
            </button>
          )}
        </>
      )}

      {erreur && <Message ton="rouge">{erreur}</Message>}
    </Cadre>
  );
}

// ─── Morceaux ────────────────────────────────────────────────────────────────

function Cadre({ children, action }) {
  return (
    <section aria-label="Décompte de fin de chantier" style={{
      background: FOND, borderRadius: 16, padding: 14, marginBottom: 12,
      border: `1.5px solid ${action ? OR + "80" : "#1E293B"}`,
      boxShadow: action ? `0 0 0 4px ${OR}14` : "none",
    }}>{children}</section>
  );
}

function Entete({ rang }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: ".07em",
                      textTransform: "uppercase", color: BLANC }}>
          Décompte de fin de chantier
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
                       color: FOND, background: OR, letterSpacing: ".04em" }}>NOUVEAU</span>
      </div>
      <ol style={{ listStyle: "none", padding: 0, margin: "10px 0 0",
                   display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {ETAPES.map((e, i) => {
          const fait = rang > i, courant = rang === i;
          return (
            <li key={e.statut} style={{ fontSize: 10.5, lineHeight: 1.25, fontWeight: 700,
                color: fait ? VERT : courant ? OR : "#64748B" }}>
              <div style={{ height: 4, borderRadius: 4, marginBottom: 5,
                            background: fait ? VERT : courant ? OR : "#334155" }} />
              {fait ? "✓ " : ""}{["Chef d'équipe", "Bureau", "Client"][i]}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Ligne({ libelle, valeur }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 10, padding: "10px 0", borderBottom: "1px solid #334155" }}>
      <span style={{ fontSize: 13, color: "#CBD5E1" }}>{libelle}</span>
      <span style={{ fontSize: 14.5, fontWeight: 800, color: BLANC,
                     fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{valeur}</span>
    </div>
  );
}

/** Durée en minutes, au pouce : −15 / +15, ou saisie directe. */
function Pas({ libelle, valeur, onChange }) {
  const n = valeur === "" ? null : Number(valeur);
  const pousser = (delta) => onChange(String(Math.max(0, (n || 0) + delta)));
  const vide = valeur === "";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 8, padding: "8px 0", borderBottom: "1px solid #334155" }}>
      <span style={{ fontSize: 13, color: vide ? OR : "#CBD5E1", flex: 1, minWidth: 0 }}>
        {libelle}{vide ? " ?" : ""}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <button aria-label={`${libelle} : moins 15 minutes`} onClick={() => pousser(-15)}
                style={boutonPas}>−</button>
        <input inputMode="numeric" aria-label={`${libelle} en minutes`} value={valeur}
          placeholder="min" onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
          style={{ width: 58, height: 40, textAlign: "center", borderRadius: 10,
                   border: `1.5px solid ${vide ? OR : "#475569"}`, background: FOND,
                   color: BLANC, fontSize: 16, fontWeight: 800 }} />
        <button aria-label={`${libelle} : plus 15 minutes`} onClick={() => pousser(15)}
                style={boutonPas}>+</button>
      </div>
    </div>
  );
}

function Message({ children, ton }) {
  const t = { rouge: ["#7F1D1D", "#FEE2E2"], or: ["#422006", "#FCD34D"] }[ton]
         || [PANNEAU, "#CBD5E1"];
  return (
    <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: t[0],
                  color: t[1], fontSize: 12.5, lineHeight: 1.45 }}>{children}</div>
  );
}

const etiquette = (c) => ({ fontSize: 11, fontWeight: 900, letterSpacing: ".08em",
                             textTransform: "uppercase", color: c });
const boutonPrincipal = {
  width: "100%", marginTop: 12, minHeight: 50, borderRadius: 12, border: "none",
  cursor: "pointer", fontSize: 15, fontWeight: 900, color: FOND,
  background: `linear-gradient(135deg, ${OR}, #F59E0B)`,
};
const boutonSecondaire = {
  width: "100%", marginTop: 10, minHeight: 44, borderRadius: 11, cursor: "pointer",
  border: "1.5px solid #475569", background: "transparent", color: "#CBD5E1",
  fontSize: 13, fontWeight: 700,
};
const boutonSecondaireLarge = { ...boutonSecondaire, marginTop: 0, minHeight: 50 };
const boutonPas = {
  width: 40, height: 40, borderRadius: 10, border: "1.5px solid #475569",
  background: PANNEAU, color: BLANC, fontSize: 20, fontWeight: 800, cursor: "pointer",
  lineHeight: 1,
};
