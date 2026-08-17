// =============================================================================
// Écran — Mail (envoi de l'offre).
// Alignement page 07 : dix mails par semaine, identiques à 90 % — le template
// supprime l'oubli (validité, dates) et uniformise le ton. Flux v1 assumé
// manuel : télécharger les deux pièces jointes (offre + conditions C.B.D.) puis
// les joindre au mail ouvert par mailto:. Le protocole mailto NE PEUT PAS
// porter de pièce jointe — c'est une limite du standard, pas un raccourci ;
// l'envoi serveur avec PJ automatiques viendra comme adaptateur au bord (D-1).
// Les textes viennent de Compte → Textes ; le formatage du domaine (emailOffre).
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  obtenirAffaire, obtenirContact, obtenirInstance, obtenirOrganisation,
  obtenirTextes, creerLienSignature, urlConditionsCbd,
  accesActif, journalMails, marquerMailEnvoye,
} from "../lib/adaptateur.js";
import { emailOffre, urlMailto } from "@domaine/communication/brief.js";
import { mailsEffectifs, remplirJetons } from "@domaine/communication/mails.js";
import { genererCode } from "@domaine/portail/acces.js";
import { piecesDuMail, corpsAvecLiens, avertissement }
  from "@domaine/communication/pieces-jointes.js";
import { C, S } from "../lib/theme.jsx";
import FilMessages from "./FilMessages.jsx";

export default function Mail({ affaireId, retour, versOffre }) {
  const [mailOffre, setMailOffre] = useState(null);  // l'email d'offre (circuit signature)
  const [instance, setInstance] = useState(null);
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [lien, setLien] = useState(null);      // { code, url } une fois généré
  // Insérer les liens de téléchargement dans le corps. Décoché par défaut :
  // on n'ajoute pas d'URL au message de quelqu'un sans le lui demander.
  const [avecLiens, setAvecLiens] = useState(false);
  const [validiteJours, setValiditeJours] = useState(30);
  const [cbd, setCbd] = useState(null);        // URL signée des conditions
  const [enCours, setEnCours] = useState(false);
  const [acces, setAcces] = useState(null);    // accès signature actif (persistant)
  const [raccourci, setRaccourci] = useState(false);  // insérer le rappel dans le mail
  const [journal, setJournal] = useState([]);  // récap des mails envoyés (manuel)

  // Modèles de mails et sélection. "offre" = l'email d'offre historique
  // (avec signature en ligne et pièces jointes) ; les autres clés viennent
  // des modèles réglés dans Compte → Textes → Modèles de mails.
  const [modeles, setModeles] = useState([]);
  const [choix, setChoix] = useState("offre");
  const [sousOnglet, setSousOnglet] = useState("composer");
  const [contexte, setContexte] = useState(null);   // jetons à remplir

  useEffect(() => {
    (async () => {
      try {
        const [affaire, contact, inst, org, textes] = await Promise.all([
          obtenirAffaire(affaireId),
          obtenirContact(affaireId).catch(() => null),
          obtenirInstance(affaireId).catch(() => null),
          obtenirOrganisation().catch(() => ({})),
          obtenirTextes().catch(() => ({})),
        ]);
        // Persistance : l'accès signature actif et le journal des mails
        // survivent au rechargement — ils viennent de la base, pas de l'état.
        accesActif(affaireId).then(setAcces).catch(() => setAcces({ actif: false }));
        journalMails(affaireId).then(setJournal).catch(() => setJournal([]));
        setInstance(inst);
        urlConditionsCbd().then(setCbd).catch(() => setCbd(null));
        setModeles(mailsEffectifs(textes));

        const faits = affaire?.faits || {};
        const famille = String(affaire?.client?.nom || "").trim().split(/\s+/).pop() || "";
        const dateLongue = contact?.date
          ? new Date(contact.date + "T00:00:00").toLocaleDateString("fr-BE",
              { weekday: "long", day: "numeric", month: "long" })
          : "";
        setContexte({
          client: affaire?.client?.nom || "", famille,
          organisation: org?.nom_commercial || org?.nom || "",
          date: dateLongue,
          montant: affaire?.tvac_centimes
            ? (affaire.tvac_centimes / 100).toLocaleString("fr-BE",
                { style: "currency", currency: "EUR" }) : "",
          reference: affaire?.reference || affaire?.numero || "",
          signataire: org?.nom || "",
          email: affaire?.client?.email || "",
        });

        setMailOffre(emailOffre({
          client: affaire?.client || {},
          signee: inst?.statut === "signee",
          charges: contact?.charges || [], decharges: contact?.decharges || [],
          formule: faits.formule, heures: faits.heures,
          nbDemenageurs: faits.nbDemenageurs,
          tvacCentimes: affaire?.tvac_centimes || 0,
          date: contact?.date, heure: contact?.heure,
          remarques: contact?.notes,
          organisation: org,
          textes,
          lienSignature: lien?.url || null,
          codeSignature: lien?.code || null,
        }));
      } catch (e) { setErreur(e.message); }
    })();
  }, [affaireId, lien]);

  // Ce qui PEUT voyager : une pièce n'accompagne le mail que si elle a un
  // lien public. Le reste est à joindre à la main, et on le dit.
  const pieces = useMemo(() => {
    const modele = estOffreChoix(choix) ? "offre"
                 : (modeles.find((x) => x.cle === choix) || {}).piece || "offre";
    return piecesDuMail({
      // Le lien de l'offre n'existe QUE si le code vient d'être généré dans
      // cette session. Un accès déjà actif ne permet pas de le reconstruire :
      // on n'en conserve que l'indice, jamais le code complet — c'est ce qui
      // rend la signature opposable. Sans lien, la pièce est annoncée comme
      // « à joindre à la main » plutôt que silencieusement absente.
      offre: lien?.url || null,
      conditions: cbd || null,
    }, modele);
  }, [choix, modeles, lien, cbd]);

  const avisPieces = useMemo(() => avertissement(pieces), [pieces]);

  // Le mail réellement affiché : l'offre, ou un modèle rempli avec le contexte.
  const mail = useMemo(() => {
    let base;
    if (choix === "offre") base = mailOffre;
    else {
      const m = modeles.find((x) => x.cle === choix);
      if (!m || !contexte) return null;
      base = { a: contexte.email || "",
               objet: remplirJetons(m.objet, contexte),
               corps: remplirJetons(m.corps, contexte) };
    }
    if (!base) return null;

    // Raccourci texte rapide : le rappel du code de signature et de son échéance,
    // ajouté au corps à la demande du bureau. Le code complet n'est présent que
    // si on vient de le générer (lien) ; sinon on met l'indice et l'échéance.
    if (raccourci && estOffreChoix(choix)) {
      const rappel = texteRappelSignature(lien, acces);
      if (rappel) base = { ...base, corps: `${base.corps}\n\n${rappel}` };
    }

    // Les liens de téléchargement, à la demande. C'est la seule façon de
    // faire parvenir un document par « Ouvrir dans Mail » : `mailto:` ne
    // transporte pas de fichier (RFC 6068), aucun navigateur n'y peut rien.
    if (avecLiens && pieces.length > 0) {
      base = { ...base, corps: corpsAvecLiens(base.corps, pieces) };
    }
    return base;
  }, [choix, mailOffre, modeles, contexte, raccourci, lien, acces,
      avecLiens, pieces]);

  async function copier() {
    const texte = `À : ${mail.a}\nObjet : ${mail.objet}\n\n${mail.corps}`;
    try { await navigator.clipboard.writeText(texte); setCopie(true); }
    catch { window.prompt("Copiez le mail :", texte); }
    setTimeout(() => setCopie(false), 2000);
  }

  if (!mail && choix === "offre") return null;
  const signee = instance?.statut === "signee";
  const estOffre = choix === "offre";

  return (
    <div style={S.page}>
      <div style={S.entete}>
        <button style={S.boutonLien} onClick={retour}>← Dossier</button>
        <div style={S.titre}>Mail</div>
      </div>

      {/* Sous-onglets : composer un mail classique, ou Mailprod — la messagerie
          tracée avec le client (bidirectionnelle, probante). */}
      <div style={{ display: "flex", gap: 4, margin: "0 16px 12px",
                    background: "#EEF2F8", borderRadius: 12, padding: 4 }}>
        {[["composer", "Composer"], ["mailprod", "Mailprod"]].map(([cle, lib]) => (
          <button key={cle} onClick={() => setSousOnglet(cle)}
            style={{ flex: 1, padding: "9px 8px", borderRadius: 9, border: "none",
                     cursor: "pointer", fontSize: 13, fontWeight: 700,
                     background: sousOnglet === cle ? "#fff" : "transparent",
                     color: sousOnglet === cle ? C.encre : C.muet,
                     boxShadow: sousOnglet === cle ? "0 1px 3px rgba(15,23,42,.1)" : "none" }}>
            {lib}
          </button>
        ))}
      </div>

      {sousOnglet === "mailprod" ? (
        <div style={S.carte}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 8,
                        textTransform: "uppercase", letterSpacing: ".03em" }}>
            Mailprod · messagerie tracée
          </div>
          <FilMessages affaireId={affaireId} cote="entreprise"
            amorce={contexte ? recapDossier(contexte) : null}
            modeles={contexte ? modelesRemplis(modeles, contexte) : []} />
        </div>
      ) : (
      <>
      {/* Choix du modèle : l'offre (circuit signature) ou un modèle réglé dans
          les paramètres. Le contenu se remplit tout seul avec les données du
          dossier. */}
      <div style={S.carte}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 8,
                      textTransform: "uppercase", letterSpacing: ".03em" }}>
          Quel mail envoyer
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setChoix("offre")} style={puce(estOffre)}>
            📄 Offre de prix
          </button>
          {modeles.map((m) => (
            <button key={m.cle} onClick={() => setChoix(m.cle)} style={puce(choix === m.cle)}>
              {m.origine === "sur_mesure" ? "✏️ " : ""}{m.titre}
            </button>
          ))}
        </div>
        {!estOffre && (
          <div style={{ fontSize: 11, color: C.fantome, marginTop: 8, lineHeight: 1.5 }}>
            Modèle rempli avec les données du dossier. Modifiable dans
            Compte → Textes → Modèles de mails.
          </div>
        )}
      </div>

      {/* Signature en ligne — seulement pour l'offre. */}
      {estOffre && (
      <div style={S.carte}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 8,
                      textTransform: "uppercase", letterSpacing: ".03em" }}>
          Signature en ligne
        </div>

        {!instance && (
          <button style={{ ...S.boutonLien, paddingLeft: 0 }}
                  onClick={() => versOffre(affaireId)}>
            Préparer et figer l'offre d'abord →
          </button>
        )}

        {/* Un accès ACTIF existe (persistant, relu au chargement) : on affiche
            le minuteur et l'échéance. Le code complet n'est plus lisible — seul
            l'indice survit. Si on vient de le créer, on montre le code une fois. */}
        {instance && acces?.actif && (
          <div style={{ padding: "10px 12px", borderRadius: 10,
                        background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
            {lien ? (
              <>
                <div style={{ fontSize: 11.5, color: "#065F46", fontWeight: 700 }}>
                  Code de signature (notez-le, il ne sera plus affiché en entier)
                </div>
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 18,
                              fontWeight: 800, color: C.encre, textAlign: "center",
                              letterSpacing: ".1em", padding: "6px 0" }}>
                  {lien.code}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11.5, color: "#065F46", fontWeight: 700 }}>
                Code actif · se termine par <b>{acces.indice}</b>
              </div>
            )}
            <Minuteur echeance={acces.expire_le} />
            {/* Raccourci texte rapide : insère code + échéance dans le mail. */}
            <button onClick={() => setRaccourci(true)}
                    style={{ ...S.boutonLien, paddingLeft: 0, fontSize: 12, marginTop: 4 }}>
              ⤵ Insérer le rappel dans le mail
            </button>
          </div>
        )}

        {instance && acces && !acces.actif && (
          <div style={{ fontSize: 12, color: C.muet, lineHeight: 1.5, marginBottom: 10 }}>
            {acces.signe ? "✓ Déjà signé par le client."
              : acces.expire ? "Le code précédent a expiré."
              : acces.revoque ? "Le code précédent a été révoqué."
              : "Aucun code actif."}
            {" "}Vous pouvez en générer un nouveau.
          </div>
        )}

        {instance && (!acces || !acces.actif) && (
          <>
            <div style={{ fontSize: 12, color: C.muet, lineHeight: 1.55,
                          marginBottom: 10 }}>
              Le client lit l'offre en ligne, recopie « Lu et approuvé » et signe.
              Choisissez le nombre de jours : le code expirera ce jour-là, à
              l'heure d'aujourd'hui.
            </div>
            <label style={{ ...S.label, marginTop: 0 }}>Le code expire dans</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {[[1, "1 jour"], [7, "1 semaine"], [15, "15 jours"], [30, "1 mois"]]
                .map(([j, lib]) => (
                <button key={j} onClick={() => setValiditeJours(j)} style={{
                  padding: "7px 12px", borderRadius: 999, cursor: "pointer",
                  fontSize: 12.5, fontWeight: 700,
                  border: `1.5px solid ${validiteJours === j ? C.bleu : C.bord}`,
                  background: validiteJours === j ? "#E7EFFC" : C.blanc,
                  color: validiteJours === j ? C.bleu : C.muet,
                }}>{lib}</button>
              ))}
            </div>
            <button style={S.boutonPlein} disabled={enCours} onClick={async () => {
              setEnCours(true); setErreur(null);
              try {
                const code = genererCode();
                await creerLienSignature(affaireId, code, validiteJours);
                setLien({ code, jours: validiteJours,
                  url: `${location.origin}/?signer=`
                    + encodeURIComponent(code.replace(/-/g, "")) });
                accesActif(affaireId).then(setAcces).catch(() => {});
              } catch (e) { setErreur(e.message); }
              finally { setEnCours(false); }
            }}>
              {enCours ? "Génération…" : "Générer le code de signature"}
            </button>
          </>
        )}
      </div>
      )}

      {/* PIÈCES JOINTES — le « hook » de fluidité.
          mailto ne peut pas porter de fichier (limite du standard). On rend
          donc le geste aussi fluide que possible : chaque pièce s'ouvre en un
          tap, prête à être enregistrée puis glissée dans le mail. Le bloc
          s'adapte au modèle choisi — l'offre a ses deux PJ, un autre mail peut
          n'en avoir aucune. */}
      {pieces.some((p) => p.url) && (
        <div style={S.carte}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8,
                          cursor: "pointer", fontSize: 12.5, color: C.encre }}>
            <input type="checkbox" checked={avecLiens} style={{ marginTop: 2 }}
                   onChange={(e) => setAvecLiens(e.target.checked)} />
            <span>
              Insérer les liens de téléchargement dans le message
              <span style={{ display: "block", fontSize: 11.5, color: C.muet,
                             marginTop: 2, lineHeight: 1.5 }}>
                Le client clique et télécharge. C'est la seule façon de faire
                parvenir un document par « Ouvrir dans Mail » : un lien mail ne
                transporte pas de fichier.
              </span>
            </span>
          </label>
        </div>
      )}

      <PiecesJointes choix={choix} instance={instance} cbd={cbd}
        versOffre={() => versOffre(affaireId)}
        piece={choix === "offre" ? "offre"
               : (modeles.find((x) => x.cle === choix) || {}).piece} />

      {/* En-tête du mail */}
      <div style={S.carte}>
        <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", rowGap: 7, fontSize: 12.5 }}>
          <span style={{ color: C.muet, fontWeight: 700 }}>À</span>
          <span style={{ color: mail?.a ? C.encre : C.rouge }}>
            {mail?.a || "aucun email client — complétez la fiche"}
          </span>
          <span style={{ color: C.muet, fontWeight: 700 }}>Objet</span>
          <span style={{ color: C.encre }}>{mail?.objet}</span>
        </div>
      </div>

      {/* Corps */}
      <div style={{ ...S.carte, maxHeight: 320, overflowY: "auto" }}>
        <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 13, color: C.encre,
                      whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
          {mail?.corps}
        </pre>
      </div>

      {erreur && <div style={{ margin: "0 16px 8px", fontSize: 12.5, color: C.rouge }}>{erreur}</div>}

      <div style={{ margin: "0 16px", display: "flex", gap: 8 }}>
        <button onClick={copier} style={{
          flex: 1, padding: "13px", borderRadius: 12, cursor: "pointer",
          border: `1.5px solid ${C.bord}`, background: "#fff",
          fontSize: 13.5, fontWeight: 700, color: C.encre,
        }}>{copie ? "✓ Copié" : "📋 Copier"}</button>
        <a href={mail ? urlMailto(mail) : "#"} style={{
          flex: 1, padding: "13px", borderRadius: 12, textAlign: "center",
          textDecoration: "none", background: C.bleu, color: "#fff",
          fontSize: 13.5, fontWeight: 700,
        }}>✉️ Ouvrir dans Mail</a>
      </div>
      {/* Ce qu'on dit sur les pièces : la CAUSE est nommée. Sans elle, le
          bureau croit à une panne de Dashprod et cherche un réglage qui
          n'existe pas. */}
      {avisPieces.message && (
        <div style={{ margin: "10px 16px 0", fontSize: 11.5, lineHeight: 1.5,
                      textAlign: "center",
                      color: avisPieces.ton === "ok" ? C.muet : C.ambre }}>
          {avisPieces.message}
        </div>
      )}

      {/* Journal manuel : le bureau marque ce qu'il a réellement envoyé. */}
      <div style={{ margin: "16px 16px 0" }}>
        <button onClick={async () => {
          try {
            await marquerMailEnvoye(affaireId,
              { modele: choix, objet: mail?.objet || "" });
            journalMails(affaireId).then(setJournal).catch(() => {});
          } catch (e) { setErreur(e.message); }
        }} style={{ ...S.boutonLien, paddingLeft: 0, fontSize: 12.5, fontWeight: 700 }}>
          ✓ Marquer ce mail comme envoyé
        </button>

        {journal.length > 0 && (
          <div style={{ marginTop: 8, padding: 12, borderRadius: 12,
                        background: "#F8FAFC", border: `1px solid ${C.bord}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.encre,
                          textTransform: "uppercase", letterSpacing: ".03em",
                          marginBottom: 6 }}>
              Mails envoyés
            </div>
            {journal.slice().reverse().map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between",
                                    fontSize: 12, color: C.muet, padding: "3px 0" }}>
                <span style={{ color: C.encre }}>{libelleModele(e.modele)}</span>
                <span>{dateCourte(e.le)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 32 }} />
      </>
      )}
    </div>
  );
}

/**
 * Le bloc pièces jointes, dépendant du modèle choisi. Pour l'offre : les deux
 * documents (offre + conditions). Pour un autre mail : rien d'imposé, mais on
 * ouvre quand même l'accès à l'offre et aux conditions, souvent utiles.
 */
function PiecesJointes({ choix, instance, cbd, versOffre, piece }) {
  const estOffre = choix === "offre";
  const doc = estOffre ? "offre" : piece;   // document associé à ce modèle
  // Rien à proposer si le modèle n'a aucun document lié (ou offre pas encore figée).
  if (doc === "aucun" || !doc) return null;
  if (doc === "offre" && !instance) return null;

  const LIB = { offre: "L'offre", facture: "La facture", releve: "Le relevé (liste sans volume)" };
  const OUVERTURE = {
    offre: "Ouvrez l'offre, enregistrez-la en PDF, puis joignez-la au mail.",
    facture: "Ouvrez la facture du dossier, enregistrez-la en PDF, puis joignez-la.",
    releve: "Ouvrez le relevé (Aperçu / PDF), enregistrez-le, puis joignez-le.",
  };

  return (
    <div style={S.carte}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.encre, marginBottom: 6,
                    textTransform: "uppercase", letterSpacing: ".03em" }}>
        Pièces jointes
      </div>
      <div style={{ fontSize: 11.5, color: C.muet, lineHeight: 1.5, marginBottom: 10 }}>
        {OUVERTURE[doc] || "Ouvrez le document, enregistrez-le en PDF, puis joignez-le au mail."}
        {" "}Votre messagerie ne peut pas les recevoir automatiquement.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {doc === "offre" && instance && (
          <button onClick={versOffre} style={pieceJointe}>📄 {LIB.offre}</button>
        )}
        {doc !== "offre" && (
          <span style={{ ...pieceJointe, color: C.encre, cursor: "default" }}>
            📄 {LIB[doc] || "Document"} — à ouvrir depuis le dossier
          </span>
        )}
        {doc === "offre" && (cbd ? (
          <a href={cbd} target="_blank" rel="noreferrer"
             style={{ ...pieceJointe, textDecoration: "none",
                      display: "inline-flex", alignItems: "center" }}>
            📋 Conditions générales
          </a>
        ) : (
          <span style={{ ...pieceJointe, color: C.fantome, cursor: "default" }}>
            📋 Conditions générales — non déposées
          </span>
        ))}
      </div>
    </div>
  );
}

function puce(actif) {
  return {
    padding: "8px 13px", borderRadius: 999, cursor: "pointer",
    fontSize: 12.5, fontWeight: 700,
    border: `1.5px solid ${actif ? C.bleu : C.bord}`,
    background: actif ? "#E7EFFC" : C.blanc,
    color: actif ? C.bleu : C.muet,
  };
}

const pieceJointe = {
  padding: "10px 14px", borderRadius: 10, cursor: "pointer",
  border: `1.5px solid ${C.bord}`, background: C.blanc, color: C.encre,
  fontSize: 12.5, fontWeight: 700,
};

// ── Helpers signature / journal ──────────────────────────────────────────────
function estOffreChoix(choix) { return choix === "offre"; }

function libelleModele(cle) {
  const M = { offre: "Offre de prix", confirmation_visite: "Confirmation de visite",
    envoi_devis: "Envoi du devis", relance_devis: "Relance", envoi_facture: "Facture",
    rappel_paiement: "Rappel de paiement", remerciement: "Remerciement",
    confirmation_demenagement: "Confirmation" };
  return M[cle] || cle || "Mail";
}

function dateCourte(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-BE",
      { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

/** Texte du rappel inséré dans le mail : code (si connu) + échéance. */
function texteRappelSignature(lien, acces) {
  const ech = acces?.expire_le ? dateEcheanceLongue(acces.expire_le) : null;
  if (lien?.code) {
    return `Pour signer votre offre en ligne : rendez-vous sur ${lien.url}\n`
      + `Votre code : ${lien.code}`
      + (ech ? `\nCe code est valable jusqu'au ${ech}.` : "");
  }
  if (acces?.actif) {
    return `Pour rappel, votre code de signature (se terminant par ${acces.indice}) `
      + `reste valable${ech ? ` jusqu'au ${ech}` : ""}.`;
  }
  return null;
}

function dateEcheanceLongue(iso) {
  try {
    return new Date(iso).toLocaleDateString("fr-BE",
      { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

/**
 * Minuteur d'échéance : combien de temps reste-t-il avant l'expiration du code.
 * Rafraîchi chaque minute. Journalier — au-delà d'un jour, on compte en jours ;
 * le dernier jour, en heures ; la dernière heure, en minutes.
 */
function Minuteur({ echeance }) {
  const [maintenant, setMaintenant] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  if (!echeance) return null;
  const reste = new Date(echeance).getTime() - maintenant;
  const fin = new Date(echeance).toLocaleDateString("fr-BE",
    { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  let texte, couleur;
  if (reste <= 0) { texte = "expiré"; couleur = C.rouge; }
  else {
    const jours = Math.floor(reste / 86400000);
    const heures = Math.floor(reste / 3600000);
    const minutes = Math.floor(reste / 60000);
    if (jours >= 1) { texte = `${jours} jour${jours > 1 ? "s" : ""} restant${jours > 1 ? "s" : ""}`; couleur = "#065F46"; }
    else if (heures >= 1) { texte = `${heures} h restantes`; couleur = "#B45309"; }
    else { texte = `${minutes} min restantes`; couleur = C.rouge; }
  }
  return (
    <div style={{ fontSize: 11, color: couleur, marginTop: 4, fontWeight: 600 }}>
      ⏳ {texte} · échéance {fin}
    </div>
  );
}

/**
 * Les modèles de mail (confirmation, relance…) prêts à insérer dans un message
 * Mailprod : jetons remplis avec le contexte du dossier. On ne garde que le
 * corps — un message n'a pas d'objet séparé.
 */
function modelesRemplis(modeles, ctx) {
  return (modeles || []).map((m) => ({
    cle: m.cle, titre: m.titre,
    corps: remplirJetons(m.corps, ctx),
  }));
}

/** Récap du dossier à reprendre dans un message client (bouton mailprod). */
function recapDossier(ctx) {
  const l = [];
  if (ctx.date) l.push(`Date prévue : ${ctx.date}`);
  if (ctx.montant) l.push(`Montant : ${ctx.montant}`);
  if (ctx.reference) l.push(`Référence : ${ctx.reference}`);
  if (l.length === 0) return null;
  return `Bonjour ${ctx.famille || ""},\n\nRécapitulatif de votre dossier :\n`
    + l.map((x) => `• ${x}`).join("\n")
    + `\n\nN'hésitez pas si vous avez la moindre question.`;
}
