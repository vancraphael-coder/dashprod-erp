// =============================================================================
// Repère de localisation — badge, saisie et mini-plan.
//
// Le besoin est VISUEL : situer une zone ou un box sans lire une fiche. Trois
// nombres alignés ne se lisent pas d'un coup d'œil, donc :
//   · un BADGE compact « B12 · É2 » ;
//   · une SAISIE en trois listes de positions RÉELLES — on choisit parmi les
//     allées qui existent, on n'en invente pas une en tapant un nombre ;
//   · un MINI-PLAN qui montre la case allumée parmi les voisines.
//
// Les libellés, formats et bornes viennent de l'ORGANISATION. Rien n'est en
// dur ici : ce fichier dessine, `@domaine/stocks/repere.js` décide.
// =============================================================================

import React from "react";
import {
  axes, repereDe, formaterRepere, decrireRepere, repereVide, repereRecevable,
  valeurAxe, valeursAxe, etendue,
} from "@domaine/stocks/repere.js";
import { C } from "../lib/theme.jsx";

/** Le badge compact posé sur une carte de zone ou de box. */
export function BadgeRepere({ entite, genre = "zone", reglageAxes }) {
  const r = repereDe(entite, genre);
  if (repereVide(r)) return null;
  return (
    <span title={decrireRepere(r, reglageAxes)} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 7px", borderRadius: 6, fontSize: 11,
      fontWeight: 800, letterSpacing: 0.3, whiteSpace: "nowrap",
      background: C.bleuClair, color: C.bleu,
      border: `1px solid ${C.bord}`, fontVariantNumeric: "tabular-nums",
    }}>
      <PictoRepere />
      {formaterRepere(r, reglageAxes)}
    </span>
  );
}

/**
 * La saisie : une liste par axe, alimentée par ce que l'organisation a
 * déclaré. Choisir « allée D » dans une liste de A à F est plus rapide et
 * plus sûr que taper « 4 » en devinant que 4 veut dire D.
 */
export function SaisieRepere({ valeur, onChange, genre = "zone", reglageAxes }) {
  const r = valeur || { x: null, y: null, z: null };
  const A = axes(reglageAxes);
  const verdict = repereRecevable(r, reglageAxes);

  function poser(cle, brut) {
    onChange({ ...r, [cle]: brut === "" ? null : Number(brut) });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6,
                    fontSize: 11.5, color: C.muet, fontWeight: 700,
                    marginBottom: 6 }}>
        <PictoRepere />Repère dans le dépôt
        <span style={{ fontWeight: 500 }}>— facultatif</span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {["x", "y", "z"].map((cle) => {
          const axe = A[cle];
          return (
            <div key={cle} style={{ flex: 1, minWidth: 0 }}>
              <label style={{ display: "block", fontSize: 10.5, color: C.muet,
                              marginBottom: 3, whiteSpace: "nowrap",
                              overflow: "hidden", textOverflow: "ellipsis" }}>
                {axe.libelle}
              </label>
              <select
                value={r[cle] ?? ""}
                onChange={(e) => poser(cle, e.target.value)}
                style={{
                  width: "100%", padding: "8px 6px", borderRadius: 9,
                  border: `1px solid ${C.bord}`, fontSize: 14,
                  textAlign: "center", background: "transparent",
                  color: C.encre, boxSizing: "border-box",
                }}>
                <option value="">—</option>
                {valeursAxe(axe).map((v) => (
                  <option key={v.valeur} value={v.valeur}>{v.libelle}</option>
                ))}
                {/* Une valeur héritée hors bornes reste sélectionnable :
                    sinon, ouvrir une vieille fiche l'effacerait en silence. */}
                {r[cle] != null
                  && !valeursAxe(axe).some((v) => v.valeur === r[cle]) && (
                  <option value={r[cle]}>{valeurAxe(r[cle], axe)} (hors dépôt)</option>
                )}
              </select>
            </div>
          );
        })}
      </div>

      {!verdict.ok && (
        <div style={{ fontSize: 11.5, color: C.rouge, marginTop: 5 }}>
          {verdict.message}
        </div>
      )}
      {!repereVide(r) && verdict.ok && (
        <div style={{ fontSize: 11.5, color: C.muet, marginTop: 5 }}>
          {decrireRepere(r, reglageAxes)}
        </div>
      )}
    </div>
  );
}

/**
 * Mini-plan vu de dessus : premier axe en colonnes, deuxième en lignes. La
 * case courante est pleine, les autres entités du dépôt en creux — on voit à
 * la fois où l'on est et ce qu'il y a autour, ce qu'aucun nombre ne donne.
 */
export function MiniPlan({ entites, genre = "zone", courant, reglageAxes,
                           hauteur = 96 }) {
  const liste = entites || [];
  const A = axes(reglageAxes);
  const cadre = etendue(liste, genre, reglageAxes);
  const r = courant ? repereDe(courant, genre) : null;

  const cols = Math.max(cadre.xMax, r?.x || 1);
  const lignes = Math.max(cadre.yMax, r?.y || 1);
  if (cols < 1 || lignes < 1) return null;

  const occupees = new Set(
    liste.map((e) => {
      const p = repereDe(e, genre);
      return p.x != null && p.y != null ? `${p.x}|${p.y}` : null;
    }).filter(Boolean)
  );

  const pas = Math.max(6, Math.min(hauteur / lignes, 18));

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10.5, color: C.muet, marginBottom: 4 }}>
        Vue de dessus — {A.x.libelle.toLowerCase()}s en colonnes,{" "}
        {A.y.libelle.toLowerCase()}s en lignes
      </div>
      <svg width="100%" height={lignes * pas}
           viewBox={`0 0 ${cols * pas} ${lignes * pas}`}
           preserveAspectRatio="xMinYMin meet"
           style={{ display: "block", maxWidth: cols * pas * 2 }}
           role="img"
           aria-label={r && !repereVide(r)
             ? decrireRepere(r, reglageAxes) : "Plan du dépôt"}>
        {Array.from({ length: lignes }).map((_, iy) =>
          Array.from({ length: cols }).map((__, ix) => {
            const x = ix + 1, y = iy + 1;
            const estCourant = r && r.x === x && r.y === y;
            const estOccupe = occupees.has(`${x}|${y}`);
            return (
              <rect key={`${x}-${y}`}
                x={ix * pas + 1} y={iy * pas + 1}
                width={pas - 2} height={pas - 2} rx={2}
                fill={estCourant ? C.bleu : estOccupe ? C.bleuClair : "transparent"}
                stroke={estCourant ? C.bleu : C.bord}
                strokeWidth={estCourant ? 1.5 : 0.7} />
            );
          })
        )}
      </svg>
    </div>
  );
}

/** Petit picto de position — dessiné, pour ne dépendre d'aucune police. */
function PictoRepere() {
  return (
    <svg width="9" height="11" viewBox="0 0 9 11" aria-hidden="true"
         style={{ flexShrink: 0 }}>
      <path d="M4.5 0C2 0 0 2 0 4.5C0 7.5 4.5 11 4.5 11S9 7.5 9 4.5C9 2 7 0 4.5 0Z"
            fill="currentColor" opacity="0.85" />
      <circle cx="4.5" cy="4.4" r="1.6" fill="#fff" />
    </svg>
  );
}
