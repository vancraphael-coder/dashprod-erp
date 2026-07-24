// =============================================================================
// Écran — Portail client « Gestion de votre déménagement ».
//
// Vue publique, sans compte. L'accès se fait par un code à 12 caractères.
// Le code n'est PAS conservé après la session : il vit en mémoire le temps de
// la visite. Un client sur un poste partagé ne laisse rien derrière lui.
//
// Tout ce qui s'affiche ici vient de fonctions cmd_portail_* qui filtrent en
// base sur le dossier lié au code. L'écran ne décide de rien : s'il demandait
// plus que son droit, la base refuserait.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  portailOuvrir, portailDossier, portailOffres, portailFactures,
  portailInventaire, reseauDemenageurs,
} from "../lib/adaptateur.js";
import { formater, formeValide, essaisRestants } from "@domaine/portail/acces.js";
import { manifeste, manifestePret, packingListCsv }
  from "@domaine/releve/inventaire-export.js";
import { C, S } from "../lib/theme.jsx";

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
  ["reseau", "Déménageurs"],
];

export default function Portail({ retour }) {
  const [code, setCode] = useState("");
  const [session, setSession] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [onglet, setOnglet] = useState("dossier");

  const pret = formeValide(code);

  async function ouvrir() {
    setErreur(null); setEnCours(true);
    try {
      const r = await portailOuvrir(code);
      if (!r?.ouvert) {
        setErreur(r?.message || "Code invalide, expiré ou bloqué.");
      } else {
        setSession(r);
      }
    } catch (e) {
      setErreur(e.message || "Connexion impossible.");
    } finally { setEnCours(false); }
  }

  if (!session) {
    return (
      <div style={{ ...S.page, paddingBottom: 60 }}>
        <div style={{ padding: "34px 20px 8px", maxWidth: 520, margin: "0 auto" }}>
          {retour && (
            <button style={S.boutonLien} onClick={retour}>← Retour</button>
          )}
          <div style={{ fontSize: 13, fontWeight: 700, color: C.bleu, marginTop: 8 }}>
            Gestion de votre déménagement
          </div>
          <h1 style={{ fontSize: 25, fontWeight: 800, margin: "6px 0 8px",
                       letterSpacing: "-.02em", lineHeight: 1.18 }}>
            Suivez votre déménagement en un seul endroit.
          </h1>
          <p style={{ fontSize: 14.5, color: C.muet, lineHeight: 1.55, margin: 0 }}>
            Votre dossier, l'inventaire de vos meubles, les offres reçues et vos
            factures. Entrez le code que votre déménageur vous a transmis.
          </p>
        </div>

        <div style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>Votre code d'accès</label>
          <input
            style={{ ...S.input, fontSize: 20, letterSpacing: ".12em",
                     textAlign: "center", fontFamily: "ui-monospace, monospace",
                     textTransform: "uppercase" }}
            value={code} autoFocus placeholder="ABCD-EFGH-JKMN"
            maxLength={16}
            onChange={(e) => { setCode(formater(e.target.value)); setErreur(null); }}
            onKeyDown={(e) => e.key === "Enter" && pret && ouvrir()} />

          {erreur && (
            <div style={{ fontSize: 12.5, color: C.rouge, background: "#FEF2F2",
                          border: "1px solid #FECACA", borderRadius: 10,
                          padding: "10px 12px", marginTop: 10, lineHeight: 1.5 }}>
              {erreur}
            </div>
          )}

          <button style={{ ...S.boutonPlein, marginTop: 12, opacity: pret ? 1 : .5 }}
                  disabled={!pret || enCours} onClick={ouvrir}>
            {enCours ? "Vérification…" : "Connexion"}
          </button>

          <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 10,
                        lineHeight: 1.5 }}>
            Le code figure sur l'email ou le SMS de votre déménageur. Après
            plusieurs essais infructueux, l'accès se bloque par sécurité —
            votre déménageur peut le réactiver.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.bleu }}>
          Gestion de votre déménagement
        </div>
        <div style={S.titre}>{session.client || "Votre dossier"}</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Dossier {session.reference || "—"}
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

      {onglet === "dossier"    && <Dossier code={code} />}
      {onglet === "inventaire" && <Inventaire code={code} />}
      {onglet === "offres"     && <Offres code={code} />}
      {onglet === "factures"   && <Factures code={code} />}
      {onglet === "reseau"     && <Reseau />}

      <div style={{ margin: "18px 16px 30px", textAlign: "center" }}>
        <button onClick={() => { setSession(null); setCode(""); }}
                style={{ background: "none", border: "none", color: C.muet,
                         fontSize: 12.5, cursor: "pointer", padding: 10 }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function useCharge(fn, code) {
  const [etat, setEtat] = useState({ chargement: true, donnees: null, erreur: null });
  useEffect(() => {
    let vivant = true;
    fn(code)
      .then((d) => vivant && setEtat({ chargement: false, donnees: d, erreur: null }))
      .catch((e) => vivant && setEtat({ chargement: false, donnees: null,
                                        erreur: e.message }));
    return () => { vivant = false; };
  }, [code]);
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

function Dossier({ code }) {
  const { chargement, donnees: d, erreur } = useCharge(portailDossier, code);
  return (
    <Etat chargement={chargement} erreur={erreur} vide={!d?.reference && "Dossier introuvable."}>
      <>
        <div style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>Votre déménagement</label>
          <L l="Référence" v={d?.reference} />
          <L l="Date souhaitée" v={jour(d?.date_souhaitee)} />
          <L l="Visite technique" v={jour(d?.date_visite)} />
        </div>

        <div style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>Vos coordonnées</label>
          <L l="Nom" v={d?.client?.nom} />
          <L l="Email" v={d?.client?.email} />
          <L l="Téléphone" v={d?.client?.tel} />
        </div>

        {(d?.adresses || []).length > 0 && (
          <div style={S.carte}>
            <label style={{ ...S.label, marginTop: 0 }}>Adresses</label>
            {d.adresses.map((a, i) => (
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
          </div>
        )}

        <div style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>Votre déménageur</label>
          <L l="Entreprise" v={d?.entreprise?.nom} />
          <L l="Téléphone" v={d?.entreprise?.tel} />
          <L l="Email" v={d?.entreprise?.email} />
        </div>
      </>
    </Etat>
  );
}

function Inventaire({ code }) {
  const { chargement, donnees, erreur } = useCharge(portailInventaire, code);
  const lignes = donnees || [];

  // Le relevé devient un manifeste : un colis par ligne relevée, ce qui donne
  // une numérotation exploitable en export. Les dimensions et poids se
  // complètent lors de l'emballage — d'où les avertissements affichés.
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
            valeur déclarée de chaque objet — c'est la base de l'assurance et de
            la déclaration douanière.
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

function Offres({ code }) {
  const { chargement, donnees, erreur } = useCharge(portailOffres, code);
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

function Factures({ code }) {
  const { chargement, donnees, erreur } = useCharge(portailFactures, code);
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

function Reseau() {
  const [etat, setEtat] = useState({ chargement: true, donnees: [], erreur: null });
  useEffect(() => {
    reseauDemenageurs()
      .then((d) => setEtat({ chargement: false, donnees: d || [], erreur: null }))
      .catch((e) => setEtat({ chargement: false, donnees: [], erreur: e.message }));
  }, []);

  return (
    <Etat chargement={etat.chargement} erreur={etat.erreur}
          vide={etat.donnees.length === 0
            && "Aucun déménageur ne figure encore dans l'annuaire."}>
      <>
        <div style={{ margin: "0 16px 10px", fontSize: 11.5, color: C.muet,
                      lineHeight: 1.5 }}>
          Les entreprises qui utilisent Dashprod et ont accepté de figurer dans
          cet annuaire. Demandez-leur une offre pour comparer.
        </div>
        {etat.donnees.map((o, i) => (
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
