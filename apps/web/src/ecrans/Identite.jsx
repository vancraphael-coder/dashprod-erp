// =============================================================================
// Écran — Identité de l'entreprise (Paramètres).
//
// La source de vérité. Ce qui est saisi ici alimente les devis, les PDF, les
// emails, les factures et, plus tard, Peppol. Aucun autre écran ne redemande
// ni ne redéfinit une de ces informations.
//
// Deux sous-pages :
//   identite    — nom légal, BCE, TVA, adresse, contact, IBAN
//   facturation — taux de TVA, échéance, préfixe de numéro, mention légale
//
// L'écran affiche en permanence l'état de complétion : tant qu'un champ
// bloquant manque, il le dit, plutôt que de laisser partir un devis à en-tête
// incomplet chez un client.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { obtenirOrganisation, sauverOrganisation } from "../lib/adaptateur.js";
import {
  CHAMPS_IDENTITE, FACTURATION_DEFAUT, identiteComplete, facturation,
  tvaBelgeValide, ibanValide, lignesEntete, nomAffiche,
} from "@domaine/organisation/identite.js";
import { C, S } from "../lib/theme.jsx";

export default function Identite({ retour, page = "identite" }) {
  const [org, setOrg] = useState(null);
  const [valeurs, setValeurs] = useState({});
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    obtenirOrganisation()
      .then((o) => { setOrg(o || {}); setValeurs(o || {}); })
      .catch((e) => { setErreur(e.message); setOrg({}); });
  }, []);

  const etat = useMemo(() => identiteComplete(valeurs), [valeurs]);
  const fact = useMemo(() => facturation(valeurs), [valeurs]);

  if (org === null) return null;

  function maj(cle, v) { setValeurs((x) => ({ ...x, [cle]: v })); setSauve(false); }
  function majFact(cle, v) {
    setValeurs((x) => ({
      ...x,
      parametres_facturation: { ...facturation(x), [cle]: v },
    }));
    setSauve(false);
  }

  async function enregistrer() {
    setErreur(null);
    try {
      await sauverOrganisation(valeurs);
      setOrg(valeurs);
      setSauve(true);
    } catch (e) { setErreur(e.message); }
  }

  const estFacturation = page === "facturation";

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Paramètres</button>
        <div style={S.titre}>
          {estFacturation ? "Facturation" : "Identité de l'entreprise"}
        </div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          {estFacturation
            ? "Réglages hérités par tous les devis et toutes les factures."
            : "Ces informations alimentent devis, PDF, emails et factures."}
        </div>
      </div>

      {!estFacturation && <Etat etat={etat} />}

      {estFacturation ? (
        <div style={S.carte}>
          <label style={{ ...S.label, marginTop: 0 }}>
            Taux de TVA (%)
            <span style={{ fontWeight: 500, color: C.fantome, marginLeft: 6 }}>
              défaut belge : {FACTURATION_DEFAUT.tva_taux} %
            </span>
          </label>
          <input style={S.input} type="number" min="0" max="100" step="0.1"
                 value={fact.tva_taux}
                 onChange={(e) => majFact("tva_taux", Number(e.target.value))} />

          <label style={S.label}>Échéance de paiement (jours)</label>
          <input style={S.input} type="number" min="0" step="1"
                 value={fact.echeance_jours}
                 onChange={(e) => majFact("echeance_jours", Number(e.target.value))} />

          <label style={S.label}>
            Préfixe de numérotation
            <span style={{ fontWeight: 500, color: C.fantome, marginLeft: 6 }}>
              facultatif — ex. « FA »
            </span>
          </label>
          <input style={S.input} value={fact.prefixe_numero ?? ""}
                 placeholder="aucun"
                 onChange={(e) => majFact("prefixe_numero", e.target.value)} />

          <label style={S.label}>Mention légale en pied de facture</label>
          <textarea style={{ ...S.input, minHeight: 54 }}
                    value={fact.mention_legale ?? ""}
                    placeholder="Ex. : intérêts de retard applicables à partir de l'échéance."
                    onChange={(e) => majFact("mention_legale", e.target.value)} />

          <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 10, lineHeight: 1.5 }}>
            Le taux saisi ici remplace le 21 % appliqué par défaut, partout :
            devis, PDF, factures. Un seul endroit décide.
          </div>
        </div>
      ) : (
        <div style={S.carte}>
          {CHAMPS_IDENTITE.map((ch) => {
            const val = valeurs[ch.cle] ?? "";
            const manque = ch.requis && String(val).trim() === "";
            const invalide =
              (ch.cle === "tva" && !tvaBelgeValide(val))
              || (ch.cle === "iban" && !ibanValide(val));
            return (
              <div key={ch.cle} style={{ marginBottom: 10 }}>
                <label style={S.label}>
                  {ch.label}
                  {ch.requis && <span style={{ color: C.rouge, marginLeft: 3 }}>*</span>}
                  {ch.aide && (
                    <span style={{ fontWeight: 500, color: C.fantome, marginLeft: 6 }}>
                      {ch.aide}
                    </span>
                  )}
                </label>
                <input
                  style={{ ...S.input,
                    borderColor: invalide ? C.rouge : manque ? "#FDE68A" : undefined }}
                  value={val} onChange={(e) => maj(ch.cle, e.target.value)} />
                {invalide && (
                  <div style={{ fontSize: 11.5, color: C.rouge, marginTop: 3 }}>
                    {ch.cle === "tva"
                      ? "Format attendu : BE suivi de 10 chiffres."
                      : "IBAN invalide — la clé de contrôle ne correspond pas."}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!estFacturation && (
        <div style={S.carte}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 8,
                        textTransform: "uppercase", letterSpacing: ".03em" }}>
            Aperçu de l'en-tête
          </div>
          <div style={{ padding: 12, borderRadius: 10, background: "#F8FAFC",
                        border: `1px solid ${C.bord}` }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.encre }}>
              {nomAffiche(valeurs) || <span style={{ color: C.rouge }}>Nom manquant</span>}
            </div>
            {lignesEntete(valeurs).map((l, i) => (
              <div key={i} style={{ fontSize: 11.5, color: C.muet, marginTop: 2 }}>{l}</div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 8, lineHeight: 1.5 }}>
            C'est exactement ce qui figurera en tête de vos devis et factures.
          </div>
        </div>
      )}

      {erreur && (
        <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>
      )}

      <div style={{ margin: "0 16px 30px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>
          {sauve ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function Etat({ etat }) {
  if (etat.complete) {
    return (
      <div style={{ ...bandeau, background: "#ECFDF5", borderColor: "#A7F3D0",
                    color: "#065F46" }}>
        ✓ Identité complète — vos documents peuvent partir.
      </div>
    );
  }
  const n = etat.bloquants.length;
  return (
    <div style={{ ...bandeau,
      background: etat.invalides.length ? "#FEF2F2" : "#FFFBEB",
      borderColor: etat.invalides.length ? "#FECACA" : "#FDE68A",
      color: etat.invalides.length ? "#991B1B" : "#92400E" }}>
      {etat.invalides.length > 0
        ? "Un champ est mal formé — corrigez-le avant d'envoyer un document."
        : `${n} champ${n > 1 ? "s" : ""} manquant${n > 1 ? "s" : ""} : un devis partirait avec un en-tête incomplet.`}
    </div>
  );
}

const bandeau = {
  margin: "0 16px 12px", padding: "11px 13px", borderRadius: 11,
  border: "1px solid", fontSize: 12.5, fontWeight: 600, lineHeight: 1.45,
};
