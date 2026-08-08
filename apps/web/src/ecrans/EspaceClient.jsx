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
  clientDossiers, clientInventaire, clientOffres, clientFactures,
  reseauDemenageurs,
} from "../lib/adaptateur.js";
import { deconnecter } from "../lib/supabase.js";
import { manifeste, manifestePret, packingListCsv }
  from "@domaine/releve/inventaire-export.js";
import { C, S } from "../lib/theme.jsx";
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
  ["offres", "Mes offres"],
  ["factures", "Mes factures"],
  ["messages", "Messages"],
  ["reseau", "Déménageurs"],
];

export default function EspaceClient({ client }) {
  const [onglet, setOnglet] = useState("dossier");

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.bleu }}>
          Gestion de votre déménagement
        </div>
        <div style={S.titre}>{client?.nom || "Votre espace"}</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          {client?.dossiers > 1
            ? `${client.dossiers} dossiers`
            : "Votre déménagement"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto",
                    padding: "0 16px 10px" }}>
        {ONGLETS.map(([cle, lib]) => (
          <button key={cle} onClick={() => setOnglet(cle)} style={{
            padding: "7px 13px", borderRadius: 999, whiteSpace: "nowrap",
            cursor: "pointer", fontSize: 12.5, fontWeight: 700,
            border: `1.5px solid ${onglet === cle ? C.bleu : C.bord}`,
            background: onglet === cle ? "#E7EFFC" : C.blanc,
            color: onglet === cle ? C.bleu : C.muet }}>{lib}</button>
        ))}
      </div>

      {onglet === "dossier"    && <Dossiers />}
      {onglet === "inventaire" && <Inventaire />}
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

function Dossiers() {
  const { chargement, donnees, erreur } = useCharge(clientDossiers);
  const dossiers = donnees || [];
  return (
    <Etat chargement={chargement} erreur={erreur}
          vide={dossiers.length === 0 && "Aucun dossier pour le moment."}>
      <>
        {dossiers.map((d) => (
          <div key={d.affaire_id} style={S.carte}>
            <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
                {d.entreprise?.nom || "Déménageur"}
              </span>
              <span style={{ fontSize: 11.5, color: C.fantome }}>{d.reference}</span>
            </div>
            <L l="Date souhaitée" v={jour(d.date_souhaitee)} />
            <L l="Visite technique" v={jour(d.date_visite)} />

            {(d.adresses || []).map((a, i) => (
              <div key={i} style={{ padding: "9px 0",
                                    borderTop: `1px solid ${C.doux}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.bleu,
                              textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {a.role === "charge" ? "Chargement" : "Déchargement"}
                </div>
                <div style={{ fontSize: 13.5, color: C.encre, marginTop: 2 }}>
                  {a.adresse}
                </div>
                <div style={{ fontSize: 12, color: C.muet }}>
                  {[a.code_postal, a.ville].filter(Boolean).join(" ")}
                  {a.etage ? ` · étage ${a.etage}` : ""}
                </div>
              </div>
            ))}

            {d.entreprise?.tel && (
              <div style={{ fontSize: 12, color: C.muet, marginTop: 8 }}>
                Contact : {d.entreprise.tel}
              </div>
            )}
          </div>
        ))}
      </>
    </Etat>
  );
}

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
                            background: "#ECFDF5", border: "1px solid #A7F3D0",
                            fontSize: 11.5, fontWeight: 700, color: "#065F46",
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
                            background: "#F8FAFC", border: `1px solid ${C.bord}` }}>
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
        <FilMessages affaireId={actif.affaire_id} cote="client" />
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
