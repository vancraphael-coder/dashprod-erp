// =============================================================================
// APP TERRAIN — Mon profil (4 onglets : Véhicule / Inventaire / Heures / Congés).
// Demande fondateur : chaque membre a une page profil avec son véhicule (état
// et signalement rapide) et son inventaire personnel — vêtements et outils —
// pré-rempli depuis une liste standard, dont il modifie l'état quand il veut
// (RLS 0030 : le membre écrit sur SON équipement, le bureau voit tout).
//
// Onglet Congés (lot 12) : le circuit demande→décision existait depuis le
// module 8 (`demanderConge`, `deciderConge`, `annulerConge`), mais il manquait
// la PORTE côté terrain. Le membre pose sa demande ici ; le bureau tranche
// depuis le planning. Deux portes, une seule table.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  listerVehicules, signalerSouci,
  listerEquipement, ajouterEquipement, changerEtatEquipement,
  listerConges, demanderConge, annulerConge,
} from "../lib/adaptateur.js";
import { maPaie } from "../lib/adaptateur.js";
import { formaterDuree } from "@domaine/operations/pointage.js";
import { validerDemandeConge, joursCouverts } from "@domaine/rh/conges.js";
import { deconnecter } from "../lib/supabase.js";
import { C, S, FC } from "../lib/theme.jsx";

// La même date du jour que les autres écrans terrain : une chaîne AAAA-MM-JJ,
// injectée dans le domaine qui, lui, ne lit jamais l'horloge.
function aujourdhui() { return new Date().toISOString().slice(0, 10); }

const ETATS_EQUIP = { neuf: "Neuf", bon: "Bon", use: "Usé", a_remplacer: "À remplacer" };
const COULEUR_EQUIP = { neuf: "#059669", bon: "#2563EB", use: "#D97706", a_remplacer: "#DC2626" };
const LIBELLE_MECA = { ok: "OK", surveiller: "À surveiller", urgent: "URGENT" };
const COULEUR_MECA = { ok: "#059669", surveiller: "#D97706", urgent: "#DC2626" };

// Inventaire standard d'un déménageur (modèle terrain) : posé en un tap.
const INVENTAIRE_STANDARD = [
  { categorie: "vetement", article: "Veste de travail" },
  { categorie: "vetement", article: "Pantalon de travail" },
  { categorie: "vetement", article: "T-shirts (x3)" },
  { categorie: "vetement", article: "Chaussures de sécurité" },
  { categorie: "vetement", article: "Gants" },
  { categorie: "outil", article: "Diable" },
  { categorie: "outil", article: "Sangles (x4)" },
  { categorie: "outil", article: "Couvertures (x10)" },
  { categorie: "outil", article: "Boîte à outils" },
  { categorie: "outil", article: "Cutter" },
];

export default function TerrainProfil({ profil }) {
  const [onglet, setOnglet] = useState("vehicule");

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={S.titre}>Mon profil</div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          {profil?.nom || ""}{profil?.email ? ` · ${profil.email}` : ""}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {[["vehicule", "🚛 Véhicule"], ["inventaire", "🧥 Inventaire"],
            ["paie", "⏱ Mes heures"], ["conges", "🌴 Congés"]].map(([cle, lib]) => (
            <button key={cle} onClick={() => setOnglet(cle)} style={{
              flex: 1, padding: "9px 6px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${onglet === cle ? C.bleu : C.bord}`,
              background: onglet === cle ? C.bleuClair : C.blanc,
              color: onglet === cle ? C.bleu : C.muet, fontSize: 12, fontWeight: 700,
              whiteSpace: "nowrap",
            }}>{lib}</button>
          ))}
        </div>
      </div>

      {onglet === "vehicule" && <OngletVehicule />}
      {onglet === "inventaire" && <OngletInventaire profil={profil} />}
      {onglet === "paie" && <OngletPaie />}
      {onglet === "conges" && <OngletConges />}

      <div style={{ margin: "18px 16px 0" }}>
        <button onClick={async () => { await deconnecter(); window.location.reload(); }}
                style={{ ...S.boutonLien, color: C.rouge, width: "100%", textAlign: "center" }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

/** Onglet Véhicule : l'état des camions, signalement rapide d'un souci. */
function OngletVehicule() {
  const [vehicules, setVehicules] = useState([]);
  const [ouvert, setOuvert] = useState(null);

  function recharger() { listerVehicules().then(setVehicules).catch(() => {}); }
  useEffect(recharger, []);

  return (
    <>
      {vehicules.map((v) => (
        <CarteVehicule key={v.id} v={v}
          ouvert={ouvert === v.id}
          onToggle={() => setOuvert(ouvert === v.id ? null : v.id)}
          onEnvoye={recharger} />
      ))}
    </>
  );
}

/** Une carte camion = son PROPRE brouillon (état + note). Plus de champ
    partagé entre tous les camions. */
function CarteVehicule({ v, ouvert, onToggle, onEnvoye }) {
  const [etat, setEtat] = useState("surveiller");
  const [note, setNote] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function envoyer() {
    setErreur(null);
    try {
      await signalerSouci({ vehiculeId: v.id, etat, note });
      setEnvoye(true); setNote("");
      setTimeout(() => setEnvoye(false), 2500);
      onEnvoye();
    } catch (e) { setErreur(e.message || "Envoi impossible"); }
  }

  return (
    <div style={{ ...S.carte, padding: 13 }}>
      <div onClick={onToggle}
           style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", cursor: "pointer" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.encre }}>🚛 {v.nom}</div>
          <div style={{ fontSize: 11.5, color: C.muet, fontFamily: FC }}>
            {v.immatriculation || "—"}
            {v.carte_carburant ? ` · carte ${v.carte_carburant}` : ""}
          </div>
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px",
          borderRadius: 999, color: "#fff",
          background: COULEUR_MECA[v.etat_mecanique || "ok"] }}>
          {LIBELLE_MECA[v.etat_mecanique || "ok"]}
        </span>
      </div>

      {ouvert && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`, paddingTop: 8 }}>
          <label style={S.label}>Signaler un état</label>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.keys(LIBELLE_MECA).map((e) => (
              <button key={e} onClick={() => setEtat(e)} style={{
                flex: 1, padding: "8px", borderRadius: 10, cursor: "pointer",
                fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${etat === e ? COULEUR_MECA[e] : C.bord}`,
                background: etat === e ? COULEUR_MECA[e] : "#fff",
                color: etat === e ? "#fff" : C.muet,
              }}>{LIBELLE_MECA[e]}</button>
            ))}
          </div>
          <label style={S.label}>Détail</label>
          <textarea style={{ ...S.input, minHeight: 50 }} value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Bruit, voyant, dommage…" />
          {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 6 }}>{erreur}</div>}
          <button style={{ ...S.boutonPlein, marginTop: 10 }} onClick={envoyer}>
            {envoye ? "✓ Signalé au bureau" : "Signaler au bureau"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Onglet Inventaire : équipement personnel, pré-rempli en un tap. */
function OngletInventaire({ profil }) {
  const [liste, setListe] = useState([]);
  const [creation, setCreation] = useState(false);
  const monId = profil?.utilisateur_id;

  function recharger() {
    if (monId) listerEquipement(monId).then(setListe).catch(() => {});
  }
  useEffect(recharger, [monId]);

  async function creerStandard() {
    setCreation(true);
    for (const art of INVENTAIRE_STANDARD) {
      await ajouterEquipement(monId, art).catch(() => {});
    }
    setCreation(false);
    recharger();
  }
  async function cycler(art) {
    const suite = { bon: "use", use: "a_remplacer", a_remplacer: "neuf", neuf: "bon" };
    await changerEtatEquipement(art.id, suite[art.etat] || "bon", monId);
    recharger();
  }

  const vetements = liste.filter((x) => x.categorie === "vetement");
  const outils = liste.filter((x) => x.categorie === "outil");

  const rendre = (arr) => arr.map((art) => (
    <button key={art.id} onClick={() => cycler(art)} style={{
      display: "flex", width: "100%", justifyContent: "space-between",
      alignItems: "center", padding: "10px 12px", marginBottom: 6,
      borderRadius: 10, cursor: "pointer", background: "#fff",
      border: `1.5px solid ${art.etat === "a_remplacer" ? "#FECACA" : C.bord}`,
    }}>
      <span style={{ fontSize: 13.5, color: C.encre, fontWeight: 600 }}>{art.article}</span>
      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
        color: "#fff", background: COULEUR_EQUIP[art.etat] }}>
        {ETATS_EQUIP[art.etat]}
      </span>
    </button>
  ));

  return (
    <>
      {liste.length === 0 ? (
        <div style={{ ...S.carte, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: C.muet, marginBottom: 12 }}>
            Aucun inventaire pour le moment.
          </div>
          <button style={S.boutonPlein} onClick={creerStandard} disabled={creation}>
            {creation ? "Création…" : "Créer mon inventaire standard"}
          </button>
          <div style={{ fontSize: 11, color: C.fantome, marginTop: 8, lineHeight: 1.5 }}>
            Veste, pantalon, t-shirts, chaussures, gants · diable, sangles,
            couvertures, boîte à outils, cutter.
          </div>
        </div>
      ) : (
        <>
          <div style={S.carte}>
            <label style={{ ...S.label, marginTop: 0 }}>Vêtements</label>
            {rendre(vetements)}
            <label style={S.label}>Outils</label>
            {rendre(outils)}
          </div>
          <div style={{ margin: "0 16px", fontSize: 11.5, color: C.fantome, lineHeight: 1.5 }}>
            Touchez un article pour changer son état (Bon → Usé → À remplacer →
            Neuf). Le bureau voit l'état en direct dans Ressources.
          </div>
        </>
      )}
    </>
  );
}

/**
 * Onglet Congés : le membre demande, le bureau tranche.
 *
 * La demande n'est pas une décision : elle part en état « demande » et
 * s'affiche au planning en pastille creuse (§4.5) pour que le bureau ne
 * réserve pas quelqu'un sur une période qu'il vient de demander. Elle ne bloque
 * rien tant qu'elle n'est pas approuvée.
 *
 * On valide AVANT d'envoyer (dates cohérentes, pas dans le passé) et on affiche
 * le motif tel quel — un bouton grisé sans explication laisse le déménageur
 * deviner ce qui cloche. Tant qu'une demande est en attente, il peut la
 * retirer lui-même (`annulerConge`).
 */
function OngletConges() {
  const [mes, setMes] = useState(null);        // null = en cours de chargement
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function recharger() {
    // On veut voir ses demandes en attente ET ses congés accordés : une
    // demande refusée ou une absence acquise racontent toutes deux où on en est.
    setMes(await listerConges(["demande", "approuve", "refuse"]).catch(() => []));
  }
  useEffect(() => { recharger(); }, []);

  const controle = validerDemandeConge({ debut, fin }, aujourdhui());

  async function envoyer() {
    if (!controle.ok) { setErreur(controle.motif); return; }
    setEnvoi(true); setErreur(null);
    try {
      // Sans utilisateurId : la base traite l'acte comme une demande du membre
      // pour lui-même, à approuver. C'est ce qui distingue cette porte de la
      // saisie directe du bureau.
      await demanderConge({ debut, fin, motif: motif.trim() || null });
      setDebut(""); setFin(""); setMotif("");
      await recharger();
    } catch (e) {
      setErreur(e.message || "La demande n'a pas pu être envoyée.");
    } finally {
      setEnvoi(false);
    }
  }

  async function retirer(id) {
    try { await annulerConge(id); await recharger(); }
    catch (e) { setErreur(e.message || "Retrait impossible."); }
  }

  const nJours = joursCouverts({ debut, fin });

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={S.carte}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.encre,
                      marginBottom: 4 }}>
          Demander un congé
        </div>
        <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 12,
                      lineHeight: 1.5 }}>
          Votre demande part au bureau, qui la validera. En attendant, elle
          apparaît au planning pour éviter qu'on vous place ces jours-là.
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ flex: 1 }}>
            <span style={S.label}>Du</span>
            <input type="date" value={debut} min={aujourdhui()}
                   onChange={(e) => setDebut(e.target.value)} style={S.input} />
          </label>
          <label style={{ flex: 1 }}>
            <span style={S.label}>Au</span>
            <input type="date" value={fin} min={debut || aujourdhui()}
                   onChange={(e) => setFin(e.target.value)} style={S.input} />
          </label>
        </div>

        <label>
          <span style={S.label}>Motif (facultatif)</span>
          <input type="text" value={motif} maxLength={120}
                 placeholder="Congé, rendez-vous…"
                 onChange={(e) => setMotif(e.target.value)} style={S.input} />
        </label>

        {debut && fin && controle.ok && (
          <div style={{ fontSize: 12, color: C.muet, marginTop: 8 }}>
            {nJours} jour{nJours > 1 ? "s" : ""} demandé{nJours > 1 ? "s" : ""}.
          </div>
        )}
        {/* Le motif du refus se lit sous les champs, pas dans un bouton grisé
            sans explication. */}
        {debut && fin && !controle.ok && (
          <div style={{ fontSize: 12, color: C.ambre, marginTop: 8,
                        fontWeight: 600 }}>
            {controle.motif}
          </div>
        )}
        {erreur && (
          <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>
        )}

        <button onClick={envoyer} disabled={!controle.ok || envoi}
                style={{ ...S.boutonPlein, marginTop: 12,
                         opacity: (!controle.ok || envoi) ? .5 : 1 }}>
          {envoi ? "Envoi…" : "Envoyer la demande"}
        </button>
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 800, color: C.muet,
                    margin: "18px 4px 8px", textTransform: "uppercase",
                    letterSpacing: ".04em" }}>
        Mes demandes
      </div>
      {mes === null ? (
        <div style={{ ...S.carte, color: C.muet, fontSize: 13 }}>Chargement…</div>
      ) : mes.length === 0 ? (
        <div style={{ ...S.carte, color: C.muet, fontSize: 13, textAlign: "center" }}>
          Aucune demande pour l'instant.
        </div>
      ) : (
        mes
          .slice()
          .sort((a, b) => (b.debut || "").localeCompare(a.debut || ""))
          .map((c) => <LigneConge key={c.id} conge={c} onRetirer={retirer} />)
      )}
      <div style={{ height: 24 }} />
    </div>
  );
}

const ETAT_CONGE = {
  demande:  { libelle: "En attente", couleur: "#D97706" },
  approuve: { libelle: "Accordé",    couleur: "#059669" },
  refuse:   { libelle: "Refusé",     couleur: "#DC2626" },
};

function LigneConge({ conge, onRetirer }) {
  const e = ETAT_CONGE[conge.etat] || { libelle: conge.etat, couleur: C.muet };
  const n = joursCouverts(conge);
  return (
    <div style={{ ...S.carte, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%",
                     background: e.couleur, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.encre }}>
          {formatJour(conge.debut)}{conge.fin !== conge.debut
            ? ` → ${formatJour(conge.fin)}` : ""}
          <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muet,
                         marginLeft: 6 }}>
            · {n} j
          </span>
        </div>
        {conge.motif && (
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 1 }}>
            {conge.motif}
          </div>
        )}
        {conge.etat === "refuse" && conge.motif_decision && (
          <div style={{ fontSize: 11.5, color: "#DC2626", marginTop: 2 }}>
            Refus : {conge.motif_decision}
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: e.couleur,
                     border: `1.5px solid ${e.couleur}`, borderRadius: 999,
                     padding: "2px 9px", whiteSpace: "nowrap" }}>
        {e.libelle}
      </span>
      {/* On ne retire QUE ce qui est encore en attente : un congé accordé
          s'annule au bureau, un refus est déjà clos. */}
      {conge.etat === "demande" && (
        <button onClick={() => onRetirer(conge.id)}
                title="Retirer ma demande"
                style={{ background: "none", border: "none", cursor: "pointer",
                         color: C.muet, fontSize: 18, padding: "0 2px",
                         lineHeight: 1, flexShrink: 0 }}>×</button>
      )}
    </div>
  );
}

/** Une date AAAA-MM-JJ en jour lisible (03 juin), sans dépendance externe. */
function formatJour(iso) {
  if (!iso) return "";
  const [a, m, j] = iso.split("-");
  const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.",
                "août", "sept.", "oct.", "nov.", "déc."];
  return `${Number(j)} ${MOIS[Number(m) - 1] || ""}${
    String(new Date().getFullYear()) !== a ? " " + a : ""}`;
}

/**
 * Mes heures et mon brut — la vue du déménageur sur SA paie.
 *
 * Le premier motif de litige sur un chantier, c'est le décompte des heures.
 * Chacun peut donc vérifier les siennes, mois par mois. La base ne répond que
 * sur l'appelant : les salaires des collègues restent invisibles.
 */
function OngletPaie() {
  const [periode, setPeriode] = useState(() => new Date().toISOString().slice(0, 7));
  const [etat, setEtat] = useState({ chargement: true, d: null, erreur: null });

  useEffect(() => {
    let vivant = true;
    setEtat((e) => ({ ...e, chargement: true }));
    maPaie(periode)
      .then((d) => vivant && setEtat({ chargement: false, d, erreur: null }))
      .catch((e) => vivant && setEtat({ chargement: false, d: null, erreur: e.message }));
    return () => { vivant = false; };
  }, [periode]);

  const { chargement, d, erreur } = etat;
  const moisPrecedent = () => {
    const [a, m] = periode.split("-").map(Number);
    const t = new Date(Date.UTC(a, m - 2, 1));
    setPeriode(t.toISOString().slice(0, 7));
  };
  const moisSuivant = () => {
    const [a, m] = periode.split("-").map(Number);
    const t = new Date(Date.UTC(a, m, 1));
    if (t <= new Date()) setPeriode(t.toISOString().slice(0, 7));
  };
  const libelleMois = () => {
    try {
      return new Date(periode + "-01T00:00:00").toLocaleDateString("fr-BE",
        { month: "long", year: "numeric" });
    } catch { return periode; }
  };
  const eur = (c) => c == null ? "—"
    : (c / 100).toFixed(2).replace(".", ",") + " €";

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "0 16px", marginBottom: 10 }}>
        <button onClick={moisPrecedent} style={navMois}>←</button>
        <span style={{ flex: 1, textAlign: "center", fontSize: 13.5,
          fontWeight: 800, textTransform: "capitalize" }}>{libelleMois()}</span>
        <button onClick={moisSuivant} style={navMois}>→</button>
      </div>

      {chargement && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Chargement…
        </div>
      )}
      {erreur && (
        <div style={{ ...S.carte, color: C.rouge, fontSize: 12.5 }}>{erreur}</div>
      )}

      {d && !chargement && (
        <>
          <div style={S.carte}>
            <div style={{ textAlign: "center", padding: "6px 0" }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: C.encre,
                fontFamily: "ui-monospace, monospace" }}>
                {String(d.heures ?? 0).replace(".", ",")} h
              </div>
              <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
                sur {d.jours_travailles || 0} chantier
                {(d.jours_travailles || 0) > 1 ? "s" : ""}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between",
              padding: "10px 0 0", borderTop: `1px solid ${C.doux}`, marginTop: 10 }}>
              <span style={{ fontSize: 12.5, color: C.muet }}>Taux horaire</span>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                {d.taux_horaire ? `${String(d.taux_horaire).replace(".", ",")} €/h` : "—"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between",
              padding: "8px 0 0" }}>
              <span style={{ fontSize: 13, color: C.encre, fontWeight: 700 }}>
                Brut estimé
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
                {eur(d.brut_centimes)}
              </span>
            </div>

            {d.avertissement && (
              <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 9,
                background: "#FFFBEB", border: "1px solid #FDE68A",
                fontSize: 11.5, color: "#92400E", lineHeight: 1.45 }}>
                {d.avertissement}
              </div>
            )}
            {d.message_net && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: C.fantome,
                            lineHeight: 1.45 }}>
                {d.message_net}
              </div>
            )}
          </div>

          {(d.detail || []).length > 0 && (
            <div style={S.carte}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.fantome,
                textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>
                Détail par chantier
              </div>
              {d.detail.map((x, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between",
                  padding: "8px 0", borderTop: `1px solid ${C.doux}` }}>
                  <span style={{ fontSize: 12.5, color: C.muet }}>
                    {new Date(x.date + "T00:00:00").toLocaleDateString("fr-BE",
                      { weekday: "short", day: "2-digit", month: "short" })}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.encre }}>
                    {formaterDuree(x.secondes)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ margin: "0 16px 12px", fontSize: 11.5, color: C.fantome,
                        lineHeight: 1.5 }}>
            Ce décompte reprend vos heures déclarées, pauses déduites. Le document
            de paie officiel est établi par le secrétariat social.
          </div>
        </>
      )}
    </>
  );
}

const navMois = {
  width: 36, height: 36, borderRadius: 10, cursor: "pointer",
  border: `1.5px solid ${C.bord}`, background: C.blanc, color: C.encre,
  fontSize: 15, fontWeight: 700,
};
