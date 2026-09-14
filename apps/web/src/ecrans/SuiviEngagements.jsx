// =============================================================================
// SUIVI DES MISSIONS CONFIÉES — la moitié manquante de la relation.
//
// CE QU'IL COMBLE. L'indépendant voyait ses missions reçues dans son rituel.
// Le donneur d'ordre, lui, envoyait une proposition et n'avait plus aucun
// endroit pour savoir ce qu'elle devenait. Une relation à deux sens dont un
// seul côté est outillé ne tient pas : c'est celui qui paie qui abandonne le
// premier.
//
// CE QUE CET ÉCRAN N'EST PAS. Pas un tableau de bord — c'est une liste de
// travail. Il répond à trois questions, dans l'ordre où elles inquiètent :
//
//   1. Qu'est-ce qui n'a pas encore de réponse ? (un chantier non couvert)
//   2. Qu'est-ce qui est confirmé et arrive bientôt ?
//   3. Qu'est-ce qui me coûte, et combien reste-t-il à recevoir en facture ?
//
// L'ORDRE EST VOLONTAIRE. Les propositions sans réponse passent devant les
// engagements confirmés, même si ces derniers sont plus proches dans le
// temps : un chantier confirmé est réglé, un chantier sans réponse est un
// risque. Trier par date mettrait le risque en bas de l'écran.
//
// L'ÉCART CONVENU / FACTURÉ SE VOIT. Ce n'est pas une anomalie à masquer :
// c'est l'information qui permet de discuter avec un prestataire, ou de
// corriger un tarif publié qui ne correspond plus à la réalité du terrain.
// =============================================================================

import React, { useEffect, useState } from "react";
import { mesEngagements, enregistrerFacturePrestataire }
  from "../lib/adaptateur.js";
import { coutSousTraitance } from "@domaine/pilotage/cout-sous-traitance.js";
import { C, S } from "../lib/theme.jsx";

const euros = (c) => `${((c || 0) / 100).toFixed(2).replace(".", ",")} €`;

const ETATS = {
  proposee: { titre: "Sans réponse", ton: "ambre" },
  acceptee: { titre: "Confirmées", ton: "vert" },
  realisee: { titre: "Réalisées, à facturer", ton: "neutre" },
  facturee: { titre: "Facturées", ton: "neutre" },
  refusee: { titre: "Refusées", ton: "rouge" },
  annulee: { titre: "Annulées", ton: "neutre" },
};

// L'ordre d'inquiétude, pas l'ordre chronologique. Un chantier confirmé est
// réglé ; un chantier sans réponse est un risque.
const ORDRE = ["proposee", "acceptee", "realisee", "facturee", "refusee", "annulee"];

function jourLisible(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("fr-BE",
    { weekday: "short", day: "numeric", month: "short" });
}

export default function SuiviEngagements({ retour, versConfier }) {
  const [liste, setListe] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [saisie, setSaisie] = useState(null);   // engagement en cours de facturation
  const [montant, setMontant] = useState("");
  const [numero, setNumero] = useState("");
  const [enCours, setEnCours] = useState(null);

  function charger() {
    mesEngagements()
      .then((l) => setListe(l.filter((e) => e.sens === "confiee")))
      .catch((e) => { setErreur(e?.message || "Lecture impossible"); setListe([]); });
  }
  useEffect(charger, []);

  /**
   * La facture reçue devient une DÉPENSE imputée au dossier, pas une facture.
   * Le montant est saisi tel qu'il figure sur la facture du prestataire : il
   * peut différer du prix convenu, et cet écart est une information.
   */
  async function enregistrer(e) {
    setErreur(null);
    const centimes = Math.round(Number(String(montant).replace(",", ".")) * 100);
    if (!Number.isFinite(centimes) || centimes <= 0) {
      setErreur("Montant HTVA requis");
      return;
    }
    setEnCours(e.id);
    try {
      const r = await enregistrerFacturePrestataire(e.id, {
        montantHtvaCentimes: centimes,
        numeroFournisseur: numero.trim() || null,
      });
      if (r?.ok === false) setErreur(r.motif);
      setSaisie(null);
      setMontant("");
      setNumero("");
      charger();
    } catch (err) {
      setErreur(err?.message || "Refusé");
    } finally {
      setEnCours(null);
    }
  }

  if (liste === null) return null;

  // Le poste de coût est calculé par le domaine, pas ici : la règle des trois
  // états (proposition sans coût, accord dû, facture prioritaire) ne doit
  // exister qu'à un seul endroit.
  const cout = coutSousTraitance(liste.map((e) => ({
    id: e.id, contrepartie: e.contrepartie, etat: e.etat,
    prix_htva_centimes: e.prixHtvaCentimes,
    facture_htva_centimes: e.factureHtvaCentimes ?? null,
  })));

  const groupes = ORDRE
    .map((etat) => [etat, liste.filter((e) => e.etat === etat)])
    .filter(([, l]) => l.length > 0);

  return (
    <div style={{ ...S.page, paddingBottom: 90 }}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Carnet</button>}
        <div style={S.titre}>Missions confiées</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          {liste.length === 0
            ? "Vous n'avez encore rien confié."
            : `${liste.length} mission${liste.length > 1 ? "s" : ""} confiée${liste.length > 1 ? "s" : ""}`}
        </div>
      </div>

      {erreur && (
        <div style={{ ...S.carte, color: C.encreRouge, background: C.teinteRouge,
                      border: `1px solid ${C.filetRouge}`, fontSize: 13 }}>
          {erreur}
        </div>
      )}

      {liste.length === 0 ? (
        <div style={S.carte}>
          <div style={{ fontSize: 13.5, color: C.muet, lineHeight: 1.55 }}>
            Confier une mission, c'est proposer une date et un tarif publié à un
            indépendant. Il accepte ou il refuse, et l'adresse exacte ne lui est
            transmise qu'après son accord.
          </div>
          {versConfier && (
            <button style={{ ...S.boutonPlein, marginTop: 12 }} onClick={versConfier}>
              Confier une mission
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Ce que ça coûte. Un seul bloc, trois chiffres qui appellent
              chacun une décision différente. */}
          <div style={S.carte}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: C.muet,
                          textTransform: "uppercase", letterSpacing: ".04em",
                          marginBottom: 10 }}>
              Ce que la sous-traitance engage
            </div>
            <Chiffre libelle="Engagé, HTVA"
                     valeur={euros(cout.engage_htva_centimes)} fort />
            <Chiffre libelle="Déjà facturé par les prestataires"
                     valeur={euros(cout.facture_htva_centimes)} />
            {cout.nb_sans_facture > 0 && (
              <Chiffre
                libelle={`En attente de facture (${cout.nb_sans_facture})`}
                valeur={euros(cout.attendu_htva_centimes)} />
            )}
            {cout.ecart_total_centimes !== 0 && (
              <Chiffre
                libelle="Écart entre convenu et facturé"
                valeur={`${cout.ecart_total_centimes > 0 ? "+" : ""}${euros(cout.ecart_total_centimes)}`}
                alerte={cout.ecart_total_centimes > 0} />
            )}
            <div style={{ fontSize: 11.5, color: C.muet, marginTop: 10,
                          lineHeight: 1.5 }}>
              Une proposition sans réponse ne compte pas : le prestataire peut
              refuser. Un accord compte, même sans facture reçue.
            </div>
          </div>

          {groupes.map(([etat, l]) => (
            <div key={etat} style={S.carte}>
              <div style={{ fontSize: 10.5, fontWeight: 800,
                            color: ETATS[etat].ton === "ambre" ? C.encreAmbre : C.muet,
                            textTransform: "uppercase", letterSpacing: ".04em",
                            marginBottom: 10 }}>
                {ETATS[etat].titre} · {l.length}
              </div>
              {l.sort((a, b) => (a.date || "").localeCompare(b.date || ""))
                 .map((e) => (
                <div key={e.id}
                     style={{ padding: "10px 0",
                              borderTop: `1px solid ${C.bord}` }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.encre }}>
                        {e.contrepartie}
                      </div>
                      <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
                        {jourLisible(e.date)} · {e.ville} · {e.nature}
                      </div>
                      {/* Un refus motivé est réutilisable : on sait quoi
                          reproposer. Un refus muet ne sert à rien. */}
                      {e.motifRefus && (
                        <div style={{ fontSize: 12, color: C.encreRouge,
                                      marginTop: 3, lineHeight: 1.45 }}>
                          Motif : {e.motifRefus}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700,
                                  color: C.encre, flexShrink: 0 }}>
                      {euros(e.prixHtvaCentimes)}
                    </div>
                  </div>

                  {/* La facture ne s'enregistre qu'après réalisation : avant,
                      il n'y a rien à payer. */}
                  {e.etat === "realisee" && saisie !== e.id && (
                    <button style={{ ...S.boutonLien, padding: 0, marginTop: 6 }}
                            disabled={Boolean(enCours)}
                            onClick={() => { setSaisie(e.id);
                                             setMontant(String(e.prixHtvaCentimes / 100)
                                               .replace(".", ","));
                                             setNumero(""); }}>
                      Enregistrer sa facture
                    </button>
                  )}

                  {saisie === e.id && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ ...S.label, marginTop: 0 }}>
                            Montant HTVA
                          </label>
                          <input style={{ ...S.input, marginTop: 0 }} autoFocus
                                 value={montant} inputMode="decimal"
                                 onChange={(ev) => setMontant(ev.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ ...S.label, marginTop: 0 }}>
                            N° de sa facture
                          </label>
                          <input style={{ ...S.input, marginTop: 0 }}
                                 value={numero} placeholder="F2026-014"
                                 onChange={(ev) => setNumero(ev.target.value)} />
                        </div>
                      </div>
                      {/* Le numéro appartient au fournisseur : c'est la
                          référence qu'on citera en cas de litige, et on ne
                          lui en attribue pas un des nôtres. */}
                      <div style={{ fontSize: 11.5, color: C.muet, marginTop: 5,
                                    lineHeight: 1.5 }}>
                        Enregistrée comme dépense imputée au dossier. Le numéro
                        est celui du prestataire — nous n'en attribuons pas.
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button style={{ ...S.boutonPlein, flex: 1 }}
                                disabled={Boolean(enCours)}
                                onClick={() => enregistrer(e)}>
                          Enregistrer
                        </button>
                        <button style={S.boutonSecondaire}
                                onClick={() => { setSaisie(null); setMontant(""); }}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {versConfier && (
            <div style={{ padding: "0 16px 24px" }}>
              <button style={S.boutonSecondaire} onClick={versConfier}>
                Confier une autre mission
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chiffre({ libelle, valeur, fort = false, alerte = false }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "baseline", gap: 12, padding: "5px 0" }}>
      <span style={{ fontSize: 12.5, color: C.muet }}>{libelle}</span>
      <span style={{ fontSize: fort ? 17 : 13.5,
                     fontWeight: fort ? 800 : 700,
                     color: alerte ? C.encreRouge : C.encre }}>
        {valeur}
      </span>
    </div>
  );
}
