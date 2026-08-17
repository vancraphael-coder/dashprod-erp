// =============================================================================
// L'affectation d'une mission — voyant et volet dépliant.
//
// Vide par défaut, et assumé : rien n'est repris d'une mission à l'autre.
// Reprendre l'équipe du déménagement sur l'emballage ferait bloquer trois
// personnes une journée entière parce qu'on aurait oublié de corriger.
//
// Le VOYANT dit l'état d'un coup d'œil, avant même de déplier :
//   gris   — personne n'est affecté
//   orange — commencé, mais il manque quelque chose
//   vert   — la mission est pourvue
//
// Ce sont trois états, pas un dégradé : un dégradé de nuances ne se lit pas
// d'un coup d'œil, et c'est précisément ce qu'on cherche ici.
// =============================================================================

import React, { useState } from "react";
import {
  etatAffectation, couleurVoyant, resumeAffectation, exigence,
} from "@domaine/planning/affectation.js";
import Bille from "./Bille.jsx";
import { C, S } from "../lib/theme.jsx";

/** Le voyant est une BILLE — la mascotte, en taille puce. Trois états, pas un
 *  dégradé : un dégradé de nuances ne se lit pas d'un coup d'œil. */
const LISERE = { gris: "#94A3B8", orange: "#FB923C", vert: "#34D399" };

/**
 * L'ÉTAT EST PORTÉ PAR LA BARRE LATÉRALE, plus par une pastille.
 *
 * La bille est la mascotte : elle sert de repère et d'action. En faire aussi
 * un voyant lui donnait un troisième métier — et multipliait les points de
 * couleur au point qu'on ne savait plus lequel regarder. Le liseré de la
 * carte dit l'état sans rien ajouter à l'écran : il est déjà là, il longe
 * exactement ce qu'il qualifie, et il ne prend aucune place.
 *
 * Conservé comme composant vide pour ne pas casser les appelants : le liseré
 * est posé par la carte elle-même, via `LISERE[couleurVoyant(...)]`.
 */
export function Voyant() { return null; }

/**
 * Le volet d'une mission : ligne repliée avec voyant et résumé, contenu
 * déplié avec les membres et les véhicules.
 */
export function VoletAffectation({
  mission, membres, flotte, valeur, onChange, ouvertParDefaut = false,
}) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  const a = valeur || { membres: [], vehicules: [] };
  const verdict = etatAffectation(mission.type, a, flotte);
  const ex = exigence(mission.type);
  const bordEtat = LISERE[couleurVoyant(verdict.etat)] || LISERE.gris;

  function basculerMembre(id) {
    const l = a.membres || [];
    onChange({ ...a, membres: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] });
  }
  function basculerVehicule(id) {
    const l = a.vehicules || [];
    onChange({ ...a, vehicules: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] });
  }

  // Un lift ne se réserve qu'avec un lift : proposer un fourgon ici n'aurait
  // aucun sens. Les autres missions gardent toute la flotte.
  const flotteOfferte = ex.categorie
    ? (flotte || []).filter((v) => (v.categorie || "camion") === ex.categorie)
    : (flotte || []);

  return (
    <div style={{
      ...S.carte,
      // Le liseré reprend la couleur du voyant : la carte entière signale son
      // état, comme une carte d'abonnement.
      borderLeft: `3px solid ${bordEtat}`,
      padding: 0, overflow: "hidden",
    }}>
      <button onClick={() => setOuvert(!ouvert)}
        aria-expanded={ouvert}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "12px 14px", border: "none", background: "none",
          cursor: "pointer", textAlign: "left",
        }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.encre }}>
            {ex.titre}
            {mission.date && (
              <span style={{ fontWeight: 400, color: C.muet }}>
                {" · "}{jour(mission.date)}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 1 }}>
            {resumeAffectation(a)}
            {verdict.etat === "partiel" && verdict.manques[0]
              ? ` — ${verdict.manques[0].toLowerCase()}` : ""}
          </div>
        </div>
        {/* La flèche est une bille, avec le même suivi 3D que la vitrine :
            elle tourne quand le volet s'ouvre. */}
        <Bille taille="jeton" ton="bleu" signe="chevron" actif={ouvert} />
      </button>

      {ouvert && (
        <div style={{ padding: "0 14px 14px" }}>
          {/* La règle du métier, dite une fois, là où elle sert. */}
          <div style={{ fontSize: 11.5, color: C.muet, lineHeight: 1.5,
                        marginBottom: 10 }}>
            {ex.note}
          </div>

          <Titre>Équipe</Titre>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(membres || []).length === 0 && (
              <span style={{ fontSize: 12, color: C.muet }}>Aucun membre actif.</span>
            )}
            {(membres || []).map((m) => (
              <Jeton key={m.id} actif={(a.membres || []).includes(m.id)}
                     onClick={() => basculerMembre(m.id)} texte={m.nom} />
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <Titre>
              Véhicules
              {ex.categorie ? ` — ${ex.categorie}s seulement` : ""}
            </Titre>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {flotteOfferte.length === 0 && (
                <span style={{ fontSize: 12, color: C.muet }}>
                  {ex.categorie
                    ? `Aucun véhicule de catégorie ${ex.categorie} dans la flotte.`
                    : "Aucun véhicule."}
                </span>
              )}
              {flotteOfferte.map((v) => (
                <Jeton key={v.id} actif={(a.vehicules || []).includes(v.id)}
                       onClick={() => basculerVehicule(v.id)} texte={v.nom} />
              ))}
            </div>
          </div>

          {verdict.manques.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 11.5, lineHeight: 1.5,
                          color: verdict.etat === "vide" ? C.muet : C.ambre }}>
              {verdict.manques.join(" · ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Titre = ({ children }) => (
  <div style={{ fontSize: 10.5, fontWeight: 800, color: C.muet, marginBottom: 6,
                textTransform: "uppercase", letterSpacing: ".04em" }}>{children}</div>
);

function Jeton({ actif, onClick, texte }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 12px", borderRadius: 999, cursor: "pointer",
      fontSize: 12.5, fontWeight: 700,
      border: `1.5px solid ${actif ? C.bleu : C.bord}`,
      background: actif ? C.bleuClair : C.blanc,
      color: actif ? C.bleu : C.muet,
    }}>{texte}</button>
  );
}

function jour(iso) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
}
