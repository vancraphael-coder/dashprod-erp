// =============================================================================
// Écran — Compte (personnel).
//
// Le Compte est PERSONNEL, y compris pour un administrateur : son inventaire,
// ses vêtements, ses congés. Les réglages de l'entreprise ont quitté cet écran
// et vivent désormais dans Paramètres, accessible d'ici pour qui en a le droit.
//
// L'inventaire s'appuie sur les mêmes fonctions que le profil Terrain :
// une seule table equipements_rh, deux portes d'entrée.
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  listerEquipement, ajouterEquipement, changerEtatEquipement,
  supprimerEquipement, modeDonnees,
} from "../lib/adaptateur.js";
import { deconnecter } from "../lib/supabase.js";
import { avisProduitMien, definirAvisProduit } from "../lib/adaptateur.js";
import { DemanderConge, MesConges } from "../composants/Conges.jsx";
import { C, S } from "../lib/theme.jsx";
import { Groupe, Entree, OngletsSegmentes } from "../composants/ListeReglages.jsx";
import { libelleCapacite } from "@domaine/noyau/permissions.js";

const ETATS = { neuf: "Neuf", bon: "Bon", use: "Usé", a_remplacer: "À remplacer" };
const COULEUR = { neuf: C.bleu, bon: C.vert, use: C.ambre, a_remplacer: C.rouge };
const SUITE = { bon: "use", use: "a_remplacer", a_remplacer: "neuf", neuf: "bon" };

const INVENTAIRE_STANDARD = [
  { categorie: "vetement", article: "Veste de travail" },
  { categorie: "vetement", article: "Pantalon de travail" },
  { categorie: "vetement", article: "T-shirts (x3)" },
  { categorie: "vetement", article: "Chaussures de sécurité" },
  { categorie: "vetement", article: "Gants" },
  { categorie: "outil", article: "Diable" },
  { categorie: "outil", article: "Sangles (x4)" },
  { categorie: "outil", article: "Couvertures (x10)" },
  { categorie: "outil", article: "Boîte à outils" },
  { categorie: "outil", article: "Cutter" },
];

const jour = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-BE",
      { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
};

export default function Profil({ profil, versParametres, versDiagnostic, versDemandes,
                                 versCentres, versRapport, peutConfigurer }) {
  const [onglet, setOnglet] = useState("inventaire");
  const [avisOuvert, setAvisOuvert] = useState(false);
  const [note, setNote] = useState(0);

  // Les portes déclarées plutôt que dessinées : on peut alors les compter, et
  // ne pas afficher un titre de famille au-dessus du vide. Un membre sans
  // droit de configuration ni accès réseau n'a aucune porte — la famille
  // entière disparaît au lieu de laisser un cadre creux.
  const portesPilotage = [
    peutConfigurer && versParametres && { cle: "parametres", icone: "⚙️",
      titre: "Paramètres",
      resume: "Identité, barème, catalogues, textes, abonnement.",
      onClick: versParametres },
    versCentres && { cle: "centres", icone: "🏭", titre: "Centres logistiques",
      resume: "Vos centres, et qui y travaille.", onClick: versCentres },
    versRapport && { cle: "rapport", icone: "📊",
      titre: "Compte rendu hebdomadaire",
      resume: "Où en est chaque centre, en un clic.", onClick: versRapport },
    versDemandes && { cle: "demandes", icone: "📦",
      titre: "Demandes du réseau",
      resume: "Les particuliers qui cherchent un déménageur.",
      onClick: versDemandes },
  ].filter(Boolean);

  return (
    <div style={{ ...S.page, paddingBottom: 90 }}>
      <div style={S.entete}>
        <div style={S.titre}>Compte</div>
      </div>

      <div style={S.carte}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.encre }}>
          {profil?.nom || "—"}
        </div>
        <div style={{ fontSize: 13, color: C.muet }}>{profil?.email || ""}</div>
        {profil?.capacites && profil.capacites.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {/* Ce que la personne peut faire, NOMMÉ. Un compteur « 4 capacités
                actives » n'apprenait rien ; les citer, si. Une capacité sans
                libellé retomberait sur sa clé — on n'en affiche donc que celles
                qui savent se dire. */}
            {profil.capacites
              .filter((c) => libelleCapacite(c) !== c)
              .map((c) => (
                <span key={c} style={{ fontSize: 11, fontWeight: 600,
                  color: C.bleu, background: C.bleuClair, borderRadius: 999,
                  padding: "3px 9px" }}>
                  {libelleCapacite(c)}
                </span>
              ))}
          </div>
        )}
      </div>

      <OngletsSegmentes actif={onglet} choisir={setOnglet}
        onglets={[["inventaire", "Outils & vêtements"], ["conges", "Mes congés"]]} />

      {onglet === "inventaire" ? <Inventaire profil={profil} /> : <Conges />}

      {/* CE QUI SORT DU COMPTE PERSONNEL.
          Avant : quatre formes pour une seule idée — « une ligne qui ouvre un
          écran ». Un bloc cousu pour Paramètres et les demandes, deux cartes
          isolées copiées caractère pour caractère pour les centres et le
          compte rendu, et une quatrième variante pour l'avis. Le même écran
          affichait donc deux styles de ligne selon l'endroit où l'œil tombait,
          alors qu'un commentaire du fichier avertissait déjà qu'« une copie
          finit toujours par diverger ». Elle avait déjà divergé.

          Une seule forme désormais, celle de Paramètres, et deux familles :
          ce qui PILOTE l'entreprise, ce qui touche à DASHPROD. */}
      {portesPilotage.length > 0 && (
        <Groupe titre="Piloter l'entreprise"
                aide="Les réglages et les vues qui dépassent votre poste.">
          {portesPilotage.map((p, i) => (
            <Entree key={p.cle} premier={i === 0} icone={p.icone} titre={p.titre}
                    resume={p.resume} onClick={p.onClick} />
          ))}
        </Groupe>
      )}

      <Groupe titre="Aide et retours"
              aide="Vérifier que tout est branché, et nous dire ce qui manque.">
        {peutConfigurer && modeDonnees() === "reel" && (
          <Entree premier icone="⭐" titre="Votre avis sur Dashprod"
                  resume={note ? `Vous avez mis ${note}/5.`
                               : "Aidez d'autres déménageurs à se décider."}
                  onClick={() => setAvisOuvert(true)} />
        )}
        <Entree premier={!(peutConfigurer && modeDonnees() === "reel")}
                icone="🩺" titre="Diagnostic de branchement"
                resume="Base de données, session, modules ouverts."
                onClick={versDiagnostic} />
      </Groupe>

      {avisOuvert && <AvisSurDashprod onNote={setNote} onFerme={() => setAvisOuvert(false)} />}

      {modeDonnees() === "reel" && (
        <div style={{ margin: "18px 16px 0" }}>
          {/* `data-bouton="danger"` n'est pas décoratif : la feuille de style
              remplit le bouton en rouge au survol. Contour au repos (il
              prévient), aplat quand on s'apprête à cliquer (il confirme). */}
          <button data-bouton="danger"
            onClick={async () => { await deconnecter(); window.location.reload(); }}
            style={{ display: "block", width: "100%", padding: 13,
              border: `1.5px solid ${C.filetRouge}`, borderRadius: 11,
              background: C.teinteRouge, color: C.encreRouge,
              fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Se déconnecter
          </button>
        </div>
      )}

      <div style={{ height: 30 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Inventaire({ profil }) {
  const [liste, setListe] = useState([]);
  const [creation, setCreation] = useState(false);
  const [ajout, setAjout] = useState({ categorie: "outil", article: "" });
  const monId = profil?.utilisateur_id;

  function recharger() {
    if (monId) listerEquipement(monId).then(setListe).catch(() => {});
  }
  useEffect(recharger, [monId]);

  async function creerStandard() {
    setCreation(true);
    for (const art of INVENTAIRE_STANDARD) await ajouterEquipement(monId, art).catch(() => {});
    setCreation(false);
    recharger();
  }
  async function ajouterArticle() {
    const nom = ajout.article.trim();
    if (!nom || !monId) return;
    await ajouterEquipement(monId, { categorie: ajout.categorie, article: nom }).catch(() => {});
    setAjout((a) => ({ ...a, article: "" }));
    recharger();
  }
  async function cycler(art) {
    await changerEtatEquipement(art.id, SUITE[art.etat] || "bon", monId);
    recharger();
  }

  async function retirer(art) {
    await supprimerEquipement(art.id).catch(() => {});
    recharger();
  }

  const rendre = (arr) => arr.map((art) => (
    <div key={art.id} style={{
      display: "flex", width: "100%", alignItems: "center", gap: 8,
      padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: C.blanc,
      border: `1.5px solid ${art.etat === "a_remplacer" ? C.filetRouge : C.bord}` }}>
      <span onClick={() => cycler(art)}
            style={{ flex: 1, fontSize: 13.5, color: C.encre, fontWeight: 600,
                     cursor: "pointer" }}>{art.article}</span>
      <span onClick={() => cycler(art)}
            style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                     color: "#fff", cursor: "pointer",
                     background: COULEUR[art.etat] || C.muet }}>
        {ETATS[art.etat] || art.etat}
      </span>
      <button onClick={() => retirer(art)} title="Retirer cet article"
              style={{ border: "none", background: "none", cursor: "pointer",
                       fontSize: 15, color: C.rouge, padding: "2px 4px",
                       lineHeight: 1 }}>✕</button>
    </div>
  ));

  if (liste.length === 0) {
    return (
      <div style={{ ...S.carte, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.muet, marginBottom: 12 }}>
          Aucun inventaire pour le moment.
        </div>
        <button style={S.boutonPlein} onClick={creerStandard} disabled={creation}>
          {creation ? "Création…" : "Créer mon inventaire standard"}
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Vêtements</label>
        {rendre(liste.filter((x) => x.categorie === "vetement"))}
        <label style={S.label}>Outils</label>
        {rendre(liste.filter((x) => x.categorie === "outil"))}
      </div>

      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Ajouter un article</label>
        <div style={{ display: "flex", gap: 8 }}>
          <select style={{ ...S.input, width: 118 }} value={ajout.categorie}
                  onChange={(e) => setAjout((a) => ({ ...a, categorie: e.target.value }))}>
            <option value="outil">Outil</option>
            <option value="vetement">Vêtement</option>
          </select>
          <input style={{ ...S.input, flex: 1 }} value={ajout.article} placeholder="Nom"
                 onChange={(e) => setAjout((a) => ({ ...a, article: e.target.value }))}
                 onKeyDown={(e) => e.key === "Enter" && ajouterArticle()} />
          <button onClick={ajouterArticle} style={{
            padding: "11px 14px", borderRadius: 10, border: "none", background: C.bleu,
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+</button>
        </div>
        <div style={{ fontSize: 11.5, color: C.fantome, marginTop: 8, lineHeight: 1.5 }}>
          Touchez un article pour changer son état (Bon → Usé → À remplacer →
          Neuf). Le bureau voit l'état en direct dans Ressources.
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mes congés — demande et suivi.
 *
 * Le circuit a changé (migration 0120) : un membre DEMANDE, le bureau
 * confirme. L'ancien écran enregistrait un congé directement approuvé et ne
 * listait que les approuvés — une demande en attente y était donc invisible,
 * ce qui laissait croire qu'elle s'était perdue.
 */
function Conges() {
  const [maj, setMaj] = useState(0);
  return (
    <>
      <DemanderConge onFait={() => setMaj((n) => n + 1)} />
      <MesConges rafraichir={maj} />
    </>
  );
}

/**
 * L'avis de l'entreprise SUR Dashprod. Note + un mot, et le choix de le rendre
 * public sur la vitrine. Rien n'est publié sans cette case cochée.
 */
function AvisSurDashprod({ onNote, onFerme }) {
  const [note, setNote] = useState(0);
  const [mot, setMot] = useState("");
  const [auteur, setAuteur] = useState("");
  const [publiable, setPubliable] = useState(true);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    avisProduitMien().then((a) => {
      if (!a?.existe) return;
      setNote(a.note || 0); setMot(a.commentaire || "");
      setAuteur(a.auteur || ""); setPubliable(a.publiable !== false);
      onNote?.(a.note || 0);
    }).catch(() => {});
  }, []);

  async function envoyer() {
    setErr(null); setMsg(null);
    if (!note) { setErr("Choisissez une note."); return; }
    try {
      await definirAvisProduit({ note, commentaire: mot, auteur, publiable });
      onNote?.(note);
      setMsg("Merci — votre avis est enregistré.");
    } catch (e) { setErr(e.message); }
  }

  return (
    <div style={{ ...S.carte, margin: "12px 16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
          Votre avis sur Dashprod
        </div>
        <button style={S.boutonLien} onClick={onFerme}>Fermer</button>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setNote(n)}
            aria-label={`${n} sur 5`}
            style={{ border: "none", background: "none", cursor: "pointer",
                     fontSize: 26, lineHeight: 1, padding: 0,
                     color: n <= note ? C.ambre : C.fantome }}>★</button>
        ))}
      </div>
      <textarea value={mot} onChange={(e) => setMot(e.target.value)} rows={3}
        placeholder="Ce que Dashprod change dans votre quotidien…"
        style={{ ...S.input, width: "100%", boxSizing: "border-box",
                 resize: "vertical", minHeight: 60 }} />
      <label style={S.label}>Signature affichée (facultatif)</label>
      <input style={S.input} value={auteur} onChange={(e) => setAuteur(e.target.value)}
             placeholder="Prénom, fonction" />
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12,
                      fontSize: 13, color: C.encre, cursor: "pointer" }}>
        <input type="checkbox" checked={publiable}
               onChange={(e) => setPubliable(e.target.checked)} />
        Autoriser l'affichage sur le site public
      </label>
      {err && <div style={{ fontSize: 12.5, color: C.rouge, marginTop: 8 }}>{err}</div>}
      {msg && <div style={{ fontSize: 12.5, color: C.vert, marginTop: 8 }}>{msg}</div>}
      <div style={{ marginTop: 12 }}>
        <button style={S.boutonPlein} onClick={envoyer}>Enregistrer</button>
      </div>
    </div>
  );
}
