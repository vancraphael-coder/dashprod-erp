// =============================================================================
// MES MISSIONS — la liste complète, au-delà du rituel.
//
// POURQUOI UN SECOND ÉCRAN. Le rituel tient en trois blocs et montre une
// demande à la fois : c'est ce qu'il faut à 6 h du matin. Mais un indépendant
// qui prépare sa semaine le dimanche soir, ou qui cherche « c'était quand, ce
// chantier pour Roovers », a besoin de tout voir. Deux besoins opposés, deux
// écrans — élargir le rituel aurait cassé ce qui le rend utilisable.
//
// L'ORDRE. Comme pour le donneur d'ordre, l'inquiétude avant la chronologie :
// ce qui attend ma réponse, puis ce qui arrive, puis ce qui est fait. Un
// chantier confirmé est réglé ; un chantier sans réponse bloque mon agenda.
//
// LA DÉCLARATION DE RÉALISATION est ici et pas dans le rituel : c'est un geste
// de fin de journée, pas d'arrivée. Et c'est le prestataire qui la fait, parce
// que c'est lui qui était sur place — le donneur d'ordre déclarant à sa place
// créerait un rapport de force que le produit n'a pas à installer.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  mesEngagements, repondreEngagement, marquerEngagementRealise,
  annulerEngagement,
} from "../lib/adaptateur.js";
import { C, S } from "../lib/theme.jsx";

const euros = (c) => `${((c || 0) / 100).toFixed(2).replace(".", ",")} €`;

const GROUPES = [
  { etat: "proposee", titre: "À confirmer", ton: "ambre" },
  { etat: "acceptee", titre: "Confirmées", ton: "vert" },
  { etat: "realisee", titre: "Réalisées, à facturer", ton: "neutre" },
  { etat: "facturee", titre: "Facturées", ton: "neutre" },
  { etat: "refusee", titre: "Refusées", ton: "neutre" },
  { etat: "annulee", titre: "Annulées", ton: "neutre" },
];

function jourLisible(iso) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-BE",
    { weekday: "long", day: "numeric", month: "long" });
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);

export default function MesMissions({ retour }) {
  const [liste, setListe] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(null);
  const [saisie, setSaisie] = useState(null);   // { id, action } motif à saisir
  const [motif, setMotif] = useState("");

  function charger() {
    mesEngagements()
      .then((l) => setListe(l.filter((e) => e.sens === "recue")))
      .catch((e) => { setErreur(e?.message || "Lecture impossible"); setListe([]); });
  }
  useEffect(charger, []);

  async function agir(id, fn) {
    setErreur(null);
    setEnCours(id);
    try {
      const r = await fn();
      if (r && r.ok === false) setErreur(r.motif);
      setSaisie(null);
      setMotif("");
      charger();
    } catch (e) {
      setErreur(e?.message || "Refusé");
    } finally {
      setEnCours(null);
    }
  }

  if (liste === null) return null;

  const groupes = GROUPES
    .map((g) => ({ ...g, l: liste.filter((e) => e.etat === g.etat) }))
    .filter((g) => g.l.length > 0);

  return (
    <div style={{ ...S.page, paddingBottom: 90 }}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Ma journée</button>}
        <div style={S.titre}>Mes missions</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          {liste.length === 0
            ? "Aucune mission reçue pour l'instant."
            : `${liste.length} au total`}
        </div>
      </div>

      {erreur && (
        <div style={{ ...S.carte, color: C.encreRouge, background: C.teinteRouge,
                      border: `1px solid ${C.filetRouge}`, fontSize: 13 }}>
          {erreur}
        </div>
      )}

      {liste.length === 0 && (
        <div style={S.carte}>
          <div style={{ fontSize: 13.5, color: C.muet, lineHeight: 1.55 }}>
            Les donneurs d'ordre vous trouvent par vos tarifs publiés et vos
            jours libres. Sans tarif publié, vous n'apparaissez dans aucun
            annuaire.
          </div>
        </div>
      )}

      {groupes.map((g) => (
        <div key={g.etat} style={S.carte}>
          <div style={{ fontSize: 10.5, fontWeight: 800,
                        color: g.ton === "ambre" ? C.encreAmbre : C.muet,
                        textTransform: "uppercase", letterSpacing: ".04em",
                        marginBottom: 10 }}>
            {g.titre} · {g.l.length}
          </div>

          {g.l.sort((a, b) => (a.date || "").localeCompare(b.date || ""))
              .map((e) => (
            <div key={e.id} style={{ padding: "11px 0",
                                     borderTop: `1px solid ${C.bord}` }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.encre }}>
                    {jourLisible(e.date)}
                    {e.heure && ` · ${e.heure.slice(0, 5)}`}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
                    {e.ville} — {e.nature}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
                    Pour {e.contrepartie}
                  </div>
                  {/* L'adresse n'existe qu'après l'accord : elle n'apparaît
                      donc que sur les missions confirmées, sans qu'on ait à
                      la masquer. */}
                  {e.adresse && (
                    <div style={{ fontSize: 12.5, color: C.encre, marginTop: 4 }}>
                      {e.adresse}
                      {e.contact && ` · ${e.contact}`}
                    </div>
                  )}
                  {e.motifRefus && (
                    <div style={{ fontSize: 12, color: C.muet, marginTop: 3,
                                  lineHeight: 1.45 }}>
                      Motif : {e.motifRefus}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.encre,
                              flexShrink: 0 }}>
                  {euros(e.prixHtvaCentimes)}
                </div>
              </div>

              {saisie?.id === e.id ? (
                <div style={{ marginTop: 10 }}>
                  <label style={{ ...S.label, marginTop: 0 }}>
                    {saisie.action === "refus" ? "Pourquoi ce refus ?"
                                               : "Pourquoi cette annulation ?"}
                  </label>
                  <input style={{ ...S.input, marginTop: 0 }} value={motif}
                         autoFocus placeholder="Déjà pris ce jour-là"
                         onChange={(ev) => setMotif(ev.target.value)} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button style={{ ...S.boutonPlein, flex: 1,
                                     opacity: motif.trim() ? 1 : 0.5 }}
                            disabled={!motif.trim() || Boolean(enCours)}
                            onClick={() => agir(e.id, () =>
                              saisie.action === "refus"
                                ? repondreEngagement(e.id, false, motif)
                                : annulerEngagement(e.id, motif))}>
                      Envoyer
                    </button>
                    <button style={S.boutonSecondaire}
                            onClick={() => { setSaisie(null); setMotif(""); }}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {e.etat === "proposee" && (
                    <>
                      <button style={{ ...S.boutonPlein, flex: 1,
                                       opacity: enCours === e.id ? 0.5 : 1 }}
                              disabled={Boolean(enCours)}
                              onClick={() => agir(e.id, () =>
                                repondreEngagement(e.id, true))}>
                        J'accepte
                      </button>
                      <button style={S.boutonSecondaire}
                              disabled={Boolean(enCours)}
                              onClick={() => { setSaisie({ id: e.id, action: "refus" });
                                               setMotif(""); }}>
                        Refuser
                      </button>
                    </>
                  )}

                  {e.etat === "acceptee" && (
                    <>
                      {/* Pas avant la date : on ne déclare pas réalisé un
                          chantier qui n'a pas eu lieu. La base refuse de
                          toute façon ; le bouton ne se montre pas pour
                          éviter un refus annonçable. */}
                      {e.date <= aujourdhui() && (
                        <button style={{ ...S.boutonPlein, flex: 1,
                                         opacity: enCours === e.id ? 0.5 : 1 }}
                                disabled={Boolean(enCours)}
                                onClick={() => agir(e.id, () =>
                                  marquerEngagementRealise(e.id))}>
                          C'est fait
                        </button>
                      )}
                      <button style={S.boutonSecondaire}
                              disabled={Boolean(enCours)}
                              onClick={() => { setSaisie({ id: e.id, action: "annul" });
                                               setMotif(""); }}>
                        Annuler la mission
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
