// =============================================================================
// Écran — Équipe (invitations).
// Réservé à qui détient gerer_referentiels (S3) : le master invite un email et
// choisit son secteur — un rôle de la matrice S3, une seule vérité (ROLES,
// noyau/permissions.js). Résout la demande : « c'est lui qui décide qui est
// dans quel secteur de son entreprise ».
// =============================================================================

import React, { useEffect, useState } from "react";
import {
  listerMembres, inviterMembre, listerConges, ajouterConge, supprimerConge,
  definirMetier, listerMembresSimples,
  listerEquipement, ajouterEquipement, changerEtatEquipement, archiverMembre,
  listerCapacitesMembre, definirCreationComplete, CAPACITES_DEVIS_COMPLET,
  capacitesMembre, definirCapacite, definirPermis,
} from "../lib/adaptateur.js";
import { ROLES } from "@domaine/noyau/permissions.js";
import { PERMIS } from "@domaine/flotte/vehicules.js";
import {
  capacitesTerrain, capacitesBureau, capacitesEffectives, origineCapacite,
  resumeAcces,
} from "@domaine/rh/capacites.js";
import { DemandesConges } from "../composants/Conges.jsx";
import { C, S, Confirmation } from "../lib/theme.jsx";

/**
 * Les permis d'un membre : cases à cocher + échéance code 95. On enregistre à
 * la volée (comme le métier) — pas de bouton « sauver » à oublier.
 */
function PermisMembre({ membre, onRecharger }) {
  const [permis, setPermis] = React.useState(membre.permis_detenus || []);
  const [code95, setCode95] = React.useState(membre.code95_echeance || "");
  const [etat, setEtat] = React.useState(null); // "envoi" | "ok" | message d'erreur

  async function enregistrer(nextPermis, nextCode95) {
    setEtat("envoi");
    try {
      await definirPermis(membre.id, nextPermis, nextCode95 || null);
      setEtat("ok");
      onRecharger && onRecharger();
      setTimeout(() => setEtat(null), 1500);
    } catch (e) { setEtat(e.message || "Échec"); }
  }

  function basculer(cle) {
    const suite = permis.includes(cle)
      ? permis.filter((x) => x !== cle) : [...permis, cle];
    setPermis(suite);
    enregistrer(suite, code95);
  }

  // Le code 95 bientôt échu se signale ici même — inutile d'attendre une
  // affectation pour découvrir qu'une formation est à refaire.
  const bientot = code95 && (() => {
    const j = Math.round((new Date(code95) - new Date()) / 86400000);
    return j < 0 ? "expiré" : j < 90 ? `expire dans ${j} j` : null;
  })();

  return (
    <>
      <label style={S.label}>Permis détenus</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PERMIS.map((p) => {
          const a = permis.includes(p.cle);
          return (
            <button key={p.cle} onClick={() => basculer(p.cle)} title={p.resume}
              style={{ padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                fontSize: 12.5, fontWeight: 700,
                border: `1.5px solid ${a ? C.bleu : C.bord}`,
                background: a ? C.bleuClair : C.blanc,
                color: a ? C.bleu : C.muet }}>
              {p.nom}
            </button>
          );
        })}
      </div>

      <label style={S.label}>Échéance du code 95</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="date" value={code95} style={{ ...S.input, flex: 1 }}
          onChange={(e) => { setCode95(e.target.value); enregistrer(permis, e.target.value); }} />
        {bientot && (
          <span style={{ fontSize: 11.5, fontWeight: 700,
            color: bientot === "expiré" ? C.rouge : C.ambre, whiteSpace: "nowrap" }}>
            {bientot}
          </span>
        )}
      </div>
      {etat && etat !== "envoi" && etat !== "ok" && (
        <div style={{ fontSize: 11.5, color: C.rouge, marginTop: 4 }}>{etat}</div>
      )}
    </>
  );
}

function DroitDevisComplet({ membreId }) {
  const [actif, setActif] = React.useState(null); // null = chargement
  const [enCours, setEnCours] = React.useState(false);

  React.useEffect(() => {
    listerCapacitesMembre(membreId)
      .then((caps) => setActif(CAPACITES_DEVIS_COMPLET.every((c) => caps.includes(c))))
      .catch(() => setActif(false));
  }, [membreId]);

  async function basculer() {
    if (actif === null || enCours) return;
    setEnCours(true);
    try { await definirCreationComplete(membreId, !actif); setActif(!actif); }
    catch { /* silencieux : l'état visuel ne bouge pas */ }
    setEnCours(false);
  }

  return (
    <div style={{ marginTop: 12 }}>
      <label style={S.label}>Droits</label>
      <button onClick={basculer} disabled={actif === null} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "11px 13px", borderRadius: 11, cursor: "pointer",
        border: `1.5px solid ${actif ? C.vert : C.bord}`,
        background: actif ? "#ECFDF5" : "#fff",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700,
                       color: actif ? "#065F46" : C.encre, textAlign: "left" }}>
          Création de devis complet
          <span style={{ display: "block", fontSize: 11, fontWeight: 500,
                         color: actif ? "#047857" : C.fantome }}>
            Onglet « Nouveau » au terrain : dossier → devis → offre → mail, prix visibles
          </span>
        </span>
        <span style={{ fontSize: 12, fontWeight: 800,
                       color: actif ? C.vert : C.fantome }}>
          {actif === null ? "…" : actif ? "ACCORDÉ" : "OFF"}
        </span>
      </button>
    </div>
  );
}

const ETATS_EQUIP = { neuf: "Neuf", bon: "Bon", use: "Usé", a_remplacer: "À remplacer" };
const COULEUR_EQUIP = { neuf: "#059669", bon: "#2563EB", use: "#D97706", a_remplacer: "#DC2626" };

function EquipementMembre({ membreId }) {
  const [liste, setListe] = React.useState([]);
  const [categorie, setCategorie] = React.useState("vetement");
  const [article, setArticle] = React.useState("");

  function recharger() { listerEquipement(membreId).then(setListe).catch(() => {}); }
  React.useEffect(recharger, [membreId]);

  async function ajouter() {
    if (!article.trim()) return;
    await ajouterEquipement(membreId, { categorie, article: article.trim() });
    setArticle(""); recharger();
  }
  async function cycler(art) {
    // Cycle l'état : bon → usé → à remplacer → neuf → bon.
    const suite = { bon: "use", use: "a_remplacer", a_remplacer: "neuf", neuf: "bon" };
    await changerEtatEquipement(art.id, suite[art.etat] || "bon", membreId);
    recharger();
  }

  const vetements = liste.filter((x) => x.categorie === "vetement");
  const outils = liste.filter((x) => x.categorie === "outil");

  const rendre = (arr) => arr.map((art) => (
    <button key={art.id} onClick={() => cycler(art)} title="Toucher pour changer l'état" style={{
      display: "inline-flex", alignItems: "center", gap: 6, margin: "0 6px 6px 0",
      padding: "5px 10px", borderRadius: 999, cursor: "pointer", fontSize: 12,
      border: `1.5px solid ${COULEUR_EQUIP[art.etat]}`,
      background: art.etat === "a_remplacer" ? "#FEF2F2" : "#fff",
      color: COULEUR_EQUIP[art.etat], fontWeight: 600,
    }}>
      {art.article}
      <span style={{ fontSize: 10, opacity: 0.85 }}>· {ETATS_EQUIP[art.etat]}</span>
    </button>
  ));

  return (
    <div style={{ marginTop: 12 }}>
      <label style={S.label}>Équipement</label>
      {vetements.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 10.5, color: C.fantome, marginBottom: 3 }}>Vêtements</div>
          {rendre(vetements)}
        </div>
      )}
      {outils.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 10.5, color: C.fantome, marginBottom: 3 }}>Outils</div>
          {rendre(outils)}
        </div>
      )}
      {liste.length === 0 && (
        <div style={{ fontSize: 11.5, color: C.fantome, marginBottom: 6 }}>Aucun équipement.</div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <select style={{ ...S.input, width: 110 }} value={categorie}
                onChange={(e) => setCategorie(e.target.value)}>
          <option value="vetement">Vêtement</option>
          <option value="outil">Outil</option>
        </select>
        <input style={{ ...S.input, flex: 1 }} value={article}
               onChange={(e) => setArticle(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && ajouter()}
               placeholder="Article" />
        <button style={{ ...S.boutonPlein, width: "auto", padding: "0 14px", marginTop: 0 }}
                onClick={ajouter}>+</button>
      </div>
    </div>
  );
}

const LIBELLES_ROLE = {
  direction: "Direction", coordination: "Coordination", commercial: "Commercial",
  chef_equipe: "Chef d'équipe", demenageur: "Déménageur",
};
const METIERS = { chef_equipe: "Chef d'équipe", chauffeur: "Chauffeur", demenageur: "Déménageur" };
const COULEUR_METIER = { chef_equipe: "#6366F1", chauffeur: "#2563EB", demenageur: "#64748B" };

export default function Equipe({ retour, integre }) {
  const [membres, setMembres] = useState([]);
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [role, setRole] = useState("demenageur");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);
  const [metiers, setMetiers] = useState({});   // id → metier (fusion des sources)
  const [conges, setConges] = useState([]);
  const [ouvert, setOuvert] = useState(null);   // fiche membre dépliée
  const [nouveauConge, setNouveauConge] = useState({ debut: "", fin: "" });
  // Incrémenté après chaque décision : force la corbeille à se recharger.
  const [majConges, setMajConges] = useState(0);
  const [archivage, setArchivage] = useState(null); // id du membre à archiver

  function recharger() {
    listerMembres().then(setMembres).catch(() => {});
    listerMembresSimples().then((l) =>
      setMetiers(Object.fromEntries(l.map((m) => [m.id, m.metier])))).catch(() => {});
    listerConges().then(setConges).catch(() => {});
  }
  useEffect(recharger, []);

  async function changerMetier(id, metier) {
    setErreur(null);
    try { await definirMetier(id, metier); recharger(); }
    catch (e) { setErreur(e.message); }
  }
  async function poserConge(membreId) {
    if (!nouveauConge.debut || !nouveauConge.fin) return;
    setErreur(null);
    try {
      await ajouterConge({ utilisateurId: membreId, ...nouveauConge });
      setNouveauConge({ debut: "", fin: "" });
      setMajConges((n) => n + 1);
      recharger();
    } catch (e) { setErreur(e.message); }
  }

  async function inviter() {
    setErreur(null); setSucces(null); setEnCours(true);
    try {
      const res = await inviterMembre({ email, nom, roleCle: role });
      if (res.envoye) {
        setSucces(`${email} invité·e — email envoyé.`);
      } else {
        setSucces(`${email} invité·e — email non envoyé automatiquement. Transmettez ce lien : ${res.lien}`);
      }
      setEmail(""); setNom("");
      recharger();
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnCours(false);
    }
  }

  const contenu = (
    <>
      {/* La corbeille du bureau : ce qui attend une décision passe AVANT le
          reste, sinon une demande dort jusqu'à ce que le membre relance. */}
      <DemandesConges rafraichir={majConges} />

      <div style={S.carte}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 4 }}>
          Inviter un membre
        </div>
        <div style={{ fontSize: 12, color: C.muet }}>
          Vous décidez du secteur : l'accès et les écrans s'adaptent automatiquement.
        </div>

        <label style={S.label}>Nom</label>
        <input style={S.input} value={nom} onChange={(e) => setNom(e.target.value)}
               placeholder="Jean Dupont" />
        <label style={S.label}>Email Google</label>
        <input style={S.input} type="email" value={email}
               onChange={(e) => setEmail(e.target.value)} placeholder="jean@gmail.com" />
        <label style={S.label}>Secteur</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.keys(ROLES).map((cle) => (
            <button key={cle} onClick={() => setRole(cle)} style={{
              padding: "7px 12px", borderRadius: 999, cursor: "pointer",
              border: `1.5px solid ${role === cle ? C.bleu : C.bord}`,
              background: role === cle ? "#E7EFFC" : C.blanc,
              color: role === cle ? C.bleu : C.muet, fontSize: 12, fontWeight: 600,
            }}>{LIBELLES_ROLE[cle] || cle}</button>
          ))}
        </div>

        {erreur && (
          <div style={{ marginTop: 12, padding: "9px 12px", background: "#FEF2F2",
                        border: "1px solid #FECACA", borderRadius: 9, color: "#991B1B",
                        fontSize: 12.5 }}>{erreur}</div>
        )}
        {succes && (
          <div style={{ marginTop: 12, padding: "9px 12px", background: "#ECFDF5",
                        border: "1px solid #A7F3D0", borderRadius: 9, color: "#065F46",
                        fontSize: 12.5 }}>{succes}</div>
        )}

        <button style={{ ...S.boutonPlein, marginTop: 14 }} disabled={!email || enCours}
                onClick={inviter}>
          {enCours ? "Invitation…" : "Inviter"}
        </button>
      </div>

      <div style={{ padding: "0 16px 8px", fontSize: 12, fontWeight: 700, color: C.muet }}>
        MEMBRES ({membres.length})
      </div>
      {membres.map((m) => {
        const ouvertIci = ouvert === m.id;
        const metier = metiers[m.id] || "demenageur";
        const sesConges = conges.filter((c) => c.utilisateur_id === m.id);
        return (
          <div key={m.id} style={{ ...S.carte, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", cursor: "pointer" }}
                 onClick={() => setOuvert(ouvertIci ? null : m.id)}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.encre }}>
                  {m.nom || m.email}
                </div>
                <div style={{ fontSize: 12, color: C.muet }}>{m.email}</div>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff",
                  background: COULEUR_METIER[metier], borderRadius: 999, padding: "3px 8px" }}>
                  {METIERS[metier]}
                </span>
                {sesConges.length > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#92400E",
                    background: "#FFFBEB", borderRadius: 999, padding: "3px 8px" }}>
                    {sesConges.length} congé{sesConges.length > 1 ? "s" : ""}
                  </span>
                )}
                {m.roles.length === 0 && (
                  <span style={{ fontSize: 11, color: C.rouge }}>en attente</span>
                )}
              </div>
            </div>

            {ouvertIci && (
              <div style={{ marginTop: 10, borderTop: `1px solid ${C.bord}`, paddingTop: 8 }}>
                {/* Autorisations : ce que le logiciel permet à ce membre.
                    Distinct du métier terrain, qui décrit ce qu'il FAIT. */}
                <Autorisations membre={m} />

                {/* Métier TERRAIN — distinct des permissions (synthèse §4) */}
                <label style={S.label}>Métier terrain</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {Object.entries(METIERS).map(([cle, lib]) => (
                    <button key={cle} onClick={() => changerMetier(m.id, cle)} style={{
                      flex: 1, padding: "8px", borderRadius: 10, cursor: "pointer",
                      fontSize: 12, fontWeight: 700,
                      border: `1.5px solid ${metier === cle ? COULEUR_METIER[cle] : C.bord}`,
                      background: metier === cle ? COULEUR_METIER[cle] : C.blanc,
                      color: metier === cle ? "#fff" : C.muet,
                    }}>{lib}</button>
                  ))}
                </div>

                {/* Permis détenus — SIGNALE une affectation risquée, ne la bloque
                    jamais. Le code 95 se périme : son échéance est un vrai signal
                    (renouvellement de formation). L'aptitude médicale groupe 2,
                    donnée de santé, n'est pas ici : elle mérite sa décision RGPD. */}
                <PermisMembre membre={m} onRecharger={recharger} />


                {/* Congés : saisie directe direction (créés approuvés) */}
                <label style={S.label}>Congés</label>
                {sesConges.map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between",
                                            alignItems: "center", padding: "4px 0" }}>
                    <span style={{ fontSize: 12.5, color: C.encre }}>
                      {c.debut} → {c.fin}{c.motif ? ` · ${c.motif}` : ""}
                    </span>
                    <button onClick={async () => { await supprimerConge(c.id); recharger(); }}
                            style={{ ...S.boutonLien, color: C.rouge, padding: "2px 6px" }}>
                      ×
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input style={{ ...S.input, flex: 1 }} type="date" value={nouveauConge.debut}
                         onChange={(e) => setNouveauConge({ ...nouveauConge, debut: e.target.value })} />
                  <input style={{ ...S.input, flex: 1 }} type="date" value={nouveauConge.fin}
                         onChange={(e) => setNouveauConge({ ...nouveauConge, fin: e.target.value })} />
                  <button style={{ ...S.boutonPlein, width: "auto", padding: "0 14px", marginTop: 0,
                                    opacity: nouveauConge.debut && nouveauConge.fin ? 1 : 0.5 }}
                          disabled={!nouveauConge.debut || !nouveauConge.fin}
                          onClick={() => poserConge(m.id)}>+</button>
                </div>

                {/* Droit individuel : création de devis complet. Accordé à UN
                    membre en plus de son rôle — il obtient l'onglet « Nouveau »
                    de l'app terrain (dossier → relevé → matériel → devis →
                    offre → mail), prix visibles. */}
                <DroitDevisComplet membreId={m.id} />

                {/* Équipement : vêtements & outils. Le bureau voit l'état ;
                    le membre le modifie lui-même (RLS 0030). */}
                <EquipementMembre membreId={m.id} />

                <button onClick={() => setArchivage(m.id)}
                        style={{ ...S.boutonLien, color: C.muet, marginTop: 12 }}>
                  🗂 Archiver ce membre
                </button>
                {archivage === m.id && (
                  <Confirmation
                    question={`Archiver ${m.nom || m.email} ? Il n'apparaîtra plus dans les listes ni au planning.`}
                    action="Archiver" couleur={C.rouge}
                    onConfirmer={async () => {
                      try { await archiverMembre(m.id); } catch (e) { setErreur(e.message); }
                      setArchivage(null); recharger();
                    }}
                    onAnnuler={() => setArchivage(null)} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
  if (integre) return contenu;
  return (
    <div style={S.page}>
      <div style={S.entete}>
        <div style={S.titre}>Équipe</div>
      </div>
      {contenu}
    </div>
  );
}

/**
 * Ce qu'un membre a le droit de faire.
 *
 * Deux origines, et l'écran les distingue :
 *   - accordé par son RÔLE : affiché, non décochable ici. Le retirer demande
 *     de changer le rôle — un geste plus lourd, qui doit rester explicite.
 *   - accordé PERSONNELLEMENT : décochable d'un clic.
 *
 * Les autorisations sensibles (argent, données de toute l'équipe) sont
 * signalées : les accorder doit être un choix conscient, pas un clic distrait.
 */
function Autorisations({ membre }) {
  const [etat, setEtat] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(null);

  async function charger() {
    setErreur(null);
    try { setEtat(await capacitesMembre(membre.id)); }
    catch (e) { setErreur(e.message); }
  }
  useEffect(() => { charger(); }, [membre.id]);

  async function basculer(cle, accorder) {
    setEnCours(cle); setErreur(null);
    try { await definirCapacite(membre.id, cle, accorder); await charger(); }
    catch (e) { setErreur(e.message); }
    finally { setEnCours(null); }
  }

  if (!etat) {
    return (
      <div style={{ fontSize: 11.5, color: C.fantome, marginBottom: 8 }}>
        Chargement des autorisations…
      </div>
    );
  }

  const effectives = capacitesEffectives(etat);

  const ligne = (c) => {
    const origine = origineCapacite(etat, c.cle);
    const actif = effectives.includes(c.cle);
    const parRole = origine === "role" || origine === "role_et_individuelle";
    return (
      <div key={c.cle} style={{ display: "flex", gap: 10, alignItems: "flex-start",
             padding: "8px 0", borderTop: `1px solid ${C.doux}` }}>
        <button
          onClick={() => !parRole && basculer(c.cle, !actif)}
          disabled={parRole || enCours === c.cle}
          title={parRole ? "Vient du rôle : changez le rôle pour la retirer"
                         : actif ? "Retirer" : "Accorder"}
          style={{
            width: 34, height: 20, borderRadius: 999, flexShrink: 0, marginTop: 2,
            border: "none", padding: 2, cursor: parRole ? "default" : "pointer",
            background: actif ? (parRole ? C.muet : C.vert) : C.bord,
            opacity: enCours === c.cle ? .5 : 1,
            display: "flex", justifyContent: actif ? "flex-end" : "flex-start",
          }}>
          <span style={{ width: 16, height: 16, borderRadius: "50%",
                         background: "#fff", display: "block" }} />
        </button>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 700,
                         color: actif ? C.encre : C.muet }}>
            {c.titre}
            {c.sensible && (
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700,
                background: "#FFFBEB", color: "#92400E", borderRadius: 999,
                padding: "1px 6px", border: "1px solid #FDE68A" }}>sensible</span>
            )}
          </span>
          <span style={{ display: "block", fontSize: 11, color: C.fantome,
                         lineHeight: 1.4, marginTop: 2 }}>
            {c.detail}
          </span>
          {parRole && (
            <span style={{ display: "block", fontSize: 10.5, color: C.muet,
                           marginTop: 2 }}>
              Vient de son rôle{(etat.roles || []).length
                ? ` (${etat.roles.map((r) => LIBELLES_ROLE[r] || r).join(", ")})` : ""}
            </span>
          )}
        </span>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ ...S.label, marginTop: 0 }}>Autorisations</label>
      <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 2 }}>
        {resumeAcces(etat)}
      </div>

      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.fantome,
                    textTransform: "uppercase", letterSpacing: ".05em",
                    marginTop: 10 }}>
        Sur le chantier
      </div>
      {capacitesTerrain().map(ligne)}

      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.fantome,
                    textTransform: "uppercase", letterSpacing: ".05em",
                    marginTop: 12 }}>
        Au bureau
      </div>
      {capacitesBureau().map(ligne)}

      {erreur && (
        <div style={{ fontSize: 11.5, color: C.rouge, marginTop: 8 }}>{erreur}</div>
      )}
    </div>
  );
}
