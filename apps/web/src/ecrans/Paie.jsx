// =============================================================================
// Écran — Paie (Paramètres → Barème → Paie).
//
// Un onglet par membre ACTIF. Un membre archivé disparaît de la période en
// cours : ses heures passées restent dans l'historique, mais il ne figure plus
// dans un décompte à payer.
//
// CE QUE CET ÉCRAN PRODUIT — et ce qu'il ne produit pas.
//
// Il produit le BRUT depuis les heures réellement pointées au chrono. C'est ce
// que l'ERP est seul à connaître, et c'est ce que le secrétariat social vous
// demande. Il calcule l'ONSS travailleur (taux fixe, vérifiable) et affiche un
// net ESTIMÉ dès que le précompte du membre est renseigné.
//
// Il ne produit PAS de fiche de paie légale. Le barème du précompte
// professionnel dépend de la situation familiale et change chaque année ; les
// déclarations DmfA engagent la responsabilité de l'employeur. Le document
// généré ici est une PRÉPARATION à transmettre au secrétariat social, qui
// émet la fiche officielle.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listerMembresSimples, obtenirReglagesPaie, sauverReglagePaie,
  heuresParMembre, obtenirOrganisation,
} from "../lib/adaptateur.js";
import {
  decompteEquipe, bornesPeriode, periodeCourante,
  STATUT_PAR_METIER, ONSS_TRAVAILLEUR,
} from "@domaine/rh/paie.js";
import { nomAffiche } from "@domaine/organisation/identite.js";
import { C, S } from "../lib/theme.jsx";

const eur = (c) => c == null ? "—"
  : (c / 100).toFixed(2).replace(".", ",") + " €";
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
              "août", "septembre", "octobre", "novembre", "décembre"];
const libellePeriode = (p) => {
  const [a, m] = String(p).split("-").map(Number);
  return `${MOIS[m - 1] || "?"} ${a}`;
};

export default function Paie({ retour }) {
  const [membres, setMembres] = useState(null);
  const [reglages, setReglages] = useState({});
  const [heures, setHeures] = useState({});
  const [org, setOrg] = useState({});
  const [periode, setPeriode] = useState(periodeCourante());
  const [actif, setActif] = useState(null);       // onglet ouvert
  const [erreur, setErreur] = useState(null);
  const [sauve, setSauve] = useState(false);

  useEffect(() => {
    // Membres ACTIFS uniquement : un archivé n'a plus d'onglet.
    listerMembresSimples(false).then(setMembres).catch((e) => {
      setErreur(e.message); setMembres([]);
    });
    obtenirReglagesPaie().then(setReglages).catch(() => {});
    obtenirOrganisation().then(setOrg).catch(() => {});
  }, []);

  useEffect(() => {
    const b = bornesPeriode(periode);
    if (b) heuresParMembre(b.debut, b.fin).then(setHeures).catch(() => setHeures({}));
  }, [periode]);

  const calcul = useMemo(() => decompteEquipe(
    (membres || []).map((m) => {
      const r = reglages[m.id] || {};
      const taux = Math.round(Number(r.taux_horaire || 0) * 100);
      return {
        id: m.id, nom: m.nom, metier: m.metier, actif: m.actif !== false,
        statut: r.statut || STATUT_PAR_METIER[m.metier] || "ouvrier",
        precomptePct: r.precompte_pct,
        lignes: [{ heures: heures[m.id] || 0, taux_horaire_centimes: taux }],
      };
    })), [membres, reglages, heures]);

  if (membres === null) return null;

  const ligneActive = calcul.lignes.find((l) => l.utilisateur_id === actif);

  async function majReglage(id, champ, valeur) {
    const suite = { ...(reglages[id] || {}), [champ]: valeur };
    setReglages((r) => ({ ...r, [id]: suite }));
    setSauve(false);
    try { await sauverReglagePaie(id, suite); setSauve(true); }
    catch (e) { setErreur(e.message); }
  }

  function moisPrecedent(n) {
    const [a, m] = periode.split("-").map(Number);
    const d = new Date(Date.UTC(a, m - 1 + n, 1));
    setPeriode(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    setActif(null);
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Barème</button>}
        <div style={S.titre}>Paie</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Décompte des heures réellement pointées, par membre.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 16px 12px" }}>
        <button onClick={() => moisPrecedent(-1)} style={navMois}>‹</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 700 }}>
          {libellePeriode(periode)}
        </div>
        <button onClick={() => moisPrecedent(1)} style={navMois}>›</button>
      </div>

      {/* Onglets — un par membre actif */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 16px 10px" }}>
        <button onClick={() => setActif(null)} style={onglet(actif === null)}>
          Tous
        </button>
        {calcul.lignes.map((l) => (
          <button key={l.utilisateur_id} onClick={() => setActif(l.utilisateur_id)}
                  style={onglet(actif === l.utilisateur_id)}>
            {l.nom.split(" ")[0]}
          </button>
        ))}
      </div>

      {actif === null ? (
        <>
          <div style={S.carte}>
            <label style={{ ...S.label, marginTop: 0 }}>
              Décompte de l'équipe — {calcul.totaux.membres} membre
              {calcul.totaux.membres > 1 ? "s" : ""}
            </label>
            {calcul.lignes.map((l) => (
              <button key={l.utilisateur_id} onClick={() => setActif(l.utilisateur_id)}
                      style={{ display: "flex", width: "100%", alignItems: "center",
                               gap: 10, padding: "10px 0", cursor: "pointer",
                               borderTop: `1px solid ${C.doux}`, background: "none",
                               border: "none", textAlign: "left" }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 700,
                                 color: C.encre }}>{l.nom}</span>
                  <span style={{ display: "block", fontSize: 11, color: C.fantome,
                                 marginTop: 2 }}>
                    {l.heures.toFixed(1).replace(".", ",")} h · {l.statut}
                  </span>
                </span>
                <span style={{ textAlign: "right" }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 700,
                                 color: C.encre }}>{eur(l.brut_centimes)}</span>
                  <span style={{ display: "block", fontSize: 11, marginTop: 2,
                                 color: l.precompte_connu ? C.muet : C.ambre }}>
                    {l.precompte_connu ? `net ${eur(l.net_centimes)}` : "précompte manquant"}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div style={S.carte}>
            <label style={{ ...S.label, marginTop: 0 }}>Totaux de la période</label>
            <Ligne l="Heures pointées"
                   v={calcul.totaux.heures.toFixed(1).replace(".", ",") + " h"} />
            <Ligne l="Brut total" v={eur(calcul.totaux.brut_centimes)} gras />
            <Ligne l={`ONSS travailleur (${(ONSS_TRAVAILLEUR * 100).toFixed(2).replace(".", ",")} %)`}
                   v={"− " + eur(calcul.totaux.onss_centimes)} />
            <Ligne l="Imposable" v={eur(calcul.totaux.imposable_centimes)} />
            <Ligne l="Précompte professionnel"
                   v={calcul.totaux.net_complet
                       ? "− " + eur(calcul.totaux.precompte_centimes)
                       : "à déterminer"} />
            <Ligne l="Net estimé"
                   v={calcul.totaux.net_complet ? eur(calcul.totaux.net_centimes) : "—"}
                   gras />
            {!calcul.totaux.net_complet && (
              <div style={{ fontSize: 11.5, color: C.ambre, marginTop: 8, lineHeight: 1.5 }}>
                Le net total n'est pas affiché tant qu'un membre n'a pas son taux
                de précompte : un total partiel serait trompeur.
              </div>
            )}
          </div>

          <Avertissement />
        </>
      ) : (
        <FicheMembre
          ligne={ligneActive} periode={periode} org={org}
          reglage={reglages[actif] || {}}
          onReglage={(champ, v) => majReglage(actif, champ, v)}
          sauve={sauve} />
      )}

      {erreur && (
        <div style={{ margin: "0 16px 20px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>
      )}
      <div style={{ height: 30 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function FicheMembre({ ligne, periode, org, reglage, onReglage, sauve }) {
  if (!ligne) return null;
  const num = (v) => (v === "" || v == null ? null : Number(v));

  return (
    <>
      <div style={S.carte}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>{ligne.nom}</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          {libellePeriode(periode)} · {ligne.metier || "—"}
        </div>

        <label style={S.label}>Taux horaire brut (€/h)</label>
        <input style={S.input} type="number" step="0.01" min="0"
               value={reglage.taux_horaire ?? ""}
               onChange={(e) => onReglage("taux_horaire", num(e.target.value))} />

        <label style={S.label}>
          Statut
          <span style={{ fontWeight: 500, color: C.fantome, marginLeft: 6 }}>
            un ouvrier cotise sur 108 % du brut
          </span>
        </label>
        <select style={S.input} value={reglage.statut || ligne.statut}
                onChange={(e) => onReglage("statut", e.target.value)}>
          <option value="ouvrier">Ouvrier</option>
          <option value="employe">Employé</option>
        </select>

        <label style={S.label}>
          Précompte professionnel (%)
          <span style={{ fontWeight: 500, color: C.fantome, marginLeft: 6 }}>
            communiqué par votre secrétariat social
          </span>
        </label>
        <input style={S.input} type="number" step="0.01" min="0" max="100"
               placeholder="laisser vide si inconnu"
               value={reglage.precompte_pct ?? ""}
               onChange={(e) => onReglage("precompte_pct", num(e.target.value))} />
        {sauve && (
          <div style={{ fontSize: 11.5, color: "#065F46", marginTop: 6 }}>✓ Enregistré</div>
        )}
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Décompte</label>
        <Ligne l="Heures pointées"
               v={ligne.heures.toFixed(2).replace(".", ",") + " h"} />
        <Ligne l="Brut" v={eur(ligne.brut_centimes)} gras />
        <Ligne l={`ONSS (${(ONSS_TRAVAILLEUR * 100).toFixed(2).replace(".", ",")} % `
                  + `sur ${Math.round(ligne.assiette * 100)} %)`}
               v={"− " + eur(ligne.onss_centimes)} />
        <Ligne l="Imposable" v={eur(ligne.imposable_centimes)} />
        <Ligne l="Précompte professionnel"
               v={ligne.precompte_connu ? "− " + eur(ligne.precompte_centimes) : "à déterminer"} />
        <Ligne l="Net estimé"
               v={ligne.precompte_connu ? eur(ligne.net_centimes) : "—"} gras />

        {!ligne.precompte_connu && (
          <div style={{ padding: "10px 12px", borderRadius: 10, marginTop: 10,
                        background: "#FFFBEB", border: "1px solid #FDE68A",
                        fontSize: 11.5, color: "#92400E", lineHeight: 1.5 }}>
            Sans taux de précompte, le net n'est pas calculé. Un chiffre inventé
            ici deviendrait un chiffre faux sur un document remis à un salarié.
          </div>
        )}
      </div>

      <div style={{ margin: "0 16px 12px" }}>
        <button style={S.boutonPlein}
                onClick={() => imprimerPreparation(ligne, periode, org)}>
          Préparation de paie (à imprimer)
        </button>
      </div>

      <Avertissement />
    </>
  );
}

function Avertissement() {
  return (
    <div style={{ margin: "0 16px 16px", padding: "12px 14px", borderRadius: 12,
                  background: "#EFF6FF", border: `1px solid ${C.bord}`,
                  fontSize: 11.5, color: C.slate || C.muet, lineHeight: 1.55 }}>
      <b style={{ color: C.encre }}>Ce n'est pas une fiche de paie officielle.</b><br />
      Le brut et les heures viennent de vos chantiers : c'est ce que votre
      secrétariat social vous demande. Le précompte professionnel dépend de la
      situation familiale de chaque salarié et change chaque année ; la fiche
      légale et les déclarations DmfA restent de la responsabilité du
      secrétariat social. Transmettez-lui cette préparation.
    </div>
  );
}

function Ligne({ l, v, gras }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between",
                  padding: "7px 0", borderTop: `1px solid ${C.doux}` }}>
      <span style={{ fontSize: 12.5, color: gras ? C.encre : C.muet,
                     fontWeight: gras ? 700 : 500 }}>{l}</span>
      <span style={{ fontSize: gras ? 14 : 12.5, color: C.encre,
                     fontWeight: gras ? 800 : 600 }}>{v}</span>
    </div>
  );
}

const onglet = (on) => ({
  padding: "7px 14px", borderRadius: 999, whiteSpace: "nowrap", cursor: "pointer",
  fontSize: 12.5, fontWeight: 700,
  border: `1.5px solid ${on ? C.bleu : C.bord}`,
  background: on ? "#E7EFFC" : C.blanc,
  color: on ? C.bleu : C.muet,
});

const navMois = {
  width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${C.bord}`,
  background: C.blanc, color: C.encre, fontSize: 16, cursor: "pointer",
};

/** Feuille imprimable destinée au secrétariat social. */
function imprimerPreparation(l, periode, org) {
  const f = (n) => n == null ? "à déterminer" : (n / 100).toFixed(2).replace(".", ",") + " €";
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Préparation de paie — ${l.nom} — ${periode}</title>
<style>
 body{font-family:system-ui,sans-serif;max-width:680px;margin:32px auto;padding:0 24px;color:#0F172A}
 h1{font-size:19px;margin:0 0 2px} .s{color:#64748B;font-size:13px}
 table{width:100%;border-collapse:collapse;margin-top:20px}
 td{padding:8px 0;border-top:1px solid #E4ECFC;font-size:14px}
 td:last-child{text-align:right;font-variant-numeric:tabular-nums}
 .g td{font-weight:700;font-size:15px}
 .n{margin-top:24px;padding:12px 14px;background:#EFF6FF;border:1px solid #E4ECFC;
    border-radius:10px;font-size:12px;line-height:1.6;color:#334155}
 @media print{body{margin:0}}
</style></head><body>
<h1>${nomAffiche(org) || "Entreprise"}</h1>
<div class="s">Préparation de paie — ${libellePeriode(periode)}</div>
<table>
 <tr><td>Salarié</td><td><b>${l.nom}</b></td></tr>
 <tr><td>Fonction</td><td>${l.metier || "—"}</td></tr>
 <tr><td>Statut</td><td>${l.statut}</td></tr>
 <tr><td>Heures pointées</td><td>${l.heures.toFixed(2).replace(".", ",")} h</td></tr>
 <tr class="g"><td>Brut</td><td>${f(l.brut_centimes)}</td></tr>
 <tr><td>ONSS travailleur (${(ONSS_TRAVAILLEUR * 100).toFixed(2).replace(".", ",")} %
   sur ${Math.round(l.assiette * 100)} %)</td><td>− ${f(l.onss_centimes)}</td></tr>
 <tr><td>Imposable</td><td>${f(l.imposable_centimes)}</td></tr>
 <tr><td>Précompte professionnel</td><td>${l.precompte_connu
   ? "− " + f(l.precompte_centimes) : "à déterminer"}</td></tr>
 <tr class="g"><td>Net estimé</td><td>${l.precompte_connu ? f(l.net_centimes) : "—"}</td></tr>
</table>
<div class="n"><b>Document préparatoire — ce n'est pas une fiche de paie.</b><br>
Les heures et le brut proviennent des chantiers réellement pointés.
Le précompte professionnel et la fiche de paie officielle relèvent du
secrétariat social, qui assure les déclarations DmfA.</div>
</body></html>`);
  w.document.close();
  w.print();
}
