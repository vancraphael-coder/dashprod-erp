// =============================================================================
// Écran — Devis.
// Projection du moteur de chiffrage (S9) : les trois formules validées, le
// barème réel (85→255 €/h), et calculerScenario qui recalcule en direct —
// HTVA, TVA, TVAC et marge colorée par zone (25–45 %). Aucune formule ici :
// l'écran saisit, le domaine calcule (une seule implémentation, T1).
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  obtenirAffaire, enregistrerChiffrage,
  obtenirEquipeAffaire, listerMembresSimples, tauxMembres, obtenirParametresPrix,
  obtenirOrganisation,
} from "../lib/adaptateur.js";
import { calculerScenario } from "@domaine/chiffrage/moteur.js";
import { BAREME_HORAIRE, TARIFS } from "@domaine/chiffrage/bareme.js";
import { libelleTva, tauxTva } from "@domaine/organisation/identite.js";
import { C, S, ZONES_MARGE, euros } from "../lib/theme.jsx";

const FORMULES = [
  { cle: "tarifaire", libelle: "Tarifaire" },
  { cle: "emballage", libelle: "+ Emballage" },
  { cle: "forfait", libelle: "Forfait" },
];

export default function Devis({ affaireId, retour, versOffre, versReleve, peutVoirPrix = true }) {
  const [affaire, setAffaire] = useState(null);
  const [org, setOrg] = useState(null);
  const [faits, setFaits] = useState({
    formule: "tarifaire", nbDemenageurs: 3, heures: 6, nbCamions: 1,
    km: 0, elevateur: false, remisePct: 0, remiseMotif: "promo",
    heuresEmballage: 0, kmEmballage: 0, forfaitTvacEuros: 0,
  });
  const [couts, setCouts] = useState({ mainOeuvreEuros: 0, carburantEuros: 0, materielEuros: 0, diversEuros: 0, peagesEuros: 0 });
  const [sauve, setSauve] = useState(false);
  const [equipe, setEquipe] = useState([]);     // membres pressentis {id, nom, taux}
  const [ref, setRef] = useState(null);          // barème + tarifs configurés

  useEffect(() => {
    obtenirOrganisation().then(setOrg).catch(() => {});
    obtenirAffaire(affaireId).then((a) => {
      setAffaire(a);
      if (a?.faits) setFaits((f) => ({ ...f, ...a.faits }));
      if (a?.couts) setCouts((c) => ({ ...c, ...a.couts }));
    });
    // Coût MO auto : équipe pressentie du dossier × leur taux horaire.
    Promise.all([obtenirEquipeAffaire(affaireId), listerMembresSimples(), tauxMembres()])
      .then(([ids, membres, taux]) => {
        setEquipe(ids.map((id) => {
          const m = membres.find((x) => x.id === id);
          return { id, nom: m?.nom || id, taux: taux[id] || 0 };
        }));
      }).catch(() => {});
    // Barème configuré (page Configuration) : le moteur l'accepte via ref.
    obtenirParametresPrix().then((p) => {
      if (!p) return;
      // Les clés numériques du barème peuvent revenir en chaînes (jsonb).
      const bareme = {};
      Object.entries(p.bareme_horaire || {}).forEach(([k, v]) => { bareme[Number(k)] = Number(v); });
      const tarifs = {};
      Object.entries(p.tarifs || {}).forEach(([k, v]) => { tarifs[k] = Number(v); });
      setRef({ bareme, tarifs });
    }).catch(() => {});
  }, [affaireId]);

  // Coût main-d'œuvre PRÉVISIONNEL : somme des taux de l'équipe × heures prévues.
  // (Le coût réel avec le chrono se calcule sur le dossier confirmé.)
  const heuresMO = faits.formule === "emballage" ? (faits.heuresEmballage || 0) : (faits.heures || 0);
  const coutMoAuto = useMemo(() => {
    const sommeTaux = equipe.reduce((s, m) => s + (m.taux || 0), 0);
    return Math.round(sommeTaux * heuresMO);
  }, [equipe, heuresMO]);

  // Injecte le coût MO calculé dans les coûts passés au moteur.
  const coutsEffectifs = useMemo(
    () => ({ ...couts, mainOeuvreEuros: coutMoAuto }),
    [couts, coutMoAuto]);

  // Le moteur — recalcul à chaque frappe. L'écran n'additionne rien lui-même.
  const scenario = useMemo(() => {
    try {
      const tvaPct = tauxTva(org || {});
      return calculerScenario(faits, coutsEffectifs, { ...(ref || {}), tvaPct });
    }
    catch { return null; }
  }, [faits, coutsEffectifs, ref]);

  function maj(champ, valeur) { setFaits((f) => ({ ...f, [champ]: valeur })); setSauve(false); }
  function majCout(champ, valeur) { setCouts((c) => ({ ...c, [champ]: valeur })); setSauve(false); }
  const num = (v) => (v === "" ? 0 : Number(v));

  async function enregistrer() {
    if (!scenario) return; // pas de chiffrage abouti → rien à enregistrer
    await enregistrerChiffrage(affaireId, {
      faits, couts: coutsEffectifs,
      resultat: { tvac_centimes: scenario.tvac_centimes, marge_pct: scenario.marge_pct },
    });
    // Recharge l'affaire : le montant enregistré est désormais la source de
    // vérité (en-tête, offre, liste le reliront de la base).
    obtenirAffaire(affaireId).then(setAffaire).catch(() => {});
    setSauve(true);
  }

  const horaire = faits.formule !== "forfait";

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Dossier</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={S.titre}>Devis — {affaire?.client?.nom || "…"}</div>
          {scenario && (
            <div style={{ fontSize: 16, fontWeight: 800, color: C.encre }}>
              {euros(scenario.tvac_centimes)}
            </div>
          )}
        </div>
      </div>

      {/* Chiffrage impossible (barème incomplet, saisie invalide) : on le dit
          clairement au lieu de laisser des blocs vides. */}
      {!scenario && (
        <div style={{ margin: "0 16px 12px", padding: "11px 13px", borderRadius: 12,
          background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#991B1B" }}>
            Chiffrage indisponible
          </div>
          <div style={{ fontSize: 11.5, color: "#B91C1C", marginTop: 2, lineHeight: 1.5 }}>
            Vérifiez la formule, le nombre de déménageurs et le barème
            (Configuration). Le calcul reprendra automatiquement.
          </div>
        </div>
      )}

      {/* Formule */}
      <div style={S.carte}>
        <div style={{ display: "flex", gap: 8 }}>
          {FORMULES.map((f) => (
            <button key={f.cle} onClick={() => maj("formule", f.cle)} style={{
              flex: 1, padding: "10px 4px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${faits.formule === f.cle ? C.bleu : C.bord}`,
              background: faits.formule === f.cle ? "#E7EFFC" : C.blanc,
              color: faits.formule === f.cle ? C.bleu : C.muet,
              fontSize: 13, fontWeight: 700,
            }}>{f.libelle}</button>
          ))}
        </div>

        {horaire ? (
          <>
            <label style={S.label}>Équipe (barème horaire)</label>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(BAREME_HORAIRE).map(([n, taux]) => (
                <button key={n} onClick={() => maj("nbDemenageurs", Number(n))} style={{
                  flex: 1, padding: "8px 2px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${faits.nbDemenageurs === Number(n) ? C.bleu : C.bord}`,
                  background: faits.nbDemenageurs === Number(n) ? "#E7EFFC" : C.blanc,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 800,
                    color: faits.nbDemenageurs === Number(n) ? C.bleu : C.encre }}>{n}</div>
                  <div style={{ fontSize: 10.5, color: C.muet }}>{taux} €/h</div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Heures facturées</label>
                <input style={S.input} type="number" min="0" step="0.5"
                       value={faits.heures}
                       onChange={(e) => maj("heures", num(e.target.value))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Camions</label>
                <input style={S.input} type="number" min="1"
                       value={faits.nbCamions}
                       onChange={(e) => maj("nbCamions", num(e.target.value))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Km (dépôt–dépôt)</label>
                <input style={S.input} type="number" min="0"
                       value={faits.km}
                       onChange={(e) => maj("km", num(e.target.value))} />
              </div>
            </div>

            <label style={{ ...S.label, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={faits.elevateur}
                     onChange={(e) => maj("elevateur", e.target.checked)} />
              Élévateur ({TARIFS.elevateur} € — max 7ᵉ étage)
            </label>

            {faits.formule === "emballage" && (
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>H. emballage ({TARIFS.emballage_horaire} €/h)</label>
                  <input style={S.input} type="number" min="0" step="0.5"
                         value={faits.heuresEmballage}
                         onChange={(e) => maj("heuresEmballage", num(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Km emballage ({TARIFS.emballage_km} €/km)</label>
                  <input style={S.input} type="number" min="0"
                         value={faits.kmEmballage}
                         onChange={(e) => maj("kmEmballage", num(e.target.value))} />
                </div>
              </div>
            )}

            {/* Réduction : le motif distingue le commercial (promo) du
                correctif (geste après dégâts) — il s'imprime sur l'offre. */}
            <label style={S.label}>Réduction</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 96 }}>
                <input style={S.input} type="number" min="0" max="100"
                       value={faits.remisePct}
                       onChange={(e) => maj("remisePct", num(e.target.value))}
                       placeholder="%" />
              </div>
              <select style={{ ...S.input, flex: 1,
                               opacity: faits.remisePct > 0 ? 1 : 0.5 }}
                      disabled={!faits.remisePct}
                      value={faits.remiseMotif}
                      onChange={(e) => maj("remiseMotif", e.target.value)}>
                <option value="promo">Promotion (geste commercial)</option>
                <option value="degats">Dégâts (geste correctif)</option>
              </select>
            </div>
            {scenario?.reduction && (
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700,
                color: scenario.reduction.motif === "degats" ? C.rouge : C.ambre }}>
                Réduction de {scenario.reduction.pct} %
                {scenario.reduction.motif === "degats" ? " (dégâts)" : " (promotion)"} appliquée
              </div>
            )}
          </>
        ) : (
          <>
            <label style={S.label}>Prix forfaitaire TVAC (€)</label>
            <input style={S.input} type="number" min="0"
                   value={faits.forfaitTvacEuros}
                   onChange={(e) => maj("forfaitTvacEuros", num(e.target.value))} />
            <div style={{ fontSize: 11.5, color: C.muet, marginTop: 6 }}>
              Heures sup. hors conditions : {TARIFS.heure_sup_forfait} € HTVA/dém./h.
            </div>
          </>
        )}
      </div>

      {/* Coûts réels — CONFIDENTIEL : jamais dans un document client, et
          invisibles sans la capacité voir_prix (S3) — le domaine l'exigeait,
          l'écran le respecte enfin (alignement 04 §7). */}
      {peutVoirPrix && (
        <div style={S.carte}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
            Coûts réels <span style={{ fontWeight: 500, color: C.muet }}>— confidentiel</span>
          </div>
          {/* Main-d'œuvre AUTOMATIQUE : taux de chaque homme pressenti × heures.
              Composez l'équipe dans le dossier ; renseignez leurs taux dans
              Ressources (Membres). */}
          <label style={S.label}>Main-d'œuvre (automatique)</label>
          <div style={{ background: "#F8FAFC", border: `1px solid ${C.bord}`,
                        borderRadius: 10, padding: "9px 11px" }}>
            {equipe.length === 0 ? (
              <div style={{ fontSize: 12, color: C.muet }}>
                Aucun membre pressenti — sélectionnez l'équipe dans le dossier.
              </div>
            ) : (
              <>
                {equipe.map((m) => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between",
                                           fontSize: 12, padding: "1px 0" }}>
                    <span style={{ color: C.encre }}>
                      {m.nom} <span style={{ color: C.fantome }}>
                        · {m.taux || "?"} €/h × {heuresMO} h</span>
                    </span>
                    <span style={{ fontWeight: 600, color: C.encre }}>
                      {euros(Math.round((m.taux || 0) * heuresMO * 100))}
                    </span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between",
                              borderTop: `1px solid ${C.bord}`, marginTop: 5, paddingTop: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.encre }}>Total MO</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
                    {euros(coutMoAuto * 100)}
                  </span>
                </div>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            {[["carburantEuros", "Carburant"], ["materielEuros", "Matériel"]]
              .map(([cle, lib]) => (
              <div key={cle} style={{ flex: 1 }}>
                <label style={S.label}>{lib} (€)</label>
                <input style={S.input} type="number" min="0"
                       value={couts[cle]}
                       onChange={(e) => majCout(cle, num(e.target.value))} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[["diversEuros", "Divers"], ["peagesEuros", "Péages"]]
              .map(([cle, lib]) => (
              <div key={cle} style={{ flex: 1 }}>
                <label style={S.label}>{lib} (€)</label>
                <input style={S.input} type="number" min="0"
                       value={couts[cle] ?? 0}
                       onChange={(e) => majCout(cle, num(e.target.value))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Résultat — le moteur parle */}
      {scenario && (
        <div style={S.carte}>
          <Ligne l="Total HTVA" v={euros(scenario.htva_centimes)} />
          <Ligne l={libelleTva(org)} v={euros(scenario.tva_centimes)} />
          <Ligne l="Total TVAC" v={euros(scenario.tvac_centimes)} gras />
          {peutVoirPrix && (
            <>
              <div style={{
                marginTop: 12, padding: "10px 12px", borderRadius: 10,
                background: "#F8FAFC", border: `1px solid ${C.bord}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 12.5, color: C.muet }}>
                  Marge (recette − coûts)
                </span>
                <span style={{ fontSize: 15, fontWeight: 800, color: ZONES_MARGE[scenario.zone] }}>
                  {euros(scenario.marge_centimes)} · {scenario.marge_pct} %
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.muet, marginTop: 6 }}>
                Zone cible : 25 – 45 % de la recette HTVA.
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ margin: "0 16px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>
          {sauve ? "✓ Chiffrage enregistré" : "Enregistrer le chiffrage"}
        </button>
        {sauve && versOffre && (
          <button style={{ ...S.boutonLien, width: "100%", textAlign: "center", marginTop: 8 }}
                  onClick={() => versOffre(affaireId)}>
            Passer à l'offre →
          </button>
        )}
      </div>
    </div>
  );
}

function Ligne({ l, v, gras }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
      <span style={{ fontSize: 13, color: gras ? C.encre : C.muet, fontWeight: gras ? 800 : 500 }}>{l}</span>
      <span style={{ fontSize: gras ? 16 : 13.5, color: C.encre, fontWeight: gras ? 800 : 600 }}>{v}</span>
    </div>
  );
}
