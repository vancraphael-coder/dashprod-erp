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
import Fermetures from "./Fermetures.jsx";
import Confidentialite from "./Confidentialite.jsx";
import Comptabilite from "./Comptabilite.jsx";
import Journal from "./Journal.jsx";
import Abonnement from "./Abonnement.jsx";
import { identiteComplete, tauxTva } from "@domaine/organisation/identite.js";
import Identite from "./Identite.jsx";
import {
  LISTES_CATALOGUE, CATALOGUES_DEFAUT, catalogue, estPersonnalise,
  normaliserArticle, coutsMateriel,
} from "@domaine/stocks/catalogues.js";
import {
  meublesDePiece, ajouterMeuble, retirerMeuble, listePersonnalisee,
  reinitialiserMeubles,
} from "@domaine/stocks/meubles-piece.js";
import { C, S } from "../lib/theme.jsx";
import { Groupe, Entree } from "../composants/ListeReglages.jsx";
import { famillesReglages, filtrerReglages, compterReglages }
  from "@domaine/organisation/reglages.js";
import Apparence from "./Apparence.jsx";
import Stockage from "./Stockage.jsx";
import Services from "./Services.jsx";
import Contrats from "./Contrats.jsx";
import Centres from "./Centres.jsx";

const euros = (c) => (Number(c || 0) / 100).toFixed(2).replace(".", ",") + " €";

export default function Parametres({
  retour, versBareme, versCout, versTextes, versArchivage, modules = [],
  peutGererCentres = false, profil = null,
}) {
  // `modules` : les modules RÉELLEMENT souscrits. La règle « une porte que
  // l'abonnement n'ouvre pas ne s'affiche pas » était appliquée dans la barre
  // de navigation et dans le Compte, mais PAS ici : Centres logistiques,
  // Comptabilité, Journal et Stockage se voyaient en offre Basique, où la base
  // refuse l'accès. Une porte fermée qui se voit est une promesse qu'on ne
  // tient pas. Le filtrage se fait dans `famillesReglages`.
  const [cats, setCats] = useState(null);
  const [ouvert, setOuvert] = useState(null);
  const [org, setOrg] = useState({});
  const [erreur, setErreur] = useState(null);
  const [requete, setRequete] = useState("");

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
  if (ouvert === "contrats") {
    return <Contrats retour={() => setOuvert(null)} />;
  }
  if (ouvert === "services") {
    return <Services retour={() => setOuvert(null)} />;
  }
  if (ouvert === "stockage") {
    return <Stockage retour={() => setOuvert(null)} profil={profil} />;
  }
  if (ouvert === "depots") {
    return <Centres retour={() => setOuvert(null)} peutGererCentres={peutGererCentres} />;
  }
  if (ouvert === "apparence") {
    return <Apparence retour={() => setOuvert(null)} />;
  }
  if (ouvert === "fermetures") {
    return <Fermetures retour={() => setOuvert(null)} />;
  }
  if (ouvert === "confidentialite") {
    return <Confidentialite retour={() => setOuvert(null)} />;
  }
  if (ouvert === "comptabilite") {
    return <Comptabilite retour={() => setOuvert(null)} />;
  }
  if (ouvert === "journal") {
    return <Journal retour={() => setOuvert(null)} />;
  }
  if (ouvert === "abonnement") {
    return <Abonnement retour={() => setOuvert(null)} />;
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

  // LE RANGEMENT vient du domaine (`organisation/reglages.js`), pas d'ici.
  // Un écran ne se monte pas hors navigateur : tant que ces familles vivaient
  // dans le JSX, la seule façon de vérifier le rangement était de relire le
  // fichier source au caractère près. Déplacées dans une fonction pure, elles
  // s'éprouvent pour de vrai — y compris le cas qu'on ne voit jamais en
  // développant, parce qu'on développe toujours en offre Pro : celui d'une
  // famille dont TOUTES les portes sont fermées par l'abonnement.
  //
  // L'écran ne garde que ce qui lui appartient : associer une clé à une
  // navigation.
  const ACTIONS = {
    identite: () => setOuvert("identite"),
    depots: () => setOuvert("depots"),
    fermetures: () => setOuvert("fermetures"),
    bareme: versBareme,
    facturation: () => setOuvert("facturation"),
    textes: versTextes,
    cout: versCout,
    services: () => setOuvert("services"),
    stockage: () => setOuvert("stockage"),
    contrats: () => setOuvert("contrats"),
    comptabilite: () => setOuvert("comptabilite"),
    journal: () => setOuvert("journal"),
    archivage: versArchivage,
    abonnement: () => setOuvert("abonnement"),
    apparence: () => setOuvert("apparence"),
    confidentialite: () => setOuvert("confidentialite"),
    ...Object.fromEntries(LISTES_CATALOGUE.map((l) => [l.cle, () => setOuvert(l.cle)])),
  };

  const familles = famillesReglages({
    catalogues: cats, organisation: org, modules, nbCouts: coutsMateriel(cats).length,
    listesCatalogue: LISTES_CATALOGUE,
    badgeListe: (cle) => (estPersonnalise(cats, cle)
      ? { texte: `${catalogue(cats, cle).length} articles`, actif: true }
      : { texte: "liste par défaut", actif: false }),
  });
  const visibles = filtrerReglages(familles, requete);
  const nbVisibles = compterReglages(visibles);
  const q = requete.trim();

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {retour && <button style={S.boutonLien} onClick={retour}>← Compte</button>}
        <div style={S.titre}>Paramètres</div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 2 }}>
          Réglages de l'entreprise. Ils s'appliquent à tous les dossiers.
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* LA RECHERCHE. Une page de réglages honnête est longue : on ne peut
            pas retirer des réglages pour la raccourcir. Ce qu'on peut faire,
            c'est cesser d'obliger à la parcourir. Trois lettres suffisent à
            atteindre « TVA » ou « congé » sans savoir dans quelle famille
            quelqu'un les a rangés — c'est justement quand le rangement se
            discute que la recherche sauve. */}
        <input value={requete} onChange={(e) => setRequete(e.target.value)}
               placeholder="Chercher un réglage — TVA, congés, cartons…"
               aria-label="Chercher un réglage"
               style={{ ...S.input, marginTop: 4 }} />
        {q && (
          <div style={{ fontSize: 11.5, color: C.muet, marginTop: 6 }}>
            {nbVisibles === 0
              ? "Aucun réglage ne correspond."
              : `${nbVisibles} réglage${nbVisibles > 1 ? "s" : ""}.`}
            <button onClick={() => setRequete("")}
                    style={{ ...S.boutonLien, fontSize: 11.5, padding: "0 6px" }}>
              Tout afficher
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: "0 16px 8px" }}>
        {visibles.map((f) => (
          <Groupe key={f.cle} titre={f.titre} aide={q ? null : f.aide}>
            {f.entrees.map((e, i) => (
              <Entree key={e.cle} premier={i === 0} icone={e.icone} titre={e.titre}
                      resume={e.resume} badge={e.badge} actif={e.actif}
                      onClick={ACTIONS[e.cle]} />
            ))}
          </Groupe>
        ))}
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
  const [pieceOuverte, setPieceOuverte] = useState(null);

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
            {/* Pour les PIÈCES : accès aux meubles pré-remplis. C'est ce qui
                rend la visite chez le client fluide — on coche au lieu de
                taper. */}
            {liste.cle === "pieces" && (
              <button onClick={() => setPieceOuverte(pieceOuverte === a ? null : a)}
                      title="Meubles de cette pièce"
                      style={{ ...boutonIcone,
                               color: pieceOuverte === a ? C.bleu : C.muet }}>
                {pieceOuverte === a ? "▾" : "🛋"}
              </button>
            )}
            <button onClick={() => retirer(i)} title="Retirer"
                    style={{ ...boutonIcone, color: C.rouge }}>✕</button>
          </div>
        ))}
      </div>

      {/* Meubles de la pièce sélectionnée */}
      {liste.cle === "pieces" && pieceOuverte && (
        <MeublesDePiece piece={pieceOuverte} cats={cats} onCats={onCats}
                        onFerme={() => setPieceOuverte(null)} />
      )}

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

/**
 * Meubles pré-remplis d'une pièce.
 *
 * Ce que le déménageur règle ici se retrouve, sans ressaisie, sous forme de
 * boutons pendant le relevé chez le client. C'est le dernier maillon entre le
 * paramétrage et le terrain.
 *
 * La liste de l'entreprise REMPLACE le socle livré avec le produit : si un
 * meuble est retiré, il ne revient pas au chargement suivant.
 */
function MeublesDePiece({ piece, cats, onCats, onFerme }) {
  const [nouveau, setNouveau] = useState("");
  const [erreur, setErreur] = useState(null);
  const [sauve, setSauve] = useState(false);

  const meubles = meublesDePiece(cats, piece);
  const perso = listePersonnalisee(cats, piece);

  async function appliquer(suite) {
    setErreur(null); setSauve(false);
    try {
      await sauverCatalogues(suite);
      onCats(suite);
      setSauve(true);
    } catch (e) { setErreur(e.message); }
  }

  function ajouter() {
    const nom = nouveau.trim();
    if (!nom) return;
    setNouveau("");
    appliquer(ajouterMeuble(cats, piece, nom));
  }

  return (
    <div style={{ ...S.carte, borderColor: C.bleu, borderWidth: 1.5 }}>
      <div style={{ display: "flex", alignItems: "baseline",
                    justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{ ...S.label, marginTop: 0 }}>
          Meubles de « {piece} »
        </label>
        <button onClick={onFerme} style={{ background: "none", border: "none",
          color: C.muet, fontSize: 12, cursor: "pointer" }}>Fermer</button>
      </div>

      <div style={{ fontSize: 11.5, color: C.fantome, marginBottom: 10,
                    lineHeight: 1.5 }}>
        Ces meubles s'affichent en boutons pendant le relevé : un geste au lieu
        d'une saisie. {perso ? "Liste personnalisée." : "Liste par défaut."}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...S.input, flex: 1, margin: 0 }} value={nouveau}
               placeholder="Nom du meuble" onChange={(e) => setNouveau(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && ajouter()} />
        <button style={boutonAjout} onClick={ajouter}>Ajouter</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
        {meubles.length === 0 && (
          <span style={{ fontSize: 12.5, color: C.muet }}>
            Aucun meuble : le relevé de cette pièce se fera à la main.
          </span>
        )}
        {meubles.map((m) => (
          <span key={m} style={{ display: "inline-flex", alignItems: "center",
            gap: 6, border: `1px solid ${C.bord}`, borderRadius: 999,
            padding: "5px 6px 5px 11px", fontSize: 12.5, background: C.blanc }}>
            {m}
            <button onClick={() => appliquer(retirerMeuble(cats, piece, m))}
                    title={`Retirer ${m}`}
                    style={{ border: "none", background: "none", cursor: "pointer",
                             color: C.rouge, fontSize: 13, padding: "0 2px" }}>✕</button>
          </span>
        ))}
      </div>

      {perso && (
        <button onClick={() => appliquer(reinitialiserMeubles(cats, piece))}
                style={{ ...S.boutonLien, paddingLeft: 0, marginTop: 10 }}>
          Revenir à la liste par défaut
        </button>
      )}
      {erreur && (
        <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>
      )}
      {sauve && !erreur && (
        <div style={{ fontSize: 12, color: C.vert, marginTop: 8 }}>Enregistré.</div>
      )}
    </div>
  );
}
