// =============================================================================
// Écran — Paramètres (Compte → Paramètres).
//
// Rassemble TOUS les réglages de l'entreprise, jusqu'ici éparpillés dans le
// Compte. Le Compte redevient personnel ; ici on règle l'organisation.
//
//   Barème (prix client)      → écran Bareme
//   Coûts internes            → écran Cout
//   Catalogues                → sous-page interne (pièces, fournitures, matériel)
//   Textes des dossiers       → écran TextesDossiers
//   Archivage                 → écran Archivage
//
// Les catalogues sont persistés dans organisations.parametres_catalogues et
// consommés par le Relevé (pièces) et le Matériel (fournitures + terrain).
// Ajouter un article de matériel le fait apparaître dans les coûts internes,
// sans double saisie.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { obtenirCatalogues, sauverCatalogues, obtenirOrganisation } from "../lib/adaptateur.js";
import { identiteComplete, tauxTva } from "@domaine/organisation/identite.js";
import Identite from "./Identite.jsx";
import {
  LISTES_CATALOGUE, CATALOGUES_DEFAUT, catalogue, estPersonnalise,
  normaliserArticle, coutsMateriel,
} from "@domaine/stocks/catalogues.js";
import { C, S } from "../lib/theme.jsx";

const euros = (c) => (Number(c || 0) / 100).toFixed(2).replace(".", ",") + " €";

export default function Parametres({
  retour, versBareme, versCout, versTextes, versArchivage,
}) {
  const [cats, setCats] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [org, setOrg] = useState({});
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    obtenirCatalogues()
      .then((c) => setCats(c || {}))
      .catch((e) => { setErreur(e.message); setCats({}); });
    obtenirOrganisation().then(setOrg).catch(() => {});
  }, [ouvert]);

  if (cats === null) return null;

  if (ouvert === "identite" || ouvert === "facturation") {
    return <Identite page={ouvert} retour={() => setOuvert(null)} />;
  }

  if (ouvert) {
    const liste = LISTES_CATALOGUE.find((l) => l.cle === ouvert);
    return (
      <EditeurListe liste={liste} cats={cats} onCats={setCats}
                    retour={() => setOuvert(null)} />
    );
  }

  const nbCouts = coutsMateriel(cats).length;
  const etatIdentite = identiteComplete(org);

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Compte</button>}
        <div style={S.titre}>Paramètres</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Réglages de l'entreprise. Ils s'appliquent à tous les dossiers.
        </div>
      </div>

      <div style={{ padding: "0 16px 8px" }}>
        <Rubrique>Entreprise</Rubrique>
        <Entree icone="🏢" titre="Identité de l'entreprise"
                resume="Nom, BCE, TVA, adresse, IBAN. Source de vérité de tous les documents."
                badge={etatIdentite.complete
                  ? "complète"
                  : etatIdentite.invalides.length
                    ? "champ invalide"
                    : `${etatIdentite.bloquants.length} champ${etatIdentite.bloquants.length > 1 ? "s" : ""} manquant${etatIdentite.bloquants.length > 1 ? "s" : ""}`}
                actif={!etatIdentite.complete}
                onClick={() => setOuvert("identite")} />
        <Entree icone="🧾" titre="Facturation"
                resume={`TVA ${tauxTva(org)} %, échéance, numérotation, mention légale.`}
                onClick={() => setOuvert("facturation")} />

        <Rubrique>Tarification</Rubrique>
        <Entree icone="🏷️" titre="Barème (prix client)"
                resume="Prix horaires par équipe, forfaits, options."
                onClick={versBareme} />
        <Entree icone="📉" titre="Coûts internes"
                resume={`Taux horaire, carburant${nbCouts ? ` · ${nbCouts} articles issus des catalogues` : ""}.`}
                onClick={versCout} />

        <Rubrique>Catalogues</Rubrique>
        {LISTES_CATALOGUE.map((l) => (
          <Entree key={l.cle} icone={l.icone} titre={l.titre} resume={l.resume}
                  badge={estPersonnalise(cats, l.cle)
                    ? `${catalogue(cats, l.cle).length} articles`
                    : "liste par défaut"}
                  actif={estPersonnalise(cats, l.cle)}
                  onClick={() => setOuvert(l.cle)} />
        ))}

        <Rubrique>Documents</Rubrique>
        <Entree icone="📝" titre="Textes des dossiers"
                resume="Email d'offre, PDF d'offre, conditions générales."
                onClick={versTextes} />

        <Rubrique>Données</Rubrique>
        <Entree icone="🗂️" titre="Archivage"
                resume="Dossiers, véhicules et membres archivés."
                onClick={versArchivage} />
      </div>

      {erreur && (
        <div style={{ margin: "0 16px 24px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>
      )}
      <div style={{ height: 40 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function EditeurListe({ liste, cats, onCats, retour }) {
  const simple = !!liste.texteSimple;
  const [items, setItems] = useState(() => [...catalogue(cats, liste.cle)]);
  const [nouveau, setNouveau] = useState(simple ? "" : { nom: "", unite: "pièce", cout: "" });
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(null);

  const total = useMemo(
    () => simple ? 0 : items.reduce((t, a) => t + Number(a?.cout_centimes || 0), 0),
    [items, simple]);

  function ajouter() {
    const article = simple
      ? normaliserArticle(nouveau, true)
      : normaliserArticle({
          nom: nouveau.nom, unite: nouveau.unite,
          cout_centimes: nouveau.cout === "" ? 0 : Math.round(Number(nouveau.cout) * 100),
        });
    if (!article) return;
    const doublon = simple
      ? items.some((x) => String(x).toLowerCase() === article.toLowerCase())
      : items.some((x) => x.cle === article.cle);
    if (doublon) { setErreur("Cet article existe déjà dans la liste."); return; }
    setErreur(null);
    setItems((v) => [...v, article]);
    setNouveau(simple ? "" : { nom: "", unite: "pièce", cout: "" });
    setSauve(false);
  }

  function retirer(i) {
    setItems((v) => v.filter((_, k) => k !== i));
    setSauve(false);
  }

  function monter(i) {
    if (i === 0) return;
    setItems((v) => { const c = [...v]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; });
    setSauve(false);
  }

  async function enregistrer() {
    setErreur(null);
    try {
      await sauverCatalogues({ ...cats, [liste.cle]: items });
      onCats({ ...cats, [liste.cle]: items });
      setSauve(true);
    } catch (e) { setErreur(e.message); }
  }

  async function reinitialiser() {
    setErreur(null);
    try {
      const suite = { ...cats };
      delete suite[liste.cle];
      await sauverCatalogues(suite);
      onCats(suite);
      setItems([...CATALOGUES_DEFAUT[liste.cle]]);
      setSauve(true);
    } catch (e) { setErreur(e.message); }
  }

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Paramètres</button>
        <div style={S.titre}>{liste.titre}</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>{liste.resume}</div>
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Ajouter un article</label>
        {simple ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...S.input, flex: 1 }} value={nouveau}
                   placeholder="Nom de la pièce"
                   onChange={(e) => setNouveau(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && ajouter()} />
            <button style={boutonAjout} onClick={ajouter}>Ajouter</button>
          </div>
        ) : (
          <>
            <input style={S.input} value={nouveau.nom} placeholder="Nom de l'article"
                   onChange={(e) => setNouveau((n) => ({ ...n, nom: e.target.value }))} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input style={{ ...S.input, flex: 1 }} value={nouveau.unite} placeholder="Unité"
                     onChange={(e) => setNouveau((n) => ({ ...n, unite: e.target.value }))} />
              <input style={{ ...S.input, flex: 1 }} type="number" step="0.01" min="0"
                     value={nouveau.cout} placeholder="Coût € HTVA"
                     onChange={(e) => setNouveau((n) => ({ ...n, cout: e.target.value }))} />
              <button style={boutonAjout} onClick={ajouter}>Ajouter</button>
            </div>
            <div style={{ fontSize: 11, color: C.fantome, marginTop: 6, lineHeight: 1.5 }}>
              Le coût est ce que l'article vous coûte, pas le prix client. Il
              alimente automatiquement les coûts internes.
            </div>
          </>
        )}
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>
          {items.length} article{items.length > 1 ? "s" : ""}
          {!simple && total > 0 && (
            <span style={{ fontWeight: 500, color: C.fantome, marginLeft: 6 }}>
              · {euros(total)} au total
            </span>
          )}
        </label>
        {items.length === 0 && (
          <div style={{ fontSize: 12.5, color: C.muet, padding: "8px 0" }}>
            Liste vide — le catalogue par défaut sera utilisé.
          </div>
        )}
        {items.map((a, i) => (
          <div key={simple ? `${a}-${i}` : a.cle || i} style={ligneArticle}>
            <button onClick={() => monter(i)} disabled={i === 0}
                    title="Monter"
                    style={{ ...boutonIcone, opacity: i === 0 ? .25 : 1 }}>↑</button>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 600,
                             color: C.encre }}>{simple ? a : a.nom}</span>
              {!simple && (
                <span style={{ display: "block", fontSize: 11, color: C.fantome, marginTop: 2 }}>
                  {euros(a.cout_centimes)} / {a.unite}
                  {a.consommable === false ? " · non consommable" : " · consommable"}
                </span>
              )}
            </span>
            <button onClick={() => retirer(i)} title="Retirer"
                    style={{ ...boutonIcone, color: C.rouge }}>✕</button>
          </div>
        ))}
      </div>

      {erreur && (
        <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>
      )}

      <div style={{ margin: "0 16px 24px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>
          {sauve ? "✓ Enregistré" : "Enregistrer la liste"}
        </button>
        {estPersonnalise(cats, liste.cle) && (
          <button onClick={reinitialiser}
                  style={{ ...S.boutonLien, display: "block", width: "100%",
                           marginTop: 10, fontWeight: 600 }}>
            Revenir à la liste par défaut
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Rubrique({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.muet, letterSpacing: ".05em",
                  textTransform: "uppercase", margin: "18px 2px 2px" }}>{children}</div>
  );
}

function Entree({ icone, titre, resume, badge, actif, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
      marginTop: 10, padding: 14, border: `1px solid ${C.bord}`, borderRadius: 14,
      background: C.blanc, boxShadow: "0 1px 3px rgba(15,23,42,.05)",
      cursor: "pointer", textAlign: "left" }}>
      <span style={{ fontSize: 19, lineHeight: 1 }}>{icone}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: C.encre }}>
          {titre}
        </span>
        <span style={{ display: "block", fontSize: 11.5, color: C.muet, marginTop: 2,
                       lineHeight: 1.4 }}>{resume}</span>
        {badge && (
          <span style={{ display: "inline-block", marginTop: 6, fontSize: 10.5,
                         fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                         background: actif ? C.bleuClair : C.doux,
                         color: actif ? C.bleu : C.fantome }}>{badge}</span>
        )}
      </span>
      <span style={{ color: C.fantome, fontSize: 18 }}>›</span>
    </button>
  );
}

const boutonAjout = {
  padding: "11px 14px", borderRadius: 10, border: "none",
  background: C.bleu, color: "#fff", fontSize: 13, fontWeight: 700,
  cursor: "pointer", whiteSpace: "nowrap",
};

const ligneArticle = {
  display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
  borderTop: `1px solid ${C.doux}`,
};

const boutonIcone = {
  border: "none", background: "none", cursor: "pointer",
  fontSize: 15, color: C.fantome, padding: "2px 6px", lineHeight: 1,
};
