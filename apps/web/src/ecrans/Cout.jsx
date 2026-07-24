// =============================================================================
// Écran — Coût (prix INTERNES). Page dédiée, accessible depuis le Compte.
// Ce que ça coûte à l'entreprise : carburant, prix
// FOURNISSEUR des cartons/fournitures (base des marges). Les taux horaires
// réels par membre se règlent dans Ressources ; le taux par défaut sert de
// repli. Persisté dans organisations.parametres_prix.couts (jsonb).
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  obtenirParametresPrix, sauverParametresPrix,
  obtenirCatalogues, sauverCatalogues,
} from "../lib/adaptateur.js";
import { catalogue, coutsMateriel } from "@domaine/stocks/catalogues.js";
import Paie from "./Paie.jsx";
import { C, S } from "../lib/theme.jsx";

export default function Cout({ retour }) {
  // La paie vit ICI, dans les coûts : un salaire est un coût interne, pas un
  // prix client. C'est le coût employeur réel qui doit ensuite alimenter le
  // barème — pas l'inverse.
  //
  // ⚠️ Le basculement vers Paie doit venir APRÈS tous les hooks. Un return
  // anticipé fait rendre moins de hooks au second passage, et React casse
  // l'écran entier. C'est exactement ce qui produisait l'écran blanc.
  const [vue, setVue] = useState("couts");
  const [params, setParams] = useState(null);
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [cats, setCats] = useState(null);

  useEffect(() => {
    obtenirParametresPrix().then(setParams).catch((e) => setErreur(e.message));
    obtenirCatalogues().then((x) => setCats(x || {})).catch(() => setCats({}));
  }, []);

  /** Écrit le coût d'un article DANS LE CATALOGUE : même donnée, un seul lieu. */
  function majArticleCatalogue(source, cle, valeurEuros) {
    const centimes = Math.max(0, Math.round(Number(valeurEuros || 0) * 100));
    const liste = catalogue(cats, source).map((a) =>
      a.cle === cle ? { ...a, cout_centimes: centimes } : a);
    setCats((x) => ({ ...(x || {}), [source]: liste }));
    setSauve(false);
  }

  function majCout(cle, v) {
    setParams((p) => ({ ...p, couts: { ...(p.couts || {}), [cle]: num(v) } }));
    setSauve(false);
  }

  async function enregistrer() {
    setErreur(null);
    // Deux stockages, un seul geste : l'exploitation dans parametres_prix,
    // les articles dans parametres_catalogues.
    try {
      await sauverParametresPrix(params);
      await sauverCatalogues(cats || {});
      setSauve(true);
    } catch (e) { setErreur(e.message); }
  }

  if (vue === "paie") return <Paie retour={() => setVue("couts")} />;
  if (!params || cats === null) return null;
  const c = params.couts || {};
  // Le coût des fournitures et du matériel vient du CATALOGUE, pas d'une
  // seconde liste codée en dur ici. Une seule saisie, deux écrans qui la lisent.
  const lignes = coutsMateriel(cats);
  const parc = lignes.filter((l) => !l.consommable)
                     .reduce((t, l) => t + l.cout_centimes, 0);

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Compte</button>}
        <div style={S.titre}>Coûts internes</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Ce que ça coûte à l'entreprise (base des marges).
        </div>

      <div style={{ display: "flex", gap: 8, margin: "0 16px 12px" }}>
        {[["couts", "Coûts d'exploitation"], ["paie", "Paie"]].map(([cle, lib]) => (
          <button key={cle} onClick={() => setVue(cle)} style={{
            flex: 1, padding: "9px 6px", borderRadius: 10, cursor: "pointer",
            fontSize: 12.5, fontWeight: 700,
            border: `1.5px solid ${vue === cle ? C.bleu : C.bord}`,
            background: vue === cle ? "#E7EFFC" : C.blanc,
            color: vue === cle ? C.bleu : C.muet }}>{lib}</button>
        ))}
      </div>
      </div>

      <Section titre="Exploitation">
        <Champ label="Carburant" suffixe="€/km"
               value={c.carburant_km} onChange={(v) => majCout("carburant_km", v)} />
      </Section>

      <Section titre="Fournitures & matériel">
        <div style={{ fontSize: 11.5, color: C.muet, lineHeight: 1.5, marginBottom: 10 }}>
          Ces articles viennent de <b>Paramètres → Catalogues</b>. Modifier un
          coût ici le modifie là-bas : c'est la même donnée. Ajouter ou retirer
          un article se fait dans les catalogues.
        </div>
        {lignes.length === 0 && (
          <div style={{ fontSize: 12.5, color: C.fantome, padding: "6px 0" }}>
            Aucun article avec un coût. Renseignez-les dans les catalogues.
          </div>
        )}
        {lignes.map((l) => (
          <Champ key={`${l.source}:${l.cle}`}
                 label={`${l.nom} (${l.unite})`} suffixe="€"
                 value={l.cout_centimes / 100}
                 onChange={(v) => majArticleCatalogue(l.source, l.cle, v)} />
        ))}
        {parc > 0 && (
          <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 8 }}>
            Valeur du parc non consommable :{" "}
            <b style={{ color: C.encre }}>
              {(parc / 100).toFixed(2).replace(".", ",")} €
            </b>
          </div>
        )}
      </Section>

      <div style={{ margin: "0 16px 12px", fontSize: 11.5, color: C.muet, lineHeight: 1.5 }}>
        Le taux horaire de chaque membre se règle dans l'onglet <b>Paie</b>,
        avec ses charges. Il n'y a plus de taux par défaut : un repli global
        masquerait un taux manquant au lieu de le signaler.
      </div>

      {erreur && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}
      <div style={{ margin: "0 16px 24px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>
          {sauve ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function Section({ titre, children }) {
  return (
    <div style={S.carte}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 8,
                    textTransform: "uppercase", letterSpacing: ".03em" }}>{titre}</div>
      {children}
    </div>
  );
}

function Champ({ label, value, suffixe, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "5px 0" }}>
      <span style={{ fontSize: 13, color: C.encre }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input inputMode="decimal" value={value ?? ""} onChange={(e) => onChange(e.target.value)}
               style={{ width: 74, textAlign: "right", padding: "7px 9px",
                        border: `1.5px solid ${C.bord}`, borderRadius: 8, fontSize: 14 }} />
        <span style={{ fontSize: 11.5, color: C.fantome, width: 52 }}>{suffixe}</span>
      </div>
    </div>
  );
}

const num = (v) => (v === "" || v == null ? 0 : Number(v));
