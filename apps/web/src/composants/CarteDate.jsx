// =============================================================================
// La CARTE DE DATE — une date, et qui la fera.
//
// C'est au moment où l'on pose une date qu'on pense à l'équipe. Séparer les
// deux en deux endroits de l'écran obligeait à redescendre plus bas, et
// l'affectation finissait oubliée : le dossier était « prêt » et personne
// n'était prévu.
//
// La BILLE porte l'état, en taille bouton — assez grande pour être le repère
// visuel de la carte, et pour que son suivi 3D se voie. C'est elle qu'on
// regarde pour savoir si la date est pourvue, avant même de lire.
// =============================================================================

import React, { useState } from "react";
import {
  etatAffectation, couleurVoyant, resumeAffectation, resumeEffectif,
  exigence, effectifRequis,
} from "@domaine/planning/affectation.js";
import { trierMembres, grouperVehicules } from "@domaine/metiers/cartes.js";
import { permisConduite } from "@domaine/flotte/vehicules.js";
import Bille from "./Bille.jsx";
import { C, S } from "../lib/theme.jsx";

const TON = { gris: "gris", orange: "orange", vert: "vert" };
const BORD = { gris: "#94A3B8", orange: "#FB923C", vert: "#34D399" };

/**
 * UNE SEULE COMMANDE PAR DATE. Il y en avait trois pour la même affectation :
 * cette carte (l'équipe *prévue*, sur le dossier), le volet de la mission (la
 * *vérité*, au planning) et le sélecteur « Équipe » du dossier. Trois endroits
 * pour une donnée finissent toujours par se contredire — et à l'écran, on ne
 * savait plus lequel disait vrai.
 *
 * La carte parle donc à UNE cible, celle qui existe :
 *   · pas encore de mission → l'équipe PRÉVUE, gardée sur le dossier
 *   · la mission existe     → l'affectation RÉELLE, au planning
 * La carte le DIT, au lieu de laisser deviner : c'est la même équipe qui
 * passe du prévu au planning à la confirmation, pas deux équipes différentes.
 *
 * @param {string} typeMission visite | emballage | demenagement | lift | …
 * @param {string} libelle ce que l'écran annonce
 * @param {boolean} facultative une date optionnelle se dit
 * @param {object|null} mission la mission réelle de cette date, si elle existe
 * @param {object} dispo lecteur de disponibilité (`lecteurDisponibilite`)
 */
export default function CarteDate({
  typeMission, libelle, facultative = false,
  date, heure, onDate, onHeure,
  affectation, onAffectation, membres, flotte,
  mission = null, dispo = null, chiffrage = null,
}) {
  const [ouvert, setOuvert] = useState(false);
  // La mission fait foi dès qu'elle existe (0131). Avant, c'est le prévu.
  const a = (mission ? mission.affectation : affectation)
            || { membres: [], vehicules: [] };
  const auPlanning = Boolean(mission);
  const ex = exigence(typeMission);

  // Sans date, il n'y a rien à affecter : le voyant reste éteint et ne réclame
  // pas une équipe pour un jour qui n'existe pas.
  const posee = Boolean(date);
  // L'effectif VENDU commande le dénominateur. Sans lui, la carte comparait
  // l'équipe à une constante et passait au vert à deux sur un dossier chiffré
  // pour quatre.
  const chif = chiffrage || {};
  const requis = effectifRequis(typeMission, chif);
  const verdict = posee
    ? etatAffectation(typeMission, a, flotte, chif)
    : { etat: "vide", manques: [], note: ex.note };
  const couleur = couleurVoyant(verdict.etat);

  function basculerMembre(id) {
    const l = a.membres || [];
    onAffectation({ ...a,
      membres: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] });
  }
  function basculerVehicule(id) {
    const l = a.vehicules || [];
    onAffectation({ ...a,
      vehicules: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] });
  }

  /**
   * La disponibilité d'une ressource pour CETTE date. Le lecteur vient du
   * domaine (`lecteurDisponibilite`) : la règle de conflit ne doit exister
   * qu'à un seul endroit. Sans date posée, on n'invente aucun conflit.
   */
  function lireDispo(genre, id) {
    if (!dispo || !date) return null;
    const d = genre === "membre"
      ? dispo.membre(id, { date, missionId: mission?.id })
      : dispo.vehicule(id, { date, missionId: mission?.id });
    return d.conflit ? d : null;
  }

  // Signalement de PERMIS : un membre affecté doit pouvoir conduire les
  // véhicules affectés à la MÊME mission. On ne le vérifie que si un véhicule
  // à permis est présent — sinon la question ne se pose pas. Comme le reste,
  // ça SIGNALE (§4.5) : le jeton n'est jamais désactivé.
  //
  // DÉCLARÉ AVANT `engages`, qui l'appelle : une const fléchée n'est pas
  // hoistée. Placée après, elle provoquait « Cannot access 'permisManquant'
  // before initialization » au rendu dès qu'un membre était affecté — un écran
  // blanc. C'est exactement le piège du hook/const utilisé avant sa ligne.
  const vehiculesAffectes = (a.vehicules || [])
    .map((id) => (flotte || []).find((v) => v.id === id))
    .filter((v) => v && v.permis);
  const permisManquant = (membreId) => {
    if (!date || vehiculesAffectes.length === 0) return null;
    const membre = (membres || []).find((m) => m.id === membreId);
    if (!membre) return null;
    for (const v of vehiculesAffectes) {
      const r = permisConduite(v, membre, date);
      if (!r.ok) return r;   // le premier manque suffit à signaler
    }
    return null;
  };

  // Ce qui est engagé ET en conflit : le bureau doit le voir sans déplier.
  const engages = [
    ...(a.membres || []).map((id) => {
      const nom = (membres || []).find((m) => m.id === id)?.nom;
      // Un membre peut cumuler indisponibilité ET permis manquant : on garde
      // le signal le plus fort (indisponible), sinon le permis.
      const d = lireDispo("membre", id);
      const p = permisManquant(id);
      const signal = d || (p && { niveau: "double", raison: p.motif });
      return [signal, nom];
    }),
    ...(a.vehicules || []).map((id) => [lireDispo("vehicule", id),
      (flotte || []).find((v) => v.id === id)?.nom]),
  ].filter(([d]) => d);

  // TOUTE LA FLOTTE EST OFFERTE, sur toute carte (décision de Raphaël).
  // Elle était filtrée sur la catégorie attendue : un lift ne voyait que des
  // lifts, un déménagement que des camions. On ne pouvait donc ni ajouter la
  // voiture qui suit le lift, ni un second camion sur un gros chantier — des
  // besoins courants du terrain.
  //
  // Rien n'est perdu côté vigilance : le domaine signale toujours l'ABSENCE de
  // la catégorie requise (« aucun lift parmi les véhicules affectés »). Ce qui
  // disparaît, c'est le faux reproche fait au renfort légitime.
  const flotteOfferte = flotte || [];

  // LE TRI. Les jetons sortaient dans l'ordre de la base — un ordre qui change
  // après une mise à jour. On coche une équipe en visant une position
  // mémorisée : un jeton qui se déplace se coche à la place d'un autre, et
  // l'erreur ne se voit qu'au départ du camion. Les affectés remontent (on les
  // relit pour vérifier), les indisponibles descendent sans disparaître —
  // on signale, on n'interdit pas.
  const membresTries = trierMembres(membres, {
    affectes: a.membres || [],
    estIndisponible: (id) => Boolean(lireDispo("membre", id)),
  });
  // Groupés par catégorie : quinze véhicules à plat redonneraient le problème
  // que le tri venait de régler. On cherche « le lift », pas « un véhicule ».
  const groupesVehicules = grouperVehicules(flotteOfferte, {
    affectes: a.vehicules || [],
    estIndisponible: (id) => Boolean(lireDispo("vehicule", id)),
    categorieAttendue: ex.categorie,
  });

  return (
    <div style={{
      ...S.carte,
      padding: 0, overflow: "hidden",
      borderLeft: `3px solid ${posee ? BORD[couleur] : C.bord}`,
      opacity: posee ? 1 : 0.88,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "13px 14px 11px" }}>
        {/* Plus de bille statique ici (décision de Raphaël) : la seule bille de
            la carte est la dynamique de l'accordéon, qui l'actionne. Quand
            aucune date n'est posée, on garde l'indice « à poser » sous forme
            d'un petit repère plat — l'affordance d'ajout ne disparaît pas, elle
            cesse seulement d'être une bille. */}
        {!posee && (
          <span aria-hidden="true" style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: `1.5px dashed ${C.fantome}`, color: C.fantome,
            fontSize: 15, lineHeight: 1 }}>+</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.encre }}>
            {libelle}
            {facultative && (
              <span style={{ fontWeight: 400, fontSize: 11.5, color: C.muet }}>
                {" "}— optionnel
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 2 }}>
            {posee
              ? resumeEffectif(a, typeMission, chif)
                + (verdict.etat === "partiel" && verdict.manques[0]
                   ? ` — ${verdict.manques[0].toLowerCase()}` : "")
              : "Aucune date posée"}
          </div>
          {/* D'où vient ce qui est affiché. Sans cette ligne, on ne sait pas
              si l'on regarde une intention ou un engagement — et c'est
              exactement ce qui rendait les trois commandes illisibles. */}
          {posee && (
            <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 3,
                          color: auPlanning ? C.vert : C.muet,
                          textTransform: "uppercase", letterSpacing: ".04em" }}>
              {auPlanning ? "Au planning" : "Prévu — au planning à la confirmation"}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "0 14px 12px" }}>
        <div style={{ flex: 2 }}>
          <label style={S.label}>Date</label>
          <input style={S.input} type="date" value={date || ""}
                 onChange={(e) => onDate(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Heure</label>
          <input style={S.input} type="time" value={heure || ""}
                 onChange={(e) => onHeure(e.target.value)} />
        </div>
      </div>

      {posee && (
        <>
          <button onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert}
            style={{
              display: "flex", alignItems: "center", gap: 9, width: "100%",
              padding: "10px 14px", border: "none",
              borderTop: `1px solid ${C.bord}`, background: "none",
              cursor: "pointer", textAlign: "left",
            }}>
            {/* LA BILLE DYNAMIQUE — c'est elle qui actionne l'accordéon
                (décision de Raphaël). Son chevron pivote avec l'état ouvert :
                le mouvement EST l'affordance. Pas de couleur d'équipe (cette
                idée a été abandonnée) — le ton neutre suffit. */}
            <Bille taille="jeton" ton="bleu" signe="chevron" actif={ouvert} />
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700,
                           color: C.encre }}>
              Qui la fait
            </span>
            <span style={{ fontSize: 11.5, color: C.muet }}>
              {resumeEffectif(a, typeMission, chif)}
            </span>
          </button>

          {ouvert && (
            <div style={{ padding: "0 14px 14px" }}>
              <div style={{ fontSize: 11.5, color: C.muet, lineHeight: 1.5,
                            margin: "2px 0 10px" }}>
                {ex.note}
              </div>

              <Titre>
                Équipe
                {/* Le dénominateur EST le titre : on le lit avant de cocher,
                    pas après avoir coché. Son origine est dite, sinon « 4 »
                    passe pour une règle du logiciel au lieu d'un choix du
                    devis — et on le corrigerait ici plutôt qu'au bon endroit. */}
                <span style={{ fontWeight: 700, color: C.muet,
                               textTransform: "none", letterSpacing: 0 }}>
                  {" — "}{(a.membres || []).length} / {requis.nombre}
                  {requis.origine === "devis" ? " (devis)" : ""}
                </span>
              </Titre>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(membres || []).length === 0 && (
                  <span style={{ fontSize: 12, color: C.muet }}>
                    Aucun membre actif.
                  </span>
                )}
                {membresTries.map((m) => {
                  // Le conflit se lit AU MOMENT DU CLIC, pas dans un écran
                  // qu'il faut aller ouvrir : c'est ici qu'on décide. Deux
                  // signaux se cumulent : disponibilité et permis. La
                  // disponibilité prime (une personne absente ne conduit rien).
                  const d = lireDispo("membre", m.id);
                  const p = (a.membres || []).includes(m.id) ? permisManquant(m.id) : null;
                  const alerte = d?.niveau || (p ? "double" : null);
                  const raison = d?.raison || p?.motif;
                  return (
                    <Jeton key={m.id} actif={(a.membres || []).includes(m.id)}
                           onClick={() => basculerMembre(m.id)} texte={m.nom}
                           alerte={alerte} raison={raison} />
                  );
                })}
              </div>

              {/* TOUTE CARTE MISSION porte les deux sélections, y compris la
                  visite (décision de Raphaël). Un véhicule seulement
                  « facultatif » ne déclenche aucun reproche d'absence — il est
                  simplement disponible, pour la voiture de service qui emmène
                  l'estimateur. Le choix n'est masqué que si le métier interdit
                  vraiment tout véhicule (`besoin: "aucun"`), ce qu'aucune carte
                  ne fait aujourd'hui. */}
              {ex.vehicule !== "aucun" && (
                <div style={{ marginTop: 12 }}>
                  <Titre>Véhicules</Titre>
                  {groupesVehicules.length === 0 && (
                    <span style={{ fontSize: 12, color: C.muet }}>
                      Aucun véhicule dans la flotte.
                    </span>
                  )}
                  {groupesVehicules.map((g) => (
                    <div key={g.cle} style={{ marginBottom: 10 }}>
                      {/* L'en-tête dit la famille ET, pour celle qu'attend la
                          mission, POURQUOI elle est en tête. Sans ce mot, on
                          croirait à un ordre arbitraire. */}
                      <div style={{ fontSize: 10.5, fontWeight: 700,
                                    color: g.attendue ? C.bleu : C.fantome,
                                    marginBottom: 5 }}>
                        {g.titre}
                        {g.attendue && (
                          <span style={{ fontWeight: 400 }}>
                            {" "}— attendu pour cette mission
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {g.vehicules.map((v) => {
                          const d = lireDispo("vehicule", v.id);
                          return (
                            <Jeton key={v.id} actif={(a.vehicules || []).includes(v.id)}
                                   onClick={() => basculerVehicule(v.id)} texte={v.nom}
                                   alerte={d?.niveau} raison={d?.raison} />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Les conflits d'abord : « il manque un camion » et « ce camion
                  est déjà pris ailleurs » sont deux problèmes différents, et
                  le second ne se voit nulle part ailleurs. */}
              {engages.length > 0 && (
                <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                  {engages.map(([d, nom], i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center",
                                          gap: 7, fontSize: 11.5,
                                          color: d.niveau === "indisponible"
                                                 ? C.rouge : C.ambre }}>
                      <span><strong>{nom || "Ressource"}</strong> — {d.raison}</span>
                    </div>
                  ))}
                </div>
              )}

              {verdict.manques.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 7,
                              marginTop: 12, fontSize: 11.5, lineHeight: 1.5,
                              color: verdict.etat === "vide" ? C.muet : C.ambre }}>
                  <span>{verdict.manques.join(" · ")}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const Titre = ({ children }) => (
  <div style={{ fontSize: 10.5, fontWeight: 800, color: C.muet, marginBottom: 6,
                textTransform: "uppercase", letterSpacing: ".04em" }}>{children}</div>
);

/**
 * Un nom qu'on coche. L'alerte est portée par le jeton lui-même : signaler le
 * conflit ailleurs obligerait à faire le lien de tête entre une liste et un
 * avertissement, au moment précis où l'on clique.
 *
 * RIEN N'EST BLOQUANT (§4.5) : deux chantiers courts dans la même journée sont
 * parfois voulus, et le bureau peut passer outre un congé. Le jeton reste
 * cliquable — il prévient, il n'interdit pas.
 */
function Jeton({ actif, onClick, texte, alerte, raison }) {
  const teinte = alerte === "indisponible" ? C.rouge
               : alerte === "double" ? C.ambre : null;
  return (
    <button onClick={onClick} title={raison ? `${texte} — ${raison}` : undefined}
      style={{
        padding: "7px 12px", borderRadius: 999, cursor: "pointer",
        fontSize: 12.5, fontWeight: 700, display: "inline-flex",
        alignItems: "center", gap: 6,
        border: `1.5px solid ${teinte || (actif ? C.bleu : C.bord)}`,
        background: actif ? C.bleuClair : C.blanc,
        color: teinte || (actif ? C.bleu : C.muet),
      }}>
      {texte}
    </button>
  );
}
