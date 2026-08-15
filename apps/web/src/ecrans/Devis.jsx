// =============================================================================
// Écran — Devis.
// Projection du moteur de chiffrage (S9) : les trois formules validées, le
// barème réel (85→255 €/h), et calculerScenario qui recalcule en direct —
// HTVA, TVA, TVAC et marge colorée par zone (25–45 %). Aucune formule ici :
// l'écran saisit, le domaine calcule (une seule implémentation, T1).
// =============================================================================

import React, { useEffect, useMemo, useState, useRef} from "react";
import {
  obtenirAffaire, enregistrerChiffrage,
  obtenirEquipeAffaire, listerMembresSimples, tauxMembres, obtenirParametresPrix,
  obtenirOrganisation, contexteMainOeuvre,
  litigesAffaire, ouvrirLitige, avancerLitige, resoudreLitige, scenarioRetenu,
  etatFacturation, heuresAffaire, validerHeures,
} from "../lib/adaptateur.js";
import { calculerScenario } from "@domaine/chiffrage/moteur.js";
import { catalogueSupplements, supplementsRetenus, libelleLigne, UNITES_SUPPLEMENT }
  from "@domaine/chiffrage/supplements.js";
import { BAREME_HORAIRE, TARIFS } from "@domaine/chiffrage/bareme.js";
import { libelleTva, tauxTva } from "@domaine/organisation/identite.js";
import { lignesMainOeuvre, coutMainOeuvre, mentionLignesRetirees, TON_HISTORIQUE }
  from "@domaine/rh/main-oeuvre.js";
import { calculDefinitif, euroCentimes } from "@domaine/pilotage/calcul-definitif.js";
import { CIRCUITS, typesLitige, libelleType, libelleEtape, couleurType,
         etapeSuivante, issues as issuesLitige, progression } from "@domaine/crm/litige.js";
import { C, S, ZONES_MARGE, euros, declarerModifs} from "../lib/theme.jsx";

const FORMULES = [
  { cle: "tarifaire", libelle: "Tarifaire" },
  { cle: "emballage", libelle: "+ Emballage" },
  { cle: "forfait", libelle: "Forfait" },
];

export default function Devis({ affaireId, retour, versOffre, versReleve, versFacture, peutVoirPrix = true }) {
  const [affaire, setAffaire] = useState(null);
  const [onglet, setOnglet] = useState("estimation");
  const [org, setOrg] = useState(null);
  const [faits, setFaits] = useState({
    formule: "tarifaire", nbDemenageurs: 3, heures: 6, nbCamions: 1,
    km: 0, elevateur: false, remisePct: 0, remiseMotif: "promo",
    heuresEmballage: 0, kmEmballage: 0, forfaitTvacEuros: 0,
  });
  const [couts, setCouts] = useState({ mainOeuvreEuros: 0, carburantEuros: 0, materielEuros: 0, diversEuros: 0, peagesEuros: 0 });
  const [sauve, setSauve] = useState(false);
  // `sauve` signale « vient d'être enregistré » ; il vaut false à l'ouverture,
  // il ne peut donc pas servir de drapeau « modifié ». D'où `touche`, mis à
  // vrai par la première modification réelle.
  const [touche, setTouche] = useState(false);
  const sauverRef = useRef(null);
  const [equipe, setEquipe] = useState([]);     // lignes retenues (domaine)
  const [equipeIds, setEquipeIds] = useState([]); // équipe pressentie brute
  const [ref, setRef] = useState(null);          // barème + tarifs configurés
  const [catalogue, setCatalogue] = useState([]);  // suppléments définis (Barème)
  const [selSup, setSelSup] = useState({});         // { cle: quantité } cochés

  useEffect(() => {
    obtenirOrganisation().then(setOrg).catch(() => {});
    obtenirAffaire(affaireId).then((a) => {
      setAffaire(a);
      if (a?.faits) {
        setFaits((f) => ({ ...f, ...a.faits }));
        if (a.faits.selSupplements) setSelSup(a.faits.selSupplements);
      }
      if (a?.couts) setCouts((c) => ({ ...c, ...a.couts }));
    });
    // Coût MO auto : équipe pressentie du dossier × leur taux horaire.
    // Les membres ARCHIVÉS sont chargés eux aussi : sans eux, un identifiant
    // brut s'affichait à la place du nom dès qu'une personne quittait l'équipe.
    Promise.all([obtenirEquipeAffaire(affaireId), listerMembresSimples(true),
                 tauxMembres(), contexteMainOeuvre(affaireId)])
      .then(([ids, membres, taux, ctx]) => {
        setEquipeIds(ids);
        setEquipe(lignesMainOeuvre({
          equipeIds: ids, membres, taux,
          ontTravaille: ctx.ontTravaille,
          dossierClos: ctx.dossierClos,
          missionTerminee: ctx.missionTerminee,
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
      setCatalogue(catalogueSupplements(p.supplements || []));
    }).catch(() => {});
  }, [affaireId]);

  // Coût main-d'œuvre PRÉVISIONNEL : somme des taux de l'équipe × heures prévues.
  // (Le coût réel avec le chrono se calcule sur le dossier confirmé.)
  const heuresMO = faits.formule === "emballage" ? (faits.heuresEmballage || 0) : (faits.heures || 0);
  const coutMoAuto = useMemo(() => coutMainOeuvre(equipe, heuresMO), [equipe, heuresMO]);

  // Injecte le coût MO calculé dans les coûts passés au moteur.
  const coutsEffectifs = useMemo(
    () => ({ ...couts, mainOeuvreEuros: coutMoAuto }),
    [couts, coutMoAuto]);

  // Suppléments retenus (cochés avec quantité) → additionnés par le moteur.
  const supRetenus = useMemo(
    () => supplementsRetenus(catalogue, selSup), [catalogue, selSup]);

  // Le moteur — recalcul à chaque frappe. L'écran n'additionne rien lui-même.
  const scenario = useMemo(() => {
    try {
      const tvaPct = tauxTva(org || {});
      return calculerScenario(
        { ...faits, supplements: supRetenus },
        coutsEffectifs, { ...(ref || {}), tvaPct });
    }
    catch { return null; }
  }, [faits, supRetenus, coutsEffectifs, ref]);

  function maj(champ, valeur) { setFaits((f) => ({ ...f, [champ]: valeur })); marquerTouche(); }
  function majCout(champ, valeur) { setCouts((c) => ({ ...c, [champ]: valeur })); marquerTouche(); }
  const num = (v) => (v === "" ? 0 : Number(v));

  /** Une modification réelle : le garde-fou s'arme. */
  function marquerTouche() { setSauve(false); setTouche(true); }

  // Garde de modifications — AVANT tout return conditionnel (règle des hooks).
  // Toute navigation, y compris la flèche retour, demandera d'abord
  // « Enregistrer / Annuler les modifications ».
  useEffect(() => {
    declarerModifs(touche, () => sauverRef.current && sauverRef.current());
    return () => declarerModifs(false, null);
  }, [touche]);
  sauverRef.current = enregistrer;

  async function enregistrer() {
    if (!scenario) return; // pas de chiffrage abouti → rien à enregistrer
    await enregistrerChiffrage(affaireId, {
      faits: { ...faits, selSupplements: selSup, supplements: supRetenus },
      couts: coutsEffectifs,
      resultat: { tvac_centimes: scenario.tvac_centimes, marge_pct: scenario.marge_pct },
    });
    // Recharge l'affaire : le montant enregistré est désormais la source de
    // vérité (en-tête, offre, liste le reliront de la base).
    obtenirAffaire(affaireId).then(setAffaire).catch(() => {});
    setSauve(true); setTouche(false);
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

      {/* Deux lectures du même dossier : l'ESTIMATION (ce qu'on chiffre pour le
          client) et le CALCUL DÉFINITIF (prévu / réel / facturé, une fois le
          chantier fait). Le second ne s'ouvre pleinement qu'après coup. */}
      <div style={{ display: "flex", gap: 4, margin: "0 16px 12px",
                    background: "#EEF2F8", borderRadius: 12, padding: 4 }}>
        {[["estimation", "Estimation"], ["definitif", "Calcul définitif"]].map(([cle, lib]) => (
          <button key={cle} onClick={() => setOnglet(cle)}
            style={{ flex: 1, padding: "9px 8px", borderRadius: 9, border: "none",
                     cursor: "pointer", fontSize: 13, fontWeight: 700,
                     background: onglet === cle ? C.blanc : "transparent",
                     color: onglet === cle ? C.encre : C.muet,
                     boxShadow: onglet === cle ? "0 1px 3px rgba(15,23,42,.1)" : "none" }}>
            {lib}
          </button>
        ))}
      </div>

      {onglet === "definitif" ? (
        <CalculDefinitif affaireId={affaireId} affaire={affaire}
          coutsReels={couts} equipe={equipe} heuresMO={heuresMO}
          peutVoirPrix={peutVoirPrix} versFacture={versFacture} />
      ) : (
      <>
      {/* ── ONGLET ESTIMATION ─────────────────────────────────────────────── */}

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
                <label style={S.label}>Véhicules</label>
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

            {/* Suppléments variables définis dans le barème. Cocher applique,
                la quantité multiplie. Le moteur les additionne. */}
            {catalogue.filter((sp) => sp.actif).length > 0 && (
              <div style={{ marginTop: 6 }}>
                <label style={S.label}>Suppléments</label>
                {catalogue.filter((sp) => sp.actif).map((sp) => {
                  const coche = (selSup[sp.cle] || 0) > 0;
                  const unite = UNITES_SUPPLEMENT.find((u) => u.cle === sp.unite);
                  const pluralisable = unite?.pluralisable;
                  return (
                    <div key={sp.cle} style={{ display: "flex", alignItems: "center",
                           gap: 8, padding: "6px 0" }}>
                      <input type="checkbox" checked={coche}
                        onChange={(e) => {
                          setSelSup((s) => ({ ...s, [sp.cle]: e.target.checked ? 1 : 0 }));
                          marquerTouche();
                        }} />
                      <span style={{ flex: 1, fontSize: 13, color: C.encre }}>
                        {sp.libelle || "(sans nom)"}
                        <span style={{ color: C.fantome, marginLeft: 6 }}>
                          {(sp.montant_centimes / 100).toFixed(0)} €
                          {unite && unite.cle !== "forfait" ? ` ${unite.nom}` : ""}
                        </span>
                      </span>
                      {coche && pluralisable && (
                        <input type="number" min="1" step="1"
                          style={{ ...S.input, width: 64, padding: "6px 8px" }}
                          value={selSup[sp.cle] || 1}
                          onChange={(e) => {
                            setSelSup((s) => ({ ...s, [sp.cle]: num(e.target.value) }));
                            marquerTouche();
                          }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

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
                {equipe.map((m) => {
                  const historique = m.ton === TON_HISTORIQUE;
                  const couleur = historique ? C.ambre : C.encre;
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between",
                                             fontSize: 12, padding: "1px 0" }}>
                      <span style={{ color: couleur }}>
                        {m.nom}
                        {m.retire && (
                          <span style={{ color: C.ambre, fontSize: 10.5 }}> · retiré de l'équipe</span>
                        )}
                        <span style={{ color: C.fantome }}>
                          {" "}· {m.tauxConnu ? `${m.taux} €/h` : "taux non renseigné"} × {heuresMO} h
                        </span>
                      </span>
                      <span style={{ fontWeight: 600, color: couleur }}>
                        {euros(Math.round(m.taux * heuresMO * 100))}
                      </span>
                    </div>
                  );
                })}
                {mentionLignesRetirees(equipeIds, equipe) && (
                  <div style={{ fontSize: 10.5, color: C.muet, marginTop: 5, lineHeight: 1.4 }}>
                    {mentionLignesRetirees(equipeIds, equipe)}
                  </div>
                )}
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
      </>
      )}
    </div>
  );
}

// =============================================================================
const BTN_PETIT = { padding: "6px 11px", borderRadius: 8, border: "none",
                    cursor: "pointer", fontSize: 12, fontWeight: 700 };

// ONGLET CALCUL DÉFINITIF — prévu vs réel vs facturé, et les litiges.
// Vue de bilan : lit, compare, alerte. La saisie des coûts réels reste dans
// l'onglet Estimation ; ici on regarde le résultat une fois le chantier fait.
// =============================================================================
function CalculDefinitif({ affaireId, affaire, coutsReels, equipe, heuresMO, peutVoirPrix, versFacture }) {
  const [prevu, setPrevu] = useState(null);
  const [facturation, setFacturation] = useState(null);

  useEffect(() => {
    scenarioRetenu(affaireId).then(setPrevu).catch(() => setPrevu(null));
    etatFacturation(affaireId).then(setFacturation).catch(() => setFacturation(null));
  }, [affaireId]);

  // Main-d'œuvre réelle : coutMainOeuvre renvoie déjà des EUROS (taux €/h × h).
  const moEuros = coutMainOeuvre(equipe, heuresMO);
  const reel = {
    mainOeuvre: moEuros,
    carburant: coutsReels.carburantEuros,
    materiel: coutsReels.materielEuros,
    divers: coutsReels.diversEuros,
    peages: coutsReels.peagesEuros,
  };

  const calc = calculDefinitif({
    prevuTvacCentimes: prevu?.tvac_centimes ?? null,
    prevuHtvaCentimes: prevu?.htva_centimes ?? null,
    reel: peutVoirPrix ? reel : null,
    facturation,
  });

  const col = calc.colonnes;
  const TON = { rouge: C.rouge, ambre: C.ambre, muet: C.muet };

  return (
    <div>
      {/* Les trois colonnes */}
      <div style={S.carte}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 10 }}>
          Prévu · Réel · Facturé
        </div>
        <div style={{ display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(min(90px,100%), 1fr))",
                      gap: 8 }}>
          <Colonne titre="Prévu" sousTitre="devis retenu"
            valeur={euroCentimes(col.prevu.tvac)} connu={col.prevu.connu} accent="#64748B" />
          <Colonne titre="Réel" sousTitre={peutVoirPrix ? "coûts constatés" : "confidentiel"}
            valeur={peutVoirPrix ? euroCentimes(col.reel.total) : "•••"}
            connu={col.reel.connu} accent="#0F172A" />
          <Colonne titre="Facturé" sousTitre={ETATS_FACT_LIB[col.facture.etat] || ""}
            valeur={euroCentimes(col.facture.du)} connu={col.facture.connu} accent={C.bleu} />
        </div>

        {/* Marges — seulement pour qui voit les prix */}
        {peutVoirPrix && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${C.bord}`, paddingTop: 10 }}>
            <LigneMarge libelle="Marge réelle" aide="facturé − coûts réels"
              valeur={euroCentimes(calc.marges.reelle_centimes)}
              pct={calc.marges.reelle_pct}
              positif={calc.marges.reelle_centimes >= 0} />
            {calc.marges.ecart_devis_centimes != null && (
              <LigneMarge libelle="Écart au devis" aide="facturé − prévu"
                valeur={euroCentimes(calc.marges.ecart_devis_centimes)}
                positif={calc.marges.ecart_devis_centimes >= 0} />
            )}
          </div>
        )}

        {/* Alertes factuelles */}
        {calc.alertes.map((a, i) => (
          <div key={i} style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.45,
                                color: TON[a.ton] || C.muet }}>
            {a.ton === "rouge" ? "⚠ " : a.ton === "ambre" ? "• " : ""}{a.texte}
          </div>
        ))}

        {facturation && facturation.factures === 0 && versFacture && (
          <button style={{ ...S.boutonLien, width: "100%", textAlign: "center", marginTop: 10 }}
                  onClick={() => versFacture(affaireId)}>
            Établir la facture →
          </button>
        )}
      </div>

      {/* Heures réelles : le bureau confirme (ou corrige) ce que le terrain a
          pointé. La validation est enregistrée — c'est l'heure retenue. */}
      <HeuresReelles affaireId={affaireId} />

      {/* Litiges */}
      <Litiges affaireId={affaireId} affaire={affaire} />
    </div>
  );
}

function Colonne({ titre, sousTitre, valeur, connu, accent }) {
  return (
    <div style={{ background: "#F8FAFC", border: `1px solid ${C.bord}`,
                  borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: accent,
                    textTransform: "uppercase", letterSpacing: ".03em" }}>{titre}</div>
      <div style={{ fontSize: 9.5, color: C.fantome, marginBottom: 6, minHeight: 12 }}>{sousTitre}</div>
      <div style={{ fontSize: 14.5, fontWeight: 800,
                    color: connu ? C.encre : C.fantome }}>{valeur}</div>
    </div>
  );
}

function LigneMarge({ libelle, aide, valeur, pct, positif }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  padding: "3px 0" }}>
      <span style={{ fontSize: 12.5, color: C.encre }}>
        {libelle} <span style={{ fontSize: 10.5, color: C.fantome }}>· {aide}</span>
      </span>
      <span style={{ fontSize: 13, fontWeight: 800,
                     color: positif ? "#15803D" : C.rouge }}>
        {valeur}{pct != null ? ` · ${pct}%` : ""}
      </span>
    </div>
  );
}

const ETATS_FACT_LIB = {
  non_facture: "non facturé", facture: "facturé",
  partiellement_paye: "partiel", paye: "payé",
};

// ── HEURES RÉELLES ───────────────────────────────────────────────────────────
// Le bureau confirme les heures pointées par le terrain, ou les corrige, puis
// valide. La validation est enregistrée (heure retenue pour les coûts).
function HeuresReelles({ affaireId }) {
  const [lignes, setLignes] = useState(null);
  const [edite, setEdite] = useState(null);   // mission_id en cours de correction
  const [saisie, setSaisie] = useState({ depart: "", arrivee: "" });
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const recharger = () => heuresAffaire(affaireId).then(setLignes).catch(() => setLignes([]));
  useEffect(() => { recharger(); }, [affaireId]);

  if (!lignes || lignes.length === 0) return null;

  const hhmm = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const dateBase = (l) => (l.depart ? l.depart.slice(0, 10) : l.date);

  async function valider(l, avecCorrection) {
    setEnCours(true); setErreur(null);
    try {
      let depart = null, arrivee = null;
      if (avecCorrection) {
        const base = dateBase(l);
        depart = saisie.depart ? new Date(`${base}T${saisie.depart}:00`) : null;
        arrivee = saisie.arrivee ? new Date(`${base}T${saisie.arrivee}:00`) : null;
      }
      await validerHeures(l.mission_id, { depart, arrivee });
      setEdite(null); await recharger();
    } catch (e) { setErreur(e.message || "Refusé"); }
    finally { setEnCours(false); }
  }

  return (
    <div style={S.carte}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>Heures réelles</div>
      <div style={{ fontSize: 11.5, color: C.muet, marginTop: 3, lineHeight: 1.45 }}>
        Ce que le terrain a pointé. Confirmez, ou corrigez avant de valider.
      </div>

      {lignes.map((l) => {
        const enEdition = edite === l.mission_id;
        return (
          <div key={l.mission_id} style={{ marginTop: 10, padding: 11, borderRadius: 10,
            border: `1px solid ${l.validees ? "#A7F3D0" : C.bord}`,
            background: l.validees ? "#F0FDF4" : "#F8FAFC" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: C.encre }}>
                {l.type ? l.type.charAt(0).toUpperCase() + l.type.slice(1) : "Chantier"}
                {l.date ? ` · ${new Date(l.date + "T00:00:00").toLocaleDateString("fr-BE",
                  { day: "numeric", month: "short" })}` : ""}
              </span>
              {l.validees && (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#15803D" }}>✓ validées</span>
              )}
            </div>

            {enEdition ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={{ flex: 1, fontSize: 11, color: C.muet }}>
                    Départ
                    <input type="time" value={saisie.depart}
                      onChange={(e) => setSaisie((s) => ({ ...s, depart: e.target.value }))}
                      style={{ ...S.input, marginTop: 3 }} />
                  </label>
                  <label style={{ flex: 1, fontSize: 11, color: C.muet }}>
                    Arrivée
                    <input type="time" value={saisie.arrivee}
                      onChange={(e) => setSaisie((s) => ({ ...s, arrivee: e.target.value }))}
                      style={{ ...S.input, marginTop: 3 }} />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button disabled={enCours} onClick={() => valider(l, true)}
                          style={{ ...S.boutonPlein, flex: 1, padding: "9px" }}>
                    Enregistrer et valider
                  </button>
                  <button onClick={() => setEdite(null)}
                          style={{ ...S.boutonLien, color: C.muet }}>Annuler</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6,
                              fontFamily: "ui-monospace, monospace", fontSize: 15,
                              fontWeight: 800, color: C.encre }}>
                  <span>{hhmm(l.depart) || "—:—"}</span>
                  <span style={{ color: C.fantome }}>→</span>
                  <span>{hhmm(l.arrivee) || "—:—"}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {!l.validees && l.depart && l.arrivee && (
                    <button disabled={enCours} onClick={() => valider(l, false)}
                            style={{ ...BTN_PETIT, background: "#15803D", color: "#fff" }}>
                      ✓ Confirmer ces heures
                    </button>
                  )}
                  <button onClick={() => {
                    setSaisie({ depart: hhmm(l.depart), arrivee: hhmm(l.arrivee) });
                    setEdite(l.mission_id);
                  }} style={{ ...BTN_PETIT, background: "#EEF2F8", color: C.encre }}>
                    {l.validees ? "Corriger" : "Corriger les heures"}
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
      {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>}
    </div>
  );
}

// ── LITIGES ────────────────────────────────────────────────────────────────
function Litiges({ affaireId, affaire }) {
  const [donnees, setDonnees] = useState(null);
  const [ouvre, setOuvre] = useState(false);

  const recharger = () => litigesAffaire(affaireId).then(setDonnees).catch(() => setDonnees(null));
  useEffect(() => { recharger(); }, [affaireId]);

  const liste = donnees?.liste || [];
  const clos = affaire?.etat === "clos";

  return (
    <div style={S.carte}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
          Litiges
          {donnees?.ouverts > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: C.rouge,
                           border: `1.5px solid ${C.rouge}`, borderRadius: 999, padding: "1px 8px" }}>
              {donnees.ouverts} en cours
            </span>
          )}
        </div>
        {!clos && !ouvre && (
          <button style={{ ...S.boutonLien, fontSize: 12 }} onClick={() => setOuvre(true)}>
            + Ouvrir un litige
          </button>
        )}
      </div>

      <div style={{ fontSize: 11.5, color: C.muet, marginTop: 3, lineHeight: 1.4 }}>
        Un litige ouvert (impayé, dégât, contestation) empêche la clôture du
        dossier tant qu'il n'est pas résolu.
      </div>

      {ouvre && <FormLitige affaireId={affaireId}
        onFait={() => { setOuvre(false); recharger(); }}
        onAnnuler={() => setOuvre(false)} />}

      {liste.length === 0 && !ouvre && (
        <div style={{ fontSize: 12, color: C.fantome, marginTop: 10 }}>
          Aucun litige sur ce dossier.
        </div>
      )}

      {liste.map((l) => (
        <LigneLitige key={l.id} litige={l} clos={clos} onFait={recharger} />
      ))}
    </div>
  );
}

function FormLitige({ affaireId, onFait, onAnnuler }) {
  const [type, setType] = useState("impaye");
  const [titre, setTitre] = useState("");
  const [montant, setMontant] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function creer() {
    setEnCours(true); setErreur(null);
    try {
      await ouvrirLitige(affaireId, {
        type, titre, description, reference,
        montantCentimes: montant ? Math.round(parseFloat(montant.replace(",", ".")) * 100) : null,
      });
      onFait();
    } catch (e) { setErreur(e.message || "Refusé"); setEnCours(false); }
  }

  return (
    <div style={{ marginTop: 10, padding: 12, background: "#F8FAFC",
                  border: `1px solid ${C.bord}`, borderRadius: 10 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {typesLitige().map((t) => (
          <button key={t.cle} onClick={() => setType(t.cle)}
            style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                     border: `1.5px solid ${type === t.cle ? t.couleur : C.bord}`,
                     background: type === t.cle ? t.couleur : C.blanc,
                     color: type === t.cle ? "#fff" : C.encre, fontWeight: 600 }}>
            {t.libelle}
          </button>
        ))}
      </div>
      <input style={{ ...S.input, marginBottom: 6 }} value={titre}
             onChange={(e) => setTitre(e.target.value)}
             placeholder="Intitulé (ex. Canapé rayé au déchargement)" />
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <input style={{ ...S.input, flex: 1 }} value={montant} inputMode="decimal"
               onChange={(e) => setMontant(e.target.value)} placeholder="Montant € (enjeu)" />
        <input style={{ ...S.input, flex: 1 }} value={reference}
               onChange={(e) => setReference(e.target.value)} placeholder="Réf. (n° sinistre…)" />
      </div>
      <textarea style={{ ...S.input, minHeight: 44, resize: "vertical" }} value={description}
                onChange={(e) => setDescription(e.target.value)} placeholder="Détails" />
      {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 6 }}>{erreur}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button style={{ ...S.boutonPlein, flex: 1 }} disabled={enCours} onClick={creer}>
          Ouvrir le litige
        </button>
        <button style={{ ...S.boutonLien, color: C.muet }} onClick={onAnnuler}>Annuler</button>
      </div>
    </div>
  );
}

function LigneLitige({ litige, clos, onFait }) {
  const [note, setNote] = useState("");
  const [enCours, setEnCours] = useState(false);
  const ouvert = litige.statut === "ouvert";
  const suivante = etapeSuivante(litige.type, litige.etape);
  const couleur = couleurType(litige.type);

  async function agir(fn) {
    setEnCours(true);
    try { await fn(); setNote(""); onFait(); } finally { setEnCours(false); }
  }

  return (
    <div style={{ marginTop: 10, padding: 11, borderRadius: 10,
                  border: `1px solid ${ouvert ? couleur + "55" : C.bord}`,
                  background: ouvert ? couleur + "0D" : "#F8FAFC" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: C.encre }}>
          {litige.titre || libelleType(litige.type)}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: couleur }}>
          {libelleType(litige.type)}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: C.muet, marginTop: 3 }}>
        {ouvert ? `Étape : ${libelleEtape(litige.type, litige.etape)}`
                : (litige.statut === "resolu" ? "✓ Résolu" : "Abandonné")}
        {litige.montant_centimes ? ` · ${euroCentimes(litige.montant_centimes)}` : ""}
        {litige.reference ? ` · réf. ${litige.reference}` : ""}
      </div>
      {litige.resolution && (
        <div style={{ fontSize: 11.5, color: C.muet, marginTop: 3, fontStyle: "italic" }}>
          {litige.resolution}
        </div>
      )}

      {ouvert && !clos && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {suivante && (
            <button style={{ ...BTN_PETIT, background: couleur, color: "#fff" }}
              disabled={enCours}
              onClick={() => agir(() => avancerLitige(litige.id, suivante.cle, note))}>
              → {suivante.libelle}
            </button>
          )}
          {issuesLitige(litige.type).map((is) => (
            <button key={is.cle} disabled={enCours}
              style={{ ...BTN_PETIT, background: is.cle === "resolu" ? "#15803D" : "#64748B", color: "#fff" }}
              onClick={() => agir(() => resoudreLitige(litige.id, is.cle, note))}>
              {is.libelle}
            </button>
          ))}
        </div>
      )}
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
