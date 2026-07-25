// =============================================================================
// Code de SIGNATURE d'offre — usage unique, ciblé sur une affaire.
//
// ⚠️ Ce code n'ouvre PLUS un espace client (l'espace passe par OAuth). Il sert
// à signer UNE offre depuis un lien envoyé par le déménageur. Le générateur et
// la validation de forme restent utiles ; le modèle de menace ci-dessous vaut
// pour tout code court exposé en clair.
//
// MODÈLE DE MENACE, à garder en tête avant de toucher à ce fichier.
//
// Le code protège un acte opposable : la signature d'une offre. Un code trop
// court ou sans limite d'essais s'énumère en quelques heures.
//
// Trois défenses, et il faut les trois :
//   1. Entropie — 12 caractères sur un alphabet de 32 ≈ 1,15 × 10^18
//      combinaisons. Un code à 6 chiffres se casse en minutes.
//   2. Limite d'essais — verrouillage après 8 tentatives ratées. Sans ça,
//      l'entropie ne sert à rien face à un script.
//   3. Expiration — un code mort ne protège plus rien.
//
// Le code n'est JAMAIS stocké en clair : la base ne garde qu'une empreinte.
// Une fuite de la table ne donne pas les codes.
// =============================================================================

// Alphabet sans caractères ambigus : ni O/0, ni I/1/L, ni U/V. Un client
// recopie ce code depuis un email ou un SMS, parfois au téléphone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTWXYZ";
const LONGUEUR = 12;
const GROUPE = 4;

export const ESSAIS_MAX = 8;
export const VALIDITE_JOURS_DEFAUT = 90;

/**
 * Génère un code client. `alea` est injectable pour les tests ; en production
 * il DOIT venir de crypto.getRandomValues, jamais de Math.random — un
 * générateur prévisible rend l'entropie fictive.
 */
export function genererCode(alea = aleaSecurise) {
  let brut = "";
  for (let i = 0; i < LONGUEUR; i++) brut += ALPHABET[alea(ALPHABET.length)];
  return formater(brut);
}

function aleaSecurise(max) {
  const g = globalThis.crypto;
  if (g?.getRandomValues) {
    const t = new Uint32Array(1);
    // Rejet du dernier intervalle incomplet : sans ça, les premières lettres
    // de l'alphabet sortiraient légèrement plus souvent.
    const limite = Math.floor(0xFFFFFFFF / max) * max;
    let v;
    do { g.getRandomValues(t); v = t[0]; } while (v >= limite);
    return v % max;
  }
  throw new Error("Générateur aléatoire sécurisé indisponible : "
                + "refus de produire un code devinable.");
}

/** Met en forme : ABCD-EFGH-JKMN. Lisible, dictable au téléphone. */
export function formater(brut) {
  const s = normaliser(brut);
  return s.match(new RegExp(`.{1,${GROUPE}}`, "g"))?.join("-") ?? s;
}

/**
 * Normalise une saisie : majuscules, séparateurs retirés, et confusions
 * courantes corrigées. Un client qui tape « O » au lieu de « 0 » doit entrer.
 */
export function normaliser(saisie) {
  return String(saisie ?? "")
    .toUpperCase()
    .replace(/[\s\-_.]/g, "")
    .replace(/[OØ]/g, "0").replace(/0/g, "")   // 0 absent de l'alphabet
    .replace(/[IL|]/g, "1").replace(/1/g, "")  // 1 absent également
    .replace(/U/g, "V").replace(/V/g, "");     // ni U ni V
}

/** Forme plausible ? Contrôle bon marché avant toute requête. */
export function formeValide(saisie) {
  const s = normaliser(saisie);
  if (s.length !== LONGUEUR) return false;
  return [...s].every((ch) => ALPHABET.includes(ch));
}

/**
 * État d'un accès. C'est cette fonction qui décide si on ouvre la porte.
 * Elle refuse par défaut : tout cas non prévu tombe sur un refus.
 */
export function etatAcces(acces, maintenant = new Date()) {
  if (!acces) return { ouvert: false, motif: "INCONNU",
    message: "Code inconnu. Vérifiez la saisie ou contactez votre déménageur." };

  if (acces.revoque_le) return { ouvert: false, motif: "REVOQUE",
    message: "Cet accès a été désactivé. Contactez votre déménageur." };

  const essais = Number(acces.essais_rates) || 0;
  if (essais >= ESSAIS_MAX) return { ouvert: false, motif: "VERROUILLE",
    message: "Trop de tentatives. L'accès est bloqué ; "
           + "votre déménageur peut le réactiver." };

  if (acces.expire_le) {
    const fin = new Date(acces.expire_le);
    if (!Number.isNaN(fin.getTime()) && fin < maintenant) {
      return { ouvert: false, motif: "EXPIRE",
        message: "Ce code a expiré. Demandez-en un nouveau à votre déménageur." };
    }
  }
  return { ouvert: true, motif: "OK", message: null };
}

/** Date d'expiration par défaut. */
export function expirationDefaut(depuis = new Date(), jours = VALIDITE_JOURS_DEFAUT) {
  const d = new Date(depuis);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString();
}

/** Essais restants, pour prévenir le client avant le verrouillage. */
export function essaisRestants(acces) {
  return Math.max(0, ESSAIS_MAX - (Number(acces?.essais_rates) || 0));
}

/**
 * Ce que le portail a le droit de montrer.
 *
 * Liste FERMÉE, volontairement. Un client voit SES données, pas les notes
 * commerciales du déménageur, pas ses marges, pas ses coûts internes, pas
 * l'équipe affectée. Toute nouvelle donnée exposée doit être ajoutée ici
 * explicitement — l'oubli doit fermer, pas ouvrir.
 */
export const CHAMPS_PORTAIL = Object.freeze({
  dossier: ["reference", "etat", "date_souhaitee", "date_visite",
            "client_nom", "client_email", "client_tel",
            "adresses_charge", "adresses_decharge"],
  offre: ["numero", "date", "montant_tvac_centimes", "statut", "organisation_nom",
          "validite", "url_document"],
  facture: ["numero", "date_emission", "echeance", "total_tvac_centimes",
            "communication", "payee", "url_document"],
  inventaire: ["piece", "numero", "designation", "quantite", "volume_m3",
               "poids_kg", "colis", "remarque"],
});

/** Interdits absolus : ces champs ne doivent jamais sortir vers un client. */
export const CHAMPS_INTERDITS = Object.freeze([
  "notes_commerciales", "marge_centimes", "couts", "cout_centimes",
  "taux_horaire", "onss_patronale_pct", "precompte_pct", "equipe",
  "affectations", "parametres_prix", "parametres_catalogues",
]);

/** Filet de sécurité : retire tout champ interdit d'une charge sortante. */
export function assainir(objet) {
  if (Array.isArray(objet)) return objet.map(assainir);
  if (!objet || typeof objet !== "object") return objet;
  const sortie = {};
  for (const [k, v] of Object.entries(objet)) {
    if (CHAMPS_INTERDITS.includes(k)) continue;
    sortie[k] = assainir(v);
  }
  return sortie;
}
