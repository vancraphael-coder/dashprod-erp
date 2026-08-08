// =============================================================================
// Écran — Espace client (accès OAuth).
//
// Le client se connecte avec Google, comme le déménageur. Ce qui l'amène ici
// plutôt que dans l'application métier : son e-mail figure sur un dossier
// client. Il n'y a pas de code à saisir — le code 12 caractères sert à signer
// une offre, pas à ouvrir cet espace.
//
// Cinq pages : dossier, meubles, offres reçues (multi-entreprises), factures,
// annuaire réseau. Tout vient de fonctions cmd_client_* qui filtrent en base
// sur l'e-mail authentifié : l'écran ne choisit pas son périmètre.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  clientDossiers, clientInventaire, clientOffres, clientFactures, deposerAvis,
  caissesClient, definirCaisse, supprimerCaisse,
  reseauDemenageurs,
} from "../lib/adaptateur.js";
import { deconnecter } from "../lib/supabase.js";
import { manifeste, manifestePret, packingListCsv }
  from "@domaine/releve/inventaire-export.js";
import { C, S, CT, FC, Eyebrow, LigneRoute, Compteur, HaloPhares }
  from "./theme-client.jsx";
import FilMessages from "./FilMessages.jsx";

const eur = (c) => c == null ? "—"
  : (c / 100).toFixed(2).replace(".", ",") + " €";
const jour = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-BE",
      { day: "2-digit", month: "long", year: "numeric" });
  } catch { return iso; }
};

const ONGLETS = [
  ["dossier", "Mon dossier"],
  ["inventaire", "Mes meubles"],
  ["caisses", "Mes caisses"],
  ["offres", "Mes offres"],
  ["factures", "Mes factures"],
  ["messages", "Messages"],
  ["reseau", "Déménageurs"],
];

export default function EspaceClient({ client }) {
  const [onglet, setOnglet] = useState("dossier");

  // La nuit doit couvrir toute la page, pas seulement la colonne centrale.
  useEffect(() => {
    const avant = document.body.style.background;
    document.body.style.background = CT.nuit;
    return () => { document.body.style.background = avant; };
  }, []);

  return (
    <div style={S.page}>
      {/* En-tête : la nuit avant le départ, halo de phares en fond. */}
      <div style={{ position: "relative", overflow: "hidden",
                    padding: "26px 18px 18px", borderBottom: `1px solid ${C.bord}` }}>
        <HaloPhares />
        <div style={{ position: "relative" }}>
          <Eyebrow couleur={CT.phare}>Votre convoi</Eyebrow>
          <div style={{ ...S.titre, fontSize: 30, marginTop: 8 }}>
            {client?.nom || "Votre espace"}
          </div>
          <div style={{ fontSize: 13, color: C.muet, marginTop: 6 }}>
            {client?.dossiers > 1
              ? `${client.dossiers} déménagements en cours`
              : "Tout ce qui concerne votre déménagement, au même endroit."}
          </div>
        </div>
      </div>

      {/* Navigation : rail en mono, soulignement ambré sur l'onglet actif. */}
      <div style={{ display: "flex", gap: 18, overflowX: "auto",
                    padding: "14px 18px 0", borderBottom: `1px solid ${C.bord}`,
                    scrollbarWidth: "none" }}>
        {ONGLETS.map(([cle, lib]) => {
          const actif = onglet === cle;
          return (
            <button key={cle} onClick={() => setOnglet(cle)} style={{
              padding: "0 0 12px", background: "none", border: "none",
              borderBottom: `2px solid ${actif ? CT.phare : "transparent"}`,
              whiteSpace: "nowrap", cursor: "pointer",
              fontFamily: FC, fontSize: 11, fontWeight: 700,
              letterSpacing: ".1em", textTransform: "uppercase",
              color: actif ? C.encre : C.muet }}>{lib}</button>
          );
        })}
      </div>

      <div style={{ height: 16 }} />

      {onglet === "dossier"    && <Dossiers />}
      {onglet === "inventaire" && <Inventaire />}
      {onglet === "caisses"    && <Caisses />}
      {onglet === "offres"     && <Offres />}
      {onglet === "factures"   && <Factures />}
      {onglet === "messages"   && <Messages />}
      {onglet === "reseau"     && <Reseau />}

      <div style={{ margin: "18px 16px 30px", textAlign: "center" }}>
        <button onClick={async () => { await deconnecter(); window.location.reload(); }}
                style={{ background: "none", border: "none", color: C.muet,
                         fontSize: 12.5, cursor: "pointer", padding: 10 }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function useCharge(fn) {
  const [etat, setEtat] = useState({ chargement: true, donnees: null, erreur: null });
  useEffect(() => {
    let vivant = true;
    fn()
      .then((d) => vivant && setEtat({ chargement: false, donnees: d, erreur: null }))
      .catch((e) => vivant && setEtat({ chargement: false, donnees: null,
                                        erreur: e.message }));
    return () => { vivant = false; };
  }, []);
  return etat;
}

function Etat({ chargement, erreur, vide, children }) {
  if (chargement) return (
    <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
      Chargement…
    </div>
  );
  if (erreur) return (
    <div style={{ ...S.carte, color: C.rouge, fontSize: 12.5 }}>{erreur}</div>
  );
  if (vide) return (
    <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
      {vide}
    </div>
  );
  return children;
}

/**
 * MON DOSSIER — l'avancement de son déménagement chez chaque entreprise.
 * Information : déménageur, référence, dates (souhaitée, visite), adresses
 *   charge/décharge avec étage, contact.
 * Interactions : lire l'avancement [indispensable] ; appeler le déménageur
 *   [gadget indispensable]. Ligne du temps de l'état : à venir.
 * Permissions : LECTURE SEULE. Les dates et adresses engagent le déménageur ;
 *   toute demande de changement passe par la messagerie.
 */
function Dossiers() {
  const { chargement, donnees, erreur } = useCharge(clientDossiers);
  const dossiers = donnees || [];
  return (
    <Etat chargement={chargement} erreur={erreur}
          vide={dossiers.length === 0 && "Aucun dossier pour le moment."}>
      <>
        {dossiers.map((d) => {
          const charges = (d.adresses || []).filter((a) => a.role === "charge");
          const decharges = (d.adresses || []).filter((a) => a.role !== "charge");
          return (
          <div key={d.affaire_id} style={S.carte}>
            <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "baseline", gap: 10 }}>
              <Eyebrow>{d.entreprise?.nom || "Déménageur"}</Eyebrow>
              <span style={{ fontFamily: FC, fontSize: 10.5, color: C.fantome }}>
                {d.reference}
              </span>
            </div>

            {/* Le chiffre qu'on vient chercher en ouvrant l'application. */}
            <Compteur date={d.date_souhaitee} />

            {/* Le trajet : d'où l'on part, où l'on arrive. */}
            {(charges.length > 0 || decharges.length > 0) && (
              <div style={{ display: "flex", alignItems: "stretch", gap: 12,
                            marginTop: 20, paddingTop: 16,
                            borderTop: `1px solid ${C.doux}` }}>
                <div style={{ flex: 1 }}>
                  <Eyebrow>Départ</Eyebrow>
                  {charges.map((a, i) => <Lieu key={i} a={a} />)}
                  {charges.length === 0 && <Lieu vide />}
                </div>
                <div aria-hidden style={{ display: "flex", alignItems: "center",
                                          color: CT.phare, fontSize: 18 }}>→</div>
                <div style={{ flex: 1 }}>
                  <Eyebrow couleur={CT.aube}>Arrivée</Eyebrow>
                  {decharges.map((a, i) => <Lieu key={i} a={a} />)}
                  {decharges.length === 0 && <Lieu vide />}
                </div>
              </div>
            )}

            {/* Signature : la route, avec le convoi à son étape réelle. */}
            <div style={{ marginTop: 20, paddingTop: 16,
                          borderTop: `1px solid ${C.doux}` }}>
              <Eyebrow>Où en est votre déménagement</Eyebrow>
              <div style={{ height: 10 }} />
              <LigneRoute etat={d.etat} />
            </div>

            {d.date_visite && (
              <div style={{ fontSize: 12.5, color: C.muet, marginTop: 4 }}>
                Visite technique le {jour(d.date_visite)}
              </div>
            )}
            {d.entreprise?.tel && (
              <a href={`tel:${d.entreprise.tel}`} style={{
                display: "inline-block", marginTop: 14, textDecoration: "none",
                fontFamily: FC, fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em",
                color: CT.phare, border: `1px solid ${C.bord}`, borderRadius: 999,
                padding: "8px 14px" }}>
                APPELER {d.entreprise.tel}
              </a>
            )}

            {/* Avis : proposé quand le déménagement est effectué. Note + mot. */}
            {(d.etat === "effectue" || d.etat === "clos") && (
              <AvisDossier affaireId={d.affaire_id} />
            )}
          </div>
          );
        })}
      </>
    </Etat>
  );
}

/** Une adresse du trajet, ou son absence, dite simplement. */
function Lieu({ a, vide }) {
  if (vide) return (
    <div style={{ fontSize: 13, color: C.fantome, marginTop: 6 }}>À préciser</div>
  );
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 13.5, color: C.encre, fontWeight: 600, lineHeight: 1.35 }}>
        {a.adresse}
      </div>
      <div style={{ fontSize: 12, color: C.muet }}>
        {[a.code_postal, a.ville].filter(Boolean).join(" ")}
        {a.etage ? ` · étage ${a.etage}` : ""}
      </div>
    </div>
  );
}

/**
 * MES MEUBLES — le relevé transformé en liste de colisage.
 * Information : récap (colis, objets, volume, poids), détail par pièce, numéro
 *   de colis fixe, remarques par objet.
 * Interactions : consulter [indispensable] ; télécharger la liste CSV [gadget
 *   indispensable, clé pour l'international/douane]. Signaler une correction :
 *   via la messagerie.
 * Permissions : LECTURE SEULE. L'inventaire est la base du prix — non éditable
 *   par le client ; il peut le commenter (messagerie).
 */
function Inventaire() {
  const { chargement, donnees, erreur } = useCharge(clientInventaire);
  const lignes = donnees || [];

  const m = useMemo(() => manifeste(
    lignes.map((r) => ({
      type: "carton", piece: r.piece, volume_m3: r.volume_m3,
      objets: [{ designation: r.designation, quantite: r.quantite,
                 piece: r.piece, remarque: r.remarque }],
    })), { mode: "maritime", valeurRequise: false }), [donnees]);

  const verdict = manifestePret(m);
  const parPiece = useMemo(() => {
    const g = new Map();
    for (const x of m.colis) {
      const p = x.piece || "Non classé";
      g.set(p, [...(g.get(p) || []), x]);
    }
    return [...g.entries()];
  }, [m]);

  function telecharger() {
    const blob = new Blob([packingListCsv(m)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "liste-de-colisage.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Etat chargement={chargement} erreur={erreur}
          vide={lignes.length === 0 && "Aucun meuble relevé pour le moment."}>
      <>
        <div style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>Récapitulatif</label>
          <L l="Colis numérotés" v={m.totaux.colis} />
          <L l="Objets" v={m.totaux.objets} />
          <L l="Volume total" v={`${m.totaux.volume_m3} m³`} />
          {m.totaux.poids_kg > 0 && <L l="Poids total" v={`${m.totaux.poids_kg} kg`} />}
          <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 8,
                        lineHeight: 1.5 }}>
            Chaque colis porte un numéro fixe (001/025). C'est ce numéro qui
            figure sur l'étiquette et sur la liste de colisage douanière.
          </div>
        </div>

        {parPiece.map(([piece, colis]) => (
          <div key={piece} style={S.carte}>
            <label style={{ ...S.label, marginTop: 0 }}>{piece}</label>
            {colis.map((x) => (
              <div key={x.numero} style={{ display: "flex", gap: 10,
                     padding: "9px 0", borderTop: `1px solid ${C.doux}` }}>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5,
                               fontWeight: 700, color: C.bleu, flexShrink: 0,
                               paddingTop: 1 }}>{x.numero}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {x.objets.map((o) => (
                    <span key={o.numero} style={{ display: "block", fontSize: 13.5,
                            color: C.encre, fontWeight: 600 }}>
                      {o.quantite > 1 ? `${o.quantite} × ` : ""}{o.designation}
                      {o.remarque && (
                        <span style={{ display: "block", fontSize: 11.5,
                                       color: C.fantome, fontWeight: 500,
                                       marginTop: 2 }}>{o.remarque}</span>
                      )}
                    </span>
                  ))}
                </span>
                {x.volume_m3 > 0 && (
                  <span style={{ fontSize: 11.5, color: C.muet, flexShrink: 0 }}>
                    {x.volume_m3} m³
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}

        {verdict.avertissements.length > 0 && (
          <div style={{ margin: "0 16px 12px", padding: "11px 13px",
                        borderRadius: 11, background: "#FFFBEB",
                        border: "1px solid #FDE68A", fontSize: 11.5,
                        color: "#92400E", lineHeight: 1.5 }}>
            <b>Pour un envoi maritime ou aérien</b>, poids et dimensions de
            chaque colis restent à compléter par votre déménageur, ainsi que la
            valeur déclarée — base de l'assurance et de la déclaration douanière.
          </div>
        )}

        <div style={{ margin: "0 16px 12px" }}>
          <button style={S.boutonPlein} onClick={telecharger}>
            Télécharger la liste de colisage
          </button>
        </div>
      </>
    </Etat>
  );
}

/**
 * MES OFFRES — toutes les offres reçues, à comparer.
 * Information : entreprise, référence, date, montant TVAC, statut (signée),
 *   contact.
 * Interactions : comparer [indispensable] ; voir le PDF [indispensable, à
 *   renforcer] ; signer en ligne [indispensable, circuit code + portail] ;
 *   poser une question [gadget indispensable, messagerie].
 * Permissions : LECTURE + SIGNATURE (acte fort, tracé). Une offre ne se modifie
 *   jamais : on l'accepte ou on la refuse.
 */
function Offres() {
  const { chargement, donnees, erreur } = useCharge(clientOffres);
  const offres = donnees || [];
  return (
    <Etat chargement={chargement} erreur={erreur}
          vide={offres.length === 0 && "Aucune offre reçue pour le moment."}>
      <>
        <div style={{ margin: "0 16px 10px", fontSize: 11.5, color: C.muet,
                      lineHeight: 1.5 }}>
          Toutes les offres reçues pour votre déménagement, quelle que soit
          l'entreprise. Comparez avant de choisir.
        </div>
        {offres.map((o, i) => (
          <div key={i} style={S.carte}>
            <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "flex-start", gap: 10 }}>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 800,
                               color: C.encre }}>{o.entreprise}</span>
                <span style={{ display: "block", fontSize: 11.5, color: C.fantome,
                               marginTop: 2 }}>
                  {o.reference} · {jour(o.date_souhaitee)}
                </span>
              </span>
              <span style={{ textAlign: "right" }}>
                <span style={{ display: "block", fontSize: 17, fontWeight: 800,
                               color: C.encre }}>
                  {eur(o.montant_tvac_centimes)}
                </span>
                <span style={{ display: "block", fontSize: 10.5, color: C.fantome }}>
                  TVAC
                </span>
              </span>
            </div>
            {o.signee && (
              <div style={{ marginTop: 10, padding: "7px 11px", borderRadius: 8,
                            background: "rgba(52,211,153,.10)",
                            border: "1px solid rgba(52,211,153,.35)",
                            fontSize: 11.5, fontWeight: 700, color: CT.menthe,
                            display: "inline-block" }}>
                ✓ Offre signée
              </div>
            )}
            {o.entreprise_tel && (
              <div style={{ fontSize: 12, color: C.muet, marginTop: 8 }}>
                {o.entreprise_tel}
              </div>
            )}
          </div>
        ))}
      </>
    </Etat>
  );
}

/**
 * MES FACTURES — les factures émises.
 * Information : numéro, entreprise, montant TVAC, émission, échéance,
 *   communication structurée.
 * Interactions : consulter [indispensable] ; copier la communication [gadget
 *   indispensable] ; télécharger le PDF [indispensable, à ajouter] ; voir le
 *   solde [gadget indispensable].
 * Permissions : LECTURE SEULE. Le paiement se fait hors application (virement).
 */
function Factures() {
  const { chargement, donnees, erreur } = useCharge(clientFactures);
  const f = donnees || [];
  return (
    <Etat chargement={chargement} erreur={erreur}
          vide={f.length === 0 && "Aucune facture pour le moment."}>
      <>
        {f.map((x, i) => (
          <div key={i} style={S.carte}>
            <div style={{ display: "flex", justifyContent: "space-between",
                          gap: 10 }}>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 14.5, fontWeight: 800,
                               color: C.encre }}>{x.numero}</span>
                <span style={{ display: "block", fontSize: 11.5, color: C.fantome,
                               marginTop: 2 }}>{x.entreprise}</span>
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.encre }}>
                {eur(x.total_tvac_centimes)}
              </span>
            </div>
            <L l="Émise le" v={jour(x.date_emission)} />
            <L l="Échéance" v={jour(x.echeance)} />
            {x.communication && (
              <div style={{ marginTop: 8, padding: "9px 11px", borderRadius: 9,
                            background: "#0D1424", border: `1px solid ${C.bord}` }}>
                <div style={{ fontSize: 10.5, color: C.fantome, fontWeight: 700,
                              textTransform: "uppercase", letterSpacing: ".04em" }}>
                  Communication structurée
                </div>
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 14,
                              fontWeight: 700, color: C.encre, marginTop: 2 }}>
                  {x.communication}
                </div>
              </div>
            )}
          </div>
        ))}
      </>
    </Etat>
  );
}

/**
 * MESSAGES (Mailprod) — le fil tracé avec chaque déménageur, par dossier.
 * Information : messages horodatés, attribués, INALTÉRABLES (registre probant).
 * Interactions : lire [indispensable] ; répondre [indispensable, seul endroit
 *   où le client écrit] ; joindre photo/PDF [gadget indispensable] ; accusé de
 *   lecture [gadget].
 * Permissions : ÉCRITURE autorisée mais APPEND-ONLY — ni modification ni
 *   suppression. Le fil fait foi en cas de litige.
 */
function Messages() {
  const { chargement, donnees, erreur } = useCharge(clientDossiers);
  const dossiers = donnees || [];
  const [ouvert, setOuvert] = useState(null);   // affaire_id du fil ouvert

  if (chargement) return (
    <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
      Chargement…
    </div>
  );
  if (erreur) return <div style={{ ...S.carte, color: C.rouge, fontSize: 12.5 }}>{erreur}</div>;
  if (dossiers.length === 0) return (
    <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
      Aucun dossier — pas encore de messagerie.
    </div>
  );

  // Un seul dossier : on ouvre le fil directement.
  const seul = dossiers.length === 1 ? dossiers[0] : null;
  const actif = seul || dossiers.find((d) => d.affaire_id === ouvert);

  if (actif) {
    return (
      <div style={S.carte}>
        {!seul && (
          <button style={{ ...S.boutonLien, paddingLeft: 0, marginBottom: 6 }}
                  onClick={() => setOuvert(null)}>← Mes dossiers</button>
        )}
        <FilMessages affaireId={actif.affaire_id} cote="client" theme={{ C, S }} />
      </div>
    );
  }

  return (
    <>
      {dossiers.map((d) => (
        <button key={d.affaire_id} onClick={() => setOuvert(d.affaire_id)}
          style={{ ...S.carte, width: "100%", textAlign: "left", cursor: "pointer",
                   border: `1px solid ${C.bord}`, display: "flex",
                   justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.encre }}>
            {d.titre || d.reference || "Mon déménagement"}
          </span>
          <span style={{ color: C.fantome }}>›</span>
        </button>
      ))}
    </>
  );
}

/**
 * DÉMÉNAGEURS (réseau) — annuaire public des entreprises opt-in.
 * Information : entreprises visibles, aucun compte requis.
 * Interactions : découvrir d'autres déménageurs [gadget] ; demander une offre
 *   [gadget, V2].
 * Permissions : LECTURE PUBLIQUE. Aucune donnée personnelle exposée.
 */
/**
 * Avis rapide : note en étoiles + un mot, déposé par le client sur un dossier
 * effectué. Une note peut être révisée (upsert côté base).
 */
function AvisDossier({ affaireId }) {
  const [note, setNote] = useState(0);
  const [mot, setMot] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function envoyer() {
    if (!note) { setErreur("Choisissez une note."); return; }
    setErreur(null);
    try { await deposerAvis(affaireId, note, mot); setEnvoye(true); }
    catch (e) { setErreur(e.message); }
  }

  if (envoye) return (
    <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10,
                  background: "rgba(52,211,153,.10)", border: "1px solid rgba(52,211,153,.35)",
                  fontSize: 12.5, color: CT.menthe }}>
      Merci pour votre avis {"★".repeat(note)}
    </div>
  );

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.doux}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.encre, marginBottom: 6 }}>
        Comment s'est passé votre déménagement ?
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setNote(n)}
            style={{ border: "none", background: "none", cursor: "pointer",
                     fontSize: 26, lineHeight: 1, padding: 0,
                     color: n <= note ? "#F59E0B" : "#D1D5DB" }}>★</button>
        ))}
      </div>
      <textarea value={mot} onChange={(e) => setMot(e.target.value)}
        placeholder="Un mot sur votre expérience (facultatif)…" rows={2}
        style={{ ...S.input, width: "100%", boxSizing: "border-box",
                 resize: "vertical", minHeight: 40 }} />
      {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 6 }}>{erreur}</div>}
      <button onClick={envoyer}
        style={{ ...S.boutonPlein, marginTop: 8 }}>Envoyer mon avis</button>
    </div>
  );
}

/**
 * MES CAISSES — inventaire privé. Le client note ce qu'il range dans chaque
 * caisse (le déménageur ne le verra jamais) et, surtout, à quelle pièce de sa
 * nouvelle adresse la caisse est destinée. Côté bureau, seul ce plan de pose
 * (numéro → pièce → adresse) est visible — jamais le contenu.
 */
function Caisses() {
  const { chargement, donnees, erreur } = useCharge(clientDossiers);
  const dossiers = donnees || [];
  const [choisi, setChoisi] = useState(null);

  if (chargement) return <Etat chargement />;
  if (erreur) return <Etat erreur={erreur} />;
  if (dossiers.length === 0) return <Etat vide="Aucun dossier." />;

  const dossier = dossiers.length === 1 ? dossiers[0]
    : dossiers.find((d) => d.affaire_id === choisi);

  if (!dossier) {
    return (
      <>
        <div style={{ fontSize: 12.5, color: C.muet, marginBottom: 10 }}>
          Choisissez le déménagement concerné :
        </div>
        {dossiers.map((d) => (
          <button key={d.affaire_id} onClick={() => setChoisi(d.affaire_id)}
            style={{ ...S.carte, width: "100%", textAlign: "left", cursor: "pointer" }}>
            {d.entreprise?.nom || "Déménagement"} · {d.reference}
          </button>
        ))}
      </>
    );
  }

  return (
    <>
      {dossiers.length > 1 && (
        <button style={{ ...S.boutonLien, paddingLeft: 0, marginBottom: 6 }}
                onClick={() => setChoisi(null)}>← Mes déménagements</button>
      )}
      <CaissesDossier dossier={dossier} />
    </>
  );
}

function CaissesDossier({ dossier }) {
  const affaireId = dossier.affaire_id;
  const [caisses, setCaisses] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [form, setForm] = useState(null);   // caisse en cours d'édition
  // Les adresses de déchargement (nouvelles adresses) proposées.
  const decharges = (dossier.adresses || []).filter((a) => a.role === "decharge" || a.sens === "decharge");

  async function recharger() {
    try { setCaisses(await caissesClient(affaireId)); }
    catch (e) { setErreur(e.message); setCaisses([]); }
  }
  useEffect(() => { recharger(); }, [affaireId]);

  function nouvelle() {
    const nums = (caisses || []).map((c) => c.numero);
    const prochain = nums.length ? Math.max(...nums) + 1 : 1;
    setForm({ numero: prochain, piece_dest: "", adresse_id: decharges[0]?.id || null,
              contenu: "", fragile: false });
  }

  async function enregistrer() {
    setErreur(null);
    try { await definirCaisse(affaireId, form); setForm(null); await recharger(); }
    catch (e) { setErreur(e.message); }
  }
  async function supprimer(numero) {
    try { await supprimerCaisse(affaireId, numero); await recharger(); }
    catch (e) { setErreur(e.message); }
  }

  return (
    <>
      <div style={{ ...S.carte, background: "rgba(167,139,250,.10)",
                    border: "1px solid rgba(167,139,250,.35)" }}>
        <div style={{ fontSize: 12.5, color: "#C9BCFF", lineHeight: 1.5 }}>
          🔒 Cette liste est <b>privée</b>. Votre déménageur ne voit que le numéro
          de caisse et la pièce de destination — jamais son contenu.
        </div>
      </div>

      {erreur && <div style={{ fontSize: 12.5, color: C.rouge, marginBottom: 8 }}>{erreur}</div>}

      {caisses == null && <Etat chargement />}
      {caisses && caisses.length === 0 && !form && (
        <div style={{ ...S.carte, textAlign: "center", color: C.fantome, fontSize: 13 }}>
          Aucune caisse pour l'instant.
        </div>
      )}

      {(caisses || []).map((c) => (
        <div key={c.numero} style={S.carte}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
              Caisse n°{c.numero}
              {c.fragile && <span style={{ color: "#DC2626", fontSize: 12 }}> · fragile</span>}
            </span>
            <span style={{ fontSize: 12, color: C.bleu, fontWeight: 700 }}>
              {c.piece_dest || "pièce ?"}
            </span>
          </div>
          {c.adresse && <div style={{ fontSize: 11.5, color: C.muet }}>→ {c.adresse}</div>}
          {c.contenu && (
            <div style={{ fontSize: 12.5, color: C.encre, marginTop: 6,
                          whiteSpace: "pre-wrap" }}>{c.contenu}</div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...S.boutonLien, paddingLeft: 0 }}
                    onClick={() => setForm({ ...c })}>Modifier</button>
            <button style={{ ...S.boutonLien, color: C.rouge }}
                    onClick={() => supprimer(c.numero)}>Supprimer</button>
          </div>
        </div>
      ))}

      {form ? (
        <div style={S.carte}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 8 }}>
            Caisse n°{form.numero}
          </div>
          <label style={{ ...S.label, marginTop: 0 }}>Pièce de destination</label>
          <input style={S.input} value={form.piece_dest}
                 placeholder="Chambre 1, Cuisine, Bureau…"
                 onChange={(e) => setForm({ ...form, piece_dest: e.target.value })} />
          {decharges.length > 1 && (
            <>
              <label style={S.label}>Nouvelle adresse</label>
              <select style={S.input} value={form.adresse_id || ""}
                      onChange={(e) => setForm({ ...form, adresse_id: e.target.value || null })}>
                {decharges.map((a) => (
                  <option key={a.id} value={a.id}>{a.adresse}</option>
                ))}
              </select>
            </>
          )}
          <label style={S.label}>Contenu (privé)</label>
          <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }}
                    value={form.contenu} placeholder="Ce que vous rangez dans cette caisse…"
                    onChange={(e) => setForm({ ...form, contenu: e.target.value })} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10,
                          fontSize: 13, color: C.encre, cursor: "pointer" }}>
            <input type="checkbox" checked={form.fragile}
                   onChange={(e) => setForm({ ...form, fragile: e.target.checked })} />
            Fragile
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={S.boutonPlein} onClick={enregistrer}>Enregistrer</button>
            <button style={{ ...S.boutonLien }} onClick={() => setForm(null)}>Annuler</button>
          </div>
        </div>
      ) : (
        <button style={{ ...S.boutonPlein, marginTop: 4 }} onClick={nouvelle}>
          + Ajouter une caisse
        </button>
      )}
    </>
  );
}

function Reseau() {
  const { chargement, donnees, erreur } = useCharge(reseauDemenageurs);
  const liste = donnees || [];
  return (
    <Etat chargement={chargement} erreur={erreur}
          vide={liste.length === 0 && "Aucun déménageur ne figure encore dans l'annuaire."}>
      <>
        <div style={{ margin: "0 16px 10px", fontSize: 11.5, color: C.muet,
                      lineHeight: 1.5 }}>
          Les entreprises qui utilisent Dashprod et ont accepté de figurer dans
          cet annuaire. Demandez-leur une offre pour comparer.
        </div>
        {liste.map((o, i) => (
          <div key={i} style={S.carte}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: C.encre }}>
              {o.nom}
            </div>
            <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
              {[o.cp, o.ville].filter(Boolean).join(" ")}
            </div>
            {o.presentation && (
              <div style={{ fontSize: 12.5, color: C.muet, marginTop: 8,
                            lineHeight: 1.5 }}>{o.presentation}</div>
            )}
            <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
              {o.tel && (
                <a href={`tel:${o.tel}`} style={{ fontSize: 12.5, fontWeight: 700,
                     color: C.bleu, textDecoration: "none" }}>{o.tel}</a>
              )}
              {o.email && (
                <a href={`mailto:${o.email}`} style={{ fontSize: 12.5, fontWeight: 700,
                     color: C.bleu, textDecoration: "none" }}>Écrire</a>
              )}
              {o.site_web && (
                <a href={o.site_web} target="_blank" rel="noreferrer"
                   style={{ fontSize: 12.5, fontWeight: 700, color: C.bleu,
                            textDecoration: "none" }}>Site</a>
              )}
            </div>
          </div>
        ))}
      </>
    </Etat>
  );
}

function L({ l, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12,
                  padding: "7px 0", borderTop: `1px solid ${C.doux}` }}>
      <span style={{ fontSize: 12.5, color: C.muet }}>{l}</span>
      <span style={{ fontSize: 12.5, color: C.encre, fontWeight: 600,
                     textAlign: "right" }}>{v || "—"}</span>
    </div>
  );
}
