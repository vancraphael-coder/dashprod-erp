// =============================================================================
// Écran — Dossier (hub central).
// Modèle : roovers-mobile.jsx (fiche à sections : Contact, Relevé, Devis,
// Offre, Facture). Le volet Contact est inline : adresses multiples de
// chargement/déchargement avec étage, ascenseur, monte-meubles (table
// affaire_adresses du Module 3, enfin projetée), date/heure souhaitées,
// remarques. Les autres sections mènent aux écrans dédiés.
// =============================================================================

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  obtenirOrganisation,
  obtenirAffaire, obtenirContact, sauverContact, sauverMission,
  missionsAffaire, affecterMission, sauverAffectationsPrevues,
  listerMissions, listerConges,
  listerVehicules,
  obtenirClientFacturation, sauverClientFacturation,
  obtenirClientIdentite, sauverClientIdentite,
  listerMembresSimples,
  validerDossierTerrain, obtenirInstance, confirmerAffaire, archiverAffaire,
  annulerAffaire, reporterAffaire, reprendreAffaire, etatFacturation,
  exigencesCloture, cloturerDossier, rouvrirDossier,
  reconciliationAffaire, confirmerMission, renvoyerChantier,
  prerequisEffectue, marquerEffectue, caissesPlan,
} from "../lib/adaptateur.js";
import { alertesVehicule } from "@domaine/flotte/vehicules.js";
import { urlItineraire } from "@domaine/communication/brief.js";
import { adresseDepot } from "@domaine/organisation/identite.js";
import { CIVILITES } from "@domaine/crm/civilite.js";
import { synthese, verdict, pictoStatut, lignesBilan, mentionDerogation }
  from "@domaine/crm/cloture.js";
import { lecteurDisponibilite } from "@domaine/operations/missions.js";
import Bille from "../composants/Bille.jsx";
import CarteDate from "../composants/CarteDate.jsx";
import { VoletAffectation } from "../composants/Affectation.jsx";
import { BandeauNature, BlocDonneurOrdre, BlocSousTraitance, BlocLift }
  from "../composants/BlocsNature.jsx";
import { comporte as comporteEtape } from "@domaine/commercial/natures.js";
import { ETAGES_RAPIDES, libelleEtage, niveau, estRelisible, liftSuffit }
  from "@domaine/planning/etages.js";
import { planAdresses, titreAdresse, peutAjouter }
  from "@domaine/commercial/adresses.js";
import { C, S, Badge, BadgeFacturation, euros, declarerModifs, Confirmation }
  from "../lib/theme.jsx";

/** Ce que la date principale s'appelle, selon le métier. « Date souhaitée »
 *  ne dit rien pour un lift : on nomme l'intervention. */
const LIBELLE_PRINCIPALE = {
  demenagement: "Déménagement",
  lift: "Intervention lift",
  sous_traitance: "Livraison",
  boxe: "Entrée en boxe",
  zone: "Mise à disposition",
};

function adrVide() {
  return { id: "a" + Math.random().toString(36).slice(2, 8), adresse: "", type: "maison",
           codePostal: "", ville: "", etage: "", ascenseur: false, monteMeubles: false,
           escalier: false };
}

export default function Dossier({ affaireId, retour, versReleve, versDevis, versOffre, versFacture, versMail, versMateriel, versJournal, versRapports, modeTerrain }) {
  const [affaire, setAffaire] = useState(null);
  const [contact, setContact] = useState(null);
  const [org, setOrg] = useState(null);
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [flotte, setFlotte] = useState([]);
  const [facturation, setFacturation] = useState(null);
  const [factOuvert, setFactOuvert] = useState(false);
  const [identite, setIdentite] = useState(null);
  const [membres, setMembres] = useState([]);
  const [instance, setInstance] = useState(null);
  const [modifie, setModifie] = useState(false);
  // L'argent a son propre cycle, dérivé des factures (0064). Nom distinct de
  // `facturation`, qui désigne ici les données de facturation DU CLIENT.
  const [cycleFacture, setCycleFacture] = useState(null);
  const [archivage, setArchivage] = useState(false);
  // La saisie propre aux natures sans relevé (sous-traitance, lift).
  const [mission, setMission] = useState({});
  // Les missions du dossier, chacune avec son affectation propre. Depuis
  // 0131, c'est la mission qui fait foi au planning, plus l'affaire.
  const [missions, setMissions] = useState([]);
  // Les AUTRES chantiers et les congés : sans eux, aucun conflit n'est
  // visible. Un doublon ne se voit qu'en regardant au-delà du dossier courant.
  const [toutesMissions, setToutesMissions] = useState([]);
  const [conges, setConges] = useState([]);
  // L'affectation PRÉVUE par date. Elle vit sur l'affaire et existe donc dès
  // la saisie, avant qu'une mission existe en base.
  const [prevues, setPrevues] = useState({});
  const enregistrerRef = useRef(null);

  useEffect(() => {
    // État de facturation : dérivé en base, jamais déduit de affaire.etat.
    etatFacturation(affaireId).then(setCycleFacture).catch(() => setCycleFacture(null));
    obtenirOrganisation().then(setOrg).catch(() => {});
    obtenirAffaire(affaireId).then((a) => {
      setAffaire(a);
      setMission(a?.faits?.mission || a?.mission || {});
      setPrevues(a?.affectations || {});
    });
    listerVehicules().then(setFlotte).catch(() => {});
    obtenirClientFacturation(affaireId).then(setFacturation).catch(() => {});
    obtenirClientIdentite(affaireId).then(setIdentite).catch(() => {});
    listerMembresSimples().then(setMembres).catch(() => {});
    missionsAffaire(affaireId).then(setMissions).catch(() => setMissions([]));
    listerMissions().then(setToutesMissions).catch(() => setToutesMissions([]));
    listerConges().then(setConges).catch(() => setConges([]));
    obtenirInstance(affaireId).then(setInstance).catch(() => {});
    // L'amorce suit le MÉTIER : créer une ligne de déchargement vide sur un
    // lift laisserait une adresse fantôme en base, dans un groupe que l'écran
    // n'affiche même pas.
    Promise.all([obtenirAffaire(affaireId), obtenirContact(affaireId)])
      .then(([a, c]) => {
        const groupes = planAdresses(a?.nature || "demenagement").map((g) => g.cle);
        const amorce = { ...c };
        for (const cle of ["charges", "decharges"]) {
          const existantes = c?.[cle] || [];
          amorce[cle] = existantes.length ? existantes
            : (groupes.includes(cle) ? [adrVide()] : []);
        }
        setContact(amorce);
      });
  }, [affaireId]);

  // Garde de modifications — DOIT être avant tout return conditionnel (règle
  // des hooks). Signale au shell les changements en attente ; la navigation
  // demandera Sauvegarder / Annuler avant de quitter.
  useEffect(() => {
    declarerModifs(modifie, () => enregistrerRef.current && enregistrerRef.current());
    return () => declarerModifs(false, null);
  }, [modifie]);

  // La règle de conflit vient du domaine : elle ne doit exister qu'une fois.
  // AVANT le return conditionnel : un hook placé après ne serait pas appelé au
  // premier rendu, et React rend un écran blanc (§3 — attrapé par le test).
  const dispo = useMemo(
    () => lecteurDisponibilite({ missions: toutesMissions, conges }),
    [toutesMissions, conges]);

  if (!affaire || !contact) return null;

  function majAdr(liste, id, champ, valeur) {
    setContact((c) => ({
      ...c,
      [liste]: c[liste].map((a) => a.id === id ? { ...a, [champ]: valeur } : a),
    }));
    setSauve(false);
  }
  function ajouterAdr(liste) {
    setContact((c) => ({ ...c, [liste]: [...c[liste], adrVide()] }));
    setSauve(false);
  }
  function retirerAdr(liste, id) {
    setContact((c) => ({ ...c, [liste]: c[liste].filter((a) => a.id !== id) }));
    setSauve(false);
  }
  function maj(champ, valeur) { setContact((c) => ({ ...c, [champ]: valeur })); setSauve(false); setModifie(true); }
  function majFact(champ, valeur) { setFacturation((f) => ({ ...f, [champ]: valeur })); setSauve(false); setModifie(true); }
  function majIdentite(champ, valeur) { setIdentite((x) => ({ ...x, [champ]: valeur })); setSauve(false); setModifie(true); }

  async function enregistrer() {
    setErreur(null);
    try {
      if (identite) await sauverClientIdentite(affaireId, identite);
      await sauverContact(affaireId, contact);
      // `equipe` et `camions` ne sont plus écrits ici : la mission principale
      // fait foi et les miroite sur le dossier (0136). Les réécrire depuis un
      // état d'écran périmé écraserait une affectation faite au planning.
      if (facturation) await sauverClientFacturation(affaireId, facturation);
      // Les natures sans relevé portent leur saisie ici : sans cette ligne,
      // hommes, heures et kilomètres seraient perdus à chaque enregistrement.
      if (affaire?.nature === "sous_traitance" || affaire?.nature === "lift") {
        await sauverMission(affaireId, mission);
      }
      // Recharge l'affaire pour refléter le nom mis à jour dans l'en-tête.
      obtenirAffaire(affaireId).then(setAffaire).catch(() => {});
      // ET les missions : depuis 0135, l'équipe du dossier commande la mission
      // du jour principal. Sans ce rechargement, le volet d'affectation
      // afficherait encore l'équipe d'avant — deux vérités à l'écran, et
      // l'impression que l'enregistrement n'a pas pris.
      missionsAffaire(affaireId).then(setMissions).catch(() => {});
      setSauve(true); setModifie(false);
    } catch (e) { setErreur(e.message); }
  }
  enregistrerRef.current = enregistrer;

  // Le parcours complet = le déménagement. Les autres natures n'ont ni visite
  // d'estimation, ni jour d'emballage : une seule date les concerne.
  const parcoursComplet = comporteEtape(affaire.nature || "demenagement", "releve");

  // Le type de la mission principale suit la nature : un lift produit une
  // mission de lift, avec ses propres exigences d'affectation.
  const typeMissionPrincipale = { lift: "lift", sous_traitance: "sous_traitance" }[
    affaire.nature] || "demenagement";

  /**
   * UNE SEULE COMMANDE PAR DATE. La carte écrit là où est la vérité :
   * sur la MISSION dès qu'elle existe (0131), sur le dossier avant.
   * Il y avait trois commandes pour cette donnée — la carte, le volet de la
   * mission, et le sélecteur « Équipe ». Elles se contredisaient à l'écran.
   */
  async function majAffectation(cle, typeMission, a) {
    const m = missionDe(typeMission);
    if (m) {
      setMissions((l) => l.map((x) =>
        x.id === m.id ? { ...x, affectation: a } : x));
      try { await affecterMission(m.id, a.membres, a.vehicules); }
      catch (e) { setErreur(e.message); }
      return;
    }
    const suivant = { ...prevues, [cle]: a };
    setPrevues(suivant);
    try { await sauverAffectationsPrevues(affaireId, suivant); }
    catch (e) { setErreur(e.message); }
  }

  const missionDe = (type) => missions.find((m) => m.type === type) || null;

  // Les trois cartes de date couvrent la mission principale, la visite et
  // l'emballage. Une mission d'un autre type (créée à la main au planning)
  // n'aurait plus aucune porte depuis le dossier : elle reste affichée.
  const typesAvecCarte = [typeMissionPrincipale, "visite", "emballage"];
  const missionsSansCarte = missions.filter(
    (m) => !typesAvecCarte.includes(m.type));

  // Un lift ne se réserve qu'avec un véhicule de catégorie « lift ». Pour les
  // autres natures, toute la flotte reste offerte.

  // L'étage maximal du lift choisi, confronté aux adresses du dossier. C'est
  // ce contrôle qui donne son utilité à la donnée saisie au lot 4 : une
  // information qu'on ne confronte jamais ne sert à rien.
  // Les véhicules du dossier ne se chargent plus à part : ils SONT ceux de la
  // mission principale — ou, avant qu'elle existe, ceux prévus sur sa carte.
  // Deux sources pour une même liste, c'est deux réponses possibles à « quel
  // camion part ce jour-là ».
  const camions = (missionDe(typeMissionPrincipale)?.affectation
                   || prevues.principale || {}).vehicules || [];
  const liftChoisi = flotte.find((v) => camions.includes(v.id) && v.categorie === "lift");
  const verdictLift = liftChoisi
    ? liftSuffit(liftChoisi, [...(contact?.charges || []), ...(contact?.decharges || [])])
    : { ok: true, motif: null };

  const chiffree = affaire.tvac_centimes != null;
  // Depuis la séparation des cycles (0064), on facture un dossier ENGAGÉ —
  // un acompte sur un dossier confirmé est légitime. Les anciens états
  // « facture » / « paye » ne sont plus des états du déménagement.
  const facturable = ["confirme", "planifie", "en_cours", "effectue", "clos"]
    .includes(affaire.etat);

  return (
    <div style={S.page}>
      <div style={S.entete}>
        {/* En consultation terrain, le retour vit dans le bandeau du haut :
            pas de second bouton retour ici (évite le double retour). */}
        {!modeTerrain && (
          <button style={S.boutonLien} onClick={retour}>← Dossiers</button>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={S.titre}>{affaire.client?.nom || "Dossier"}</div>
          {/* Deux badges : où en est le déménagement, où en est l'argent.
              Le cycle de facturation reste masqué au terrain (aucun prix). */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Badge etat={affaire.etat} />
            {!modeTerrain && <BadgeFacturation etat={cycleFacture?.etat} discret />}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: C.muet, marginTop: 2 }}>
          {affaire.client?.tel || "—"}
          {/* Aucun montant pour le terrain : zéro prix, nulle part. */}
          {chiffree && !modeTerrain &&
            <> · <b style={{ color: C.encre }}>{euros(affaire.tvac_centimes)}</b></>}
        </div>
      </div>

      {/* La navigation entre sections vit dans la barre du bas (SousNavDossier)
          — plus de double barre en haut. */}

      {/* Rattrapage : offre SIGNÉE mais affaire jamais confirmée (affaires
          antérieures au correctif de chaîne). Confirmer crée la mission au
          planning et y reporte camions + équipe pressentis. */}
      {instance?.statut === "signee" && ["devis", "envoye"].includes(affaire.etat) && (
        <div style={{ margin: "0 16px 10px", padding: "11px 12px", borderRadius: 12,
          background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#065F46" }}>
            Offre signée — confirmation en attente
          </div>
          <div style={{ fontSize: 11.5, color: "#047857", marginTop: 2, marginBottom: 8 }}>
            Confirmez pour créer la mission au planning (camions et équipe
            pressentis y seront reportés).
          </div>
          <button onClick={async () => {
            try {
              await confirmerAffaire(affaireId);
              obtenirAffaire(affaireId).then(setAffaire).catch(() => {});
            } catch (e) { setErreur(e.message); }
          }} style={{
            padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "#059669", color: "#fff", fontSize: 13, fontWeight: 700,
          }}>Confirmer et planifier</button>
        </div>
      )}

      {/* Dossier venu du terrain : à valider par le bureau (brouillon → devis). */}
      {affaire.etat === "brouillon" && (
        <div style={{ margin: "0 16px 10px", padding: "11px 12px", borderRadius: 12,
          background: "#F5F3FF", border: "1px solid #DDD6FE" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#5B21B6" }}>
            Dossier créé sur le terrain — à valider
          </div>
          <div style={{ fontSize: 11.5, color: "#6D28D9", marginTop: 2, marginBottom: 8 }}>
            Complétez le relevé et le prix, puis validez pour lancer le chiffrage.
          </div>
          <button onClick={async () => {
            await validerDossierTerrain(affaireId);
            obtenirAffaire(affaireId).then(setAffaire).catch(() => {});
          }} style={{
            padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "#7C3AED", color: "#fff", fontSize: 13, fontWeight: 700,
          }}>Valider ce dossier</button>
        </div>
      )}

      {/* Identité du client — éditable ici (le nom se corrige au même endroit
          que tout le reste, pas dans un écran séparé). */}
      {identite && (
        <div style={S.carte}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 4 }}>
            Client
          </div>
          {/* La civilité qualifie le CONTACT client (couple, madame, monsieur),
              pas la facturation : elle sert aux formules des documents. */}
          <label style={S.label}>Civilité</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            {CIVILITES.map((c) => {
              const actif = identite.civilite === c.cle;
              return (
                <button key={c.cle} type="button"
                  onClick={() => majIdentite("civilite", actif ? null : c.cle)}
                  style={{ padding: "8px 14px", borderRadius: 999, cursor: "pointer",
                    fontSize: 12.5, fontWeight: 700,
                    border: `1.5px solid ${actif ? C.bleu : C.bord}`,
                    background: actif ? "#E7EFFC" : C.blanc,
                    color: actif ? C.bleu : C.muet }}>
                  {actif ? "✓ " : ""}{c.libelle}
                </button>
              );
            })}
          </div>
          <label style={S.label}>Nom</label>
          <input style={S.input} value={identite.nom || ""}
                 onChange={(e) => majIdentite("nom", e.target.value)}
                 placeholder="Famille Dupont" />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Téléphone</label>
              <input style={S.input} value={identite.tel || ""} inputMode="tel"
                     onChange={(e) => majIdentite("tel", e.target.value)}
                     placeholder="0470 00 00 00" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Email</label>
              <input style={S.input} value={identite.email || ""} inputMode="email"
                     onChange={(e) => majIdentite("email", e.target.value)}
                     placeholder="client@exemple.be" />
            </div>
          </div>
        </div>
      )}

      {/* Chaque date est une CARTE : la date et qui la fait, au même endroit.
          Les séparer obligeait à redescendre plus bas dans l'écran, et
          l'affectation finissait oubliée — le dossier semblait prêt et
          personne n'était prévu. */}
      <CarteDate
        typeMission={typeMissionPrincipale}
        libelle={LIBELLE_PRINCIPALE[affaire.nature || "demenagement"]}
        date={contact.date} heure={contact.heure}
        onDate={(v) => maj("date", v)} onHeure={(v) => maj("heure", v)}
        affectation={prevues.principale} membres={membres} flotte={flotte}
        mission={missionDe(typeMissionPrincipale)} dispo={dispo}
        onAffectation={(a) => majAffectation("principale", typeMissionPrincipale, a)} />

      {parcoursComplet && (
        <>
          <CarteDate typeMission="visite" libelle="Visite préalable" facultative
            date={contact.dateVisite} heure={contact.heureVisite}
            onDate={(v) => maj("dateVisite", v)}
            onHeure={(v) => maj("heureVisite", v)}
            affectation={prevues.visite} membres={membres} flotte={flotte}
            mission={missionDe("visite")} dispo={dispo}
            onAffectation={(a) => majAffectation("visite", "visite", a)} />

          <CarteDate typeMission="emballage" libelle="Emballage" facultative
            date={contact.dateEmballage} heure={contact.heureEmballage}
            onDate={(v) => maj("dateEmballage", v)}
            onHeure={(v) => maj("heureEmballage", v)}
            affectation={prevues.emballage} membres={membres} flotte={flotte}
            mission={missionDe("emballage")} dispo={dispo}
            onAffectation={(a) => majAffectation("emballage", "emballage", a)} />
        </>
      )}

      {/* La liste « Affectations » a disparu : elle rejouait exactement les
          cartes de date, avec d'autres mots et une autre cible d'écriture. Une
          mission qui n'a PAS de carte (créée à la main au planning) reste
          affichée ici — sinon elle deviendrait invisible depuis le dossier. */}
      {missionsSansCarte.length > 0 && (
        <>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: C.muet,
                        margin: "14px 16px 6px", textTransform: "uppercase",
                        letterSpacing: ".04em" }}>
            Autres missions ({missionsSansCarte.length})
          </div>
          {missionsSansCarte.map((m) => (
            <VoletAffectation key={m.id} mission={m}
              membres={membres} flotte={flotte}
              valeur={m.affectation}
              onChange={async (a) => {
                setMissions((l) => l.map((x) =>
                  x.id === m.id ? { ...x, affectation: a } : x));
                try {
                  await affecterMission(m.id, a.membres, a.vehicules);
                } catch (e) { setErreur(e.message); }
              }} />
          ))}
        </>
      )}

      {/* Le lift choisi monte-t-il assez haut ? Cet avertissement vivait sous
          l'ancien sélecteur de véhicules ; il suit désormais la carte qui
          choisit le lift. Le perdre aurait rendu muette la donnée d'étage
          saisie au lot 4 — on signale, on n'interdit pas. */}
      {!verdictLift.ok && (
        <div style={{ ...S.carte, display: "flex", alignItems: "flex-start",
                      gap: 9, borderLeft: `3px solid ${C.ambre}` }}>
          <Bille taille="jeton" ton="orange" signe="attention" />
          <div style={{ fontSize: 12, color: C.encre, lineHeight: 1.5 }}>
            <strong>{liftChoisi?.nom}</strong> — {verdictLift.motif}
          </div>
        </div>
      )}

      {/* Les sélecteurs « Équipe » et « Véhicules » de niveau dossier ont
          disparu. Ils pilotaient la même affectation que la carte du jour
          principal, mais à l'enregistrement et non au clic — d'où deux
          affichages qui se contredisaient jusqu'au prochain « Enregistrer ».
          `affaires.equipe` et `affaires.camions` restent alimentés, par le
          miroir depuis la mission principale (0136), et continuent de servir
          au chiffrage de la main-d'œuvre. */}

      {/* Ce qu'on vend — et, pour les natures sans relevé, leur chiffrage. */}
      <BandeauNature cle={affaire?.nature} />

      {affaire?.nature === "sous_traitance" && (
        <BlocDonneurOrdre valeur={mission}
          onChange={(m) => { setMission(m); setModifie(true); }} />
      )}
      {affaire?.nature === "sous_traitance" && (
        <BlocSousTraitance valeur={mission}
          onChange={(m) => { setMission(m); setModifie(true); }} />
      )}
      {affaire?.nature === "lift" && (
        <BlocLift valeur={mission} centreId={affaire?.centreId}
          onChange={(m) => { setMission(m); setModifie(true); }} />
      )}

      {/* Les adresses suivent le vocabulaire du MÉTIER, pas un moule commun :
          un lift ne charge rien, il se pose devant une façade ; une
          sous-traitance part d'un enlèvement vers plusieurs livraisons ; une
          zone est un flux, pas un trajet. Voir @domaine/commercial/adresses. */}
      {planAdresses(affaire.nature || "demenagement").map((g) => (
        <BlocAdresses key={g.cle} groupe={g} liste={contact[g.cle] || []}
          onMaj={(id, ch, v) => majAdr(g.cle, id, ch, v)}
          onAjouter={() => ajouterAdr(g.cle)}
          onRetirer={(id) => retirerAdr(g.cle, id)} />
      ))}

      {/* Itinéraire multi-arrêts : zéro API payante — Maps s'ouvre, on lit
          distance et durée (alignement 02 §3). */}
      {(() => {
        const url = urlItineraire(contact.charges, contact.decharges, adresseDepot(org));
        return url ? (
          <div style={{ margin: "0 16px 14px" }}>
            <a href={url} target="_blank" rel="noreferrer" style={{
              display: "block", textAlign: "center", padding: "13px",
              borderRadius: 12, textDecoration: "none", fontSize: 14, fontWeight: 700,
              color: "#fff", background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
            }}>
              🗺️ Ouvrir l'itinéraire (Google Maps)
            </a>
          </div>
        ) : null;
      })()}

      {/* Coût de trajet : le versant COÛT réel (marge), distinct du km facturé
          au barème. Interne — jamais montré au terrain (aucun prix). */}
      {!modeTerrain && (
      <div style={S.carte}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 6 }}>
          Coût de trajet <span style={{ fontWeight: 500, color: C.muet }}>(interne)</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Km</label>
            <input style={S.input} inputMode="decimal" value={contact.trajetKm ?? ""}
                   onChange={(e) => maj("trajetKm", e.target.value)} placeholder="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Durée</label>
            <input style={S.input} value={contact.trajetDuree || ""}
                   onChange={(e) => maj("trajetDuree", e.target.value)} placeholder="45 min" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Prix/km (€)</label>
            <input style={S.input} inputMode="decimal" value={contact.trajetPrixKm ?? ""}
                   onChange={(e) => maj("trajetPrixKm", e.target.value)} placeholder="0" />
          </div>
        </div>
        {contact.trajetKm > 0 && contact.trajetPrixKm > 0 && (
          <div style={{ fontSize: 12, color: C.muet, marginTop: 6 }}>
            Coût trajet ({contact.trajetKm} km × {contact.trajetPrixKm} €) ={" "}
            <b style={{ color: C.encre }}>
              {(contact.trajetKm * contact.trajetPrixKm).toLocaleString("fr-BE", {
                style: "currency", currency: "EUR",
              })}
            </b>
          </div>
        )}
      </div>
      )}

      {/* Données de facturation — le bouton facturation entreprise n'a rien à
          faire côté terrain (donnée commerciale, aucun prix). Masqué. */}
      {!modeTerrain && (
      <div style={S.carte}>
        <button onClick={() => setFactOuvert(!factOuvert)} style={{
          ...S.boutonLien, paddingLeft: 0, width: "100%", textAlign: "left",
          display: "flex", justifyContent: "space-between", fontSize: 13,
          fontWeight: 700, color: C.encre,
        }}>
          <span>Facturation {facturation?.tva_num ? "· société" : "· particulier"}</span>
          <span style={{ color: C.muet }}>{factOuvert ? "−" : "+"}</span>
        </button>
        {factOuvert && facturation && (
          <div style={{ marginTop: 8 }}>
            <label style={S.label}>Société</label>
            <input style={S.input} value={facturation.societe || ""}
                   onChange={(e) => majFact("societe", e.target.value)}
                   placeholder="Raison sociale (si professionnel)" />
            <label style={S.label}>N° TVA</label>
            <input style={S.input} value={facturation.tva_num || ""}
                   onChange={(e) => majFact("tva_num", e.target.value)}
                   placeholder="BE0123.456.789" />
            <label style={S.label}>Adresse de facturation</label>
            <input style={S.input} value={facturation.fact_lignes || ""}
                   onChange={(e) => majFact("fact_lignes", e.target.value)}
                   placeholder="Rue et numéro" />
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 110 }}>
                <label style={S.label}>Code postal</label>
                <input style={S.input} value={facturation.fact_cp || ""}
                       onChange={(e) => majFact("fact_cp", e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Ville</label>
                <input style={S.input} value={facturation.fact_ville || ""}
                       onChange={(e) => majFact("fact_ville", e.target.value)} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.fantome, marginTop: 6 }}>
              Sans adresse de facturation, la facture reprend l'adresse de déchargement.
            </div>
          </div>
        )}
      </div>
      )}

      {/* Remarques */}
      <div style={S.carte}>
        <label style={{ ...S.label, marginTop: 0 }}>Remarques</label>
        <textarea style={{ ...S.input, minHeight: 70, resize: "vertical" }}
                  value={contact.notes} onChange={(e) => maj("notes", e.target.value)}
                  placeholder="Piano au salon. Rue étroite. Cuisine à démonter…" />
      </div>

      {erreur && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}
      <div style={{ margin: "0 16px" }}>
        <button style={S.boutonPlein} onClick={enregistrer}>
          {sauve ? "✓ Dossier enregistré" : "Enregistrer le dossier"}
        </button>

        {/* Ce que le terrain a constaté sur place, et les écarts à trancher.
            L'autre moitié de la boucle : le terrain observe, le bureau décide. */}
        {!modeTerrain && versRapports && (
          <button onClick={() => versRapports(affaireId)} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            marginTop: 10, padding: "11px 13px", borderRadius: 11,
            cursor: "pointer", border: `1px solid ${C.bord}`,
            background: C.blanc, textAlign: "left" }}>
            <span>🧰</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.encre }}>
              Rapports de chantier
            </span>
            <span style={{ fontSize: 11.5, color: C.fantome }}>Ouvrir</span>
          </button>
        )}

        {/* L'historique du dossier : qui a changé quoi, quand, et les
            décisions consignées. En insertion seule — rien ne s'y réécrit. */}
        {!modeTerrain && versJournal && (
          <button onClick={() => versJournal(affaireId)} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            marginTop: 10, padding: "11px 13px", borderRadius: 11,
            cursor: "pointer", border: `1px solid ${C.bord}`,
            background: C.blanc, textAlign: "left" }}>
            <span>📖</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.encre }}>
              Historique de ce dossier
            </span>
            <span style={{ fontSize: 11.5, color: C.fantome }}>Ouvrir</span>
          </button>
        )}

        {/* Passer « en cours » à « effectué » : action du bureau, avec les
            prérequis affichés (validés / manquants) pour savoir ce qui bloque. */}
        {!modeTerrain && affaire.etat === "en_cours" && (
          <ZoneMarquerEffectue affaireId={affaireId}
                               onFait={() => obtenirAffaire(affaireId).then(setAffaire)} />
        )}

        {/* Réconciliation terrain → bureau : le chef d'équipe a remonté des
            chantiers, le bureau confirme (ou renvoie). C'est ici, et seulement
            ici, que le dossier devient officiellement « effectué ». */}
        {!modeTerrain && !["clos"].includes(affaire.etat) && (
          <ZoneReconciliation affaire={affaire} affaireId={affaireId}
                              onFait={() => obtenirAffaire(affaireId).then(setAffaire)} />
        )}

        {/* Plan de pose des caisses : le client a numéroté ses caisses et dit
            où chacune va (pièce de la nouvelle adresse). On n'affiche QUE ce
            plan — jamais le contenu, qui reste privé au client. Utile au
            terrain pour déposer chaque caisse au bon endroit. */}
        <PlanCaisses affaireId={affaireId} />

        {/* Clôture : la dernière étape du cycle. La check-list vient de la
            base, pas de l'écran — ce qui s'affiche ici est exactement ce qui
            sera vérifié au moment d'appuyer. */}
        {!modeTerrain && ["effectue", "clos"].includes(affaire.etat) && (
          <ZoneCloture affaire={affaire} affaireId={affaireId}
                       onFait={() => obtenirAffaire(affaireId).then(setAffaire)} />
        )}

        {/* Désistement client : le chantier ne se fera pas, ou pas à cette
            date. Annuler ou reporter libère automatiquement l'équipe et les
            camions du planning (les missions ouvertes sont annulées). */}
        {!modeTerrain && (
          <ZoneDesistement affaire={affaire} affaireId={affaireId}
                           onFait={() => { declarerModifs(false, null); retour(); }} />
        )}

        {/* Archiver : sort le dossier des listes — rien n'est supprimé, tout
            se retrouve (et se restaure) dans Compte → Archivage. */}
        {!modeTerrain && (
          <button onClick={() => setArchivage(true)}
                  style={{ ...S.boutonLien, color: C.muet, width: "100%",
                           textAlign: "center", marginTop: 10 }}>
            🗂 Archiver ce dossier
          </button>
        )}
        {archivage && (
          <Confirmation
            question="Archiver ce dossier ? Il disparaîtra des listes (récupérable dans Compte → Archivage)."
            action="Archiver" couleur={C.rouge}
            onConfirmer={async () => {
              await archiverAffaire(affaireId);
              declarerModifs(false, null);
              retour();
            }}
            onAnnuler={() => setArchivage(false)} />
        )}
      </div>
    </div>
  );
}

/**
 * Désistement client. Deux issues distinctes :
 *  — REPORTER : le chantier se fera plus tard. Avec une nouvelle date, il est
 *    replanifié immédiatement ; sans date, le dossier attend en « reporté » et
 *    repartira tout seul dès qu'une date sera saisie.
 *  — ANNULER : le chantier ne se fera pas. Définitif (le dossier reste
 *    consultable et archivable, rien n'est supprimé).
 * Dans les deux cas, les missions ouvertes sont annulées côté serveur : équipe
 * et camions se libèrent au planning sans intervention.
 */
const ANNULABLE = ["brouillon", "devis", "envoye", "confirme", "planifie", "en_cours", "reporte"];
const REPORTABLE = ["envoye", "confirme", "planifie"];

/**
 * ZONE DE CLÔTURE — la fin du dossier, rendue vérifiable.
 *
 * Trois états possibles :
 *  — le dossier est clôturé : on montre le bilan FIGÉ (jamais recalculé) et
 *    le seul geste restant, rouvrir, qui exige un motif écrit ;
 *  — tout est en ordre : un bouton, franc ;
 *  — il manque quelque chose : la liste nommée, et la possibilité de passer
 *    outre avec un motif — jamais en silence, jamais par défaut.
 */
/**
 * ZONE DE RÉCONCILIATION — le bureau tranche ce que le terrain a remonté.
 *
 * Le chef d'équipe clôt sa mission : elle passe « terminée sur le terrain ».
 * C'est une indication, pas un verdict. Ici, le bureau (patron/secrétariat)
 * confirme chaque chantier — ou le renvoie au terrain. Quand tous sont
 * confirmés, le dossier devient « effectué » et la facturation s'ouvre.
 *
 * On n'affiche cette zone que lorsqu'il y a quelque chose à réconcilier : des
 * chantiers en attente, ou tout juste confirmés.
 */
/**
 * ZONE « MARQUER EFFECTUÉ » — le bureau fait passer le dossier de « en cours »
 * à « effectué ». Le bouton n'est actif que si tous les prérequis sont verts ;
 * sinon, la liste montre exactement ce qui est validé et ce qui manque.
 */
function ZoneMarquerEffectue({ affaireId, onFait }) {
  const [pre, setPre] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    prerequisEffectue(affaireId).then(setPre).catch(() => setPre(null));
  }, [affaireId]);

  if (!pre) return null;

  async function marquer() {
    setEnCours(true); setErreur(null);
    try { await marquerEffectue(affaireId); onFait(); }
    catch (e) { setErreur(e.message || "Refusé"); setEnCours(false); }
  }

  return (
    <div style={{ ...S.carte, border: `1px solid ${C.bord}` }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
        Marquer le dossier effectué
      </div>
      <div style={{ fontSize: 12, color: C.muet, marginTop: 4, lineHeight: 1.5 }}>
        {pre.peut_effectuer
          ? "Tout est prêt : le chantier peut être déclaré effectué."
          : "Quelques points à régler avant de pouvoir déclarer le dossier effectué."}
      </div>

      <div style={{ marginTop: 10 }}>
        {(pre.points || []).map((p) => {
          const ok = p.statut === "ok";
          return (
            <div key={p.cle} style={{ display: "flex", gap: 8, alignItems: "baseline",
                                      padding: "5px 0" }}>
              <span style={{ fontSize: 13, flexShrink: 0,
                             color: ok ? "#15803D" : C.ambre }}>
                {ok ? "✓" : "○"}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600,
                               color: ok ? C.encre : C.encre }}>{p.libelle}</span>
                {p.detail && (
                  <span style={{ display: "block", fontSize: 11, color: C.muet, marginTop: 1 }}>
                    {p.detail}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>}

      <button disabled={!pre.peut_effectuer || enCours} onClick={marquer}
              style={{ ...S.boutonPlein, width: "100%", marginTop: 12,
                       opacity: pre.peut_effectuer ? 1 : 0.5,
                       background: pre.peut_effectuer
                         ? "linear-gradient(135deg, #059669, #047857)" : "#94A3B8" }}>
        {enCours ? "…" : "✓ Marquer effectué"}
      </button>
      {!pre.peut_effectuer && (
        <div style={{ fontSize: 10.5, color: C.fantome, textAlign: "center", marginTop: 6 }}>
          Le bouton s'activera une fois les points ci-dessus validés.
        </div>
      )}
    </div>
  );
}

/**
 * Plan de pose des caisses (vue bureau/terrain). Le client numérote ses caisses
 * et indique la pièce de destination ; on affiche numéro → pièce → adresse,
 * jamais le contenu (privé). Rien ne s'affiche s'il n'y a pas de caisse.
 */
function PlanCaisses({ affaireId }) {
  const [plan, setPlan] = useState(null);
  useEffect(() => { caissesPlan(affaireId).then(setPlan).catch(() => setPlan([])); }, [affaireId]);
  if (!plan || plan.length === 0) return null;

  return (
    <div style={S.carte}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 2 }}>
        Plan de pose des caisses
      </div>
      <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 8, lineHeight: 1.45 }}>
        Numéroté par le client. Le contenu reste privé — on ne voit que la
        destination.
      </div>
      {plan.map((c) => (
        <div key={c.numero} style={{ display: "flex", justifyContent: "space-between",
              alignItems: "baseline", padding: "6px 0",
              borderTop: `1px solid ${C.doux}` }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.encre }}>
            n°{c.numero}
            {c.fragile && <span style={{ color: "#DC2626", fontSize: 11 }}> · fragile</span>}
          </span>
          <span style={{ fontSize: 12.5, color: C.encre, textAlign: "right" }}>
            {c.piece_dest || "pièce ?"}
            {c.adresse && <span style={{ color: C.muet }}> · {c.adresse}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function ZoneReconciliation({ affaire, affaireId, onFait }) {
  const [recon, setRecon] = useState(null);
  const [renvoi, setRenvoi] = useState(null);   // mission en cours de renvoi
  const [motif, setMotif] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  const recharger = () => reconciliationAffaire(affaireId).then(setRecon).catch(() => setRecon(null));
  useEffect(() => { recharger(); }, [affaireId, affaire.etat]);

  if (!recon) return null;
  // Rien à réconcilier : aucun chantier en attente ET le dossier n'est pas
  // encore effectué (sinon la clôture prend le relais).
  if (recon.en_attente_bureau === 0 && affaire.etat === "effectue") return null;
  if (recon.en_attente_bureau === 0 && recon.encore_ouvertes > 0) return null;
  if (recon.en_attente_bureau === 0 && recon.confirmees === 0) return null;

  async function agir(fn) {
    setEnCours(true); setErreur(null);
    try { await fn(); setRenvoi(null); setMotif(""); await recharger(); onFait(); }
    catch (e) { setErreur(e.message || "Refusé"); }
    finally { setEnCours(false); }
  }

  const enAttente = (recon.missions || []).filter((m) => m.etat === "terminee_terrain");

  return (
    <div style={{ ...S.carte, border: `1px solid ${C.bord}` }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
        Confirmation du bureau
      </div>
      <div style={{ fontSize: 12, color: C.muet, marginTop: 4, lineHeight: 1.5 }}>
        {enAttente.length > 0
          ? "Le terrain a remonté ces chantiers comme terminés. À vous de confirmer — le dossier deviendra « effectué » et facturable."
          : "Tous les chantiers sont confirmés."}
      </div>

      {enAttente.map((m) => (
        <div key={m.id} style={{ marginTop: 10, padding: 11, borderRadius: 10,
          border: "1px solid #FDE68A", background: "#FFFBEB" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.encre }}>
              {m.type ? m.type.charAt(0).toUpperCase() + m.type.slice(1) : "Chantier"}
              {m.date ? ` · ${new Date(m.date + "T00:00:00").toLocaleDateString("fr-BE",
                { day: "numeric", month: "short" })}` : ""}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#B45309" }}>
              remonté du terrain
            </span>
          </div>

          {renvoi === m.id ? (
            <div style={{ marginTop: 8 }}>
              <input value={motif} onChange={(e) => setMotif(e.target.value)}
                     placeholder="Ce qui reste à faire (ex. cave oubliée)…"
                     style={{ ...S.input }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button disabled={enCours}
                  onClick={() => agir(() => renvoyerChantier(m.id, motif))}
                  style={{ ...S.boutonLien, color: C.rouge, fontWeight: 700 }}>
                  Renvoyer au terrain
                </button>
                <button onClick={() => { setRenvoi(null); setMotif(""); }}
                        style={{ ...S.boutonLien, color: C.muet }}>Annuler</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button disabled={enCours}
                onClick={() => agir(() => confirmerMission(m.id))}
                style={{ ...S.boutonPlein, flex: 1, padding: "10px",
                         background: "linear-gradient(135deg, #059669, #047857)" }}>
                ✓ Confirmer effectué
              </button>
              <button onClick={() => setRenvoi(m.id)}
                      style={{ ...S.boutonLien, color: C.muet }}>Pas fini</button>
            </div>
          )}
        </div>
      ))}

      {recon.confirmees > 0 && enAttente.length === 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#15803D", fontWeight: 600 }}>
          ✓ {recon.confirmees} chantier{recon.confirmees > 1 ? "s" : ""} confirmé{recon.confirmees > 1 ? "s" : ""}.
        </div>
      )}

      {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>}
    </div>
  );
}

function ZoneCloture({ affaire, affaireId, onFait }) {
  const [exig, setExig] = useState(null);
  const [motif, setMotif] = useState("");
  const [mode, setMode] = useState(null); // null | "forcer" | "rouvrir"
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const clos = affaire.etat === "clos";

  useEffect(() => {
    if (clos) { setExig(null); return; }
    exigencesCloture(affaireId).then(setExig).catch(() => setExig(null));
  }, [affaireId, affaire.etat, clos]);

  async function agir(fn) {
    setEnCours(true); setErreur(null);
    try { await fn(); setMode(null); setMotif(""); onFait(); }
    catch (e) { setErreur(e.message || "Refusé"); }
    finally { setEnCours(false); }
  }

  if (clos) {
    const bilan = affaire.cloture_bilan;
    const derog = mentionDerogation(bilan);
    return (
      <div style={{ ...S.carte, background: "#F1F5F9", border: `1px solid ${C.bord}` }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
          🔒 Dossier clôturé
        </div>
        <div style={{ fontSize: 12, color: C.muet, marginTop: 4, lineHeight: 1.5 }}>
          Plus rien n'y bouge : ni les missions, ni les factures, ni les heures.
          Le bilan ci-dessous a été figé ce jour-là ; il ne se recalcule pas.
        </div>
        {derog && (
          <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 9,
                        background: "#FFF7ED", border: "1px solid #FDE68A",
                        fontSize: 11.5, color: "#92400E", lineHeight: 1.45 }}>
            {derog}
          </div>
        )}
        {lignesBilan(bilan).map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between",
                                padding: "5px 0", fontSize: 12.5 }}>
            <span style={{ color: C.muet }}>{l}</span>
            <span style={{ fontWeight: 700, color: C.encre }}>{v}</span>
          </div>
        ))}

        {mode !== "rouvrir" ? (
          <button onClick={() => setMode("rouvrir")}
                  style={{ ...S.boutonLien, color: C.muet, marginTop: 10 }}>
            Rouvrir ce dossier
          </button>
        ) : (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 6 }}>
              Pourquoi ? Le motif reste au journal, et la clôture précédente
              est conservée avec son bilan.
            </div>
            <input value={motif} onChange={(e) => setMotif(e.target.value)}
                   placeholder="Erreur de facturation constatée…"
                   style={{ ...S.input }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button disabled={!motif.trim() || enCours}
                      onClick={() => agir(() => rouvrirDossier(affaireId, motif))}
                      style={{ ...S.boutonPlein, flex: 1,
                               opacity: motif.trim() ? 1 : 0.5 }}>
                Rouvrir
              </button>
              <button onClick={() => { setMode(null); setMotif(""); }}
                      style={{ ...S.boutonLien, color: C.muet }}>Annuler</button>
            </div>
          </div>
        )}
        {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>}
      </div>
    );
  }

  if (!exig) return null;
  const s = synthese(exig);

  return (
    <div style={{ ...S.carte, border: `1px solid ${C.bord}` }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre }}>
        Clôturer le dossier
      </div>
      <div style={{ fontSize: 12, color: C.muet, marginTop: 4, lineHeight: 1.5 }}>
        {verdict(exig)}
      </div>

      <div style={{ marginTop: 10 }}>
        {s.points.map((p) => {
          const manque = p.statut === "manquant";
          const couleur = p.statut === "ok" ? "#15803D"
                        : manque && p.bloquant ? C.rouge
                        : manque ? "#92400E" : C.fantome;
          return (
            <div key={p.cle} style={{ display: "flex", gap: 8, alignItems: "baseline",
                                      padding: "4px 0", fontSize: 12.5 }}>
              <span style={{ color: couleur, fontWeight: 800, width: 14 }}>
                {pictoStatut(p.statut)}
              </span>
              <span style={{ flex: 1, color: manque ? C.encre : C.muet }}>
                {p.libelle}
                {p.detail && (
                  <span style={{ display: "block", fontSize: 11, color: couleur, marginTop: 1 }}>
                    {p.detail}
                  </span>
                )}
              </span>
              {manque && !p.bloquant && (
                <span style={{ fontSize: 10.5, color: "#92400E" }}>réserve</span>
              )}
            </div>
          );
        })}
      </div>

      {s.peutCloturer && mode !== "forcer" && (
        <button disabled={enCours}
                onClick={() => agir(() => cloturerDossier(affaireId, null))}
                style={{ ...S.boutonPlein, width: "100%", marginTop: 12,
                         background: "linear-gradient(135deg, #0F172A, #334155)" }}>
          🔒 Clôturer — le dossier deviendra définitif
        </button>
      )}

      {s.peutForcer && mode !== "forcer" && (
        <button onClick={() => setMode("forcer")}
                style={{ ...S.boutonLien, color: C.muet, width: "100%",
                         textAlign: "center", marginTop: 10 }}>
          Clôturer malgré {s.nbBloquants} point{s.nbBloquants > 1 ? "s" : ""} — motif obligatoire
        </button>
      )}

      {mode === "forcer" && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 6, lineHeight: 1.45 }}>
            Ce motif est inscrit dans le bilan figé et dans le journal. Il
            expliquera, dans deux ans, pourquoi ce dossier a été clôturé
            incomplet.
          </div>
          <input value={motif} onChange={(e) => setMotif(e.target.value)}
                 placeholder="Client insolvable, créance passée en perte…"
                 style={{ ...S.input }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button disabled={!motif.trim() || enCours}
                    onClick={() => agir(() => cloturerDossier(affaireId, motif))}
                    style={{ ...S.boutonPlein, flex: 1, opacity: motif.trim() ? 1 : 0.5 }}>
              Clôturer avec ce motif
            </button>
            <button onClick={() => { setMode(null); setMotif(""); }}
                    style={{ ...S.boutonLien, color: C.muet }}>Annuler</button>
          </div>
        </div>
      )}

      {erreur && <div style={{ fontSize: 12, color: C.rouge, marginTop: 8 }}>{erreur}</div>}
    </div>
  );
}

function ZoneDesistement({ affaire, affaireId, onFait }) {
  const [mode, setMode] = useState(null); // null | "reporter" | "annuler"
  const [motif, setMotif] = useState("");
  const [nouvelleDate, setNouvelleDate] = useState("");
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const peutAnnuler = ANNULABLE.includes(affaire.etat);
  const peutReporter = REPORTABLE.includes(affaire.etat);

  // Annuler une annulation : un désistement encodé par erreur doit pouvoir se
  // défaire. Le dossier repart de « confirmé » et ses missions redeviennent
  // planifiées — mais NON PARTAGÉES, pour que le bureau revalide avant que le
  // terrain se remobilise.
  if (affaire.etat === "annule") {
    return (
      <div style={{ ...S.carte, background: "#FFF7ED", border: "1px solid #FDE68A" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
          Dossier annulé
        </div>
        <div style={{ fontSize: 12, color: "#92400E", marginTop: 4, lineHeight: 1.5 }}>
          Il n'apparaît plus au planning, ni au bureau ni au terrain.
        </div>
        <button
          onClick={async () => {
            try { await reprendreAffaire(affaireId, "reprise depuis le dossier"); onFait(); }
            catch (e) { alert(e.message || "Reprise refusée"); }
          }}
          style={{ ...S.boutonPlein, marginTop: 12 }}>
          Annuler l'annulation — remettre le dossier en route
        </button>
      </div>
    );
  }

  if (!peutAnnuler && !peutReporter) return null;

  async function confirmer() {
    setErreur(null); setEnCours(true);
    try {
      if (mode === "annuler") await annulerAffaire(affaireId, motif);
      else await reporterAffaire(affaireId, nouvelleDate || null, motif);
      onFait();
    } catch (e) {
      setErreur(e.message || "Opération refusée");
      setEnCours(false);
    }
  }

  const bouton = (cle, libelle, couleur) => (
    <button onClick={() => { setMode(cle); setErreur(null); }} style={{
      flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
      fontSize: 12.5, fontWeight: 700, background: C.blanc,
      border: `1.5px solid ${C.bord}`, color: couleur,
    }}>{libelle}</button>
  );

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.bord}` }}>
      {affaire.etat === "reporte" && (
        <div style={{ marginBottom: 10, padding: "9px 11px", borderRadius: 10,
          background: "#FFFBEB", border: "1px solid #FDE68A",
          fontSize: 11.5, color: "#92400E", lineHeight: 1.5 }}>
          Dossier reporté, en attente d'une date. Saisissez la nouvelle date du
          déménagement plus haut : le chantier sera replanifié automatiquement.
        </div>
      )}

      {!mode && (
        <>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muet,
            textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
            Désistement client
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {peutReporter && bouton("reporter", "📅 Reporter", C.ambre)}
            {peutAnnuler && bouton("annuler", "✕ Annuler", C.rouge)}
          </div>
        </>
      )}

      {mode && (
        <div style={{ padding: 12, borderRadius: 11,
          background: mode === "annuler" ? "#FEF2F2" : "#FFFBEB",
          border: `1px solid ${mode === "annuler" ? "#FECACA" : "#FDE68A"}` }}>
          <div style={{ fontSize: 13, fontWeight: 800,
            color: mode === "annuler" ? "#991B1B" : "#92400E", marginBottom: 8 }}>
            {mode === "annuler" ? "Annuler le dossier" : "Reporter le chantier"}
          </div>

          {mode === "reporter" && (
            <>
              <label style={S.label}>Nouvelle date (laisser vide si inconnue)</label>
              <input style={S.input} type="date" value={nouvelleDate}
                     onChange={(e) => setNouvelleDate(e.target.value)} />
            </>
          )}

          <label style={S.label}>Motif (tracé dans l'historique)</label>
          <input style={S.input} value={motif} onChange={(e) => setMotif(e.target.value)}
                 placeholder={mode === "annuler"
                   ? "Ex. : client a choisi un concurrent"
                   : "Ex. : compromis de vente décalé"} />

          <div style={{ fontSize: 11.5, color: C.muet, margin: "8px 0 10px", lineHeight: 1.5 }}>
            {mode === "annuler"
              ? "L'équipe et les véhicules seront libérés au planning. Le dossier reste consultable."
              : nouvelleDate
                ? "Le chantier sera replanifié à cette date avec la même équipe."
                : "Le dossier passera en « reporté » et libèrera le planning jusqu'à une nouvelle date."}
          </div>

          {erreur && <div style={{ fontSize: 12, color: C.rouge, marginBottom: 8 }}>{erreur}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={enCours} onClick={confirmer} style={{
              flex: 1, padding: "11px", borderRadius: 10, border: "none",
              cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#fff",
              background: mode === "annuler" ? C.rouge : C.ambre,
            }}>
              {enCours ? "…" : mode === "annuler" ? "Confirmer l'annulation" : "Confirmer le report"}
            </button>
            <button disabled={enCours} onClick={() => { setMode(null); setMotif(""); }} style={{
              padding: "11px 16px", borderRadius: 10, cursor: "pointer",
              fontSize: 13, fontWeight: 700, background: C.blanc,
              border: `1.5px solid ${C.bord}`, color: C.muet,
            }}>Retour</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BlocAdresses({ groupe, liste, onMaj, onAjouter, onRetirer }) {
  return (
    <div style={S.carte}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.encre, marginBottom: 2 }}>
        {groupe.titre}{liste.length > 1 ? ` (${liste.length})` : ""}
      </div>
      {/* La phrase qui évite une mauvaise saisie : « vide si le donneur
          d'ordre livre lui-même » vaut mieux qu'un champ obligatoire mal
          rempli. */}
      {groupe.aide && (
        <div style={{ fontSize: 11.5, color: C.muet, marginBottom: 8,
                      lineHeight: 1.45 }}>{groupe.aide}</div>
      )}
      {liste.map((a, i) => (
        <div key={a.id} style={{ borderTop: i > 0 ? `1px solid ${C.bord}` : "none",
                                  paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0 }}>
          {(groupe.numerote || liste.length > 1) && (
            <div style={{ fontSize: 11, fontWeight: 800, color: C.muet,
                          marginBottom: 5, textTransform: "uppercase",
                          letterSpacing: ".04em" }}>
              {titreAdresse(groupe, i, liste.length)}
            </div>
          )}
          <label style={S.label}>Adresse {liste.length > 1 ? i + 1 : ""}</label>
          <input style={S.input} value={a.adresse}
                 onChange={(e) => onMaj(a.id, "adresse", e.target.value)}
                 placeholder="Rue des Tulipes 14" />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <div style={{ width: 110 }}>
              <label style={S.label}>Code postal</label>
              <input style={S.input} value={a.codePostal || ""} inputMode="numeric"
                     onChange={(e) => onMaj(a.id, "codePostal", e.target.value)}
                     placeholder="1300" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Ville</label>
              <input style={S.input} value={a.ville || ""}
                     onChange={(e) => onMaj(a.id, "ville", e.target.value)}
                     placeholder="Wavre" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Type</label>
              <select style={S.input} value={a.type}
                      onChange={(e) => onMaj(a.id, "type", e.target.value)}>
                <option value="maison">Maison</option>
                <option value="appart">Appartement</option>
                <option value="bureau">Bureau</option>
                <option value="garde-meuble">Garde-meuble</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Étage</label>
              <input style={S.input} value={a.etage}
                     onChange={(e) => onMaj(a.id, "etage", e.target.value)}
                     placeholder="RDC / 2e" />
            </div>
          </div>

          {/* Sélection rapide : un doigt au lieu du clavier, et surtout une
              valeur COMPARABLE à l'étage maximal d'un lift. Le champ libre
              reste au-dessus — les saisies héritées ne se perdent pas. */}
          <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
            {ETAGES_RAPIDES.map((n) => {
              const choisi = niveau(a.etage) === n;
              return (
                <button key={n} type="button"
                  onClick={() => onMaj(a.id, "etage", libelleEtage(n))}
                  style={{
                    padding: "5px 11px", borderRadius: 999, cursor: "pointer",
                    fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${choisi ? C.bleu : C.bord}`,
                    background: choisi ? C.bleuClair : C.blanc,
                    color: choisi ? C.bleu : C.muet }}>
                  {libelleEtage(n)}
                </button>
              );
            })}
            {!estRelisible(a.etage) && (
              <span style={{ fontSize: 11.5, color: C.ambre, alignSelf: "center" }}>
                étage non reconnu
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 12.5, color: C.encre, display: "flex", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={a.ascenseur}
                     onChange={(e) => onMaj(a.id, "ascenseur", e.target.checked)} />
              Ascenseur
            </label>
            <label style={{ fontSize: 12.5, color: C.encre, display: "flex", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={a.escalier}
                     onChange={(e) => onMaj(a.id, "escalier", e.target.checked)} />
              Escalier
            </label>
            <label style={{ fontSize: 12.5, color: C.encre, display: "flex", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={a.monteMeubles}
                     onChange={(e) => onMaj(a.id, "monteMeubles", e.target.checked)} />
              Monte-meubles
            </label>
            {liste.length > 1 && (
              <button onClick={() => onRetirer(a.id)}
                      style={{ ...S.boutonLien, color: C.rouge, marginLeft: "auto" }}>
                Retirer
              </button>
            )}
          </div>
        </div>
      ))}
      {/* Un maximum par métier : cinq livraisons dans une tournée se gèrent,
          quinze ne se gèrent plus dans un formulaire. */}
      {peutAjouter(groupe, liste) ? (
        <button style={{ ...S.boutonLien, paddingLeft: 0, marginTop: 8 }} onClick={onAjouter}>
          + Ajouter {groupe.numerote ? `${groupe.titre.toLowerCase()} ${liste.length + 1}` : "une adresse"}
        </button>
      ) : (
        <div style={{ fontSize: 11.5, color: C.muet, marginTop: 8 }}>
          Maximum {groupe.max} atteint.
        </div>
      )}
    </div>
  );
}
