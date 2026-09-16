// =============================================================================
// CALCUL DU TEMPS — en étapes, à la place d'un nombre estimé de tête.
//
// CE QU'IL REMPLACE. Un champ « Heures facturées » et un champ « Km », saisis
// séparément. Deux défauts qui coûtent de l'argent :
//
//   · le nombre d'heures ne se défend pas. « J'ai compté six heures » n'est
//     pas un argument devant un client qui conteste ; « 2 h 02 de route, 2 h de
//     chargement, 1 h 30 de déchargement » se défend ligne par ligne.
//   · l'oubli n'est jamais aléatoire : il porte TOUJOURS sur le trajet, parce
//     que c'est le seul temps où personne ne travaille. Mesuré sur un chantier
//     à 80 km : 2 h 02 oubliées, dont 1 h 01 pour le seul retour au dépôt.
//
// LES KILOMÈTRES NE SE SAISISSENT PLUS DEUX FOIS. Les étapes portent les
// distances ; le total alimente à la fois le temps de route et le poste
// kilométrique. Avant, on tapait les km une fois pour le prix et on les
// oubliait dans les heures — deux saisies de la même réalité, donc deux
// occasions de ne plus dire la même chose.
//
// LE MODE MANUEL RESTE. Un devis déjà commencé, ou un chantier atypique qu'on
// chiffre au doigt, garde le champ libre. Basculer est un choix explicite : on
// n'impose pas une méthode de calcul à qui a déjà la sienne.
//
// La logique vit dans `@domaine/chiffrage/temps-chantier.js` et n'est pas
// recalculée ici — cet écran saisit et affiche, il ne décide pas.
// =============================================================================

import React from "react";
import {
  VITESSE_ROUTE_KMH, PAS_FACTURATION_MINUTES, allerRetourSimple, detailTemps,
  heuresFacturables, formaterDuree, lignesLisibles,
} from "@domaine/chiffrage/temps-chantier.js";
import { C, S } from "../lib/theme.jsx";

const D = Object.freeze({
  kmDepotChargement: 0, kmChargementLivraison: 0, kmLivraisonDepot: null,
  chargementHeures: 2, chargementMinutes: 0,
  dechargementHeures: 1, dechargementMinutes: 30,
  majorationPct: 0,
});

/** Les étapes et les totaux d'un jeu de valeurs. Une seule source. */
export function calculer(t = {}) {
  const v = { ...D, ...t };
  const etapes = allerRetourSimple(v);
  const options = { majorationPct: v.majorationPct };
  const detail = detailTemps(etapes, options);
  return {
    etapes,
    detail,
    lignes: lignesLisibles(etapes, options),
    heures: heuresFacturables(etapes, options),
    km: detail.km_total,
  };
}

export default function CalculTemps({ temps, actif, onChange, onBasculer }) {
  const t = { ...D, ...(temps || {}) };
  const r = calculer(t);
  const maj = (cle) => (e) => {
    const brut = e.target.value;
    const n = brut === "" ? null : Number(String(brut).replace(",", "."));
    onChange({ ...t, [cle]: Number.isFinite(n) ? n : (n === null ? null : 0) });
  };

  if (!actif) {
    return (
      <button style={{ ...S.boutonSecondaire, marginTop: 8 }} onClick={onBasculer}>
        Calculer le temps en étapes
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 12,
                  background: C.teinteBleue || C.blanc,
                  border: `1px solid ${C.bord}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.encre, flex: 1 }}>
          Temps en étapes
        </div>
        <button style={{ ...S.boutonLien, padding: 0 }} onClick={onBasculer}>
          Saisie libre
        </button>
      </div>

      {/* ── Les distances ─────────────────────────────────────────────── */}
      <label style={S.label}>Dépôt → chargement (km)</label>
      <input style={{ ...S.input, marginTop: 0 }} type="number" min="0"
             inputMode="decimal" value={t.kmDepotChargement}
             onChange={maj("kmDepotChargement")} />

      <label style={S.label}>Chargement → livraison (km)</label>
      <input style={{ ...S.input, marginTop: 0 }} type="number" min="0"
             inputMode="decimal" value={t.kmChargementLivraison}
             onChange={maj("kmChargementLivraison")} />

      <label style={S.label}>Retour au dépôt (km)</label>
      <input style={{ ...S.input, marginTop: 0 }} type="number" min="0"
             inputMode="decimal"
             placeholder={`${(t.kmDepotChargement || 0) + (t.kmChargementLivraison || 0)} (trajet inverse)`}
             value={t.kmLivraisonDepot ?? ""}
             onChange={maj("kmLivraisonDepot")} />
      {/* Laissé vide, on présume le trajet inverse complet. Présumer zéro
          effacerait un temps réel — c'est celui qu'on oublie le plus. */}
      <div style={{ fontSize: 11.5, color: C.muet, marginTop: 4, lineHeight: 1.45 }}>
        Vide = trajet inverse. C'est du temps payé, et c'est celui qu'on oublie
        en estimant de tête.
      </div>

      {/* ── La manutention ────────────────────────────────────────────── */}
      <label style={S.label}>Chargement</label>
      <HeureMinute h={t.chargementHeures} m={t.chargementMinutes}
                   surH={maj("chargementHeures")} surM={maj("chargementMinutes")} />

      <label style={S.label}>Déchargement</label>
      <HeureMinute h={t.dechargementHeures} m={t.dechargementMinutes}
                   surH={maj("dechargementHeures")} surM={maj("dechargementMinutes")} />

      <label style={S.label}>Majoration trafic et pauses (%)</label>
      <input style={{ ...S.input, marginTop: 0 }} type="number" min="0" max="100"
             value={t.majorationPct} onChange={maj("majorationPct")} />
      {/* Explicite, et imprimée sur le devis. Un coefficient caché dans la
          formule mentirait sur la nature du chiffre : le modèle calcule un
          temps théorique, pas un temps de trajet réel. */}

      {/* ── Le détail, tel qu'il apparaîtra sur le devis ───────────────── */}
      <div style={{ marginTop: 14, paddingTop: 12,
                    borderTop: `1px solid ${C.bord}` }}>
        {r.lignes.map((l, i) => (
          <div key={`${l.libelle}-${i}`}
               style={{ display: "flex", gap: 10, fontSize: 12.5,
                        padding: "3px 0", color: C.muet }}>
            <span style={{ flex: 1, minWidth: 0 }}>{l.libelle}</span>
            <span style={{ flexShrink: 0, color: C.encre }}>{l.duree}</span>
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 8, paddingTop: 8,
                      borderTop: `1px solid ${C.bord}`, alignItems: "baseline" }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.encre }}>
            Total
          </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
            {formaterDuree(r.detail.minutes_total)}
          </span>
        </div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 4, lineHeight: 1.5 }}>
          Facturé <b>{r.heures} h</b> — arrondi au quart d'heure supérieur.
          {" "}{r.km} km au total, à {r.detail.vitesse_kmh} km/h.
        </div>
        {/* La convention de vitesse est une hypothèse de calcul, pas une
            mesure : un chiffre dont on ignore l'hypothèse ne se discute pas.
            Elle appartient au barème — voir le réglage à venir. */}
      </div>
    </div>
  );
}

function HeureMinute({ h, m, surH, surM }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input style={{ ...S.input, marginTop: 0, flex: 1 }} type="number" min="0"
             value={h} onChange={surH} />
      <span style={{ fontSize: 13, color: C.muet }}>h</span>
      <input style={{ ...S.input, marginTop: 0, flex: 1 }} type="number" min="0"
             max="59" step="5" value={m} onChange={surM} />
      <span style={{ fontSize: 13, color: C.muet }}>min</span>
    </div>
  );
}

export { VITESSE_ROUTE_KMH, PAS_FACTURATION_MINUTES };
