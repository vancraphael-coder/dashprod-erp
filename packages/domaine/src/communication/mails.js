// =============================================================================
// Modèles de mails — les envois d'une entreprise de déménagement.
//
// Une société n'écrit pas dix fois la même chose. Ces modèles couvrent les
// moments où elle parle au client : confirmer un rendez-vous, envoyer le devis,
// relancer, réclamer un paiement, remercier après la prestation. Chacun a un
// objet et un corps par défaut, avec des jetons {entre accolades} remplacés au
// moment de l'envoi.
//
// Deux principes :
//   1. Les modèles LIVRÉS sont un socle, jamais un carcan : chaque société les
//      réécrit, et ses versions priment (comme les textes d'offre).
//   2. Une société peut créer ses PROPRES modèles, vierges, et les garder. Le
//      métier de chacun a ses envois que nous n'avons pas prévus.
//
// Aucun envoi ici : ce module ne fait que fournir des textes et remplir des
// jetons. L'envoi passe par le client mail de l'utilisateur (mailto) ou l'outil
// d'e-mail de la société — Dashprod n'expédie rien lui-même.
// =============================================================================

/** Jetons reconnus, avec une aide affichée à l'utilisateur. */
export const JETONS_MAIL = Object.freeze({
  "{client}": "Nom du client",
  "{famille}": "Nom de famille du client",
  "{organisation}": "Nom de votre société",
  "{date}": "Date de la prestation",
  "{montant}": "Montant concerné",
  "{reference}": "Référence du dossier",
  "{signataire}": "Votre nom (bas de mail)",
});

/**
 * Les modèles livrés. `cle` sert d'identifiant stable ; ne jamais la changer,
 * une société peut avoir personnalisé le modèle sur cette clé.
 */
export const MODELES_MAIL_DEFAUT = Object.freeze([
  {
    cle: "confirmation_visite",
    titre: "Confirmation de visite technique",
    objet: "Visite technique — {organisation}",
    corps:
`Bonjour {famille},

Nous confirmons notre visite technique le {date} afin d'évaluer votre déménagement et d'établir une offre précise.

Merci de nous signaler tout accès particulier (étage, ascenseur, stationnement).

Bien à vous,
{signataire}
{organisation}`,
  },
  {
    cle: "envoi_devis",
    titre: "Envoi du devis",
    objet: "Votre offre de déménagement — {organisation}",
    corps:
`Bonjour {famille},

Vous trouverez ci-joint notre offre pour votre déménagement prévu le {date}.

Elle reste valable un mois. Nous restons à votre disposition pour toute question ou ajustement.

Bien à vous,
{signataire}
{organisation}`,
  },
  {
    cle: "relance_devis",
    titre: "Relance après devis",
    objet: "Votre déménagement — suite à notre offre",
    corps:
`Bonjour {famille},

Nous revenons vers vous concernant l'offre transmise pour votre déménagement. Avez-vous pu en prendre connaissance ?

Nous serions heureux de vous accompagner. N'hésitez pas si vous souhaitez en discuter.

Bien à vous,
{signataire}
{organisation}`,
  },
  {
    cle: "confirmation_demenagement",
    titre: "Confirmation du déménagement",
    objet: "C'est confirmé — déménagement du {date}",
    corps:
`Bonjour {famille},

Votre déménagement est confirmé pour le {date}. Notre équipe sera présente à l'heure convenue.

Quelques rappels utiles : libérez les accès, préparez les objets fragiles, et gardez avec vous les documents importants.

À très bientôt,
{signataire}
{organisation}`,
  },
  {
    cle: "envoi_facture",
    titre: "Envoi de la facture",
    objet: "Votre facture — {organisation}",
    corps:
`Bonjour {famille},

Vous trouverez ci-joint la facture relative à votre déménagement du {date}, d'un montant de {montant}.

Nous vous remercions de votre confiance.

Bien à vous,
{signataire}
{organisation}`,
  },
  {
    cle: "rappel_paiement",
    titre: "Rappel de paiement",
    objet: "Rappel — facture en attente",
    corps:
`Bonjour {famille},

Sauf erreur de notre part, la facture relative à votre déménagement du {date} ({montant}) demeure impayée à ce jour.

Nous vous remercions de bien vouloir procéder au règlement. Si le paiement a été effectué entre-temps, merci de ne pas tenir compte de ce message.

Bien à vous,
{signataire}
{organisation}`,
  },
  {
    cle: "remerciement",
    titre: "Remerciement après prestation",
    objet: "Merci pour votre confiance",
    corps:
`Bonjour {famille},

Nous espérons que votre déménagement s'est déroulé au mieux.

Merci de nous avoir fait confiance. Votre avis nous aide beaucoup : n'hésitez pas à nous en faire part.

Bien à vous,
{signataire}
{organisation}`,
  },
]);

/** Contexte d'exemple pour l'aperçu dans les réglages. */
export const EXEMPLE_MAIL = Object.freeze({
  client: "Marie Dupont", famille: "Dupont", organisation: "Déménagements Martin",
  date: "12 mars 2026", montant: "1 210,00 €", reference: "2026-0042",
  signataire: "Jean Martin",
});

/** Remplace les jetons présents dans un texte. Un jeton sans valeur reste tel quel. */
export function remplirJetons(texte, contexte = {}) {
  if (!texte) return "";
  return texte.replace(/\{(\w+)\}/g, (brut, cle) =>
    contexte[cle] != null && contexte[cle] !== "" ? String(contexte[cle]) : brut);
}

/**
 * Fusionne modèles livrés et modèles/personnalisations d'une société.
 * `stockes.mails` a la forme :
 *   { perso: { [cle]: {objet, corps} }, sur_mesure: [{cle, titre, objet, corps}] }
 * — `perso` : réécritures des modèles livrés (par clé) ;
 * — `sur_mesure` : modèles créés de toutes pièces par la société.
 */
export function mailsEffectifs(stockes) {
  const bloc = (stockes || {}).mails || {};
  const perso = bloc.perso || {};
  const surMesure = Array.isArray(bloc.sur_mesure) ? bloc.sur_mesure : [];

  const livres = MODELES_MAIL_DEFAUT.map((m) => ({
    ...m,
    ...(perso[m.cle] || {}),
    origine: "livre",
    personnalise: Boolean(perso[m.cle]),
  }));

  const propres = surMesure
    .filter((m) => m && m.cle)
    .map((m) => ({ titre: m.titre || "Sans titre", objet: m.objet || "",
                   corps: m.corps || "", cle: m.cle, origine: "sur_mesure" }));

  return [...livres, ...propres];
}

/** Un modèle par sa clé, dans l'ensemble effectif. */
export function mailEffectif(stockes, cle) {
  return mailsEffectifs(stockes).find((m) => m.cle === cle) || null;
}

/** Enregistre la réécriture d'un modèle LIVRÉ. Vider = revenir au défaut. */
export function ecrireMailPerso(stockes, cle, { objet, corps }) {
  const base = { ...(stockes || {}) };
  const mails = { ...(base.mails || {}) };
  const perso = { ...(mails.perso || {}) };
  const defaut = MODELES_MAIL_DEFAUT.find((m) => m.cle === cle);

  // Si la société remet exactement le texte par défaut, on efface sa surcharge.
  const identique = defaut && objet === defaut.objet && corps === defaut.corps;
  if (identique || (!objet && !corps)) delete perso[cle];
  else perso[cle] = { objet: objet || "", corps: corps || "" };

  mails.perso = perso;
  base.mails = nettoyer(mails);
  return base;
}

/** Crée ou met à jour un modèle SUR MESURE. Retourne le stockage et la clé. */
export function ecrireMailSurMesure(stockes, { cle, titre, objet, corps }) {
  const base = { ...(stockes || {}) };
  const mails = { ...(base.mails || {}) };
  const liste = Array.isArray(mails.sur_mesure) ? [...mails.sur_mesure] : [];
  const cleFinale = cle || nouvelleCle(titre, liste);

  const i = liste.findIndex((m) => m.cle === cleFinale);
  const modele = { cle: cleFinale, titre: titre || "Sans titre",
                   objet: objet || "", corps: corps || "" };
  if (i === -1) liste.push(modele); else liste[i] = modele;

  mails.sur_mesure = liste;
  base.mails = nettoyer(mails);
  return { stockes: base, cle: cleFinale };
}

/** Supprime un modèle sur mesure (les modèles livrés ne se suppriment pas). */
export function supprimerMailSurMesure(stockes, cle) {
  const base = { ...(stockes || {}) };
  const mails = { ...(base.mails || {}) };
  mails.sur_mesure = (mails.sur_mesure || []).filter((m) => m.cle !== cle);
  base.mails = nettoyer(mails);
  return base;
}

function nouvelleCle(titre, liste) {
  const racine = "perso_" + (titre || "mail").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "mail";
  let cle = racine, n = 2;
  const prises = new Set(liste.map((m) => m.cle));
  while (prises.has(cle)) cle = `${racine}_${n++}`;
  return cle;
}

function nettoyer(mails) {
  const out = {};
  if (mails.perso && Object.keys(mails.perso).length) out.perso = mails.perso;
  if (mails.sur_mesure && mails.sur_mesure.length) out.sur_mesure = mails.sur_mesure;
  return Object.keys(out).length ? out : undefined;
}
