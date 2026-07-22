// =============================================================================
// Écran — Modifications données texte dossiers (Compte).
//
// Page d'entrée + sous-pages. Chaque sous-page règle un jeu de textes que le
// client finit par lire : l'email d'offre, le PDF d'offre, les conditions
// générales. La liste des sous-pages vient de GROUPES_TEXTES : ajouter un
// groupe au catalogue suffit à faire apparaître une sous-page ici.
//
// Un champ laissé vide retombe sur le texte par défaut du domaine. Un réglage
// partiel est donc toujours valide.
//
// L'aperçu de l'email est calculé par emailOffre — la MÊME fonction que
// l'envoi réel : ce qui est affiché est exactement ce que le client recevra.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  obtenirTextes, sauverTextes, obtenirOrganisation,
  urlConditionsCbd, televerserConditionsCbd, modeDonnees,
} from "../lib/adaptateur.js";
import { emailOffre } from "@domaine/communication/brief.js";
import { articlesCgv, CGV_VERSION_COURANTE } from "@domaine/documents/cgv.js";
import {
  GROUPES_TEXTES, DEFAUTS_PAR_GROUPE, lireGroupe, ecrireGroupe,
} from "@domaine/communication/textes.js";
import { C, S } from "../lib/theme.jsx";

// Exemple figé pour l'aperçu — jamais envoyé, sert à visualiser le rendu.
const EXEMPLE = {
  client: { nom: "Marie Dupont", email: "marie.dupont@exemple.be" },
  tvacCentimes: 94380, heures: 6, nbDemenageurs: 3, formule: "tarifaire",
  charges: [{ adresse: "Rue de l'Exemple 1, 1000 Bruxelles" }],
  decharges: [{ adresse: "Avenue Louise 12, 1050 Bruxelles" }],
  date: "2026-09-14", heure: "08:00",
};

export default function TextesDossiers({ retour }) {
  const [stockes, setStockes] = useState(null);   // jsonb complet
  const [org, setOrg] = useState({});
  const [erreur, setErreur] = useState(null);
  const [ouvert, setOuvert] = useState(null);      // clé du groupe ouvert

  useEffect(() => {
    obtenirTextes()
      .then((t) => setStockes(t || {}))
      .catch((e) => { setErreur(e.message); setStockes({}); });
    obtenirOrganisation().then(setOrg).catch(() => {});
  }, []);

  if (stockes === null) return null;

  const groupe = ouvert ? GROUPES_TEXTES.find((g) => g.cle === ouvert) : null;

  if (groupe) {
    return (
      <SousPage
        groupe={groupe} stockes={stockes} org={org}
        onStockes={setStockes} retour={() => setOuvert(null)}
      />
    );
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Compte</button>}
        <div style={S.titre}>Modifications données texte dossiers</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Tous les textes qu'un client peut lire. Un champ vide garde le texte
          par défaut.
        </div>
      </div>

      <div style={{ padding: "0 16px 24px" }}>
        {GROUPES_TEXTES.map((g) => {
          const perso = Object.keys(lireGroupe(stockes, g)).length;
          return (
            <button key={g.cle} onClick={() => setOuvert(g.cle)} style={carteBouton}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{g.icone}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 700,
                               color: C.encre }}>{g.titre}</span>
                <span style={{ display: "block", fontSize: 11.5, color: C.muet,
                               marginTop: 2, lineHeight: 1.4 }}>{g.resume}</span>
                {!g.fichier && (
                  <span style={{ display: "inline-block", marginTop: 6, fontSize: 10.5,
                                 fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                                 background: perso ? C.bleuClair : C.doux,
                                 color: perso ? C.bleu : C.fantome }}>
                    {perso ? `${perso} texte${perso > 1 ? "s" : ""} personnalisé${perso > 1 ? "s" : ""}`
                           : "textes par défaut"}
                  </span>
                )}
              </span>
              <span style={{ color: C.fantome, fontSize: 18 }}>›</span>
            </button>
          );
        })}
      </div>

      {erreur && (
        <div style={{ margin: "0 16px 24px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SousPage({ groupe, stockes, org, onStockes, retour }) {
  const defauts = DEFAUTS_PAR_GROUPE[groupe.cle] || {};
  // Pré-remplissage avec le texte RÉELLEMENT en vigueur : personnalisation si
  // elle existe, défaut sinon. Un champ vide avec un simple indice gris ne
  // permet pas de relire ni de retoucher le texte qui part chez le client.
  const [valeurs, setValeurs] = useState(
    () => ({ ...defauts, ...lireGroupe(stockes, groupe) }));
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [cbd, setCbd] = useState(undefined);      // undefined = en cours
  const [envoiCbd, setEnvoiCbd] = useState(false);

  useEffect(() => {
    if (groupe.fichier) urlConditionsCbd().then(setCbd).catch(() => setCbd(null));
  }, [groupe.fichier]);

  // Aperçu : mêmes règles que l'envoi réel.
  const apercu = useMemo(() => {
    if (!groupe.apercu) return null;
    const utiles = Object.fromEntries(
      Object.entries(valeurs).filter(([, v]) => v !== "" && v != null));
    try {
      return emailOffre({ ...EXEMPLE, organisation: org, textes: utiles });
    } catch { return null; }
  }, [groupe.apercu, valeurs, org]);

  function maj(cle, valeur) {
    setValeurs((v) => ({ ...v, [cle]: valeur }));
    setSauve(false);
  }

  async function enregistrer() {
    setErreur(null);
    try {
      // On ne stocke que ce qui diffère du défaut : le jour où le défaut
      // évolue, l'entreprise en bénéficie sans avoir à ressaisir.
      // Pour les alinéas, le "défaut" est le texte d'origine de l'article :
      // on ne stocke que ce qui en diffère réellement.
      const origine = groupe.alineas
        ? Object.fromEntries(articlesCgv().map((a) => [String(a.index), a.texte]))
        : defauts;
      const differences = Object.fromEntries(
        Object.entries(valeurs).filter(([k, v]) => String(v ?? "") !== String(origine[k] ?? "")));
      const complet = ecrireGroupe(stockes, groupe, differences);
      await sauverTextes(complet);
      onStockes(complet);
      setSauve(true);
    } catch (e) { setErreur(e.message); }
  }

  async function reinitialiser() {
    setErreur(null);
    try {
      const complet = ecrireGroupe(stockes, groupe, {});
      await sauverTextes(complet);
      onStockes(complet);
      setValeurs({ ...defauts });
      setSauve(true);
    } catch (e) { setErreur(e.message); }
  }

  async function deposerCbd(fichier) {
    if (!fichier) return;
    setErreur(null); setEnvoiCbd(true);
    try {
      await televerserConditionsCbd(fichier);
      setCbd(await urlConditionsCbd());
    } catch (e) { setErreur(e.message || "Dépôt impossible"); }
    setEnvoiCbd(false);
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Textes dossiers</button>
        <div style={S.titre}>{groupe.titre}</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>{groupe.resume}</div>
      </div>

      {groupe.champs.length > 0 && (
        <div style={S.carte}>
          {groupe.champs.map((ch) => (
            <div key={ch.cle} style={{ marginBottom: 10 }}>
              <label style={S.label}>
                {ch.label}
                {ch.aide && (
                  <span style={{ fontWeight: 500, color: C.fantome, marginLeft: 6 }}>
                    {ch.aide}
                  </span>
                )}
              </label>
              {ch.long ? (
                <textarea style={{ ...S.input, minHeight: 46 }}
                          value={valeurs[ch.cle] ?? ""}
                          placeholder={String(defauts[ch.cle] ?? "")}
                          onChange={(e) => maj(ch.cle, e.target.value)} />
              ) : (
                <input style={S.input}
                       type={ch.nombre ? "number" : "text"}
                       value={valeurs[ch.cle] ?? ""}
                       placeholder={String(defauts[ch.cle] ?? "")}
                       onChange={(e) => maj(ch.cle,
                         ch.nombre ? (e.target.value === "" ? "" : Number(e.target.value))
                                   : e.target.value)} />
              )}
            </div>
          ))}
        </div>
      )}

      {apercu && (
        <div style={S.carte}>
          <div style={sousTitre}>Aperçu (exemple)</div>
          <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 6 }}>
            Objet : <span style={{ color: C.encre, fontWeight: 700 }}>{apercu.objet}</span>
          </div>
          <pre style={{
            margin: 0, padding: 12, borderRadius: 10, background: "#F8FAFC",
            border: `1px solid ${C.bord}`, fontSize: 12, lineHeight: 1.55,
            color: C.encre, whiteSpace: "pre-wrap",
            fontFamily: "ui-monospace, monospace",
          }}>{apercu.corps}</pre>
        </div>
      )}

      {groupe.alineas && (
        <div style={S.carte}>
          <div style={{ fontSize: 11.5, color: C.muet, lineHeight: 1.5, marginBottom: 10 }}>
            Version {CGV_VERSION_COURANTE} en vigueur. Réécrivez un article : les
            autres gardent leur texte d'origine. Les documents déjà signés
            conservent le texte qu'ils contenaient — une réécriture ne les
            modifie jamais.
          </div>
          {articlesCgv().map((art) => (
            <div key={art.index} style={{ marginBottom: 12 }}>
              <label style={S.label}>
                Article {art.numero} — {art.titre}
                {valeurs[String(art.index)] && (
                  <span style={{ fontWeight: 500, color: C.bleu, marginLeft: 6 }}>
                    réécrit
                  </span>
                )}
              </label>
              <textarea style={{ ...S.input, minHeight: 70 }}
                        value={valeurs[String(art.index)] ?? art.texte}
                        onChange={(e) => maj(String(art.index), e.target.value)} />
            </div>
          ))}
        </div>
      )}

      {groupe.fichier && (
        <div style={S.carte}>
          <div style={{ fontSize: 11.5, color: C.muet, lineHeight: 1.5, marginBottom: 8 }}>
            PDF joint à chaque offre envoyée au client, à côté de l'offre elle-même.
          </div>
          {cbd === undefined ? null : cbd ? (
            <div style={{ display: "flex", alignItems: "center",
                          justifyContent: "space-between", padding: "10px 12px",
                          borderRadius: 10, background: "#ECFDF5",
                          border: "1px solid #A7F3D0" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#065F46" }}>
                ✓ Conditions déposées
              </span>
              <a href={cbd} target="_blank" rel="noreferrer"
                 style={{ fontSize: 12.5, fontWeight: 700, color: C.bleu }}>Ouvrir</a>
            </div>
          ) : (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "#FFFBEB",
                          border: "1px solid #FDE68A", fontSize: 12.5, color: "#92400E" }}>
              Aucun document déposé — les offres partiront sans les conditions.
            </div>
          )}
          {modeDonnees() === "reel" && (
            <label style={{ ...S.boutonLien, display: "block", marginTop: 10,
                            cursor: "pointer", fontWeight: 700 }}>
              {envoiCbd ? "Dépôt en cours…" : cbd ? "Remplacer le PDF" : "Déposer le PDF"}
              <input type="file" accept="application/pdf" style={{ display: "none" }}
                     onChange={(e) => deposerCbd(e.target.files?.[0])} />
            </label>
          )}
        </div>
      )}

      {erreur && (
        <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>
      )}

      {(groupe.champs.length > 0 || groupe.alineas) && (
        <div style={{ margin: "0 16px 24px" }}>
          <button style={S.boutonPlein} onClick={enregistrer}>
            {sauve ? "✓ Enregistré" : "Enregistrer"}
          </button>
          {Object.keys(lireGroupe(stockes, groupe)).length > 0 && (
            <button onClick={reinitialiser}
                    style={{ ...S.boutonLien, display: "block", width: "100%",
                             marginTop: 10, fontWeight: 600 }}>
              Revenir aux textes par défaut
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const carteBouton = {
  display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
  marginTop: 10, padding: 14, border: `1px solid ${C.bord}`, borderRadius: 14,
  background: C.blanc, boxShadow: "0 1px 3px rgba(15,23,42,.05)",
  cursor: "pointer", textAlign: "left",
};

const sousTitre = {
  fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 8,
  textTransform: "uppercase", letterSpacing: ".03em",
};
