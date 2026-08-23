// =============================================================================
// Écran — Confidentialité & données (Paramètres → Confidentialité).
//
// Met en œuvre la limitation de conservation (RGPD art. 5.1.e). L'inventaire du
// mobilier des clients et les adresses de chantier sont purgés après le délai
// de conservation ; les factures sont gardées pour le délai légal.
//
// La purge est un acte grave : on montre d'abord ce qui serait supprimé
// (aperçu), on demande confirmation, puis seulement on purge.
// =============================================================================

import React, { useEffect, useState } from "react";
import { apercuRetention, purgerDonneesExpirees } from "../lib/adaptateur.js";
import {
  RETENTION_OPERATIONNELLE_MOIS, RETENTION_FISCALE_ANNEES,
} from "@domaine/rgpd/retention.js";
import { C, S } from "../lib/theme.jsx";

export default function Confidentialite({ retour }) {
  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [confirme, setConfirme] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState(null);

  async function charger() {
    setErreur(null);
    try { setApercu(await apercuRetention()); }
    catch (e) { setErreur(e.message); }
  }
  useEffect(() => { charger(); }, []);

  async function purger() {
    setEnCours(true); setErreur(null);
    try {
      const r = await purgerDonneesExpirees(false);
      setResultat(r);
      setConfirme(false);
      await charger();
    } catch (e) { setErreur(e.message); }
    finally { setEnCours(false); }
  }

  if (apercu === null && !erreur) return null;
  const purgeables = apercu?.purgeables_maintenant ?? 0;

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Paramètres</button>}
        <div style={S.titre}>Confidentialité & données</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Conservation et suppression des données personnelles.
        </div>
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Ce que conserve Dashprod</label>
        <div style={{ fontSize: 12.5, color: C.muet, lineHeight: 1.6 }}>
          <p style={{ margin: "0 0 10px" }}>
            <b style={{ color: C.encre }}>Données de déménagement</b> — inventaire
            du mobilier, adresses de départ et d'arrivée. Conservées pendant le
            traitement du dossier, puis <b>{RETENTION_OPERATIONNELLE_MOIS} mois</b>
            {" "}après son archivage, le temps d'un éventuel litige. Ensuite
            supprimées.
          </p>
          <p style={{ margin: 0 }}>
            <b style={{ color: C.encre }}>Factures</b> — conservées{" "}
            <b>{RETENTION_FISCALE_ANNEES} ans</b>, comme l'impose la loi comptable
            belge. Elles ne sont jamais supprimées par la purge ci-dessous.
          </p>
        </div>
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>État actuel</label>
        <Ligne l="Dossiers archivés" v={apercu?.dossiers_archives ?? "—"} />
        <Ligne l="Données déjà supprimées" v={apercu?.deja_purges ?? "—"} />
        <Ligne l="Purgeables maintenant" v={purgeables}
               accent={purgeables > 0} />
      </div>

      {resultat && (
        <div style={{ margin: "0 16px 12px", padding: "11px 13px", borderRadius: 11,
                      background: C.teinteVerte, border: `1px solid ${C.filetVert}`,
                      fontSize: 12.5, color: C.encreVert, lineHeight: 1.5 }}>
          {resultat.message}
        </div>
      )}

      {purgeables > 0 && (
        <div style={S.carte}>
          {!confirme ? (
            <>
              <div style={{ fontSize: 12.5, color: C.muet, lineHeight: 1.5,
                            marginBottom: 10 }}>
                {purgeables} dossier{purgeables > 1 ? "s" : ""} ont dépassé le délai
                de conservation. Leur inventaire et leurs adresses seront supprimés
                définitivement. Les factures sont conservées.
              </div>
              <button style={{ ...S.boutonPlein, background: C.rouge }}
                      onClick={() => setConfirme(true)}>
                Supprimer les données expirées
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.rouge,
                            marginBottom: 8 }}>
                Cette suppression est définitive.
              </div>
              <div style={{ fontSize: 12, color: C.muet, marginBottom: 12,
                            lineHeight: 1.5 }}>
                {purgeables} dossier{purgeables > 1 ? "s" : ""} concernés. Confirmez-vous ?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.boutonPlein, background: C.rouge, flex: 1 }}
                        disabled={enCours} onClick={purger}>
                  {enCours ? "Suppression…" : "Oui, supprimer"}
                </button>
                <button style={{ ...S.boutonLien, flex: 1 }}
                        onClick={() => setConfirme(false)}>Annuler</button>
              </div>
            </>
          )}
        </div>
      )}

      {erreur && (
        <div style={{ margin: "0 16px 20px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>
      )}
      <div style={{ height: 30 }} />
    </div>
  );
}

function Ligne({ l, v, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between",
                  padding: "8px 0", borderTop: `1px solid ${C.doux}` }}>
      <span style={{ fontSize: 12.5, color: C.muet }}>{l}</span>
      <span style={{ fontSize: 13.5, fontWeight: 800,
                     color: accent ? C.ambre : C.encre }}>{v}</span>
    </div>
  );
}
