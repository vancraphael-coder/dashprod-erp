// =============================================================================
// Écran — Abonnement.
//
// Deux moments, très différents :
//   1. CHOISIR une offre : comparer, voir ce qu'on gagne, ce qu'on perd.
//   2. TRANSITIONNER quand on redescend : désigner qui garde son accès.
//
// Le second est celui qui compte. Principe posé par Raphaël, et gravé dans le
// code : **on n'efface jamais de données**. Les accès qui dépassent la
// nouvelle limite sont ARCHIVÉS, pas supprimés — c'est exactement ce qui
// permet de remonter plus tard sans avoir rien perdu.
//
// L'écran ne choisit donc jamais à la place de l'utilisateur : il dit combien
// de places restent, et le laisse désigner. Décider soi-même qui perd son
// compte serait la pire des automatisations.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  obtenirOrganisation, listerMembres, exigencesOffre, changerOffre,
} from "../lib/adaptateur.js";
import {
  PLANS, plan, module, prixPeriode, gainSurPrecedent, modulesAVenir,
  REMISE_ANNUELLE_PCT, ESSAI_JOURS, ESSAI_PLAN,
  joursEssaiRestants, selectionRecevable,
} from "@domaine/commercial/plans.js";
import { C, S, euros } from "../lib/theme.jsx";

export default function Abonnement({ retour }) {
  const [org, setOrg] = useState(null);
  const [membres, setMembres] = useState([]);
  const [periodicite, setPeriodicite] = useState("mensuel");
  const [cible, setCible] = useState(null);       // offre en cours de choix
  const [exig, setExig] = useState(null);         // ce que la bascule exige
  const [conserver, setConserver] = useState([]); // qui garde son accès
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function charger() {
    const o = await obtenirOrganisation().catch(() => null);
    setOrg(o);
    if (o?.periodicite) setPeriodicite(o.periodicite);
    setMembres((await listerMembres().catch(() => []))
      .filter((m) => m.actif !== false));
  }
  useEffect(() => { charger(); }, []);

  const actuel = org?.plan || "regular";
  const essaiRestant = joursEssaiRestants(org?.essai_fin);

  async function choisir(cle) {
    setErreur(null); setCible(cle); setConserver([]);
    if (cle === actuel) { setExig(null); return; }
    try { setExig(await exigencesOffre(cle)); }
    catch (e) { setErreur(e.message); setExig(null); }
  }

  async function appliquer() {
    setEnCours(true); setErreur(null);
    try {
      await changerOffre(cible, { periodicite, conserver });
      setCible(null); setExig(null); setConserver([]);
      await charger();
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  const aArchiver = exig?.a_archiver || 0;
  const verdict = useMemo(
    () => aArchiver > 0
      ? selectionRecevable({ a_conserver: exig.limite_cible }, conserver.length)
      : { ok: true, message: null },
    [aArchiver, exig, conserver]);

  if (!org) return null;

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Paramètres</button>}
        <div style={S.titre}>Abonnement</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Votre offre {plan(actuel)?.nom} · {membres.length} utilisateur
          {membres.length > 1 ? "s" : ""} actif{membres.length > 1 ? "s" : ""}
        </div>
      </div>

      {essaiRestant > 0 && (
        <div style={{ margin: "0 16px 12px", padding: "11px 13px",
          borderRadius: 11, background: "#EEF2FF", border: "1px solid #C7D2FE",
          fontSize: 12.5, color: "#3730A3", lineHeight: 1.5 }}>
          <b>Essai {plan(ESSAI_PLAN)?.nom} en cours</b> — {essaiRestant} jour
          {essaiRestant > 1 ? "s" : ""} restant{essaiRestant > 1 ? "s" : ""}.
          À l'échéance, vous retrouverez votre offre {plan(actuel)?.nom} sans
          rien perdre.
        </div>
      )}

      {/* Périodicité : l'annuel se règle d'avance, remisé. */}
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Facturation</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[["mensuel", "Mensuelle"], ["annuel", `Annuelle −${REMISE_ANNUELLE_PCT} %`]]
            .map(([p, lib]) => (
            <button key={p} onClick={() => setPeriodicite(p)} style={{
              flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              border: `1.5px solid ${periodicite === p ? C.bleu : C.bord}`,
              background: periodicite === p ? "#E7EFFC" : C.blanc,
              color: periodicite === p ? C.bleu : C.muet }}>{lib}</button>
          ))}
        </div>
        {periodicite === "annuel" && (
          <div style={{ fontSize: 11.5, color: C.vert, marginTop: 8,
                        fontWeight: 600 }}>
            Vous économisez {euros(prixPeriode(actuel, "annuel").economie_centimes)}
            {" "}par an sur votre offre actuelle.
          </div>
        )}
      </div>

      {/* Les trois offres */}
      {PLANS.map((p) => {
        const prix = prixPeriode(p.cle, periodicite);
        const estActuel = p.cle === actuel;
        const gains = gainSurPrecedent(p.cle);
        const aVenir = modulesAVenir(p.cle);
        return (
          <div key={p.cle} style={{ ...S.carte,
            borderWidth: estActuel || cible === p.cle ? 2 : 1,
            borderColor: estActuel ? C.vert : cible === p.cle ? C.bleu : C.bord }}>
            <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "baseline" }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: C.encre }}>
                {p.nom}
                {estActuel && (
                  <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700,
                    color: C.vert, background: "#ECFDF5", borderRadius: 999,
                    padding: "2px 8px", border: "1px solid #A7F3D0" }}>
                    votre offre
                  </span>
                )}
              </span>
              <span style={{ textAlign: "right" }}>
                <span style={{ display: "block", fontSize: 18, fontWeight: 800 }}>
                  {euros(periodicite === "annuel"
                    ? prix.equivalent_mensuel_centimes : prix.total_centimes)}
                </span>
                <span style={{ display: "block", fontSize: 10.5, color: C.fantome }}>
                  HTVA / mois{periodicite === "annuel" ? " · payé à l'année" : ""}
                </span>
              </span>
            </div>

            <div style={{ fontSize: 12.5, color: C.muet, marginTop: 4,
                          lineHeight: 1.5 }}>
              {p.promesse} · {p.utilisateurs ?? "∞"} utilisateur
              {p.utilisateurs !== 1 ? "s" : ""}
            </div>

            {gains.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.fantome,
                  textTransform: "uppercase", letterSpacing: ".05em" }}>
                  En plus de {PLANS[PLANS.indexOf(p) - 1].nom}
                </div>
                {gains.filter((c) => module(c)?.livre).map((c) => (
                  <div key={c} style={{ fontSize: 12.5, color: C.encre,
                                        marginTop: 4, display: "flex", gap: 7 }}>
                    <span style={{ color: C.vert, fontWeight: 800 }}>✓</span>
                    {module(c).titre}
                  </div>
                ))}
                {aVenir.length > 0 && aVenir.map((c) => (
                  <div key={c} style={{ fontSize: 12, color: C.fantome,
                                        marginTop: 4, display: "flex", gap: 7 }}>
                    <span>◦</span>{module(c).titre} — à venir
                  </div>
                ))}
              </div>
            )}

            {!estActuel && (
              <button onClick={() => choisir(p.cle)} style={{
                width: "100%", marginTop: 12, padding: "11px", borderRadius: 10,
                cursor: "pointer", fontSize: 13, fontWeight: 700,
                border: `1.5px solid ${C.bleu}`,
                background: cible === p.cle ? C.bleu : C.blanc,
                color: cible === p.cle ? "#fff" : C.bleu }}>
                {plan(p.cle).prix_centimes > plan(actuel).prix_centimes
                  ? `Passer à ${p.nom}` : `Redescendre en ${p.nom}`}
              </button>
            )}
          </div>
        );
      })}

      {/* ── La transition : ce que le changement exige ────────────────── */}
      {exig && (
        <div style={{ ...S.carte, borderColor: C.bleu, borderWidth: 2 }}>
          <label style={{ ...S.label, marginTop: 0 }}>
            Passage vers {plan(cible)?.nom}
          </label>

          {/* Les modules perdus : annoncés, mais SANS arbitrage. Leurs données
              restent — c'est ce qui permet de remonter sans rien perdre. */}
          {(exig.modules_perdus || []).length > 0 && (
            <div style={{ padding: "10px 12px", borderRadius: 10,
              background: "#FFFBEB", border: "1px solid #FDE68A",
              fontSize: 12, color: "#92400E", lineHeight: 1.5,
              marginBottom: 10 }}>
              <b>Vous n'aurez plus accès à :</b>{" "}
              {exig.modules_perdus.map((c) => module(c)?.titre || c).join(", ")}.
              <div style={{ marginTop: 4 }}>
                Vos données restent enregistrées : elles redeviendront
                accessibles si vous remontez d'offre.
              </div>
            </div>
          )}

          {aArchiver > 0 ? (
            <>
              <div style={{ fontSize: 12.5, color: C.encre, lineHeight: 1.55,
                            marginBottom: 10 }}>
                Cette offre comprend <b>{exig.limite_cible} accès</b> et vous
                avez <b>{exig.utilisateurs_actifs} personnes actives</b>.
                Désignez qui conserve son accès — les autres seront
                <b> archivés, jamais supprimés</b> : leurs heures, leurs
                chantiers et leur historique restent intacts, et il suffira de
                les réactiver si vous remontez.
              </div>

              {membres.map((m) => {
                const choisi = conserver.includes(m.id);
                const complet = conserver.length >= exig.limite_cible && !choisi;
                return (
                  <button key={m.id} disabled={complet}
                    onClick={() => setConserver((v) => choisi
                      ? v.filter((x) => x !== m.id) : [...v, m.id])}
                    style={{ display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "10px 12px", marginBottom: 6,
                      borderRadius: 10, textAlign: "left",
                      cursor: complet ? "default" : "pointer",
                      opacity: complet ? .45 : 1,
                      border: `1.5px solid ${choisi ? C.vert : C.bord}`,
                      background: choisi ? "#ECFDF5" : C.blanc }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5,
                      border: `1.5px solid ${choisi ? C.vert : C.bord}`,
                      background: choisi ? C.vert : "#fff", color: "#fff",
                      fontSize: 12, display: "grid", placeItems: "center",
                      flexShrink: 0 }}>{choisi ? "✓" : ""}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: 13,
                        fontWeight: 700, color: C.encre }}>{m.nom || m.email}</span>
                      <span style={{ display: "block", fontSize: 11,
                        color: C.fantome }}>
                        {choisi ? "garde son accès" : "sera archivé"}
                      </span>
                    </span>
                  </button>
                );
              })}

              {verdict.message && (
                <div style={{ fontSize: 12, color: verdict.ok ? C.muet : C.rouge,
                              marginTop: 4 }}>{verdict.message}</div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: C.muet, lineHeight: 1.5,
                          marginBottom: 10 }}>
              Aucun arbitrage nécessaire : le changement s'applique
              immédiatement.
            </div>
          )}

          {erreur && (
            <div style={{ fontSize: 12.5, color: C.rouge, background: "#FEF2F2",
              border: "1px solid #FECACA", borderRadius: 10, padding: "10px 12px",
              marginTop: 10, lineHeight: 1.5 }}>{erreur}</div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={{ ...S.boutonPlein, margin: 0, flex: 1,
                             opacity: verdict.ok ? 1 : .5 }}
              disabled={!verdict.ok || enCours} onClick={appliquer}>
              {enCours ? "Application…" : `Confirmer le passage en ${plan(cible)?.nom}`}
            </button>
            <button style={{ ...S.boutonLien, padding: "10px 12px" }}
              onClick={() => { setCible(null); setExig(null); setErreur(null); }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      <div style={{ margin: "0 16px", fontSize: 11, color: C.fantome,
                    lineHeight: 1.55 }}>
        {ESSAI_JOURS} jours d'essai offerts sur l'offre {plan(ESSAI_PLAN)?.nom}.
        Aucune donnée n'est jamais supprimée lors d'un changement d'offre.
      </div>
      <div style={{ height: 30 }} />
    </div>
  );
}
