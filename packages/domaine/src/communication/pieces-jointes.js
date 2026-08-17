// =============================================================================
// LES PIÈCES JOINTES D'UN MAIL — et pourquoi elles ne voyagent pas.
//
// LE FAIT, qu'il faut regarder en face : le protocole `mailto:` NE PEUT PAS
// porter de fichier. Ce n'est pas une limite de Dashprod ni du navigateur,
// c'est le standard (RFC 6068) : un lien mailto ne transporte que du texte.
// Aucune application web ne peut « pousser » un PDF dans Gmail par ce chemin.
//
// Trois issues existent, et une seule marche partout :
//   1. Envoyer depuis Dashprod — le fichier part vraiment, mais l'expéditeur
//      n'est pas la boîte du bureau et la réponse du client n'y arrive pas.
//   2. Brancher l'API du fournisseur (Gmail, Graph) — le brouillon porte alors
//      la pièce, mais il faut une autorisation par fournisseur, et ça ne
//      couvre pas celui qui utilise autre chose.
//   3. METTRE DES LIENS DANS LE CORPS — le client clique et télécharge. Ça
//      marche avec toute messagerie, sans autorisation, tout de suite.
//
// Ce module fait la 3. Il ne prétend pas résoudre le problème du transport :
// il le contourne honnêtement, et DIT ce qui ne peut pas être joint.
// =============================================================================

/**
 * Les pièces d'un mail, chacune avec ou sans lien.
 *
 * @param {object} src { offre: {url}, conditions: {url}, facture: {url}, … }
 * @param {string} modele clé du modèle de mail
 * @returns {{cle, libelle, url|null}[]}
 */
export function piecesDuMail(src = {}, modele = "offre") {
  const out = [];
  const ajouter = (cle, libelle, url) => out.push({ cle, libelle, url: url || null });

  if (modele === "offre") {
    ajouter("offre", "Votre offre", src.offre);
    ajouter("conditions", "Conditions générales", src.conditions);
  } else if (modele === "facture") {
    ajouter("facture", "Votre facture", src.facture);
  } else if (modele === "releve") {
    ajouter("releve", "Le relevé", src.releve);
  }
  return out;
}

/** Celles qui ont un lien : ce sont les seules qui peuvent voyager. */
export function piecesAvecLien(pieces) {
  return (pieces || []).filter((p) => p.url);
}

/** Celles qui n'en ont pas : à joindre à la main, et il faut le dire. */
export function piecesSansLien(pieces) {
  return (pieces || []).filter((p) => !p.url);
}

/**
 * Le bloc à insérer dans le corps du mail. Rendu en TEXTE BRUT : le corps
 * part par `mailto:`, qui ne transporte pas de HTML.
 *
 * Renvoie une chaîne vide quand aucune pièce n'a de lien — insérer un titre
 * « Documents » suivi de rien ferait mauvais effet chez le client.
 */
export function blocLiens(pieces, options = {}) {
  const avec = piecesAvecLien(pieces);
  if (avec.length === 0) return "";

  const titre = options.titre || "Vos documents";
  const lignes = avec.map((p) => `${p.libelle} : ${p.url}`);
  const validite = options.validiteJours
    ? `\n\nCes liens restent valables ${options.validiteJours} jours.`
    : "";

  return `\n\n${titre}\n${lignes.join("\n")}${validite}`;
}

/**
 * Le corps complet, bloc de liens inclus — sans le dupliquer si l'appelant
 * l'insère deux fois (un double clic sur « insérer » est vite arrivé).
 */
export function corpsAvecLiens(corps, pieces, options = {}) {
  const bloc = blocLiens(pieces, options);
  if (!bloc) return corps || "";
  const base = corps || "";
  return base.includes(bloc.trim()) ? base : base + bloc;
}

/**
 * Ce qu'il faut dire à l'utilisateur, en une phrase, sans mentir sur la
 * cause. Rendu comme une DÉCISION plutôt qu'un texte figé : l'écran affiche
 * le message, il ne recompose pas la règle.
 */
export function avertissement(pieces) {
  const avec = piecesAvecLien(pieces);
  const sans = piecesSansLien(pieces);

  if (avec.length === 0 && sans.length === 0) {
    return { ton: "neutre", message: null };
  }
  if (sans.length === 0) {
    return {
      ton: "ok",
      message: "Les documents partiront sous forme de liens : le client clique "
             + "et télécharge. Aucun fichier n'est attaché — un mail ouvert "
             + "depuis un site ne peut pas en porter.",
    };
  }
  if (avec.length === 0) {
    return {
      ton: "attention",
      message: `À joindre à la main : ${sans.map((p) => p.libelle).join(", ")}. `
             + "Un mail ouvert depuis un site ne peut pas porter de fichier.",
    };
  }
  return {
    ton: "attention",
    message: `Les liens sont insérés. Reste à joindre à la main : `
           + `${sans.map((p) => p.libelle).join(", ")}.`,
  };
}
