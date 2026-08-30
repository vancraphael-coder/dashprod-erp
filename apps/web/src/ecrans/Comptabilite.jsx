// =============================================================================
// Écran — Comptabilité.
//
// Le moteur d'export existait, testé, depuis des semaines : CSV pour Excel,
// journal des ventes à double entrée aux comptes du PCMN belge, et FEC pour
// les clients qui opèrent en France. Mais AUCUN écran ne l'appelait — donc
// le livrable comptable était inatteignable (INC-04).
//
// Cet écran est cette porte. Il suit le rythme réel du métier : on ne demande
// pas « les factures de mardi », on demande un trimestre — celui de la
// déclaration TVA belge, qui est donc le défaut.
//
// Rien n'est recalculé ici : les totaux viennent du modèle canonique, comme
// le PDF et l'UBL. Une seule source, plusieurs sorties.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { facturesCanoniquesPeriode, obtenirOrganisation , achatsPeriode, paiementsPeriode, listerTiers, depots } from "../lib/adaptateur.js";
import {
  bornesPeriode, libellePeriode, trimestreCourant, recapitulatif, lotPret,
} from "@domaine/facturation/periodes.js";
import {
  versCsv, journalCsv, versFec, journalVentes, equilibre, COMPTES_DEFAUT,
  journalAchatsCsv, paiementsCsv, tiersCsv,
} from "@domaine/facturation/exports.js";
import { C, S, euros } from "../lib/theme.jsx";
import OutilRapprochement from "../composants/OutilRapprochement.jsx";
import Relances from "../composants/Relances.jsx";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
              "août", "septembre", "octobre", "novembre", "décembre"];

// Style d'une pastille de ventilation (active/inactive).
function pastilleCentre(actif) {
  return {
    border: `1px solid ${actif ? C.encre : C.bord}`,
    background: actif ? C.encre : "transparent",
    color: actif ? "#fff" : C.muet,
    borderRadius: 999, padding: "3px 10px", fontSize: 11.5,
    fontWeight: actif ? 700 : 500, cursor: "pointer",
  };
}

export default function Comptabilite({ retour }) {
  const [periode, setPeriode] = useState(() => trimestreCourant());
  const [factures, setFactures] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [org, setOrg] = useState(null);
  // Les ressources complémentaires de l'export. Chacune se charge et échoue
  // SEULE : un export partiel vaut mieux qu'un écran blanc, et le client doit
  // pouvoir emporter ce qui est disponible.
  const [achats, setAchats] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [tiers, setTiers] = useState([]);
  // Ventilation par centre (Option A, point 2) : la maison mère voit TOUT
  // consolidé par défaut, et peut isoler un centre. `null` = tous les centres.
  const [centres, setCentres] = useState([]);
  const [centreFiltre, setCentreFiltre] = useState(null);   // null = tous

  const bornes = useMemo(() => bornesPeriode(periode), [periode]);

  useEffect(() => { obtenirOrganisation().then(setOrg).catch(() => setOrg(null)); }, []);
  useEffect(() => {
    depots(false).then((l) => setCentres(l || [])).catch(() => setCentres([]));
  }, []);

  useEffect(() => {
    if (!bornes) return;
    let vivant = true;
    setFactures(null); setErreur(null);
    facturesCanoniquesPeriode(bornes)
      .then((f) => vivant && setFactures(f))
      .catch((e) => vivant && setErreur(e.message));
    achatsPeriode(bornes).then((a) => vivant && setAchats(a || [])).catch(() => {});
    paiementsPeriode(bornes).then((p) => vivant && setPaiements(p || [])).catch(() => {});
    listerTiers().then((t) => vivant && setTiers(t || [])).catch(() => {});
    return () => { vivant = false; };
  }, [bornes?.debut, bornes?.fin]);

  // Les factures du centre choisi (ou toutes si null). La maison mère consolide
  // par défaut ; on peut isoler un centre pour sa ventilation.
  const facturesVues = useMemo(() => {
    if (!factures) return factures;              // null tant que ça charge
    if (centreFiltre === null) return factures;  // tous les centres
    // "__mm__" = maison mère (centre_id null) ; sinon l'id du centre.
    const cible = centreFiltre === "__mm__" ? null : centreFiltre;
    return factures.filter((f) => (f.centre_id ?? null) === cible);
  }, [factures, centreFiltre]);

  const recap = useMemo(() => recapitulatif(facturesVues || []), [facturesVues]);
  const verdict = useMemo(() => lotPret(facturesVues || []), [facturesVues]);

  /** Contrôle d'équilibre du journal : une écriture déséquilibrée est rejetée
   *  par tout cabinet. On le vérifie AVANT de proposer le fichier. */
  const journalEquilibre = useMemo(() => {
    if (!facturesVues || facturesVues.length === 0) return true;
    try { return equilibre(journalVentes(facturesVues, COMPTES_DEFAUT)); }
    catch { return false; }
  }, [facturesVues]);

  function telecharger(contenu, nom, type = "text/csv;charset=utf-8") {
    const blob = new Blob([contenu], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nom;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const suffixe = `${periode.annee}-${periode.type === "trimestre" ? `T${periode.trimestre}`
    : periode.type === "mois" ? String(periode.mois).padStart(2, "0") : "annuel"}`;

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Paramètres</button>}
        <div style={S.titre}>Comptabilité</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Vos factures émises, et les fichiers pour votre comptable.
        </div>
      </div>

      <CeQueDashprodFait />

      {/* Choix de la période. Le trimestre d'abord : c'est le rythme de la
          déclaration TVA belge. */}
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Période</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[["trimestre", "Trimestre"], ["mois", "Mois"], ["annee", "Exercice"]]
            .map(([t, lib]) => (
            <button key={t} onClick={() => setPeriode((p) => ({
              ...p, type: t,
              trimestre: p.trimestre || trimestreCourant().trimestre,
              mois: p.mois || new Date().getMonth() + 1,
            }))} style={onglet(periode.type === t)}>{lib}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select style={{ ...S.input, width: 110, margin: 0 }} value={periode.annee}
                  onChange={(e) => setPeriode((p) => ({ ...p, annee: Number(e.target.value) }))}>
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {periode.type === "trimestre" && (
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 4].map((t) => (
                <button key={t} onClick={() => setPeriode((p) => ({ ...p, trimestre: t }))}
                        style={onglet(periode.trimestre === t, 44)}>T{t}</button>
              ))}
            </div>
          )}

          {periode.type === "mois" && (
            <select style={{ ...S.input, flex: 1, minWidth: 130, margin: 0 }}
                    value={periode.mois}
                    onChange={(e) => setPeriode((p) => ({ ...p, mois: Number(e.target.value) }))}>
              {MOIS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          )}
        </div>

        {bornes && (
          <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 8 }}>
            Du {bornes.debut} au {bornes.fin} · factures émises uniquement
          </div>
        )}

        {/* Ventilation par centre — la maison mère consolide TOUT par défaut,
            et peut isoler un centre (Option A, point 2). */}
        {centres.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6,
                        flexWrap: "wrap", marginTop: 10 }}>
            <span style={{ fontSize: 11.5, color: C.fantome, fontWeight: 600 }}>
              Ventilation
            </span>
            <button onClick={() => setCentreFiltre(null)}
              style={pastilleCentre(centreFiltre === null)}>
              Tous les centres
            </button>
            <button onClick={() => setCentreFiltre("__mm__")}
              style={pastilleCentre(centreFiltre === "__mm__")}
              title="Les factures rattachées à la maison mère">
              Maison mère
            </button>
            {centres.map((c) => (
              <button key={c.id} onClick={() => setCentreFiltre(c.id)}
                style={pastilleCentre(centreFiltre === c.id)}>{c.nom}</button>
            ))}
          </div>
        )}
      </div>

      {erreur && (
        <div style={{ ...S.carte, color: C.rouge, fontSize: 12.5 }}>{erreur}</div>
      )}

      {factures === null && !erreur && (
        <div style={{ ...S.carte, textAlign: "center", color: C.muet, fontSize: 13 }}>
          Chargement…
        </div>
      )}

      {factures && (
        <>
          {/* Rapprocher un virement reçu à sa facture (lot C). Local : il
              travaille sur les factures déjà chargées de la période. */}
          <OutilRapprochement factures={facturesVues || []} />

          {/* Les factures échues et non soldées, à relancer (lot D). On signale,
              on n'envoie rien. */}
          <Relances factures={facturesVues || []} paiements={paiements || []} />

          {/* Récapitulatif TVA — ce que le comptable regarde en premier. */}
          <div style={S.carte}>
            <label style={{ ...S.label, marginTop: 0 }}>
              {libellePeriode(periode)}
            </label>
            <Ligne l="Factures émises" v={recap.nb_factures} />
            {recap.nb_avoirs > 0 && (
              <Ligne l="Avoirs (déduits)" v={recap.nb_avoirs} />
            )}
            <Ligne l="Total HTVA" v={euros(recap.htva_centimes)} />

            {recap.par_taux.map((t) => (
              <Ligne key={t.taux} l={`TVA ${t.taux} % (base ${euros(t.base_centimes)})`}
                     v={euros(t.tva_centimes)} discret />
            ))}

            <Ligne l="TVA due" v={euros(recap.tva_centimes)} gras />
            <Ligne l="Total TVAC" v={euros(recap.tvac_centimes)} gras />

            {recap.nb === 0 && (
              <div style={{ fontSize: 12.5, color: C.muet, marginTop: 10,
                            lineHeight: 1.5 }}>
                Aucune facture émise sur cette période.
              </div>
            )}
          </div>

          {/* Ce qui empêcherait le comptable d'accepter le fichier. */}
          {(verdict.bloquantes.length > 0 || !journalEquilibre) && (
            <div style={{ margin: "0 16px 12px", padding: "11px 13px",
                          borderRadius: 11, background: C.teinteRouge,
                          border: `1px solid ${C.filetRouge}`, fontSize: 12,
                          color: C.encreRouge, lineHeight: 1.5 }}>
              <b>À corriger avant de transmettre :</b>
              {!journalEquilibre && (
                <div style={{ marginTop: 4 }}>
                  Le journal des ventes n'est pas équilibré (débit ≠ crédit).
                </div>
              )}
              {verdict.bloquantes.map((x, i) => (
                <div key={i} style={{ marginTop: 4 }}>{x.message}</div>
              ))}
            </div>
          )}

          {/* Exports. Trois formats, un seul modèle derrière. */}
          {recap.nb > 0 && (
            <div style={S.carte}>
              <label style={{ ...S.label, marginTop: 0 }}>Export comptable</label>

              <Export
                titre="Relevé des factures (CSV)"
                detail="Ouvrable dans Excel. Une ligne par facture, avec HTVA, TVA et TVAC."
                onClick={() => telecharger(versCsv(facturesVues),
                  `factures-${suffixe}.csv`)} />

              <Export
                titre="Journal des ventes (CSV)"
                detail={"Écritures à double entrée aux comptes du PCMN belge : débit "
                      + "clients, crédit ventes et TVA par taux. C'est ce que le "
                      + "cabinet importe."}
                onClick={() => telecharger(journalCsv(facturesVues, COMPTES_DEFAUT),
                  `journal-ventes-${suffixe}.csv`)} />

              <Export
                titre="FEC (France)"
                detail={"Fichier des Écritures Comptables, format légal français, "
                      + "18 colonnes tabulées. Uniquement si vous opérez en France."}
                onClick={() => telecharger(versFec(facturesVues, {
                  journalCode: "VE", journalLib: "Journal des ventes",
                }), `FEC-${suffixe}.txt`, "text/plain;charset=utf-8")} />

              <Export
                titre="Journal des achats (CSV)"
                detail={"Écritures des factures fournisseur que vous avez "
                      + "APPROUVÉES : débit achats et TVA déductible, crédit "
                      + "fournisseurs. Une facture reçue mais non validée n'y "
                      + "figure pas."}
                onClick={() => telecharger(journalAchatsCsv(achats),
                  `journal-achats-${suffixe}.csv`)} />

              <Export
                titre="Paiements (CSV)"
                detail={"Ce que vous avez encaissé, avec la facture concernée. "
                      + "C'est la pièce du lettrage : sans elle, votre comptable "
                      + "voit des créances qu'il ne peut pas solder."}
                onClick={() => telecharger(paiementsCsv(paiements),
                  `paiements-${suffixe}.csv`)} />

              <Export
                titre="Clients et fournisseurs (CSV)"
                detail={"La liste des tiers avec leurs numéros de TVA. Le cabinet "
                      + "crée ses comptes auxiliaires à partir de ce fichier."}
                onClick={() => telecharger(tiersCsv(tiers), `tiers-${suffixe}.csv`)} />

              <div style={{ fontSize: 11, color: C.fantome, marginTop: 10,
                            lineHeight: 1.5 }}>
                Ces fichiers reprennent vos données telles qu'elles ont été
                enregistrées. Ils ne remplacent pas votre comptable : ils lui
                évitent de tout ressaisir.
              </div>
            </div>
          )}

          {/* Le détail, pour vérifier avant d'envoyer. */}
          {recap.nb > 0 && (
            <div style={S.carte}>
              <label style={{ ...S.label, marginTop: 0 }}>Détail</label>
              {factures.map((f) => (
                <div key={f.numero} style={{ display: "flex", gap: 10,
                       padding: "9px 0", borderTop: `1px solid ${C.doux}` }}>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5,
                                 color: f.type === "avoir" ? C.rouge : C.bleu,
                                 fontWeight: 700, flexShrink: 0 }}>
                    {f.numero}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, color: C.encre,
                                   fontWeight: 600 }}>
                      {f.acheteur?.nom || "—"}
                    </span>
                    <span style={{ display: "block", fontSize: 11, color: C.fantome }}>
                      {f.date_emission}{f.type === "avoir" ? " · avoir" : ""}
                    </span>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.encre,
                                 flexShrink: 0 }}>
                    {f.type === "avoir" ? "−" : ""}{euros(f.total.tvac_centimes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ height: 30 }} />
    </div>
  );
}

const onglet = (actif, largeur) => ({
  padding: "8px 14px", borderRadius: 999, cursor: "pointer",
  fontSize: 12.5, fontWeight: 700, width: largeur,
  border: `1.5px solid ${actif ? C.bleu : C.bord}`,
  background: actif ? "#E7EFFC" : C.blanc,
  color: actif ? C.bleu : C.muet,
});

function Ligne({ l, v, gras, discret }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12,
                  padding: gras ? "9px 0" : "6px 0",
                  borderTop: `1px solid ${C.doux}` }}>
      <span style={{ fontSize: discret ? 12 : 12.5,
                     color: discret ? C.fantome : C.muet }}>{l}</span>
      <span style={{ fontSize: gras ? 14 : 12.5, fontWeight: gras ? 800 : 600,
                     color: C.encre, textAlign: "right" }}>{v}</span>
    </div>
  );
}

function Export({ titre, detail, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "block", width: "100%", textAlign: "left", cursor: "pointer",
      padding: "12px 13px", marginTop: 8, borderRadius: 11,
      border: `1.5px solid ${C.bord}`, background: C.blanc }}>
      <span style={{ display: "block", fontSize: 13.5, fontWeight: 700,
                     color: C.encre }}>⬇ {titre}</span>
      <span style={{ display: "block", fontSize: 11.5, color: C.muet,
                     marginTop: 3, lineHeight: 1.45 }}>{detail}</span>
    </button>
  );
}

/**
 * CE QUE DASHPROD FAIT — et ce qu'il ne fait pas.
 *
 * Dit franchement, en tête d'écran, plutôt qu'en petits caractères. Un
 * utilisateur qui croit que Dashprod « fait sa comptabilité » découvrirait le
 * malentendu au pire moment : devant son contrôle. Mieux vaut qu'il le sache
 * ici, et qu'il sache aussi qu'il peut tout emporter.
 */
function CeQueDashprodFait() {
  return (
    <div style={{ ...S.carte, borderLeft: `3px solid ${C.bleu}` }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
        Ce que Dashprod fait de votre comptabilité
      </div>

      <Point signe="✓" couleur={C.vert} titre="Il prépare">
        Vos factures, vos encaissements, vos achats approuvés et vos tiers sont
        tenus au fil de l'eau et transformés en écritures équilibrées, aux
        comptes du plan comptable belge.
      </Point>

      <Point signe="✓" couleur={C.vert} titre="Il vous rend vos données">
        À tout moment, vous exportez TOUT : factures, journaux, paiements,
        clients et fournisseurs. Des fichiers CSV standards que votre comptable
        importe dans son logiciel — le sien, pas le nôtre.
      </Point>

      <Point signe="—" couleur={C.muet} titre="Il ne tient pas votre comptabilité">
        Dashprod n'est pas un logiciel comptable agréé et ne se substitue pas à
        votre comptable. Il ne produit ni bilan, ni compte de résultats, ni
        déclaration fiscale. C'est votre comptable qui tient les livres,
        contrôle et dépose.
      </Point>

      <Point signe="—" couleur={C.muet} titre="Il ne décide pas à votre place">
        Les taux de TVA proposés viennent de la nature de vos dossiers. Une
        situation que Dashprod ne sait pas qualifier est refusée plutôt que
        devinée — et signalée pour que vous en parliez à votre comptable.
      </Point>

      <div style={{ fontSize: 11.5, color: C.fantome, lineHeight: 1.5,
                    marginTop: 10, paddingTop: 9,
                    borderTop: `1px solid ${C.doux || C.bord}` }}>
        Vos données vous appartiennent. Si vous quittez Dashprod, vous partez
        avec elles — c'est le sens de ces exports, et ils resteront disponibles
        quoi qu'il arrive.
      </div>
    </div>
  );
}

function Point({ signe, couleur, titre, children }) {
  return (
    <div style={{ display: "flex", gap: 9, marginTop: 10 }}>
      <span style={{ color: couleur, fontWeight: 800, fontSize: 13,
                     lineHeight: 1.5, flexShrink: 0 }}>{signe}</span>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.encre }}>{titre}</div>
        <div style={{ fontSize: 12, color: C.muet, lineHeight: 1.5, marginTop: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
