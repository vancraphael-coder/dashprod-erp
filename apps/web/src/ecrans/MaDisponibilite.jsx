// =============================================================================
// MA DISPONIBILITÉ — le premier écran du parcours de l'indépendant.
//
// CE QU'IL RÈGLE, et pourquoi c'est un réglage et pas un agenda. On ne saisit
// pas ses journées une par une : on pose un RYTHME une fois — « du lundi au
// vendredi » — et on ne touche plus qu'aux exceptions. Un agenda à remplir
// chaque semaine ne se remplit pas, et un agenda vide fait qu'on ne reçoit
// aucune proposition.
//
// CE QUE L'ÉCRAN MONTRE, ET CE QU'IL PROMET DE NE PAS MONTRER. Trois états
// visibles ici et nulle part ailleurs : pris (et par qui), fermé (et
// pourquoi), libre. À l'extérieur, seules les dates libres sortent — un
// donneur d'ordre ne peut pas distinguer « occupé chez un autre » de « en
// vacances ». L'écran le DIT, en bas : une garantie qu'on ne voit pas ne
// rassure personne.
//
// L'OCCUPATION NE SE SAISIT PAS. Un engagement accepté ferme la journée tout
// seul. C'est ce qui évite l'agenda qui ment : sans cette déduction, il
// faudrait retirer sa disponibilité après chaque acceptation, on l'oublierait,
// et on recevrait des propositions pour des jours déjà pris.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { monCalendrier, definirRythme, definirException } from "../lib/adaptateur.js";
import { JOURS, resumeRegles } from "@domaine/planning/disponibilites.js";
import { C, S } from "../lib/theme.jsx";

const iso = (d) => d.toISOString().slice(0, 10);

function plage(semaines = 4) {
  const du = new Date();
  du.setHours(0, 0, 0, 0);
  const au = new Date(du);
  au.setDate(au.getDate() + semaines * 7 - 1);
  return { du: iso(du), au: iso(au) };
}

const TONS = {
  libre: { fond: "teinteVerte", filet: "filetVert", encre: "encreVert", mot: "Libre" },
  pris: { fond: "teinteAmbre", filet: "filetAmbre", encre: "encreAmbre", mot: "Pris" },
  ferme: { fond: "teinteRouge", filet: "filetRouge", encre: "encreRouge", mot: "Fermé" },
  hors_regle: { fond: null, filet: null, encre: "muet", mot: "—" },
};

export default function MaDisponibilite({ retour }) {
  const { du, au } = useMemo(() => plage(4), []);
  const [jours, setJours] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(null);
  const [motif, setMotif] = useState("");
  const [aFermer, setAFermer] = useState(null);

  function charger() {
    monCalendrier(du, au)
      .then(setJours)
      .catch((e) => { setErreur(e?.message || "Lecture impossible"); setJours([]); });
  }
  useEffect(charger, [du, au]);

  // Le rythme se déduit du calendrier : les jours de semaine qui ressortent
  // « libre » sans exception. Le relire plutôt que le stocker à part évite
  // deux sources pour la même vérité.
  const rythme = useMemo(() => {
    if (!jours) return [];
    const vus = new Set();
    for (const j of jours) {
      if (j.etat === "libre" && !j.motif) {
        vus.add(new Date(`${j.date}T00:00:00Z`).getUTCDay() || 7);
      }
    }
    return [...vus].sort();
  }, [jours]);

  async function basculerJourSemaine(num) {
    setErreur(null);
    setEnCours(`j${num}`);
    const nouveau = rythme.includes(num)
      ? rythme.filter((x) => x !== num) : [...rythme, num].sort();
    try {
      await definirRythme(nouveau);
      charger();
    } catch (e) {
      setErreur(e?.message || "Changement refusé");
    } finally {
      setEnCours(null);
    }
  }

  async function fermer(date) {
    setErreur(null);
    setEnCours(date);
    try {
      await definirException(date, false, motif || null);
      setAFermer(null);
      setMotif("");
      charger();
    } catch (e) {
      setErreur(e?.message || "Refusé");
    } finally {
      setEnCours(null);
    }
  }

  async function rouvrir(date) {
    setErreur(null);
    setEnCours(date);
    try {
      // `null` retire l'exception et rend la main au rythme habituel — plutôt
      // que de poser une exception « disponible », qui survivrait à un
      // changement de rythme et finirait par surprendre.
      await definirException(date, null);
      charger();
    } catch (e) {
      setErreur(e?.message || "Refusé");
    } finally {
      setEnCours(null);
    }
  }

  if (jours === null) return null;
  const libres = jours.filter((j) => j.etat === "libre").length;

  return (
    <div style={{ ...S.page, paddingBottom: 90 }}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Retour</button>}
        <div style={S.titre}>Ma disponibilité</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          {libres} jour{libres > 1 ? "s" : ""} libre{libres > 1 ? "s" : ""} sur
          les quatre prochaines semaines
        </div>
      </div>

      {erreur && (
        <div style={{ ...S.carte, color: C.encreRouge, background: C.teinteRouge,
                      border: `1px solid ${C.filetRouge}`, fontSize: 13 }}>
          {erreur}
        </div>
      )}

      {/* ── LE RYTHME : posé une fois ──────────────────────────────────── */}
      <div style={S.carte}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: C.muet,
                      textTransform: "uppercase", letterSpacing: ".04em",
                      marginBottom: 4 }}>
          Mon rythme habituel
        </div>
        <div style={{ fontSize: 12.5, color: C.muet, marginBottom: 10,
                      lineHeight: 1.5 }}>
          {resumeRegles(rythme.map((j) => ({ jour: j })))}. Posé une fois, ça
          vaut pour toutes les semaines.
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {JOURS.map((j) => {
            const actif = rythme.includes(j.num);
            return (
              <button key={j.num} disabled={Boolean(enCours)}
                onClick={() => basculerJourSemaine(j.num)}
                style={{ padding: "8px 12px", borderRadius: 10, cursor: "pointer",
                         fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
                         border: `1.5px solid ${actif ? C.encreVert : C.bord}`,
                         background: actif ? C.teinteVerte : C.blanc,
                         color: actif ? C.encreVert : C.muet,
                         opacity: enCours === `j${j.num}` ? 0.5 : 1 }}>
                {j.court}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── LES QUATRE PROCHAINES SEMAINES ─────────────────────────────── */}
      <div style={S.carte}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: C.muet,
                      textTransform: "uppercase", letterSpacing: ".04em",
                      marginBottom: 10 }}>
          Les quatre prochaines semaines
        </div>

        {jours.map((j) => {
          const t = TONS[j.etat] || TONS.hors_regle;
          const d = new Date(`${j.date}T00:00:00`);
          return (
            <div key={j.date}
                 style={{ display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 0",
                          borderTop: `1px solid ${C.bord}`,
                          opacity: j.etat === "hors_regle" ? 0.45 : 1 }}>
              <div style={{ width: 96, flexShrink: 0, fontSize: 12.5,
                            color: C.encre }}>
                {d.toLocaleDateString("fr-BE",
                  { weekday: "short", day: "numeric", month: "short" })}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700,
                               padding: "3px 9px", borderRadius: 999,
                               color: C[t.encre],
                               background: t.fond ? C[t.fond] : "transparent",
                               border: t.filet ? `1px solid ${C[t.filet]}` : "none" }}>
                  {t.mot}
                </span>
                {/* Visible ICI seulement. À l'extérieur, ni le nom ni le
                    motif ne sortent. */}
                {j.pour && (
                  <span style={{ fontSize: 12, color: C.muet, marginLeft: 8 }}>
                    {j.pour}
                  </span>
                )}
                {j.motif && (
                  <span style={{ fontSize: 12, color: C.muet, marginLeft: 8 }}>
                    {j.motif}
                  </span>
                )}
              </div>

              {j.etat === "libre" && (
                <button style={{ ...S.boutonLien, padding: 0, flexShrink: 0 }}
                        disabled={Boolean(enCours)}
                        onClick={() => { setAFermer(j.date); setMotif(""); }}>
                  Fermer
                </button>
              )}
              {j.etat === "ferme" && (
                <button style={{ ...S.boutonLien, padding: 0, flexShrink: 0,
                                 color: C.encreVert }}
                        disabled={Boolean(enCours)}
                        onClick={() => rouvrir(j.date)}>
                  Rouvrir
                </button>
              )}
              {/* Une journée prise ne se ferme pas : il faudrait d'abord
                  annuler l'engagement, et ça se fait avec le donneur d'ordre,
                  pas d'un clic sur un agenda. */}
            </div>
          );
        })}
      </div>

      {aFermer && (
        <div style={S.carte}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.encre }}>
            Fermer le {aFermer}
          </div>
          <label style={S.label}>Motif (privé)</label>
          <input style={{ ...S.input, marginTop: 0 }} value={motif} autoFocus
                 placeholder="Congé" onChange={(e) => setMotif(e.target.value)} />
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 5,
                        lineHeight: 1.5 }}>
            Ce motif reste chez vous. Personne d'autre ne le voit — ni les
            donneurs d'ordre, ni l'éditeur de Dashprod.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={{ ...S.boutonPlein, flex: 1 }}
                    disabled={Boolean(enCours)} onClick={() => fermer(aFermer)}>
              Fermer cette journée
            </button>
            <button style={S.boutonSecondaire}
                    onClick={() => { setAFermer(null); setMotif(""); }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Une garantie qu'on ne voit pas ne rassure personne. */}
      <div style={{ ...S.carte, background: C.teinteVerte,
                    border: `1px solid ${C.filetVert}` }}>
        <div style={{ fontSize: 12.5, color: C.encreVert, lineHeight: 1.55 }}>
          <strong>Ce que les autres voient : uniquement vos jours libres.</strong>
          {" "}Pas vos journées prises, pas vos motifs, pas le nom de vos
          clients. Un donneur d'ordre ne peut pas distinguer une journée
          occupée d'une journée de congé — les deux lui apparaissent
          identiquement, comme indisponibles.
        </div>
      </div>
    </div>
  );
}
