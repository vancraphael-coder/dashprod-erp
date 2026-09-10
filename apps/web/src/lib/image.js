// =============================================================================
// NORMALISER UNE PHOTO EN JPEG — pour qu'elle s'affiche PARTOUT.
//
// LE PROBLÈME RÉEL (constaté le 29/08) : les iPhone livrent des photos en HEIC.
// Les navigateurs (hors Safari) ne savent PAS afficher le HEIC dans une balise
// <img> — la photo reste blanche, alors que le fichier est bien là. Les JPEG,
// eux, passent partout.
//
// LA SOLUTION : avant l'upload, on redessine la photo sur un canvas et on la
// ré-encode en JPEG. Bénéfices :
//   · le HEIC (quand le navigateur SAIT le décoder — Safari, iOS) devient un
//     JPEG affichable partout ;
//   · au passage, on redimensionne : un HEIC de 8,5 Mo tombe à quelques
//     centaines de Ko, plus rapide à envoyer et à afficher ;
//   · le résultat porte toujours le type image/jpeg — fini les surprises.
//
// SI LE DÉCODAGE ÉCHOUE (un vrai HEIC sur un navigateur qui ne sait pas le
// lire), on ne stocke PAS une photo invisible : on lève une erreur claire, et
// l'appelant refuse le fichier. Mieux vaut un refus net qu'une photo fantôme.
//
// Ce module vit côté navigateur (canvas, createImageBitmap). Il n'est pas
// « domaine pur » — il touche au DOM — donc il reste dans apps/web/lib.
// =============================================================================

// 1600 px de côté : une photo de constat sert à montrer une rayure ou un
// emballage, pas à faire un tirage. Au-delà, on paie du stockage pour des
// pixels que personne ne regarde. C'était 2000 — le gain est réel et la
// lisibilité inchangée sur un écran de téléphone comme sur un PDF.
const CANVAS_MAX = 1600;          // côté le plus long, en pixels
const QUALITE_JPEG = 0.85;

/**
 * En dessous de ce poids, ré-encoder ne rapporte rien et dégraderait pour
 * rien : on garde le fichier tel quel.
 *
 * LE DÉFAUT QUE CE SEUIL CORRIGE. Le laissez-passer était à 4 Mo : tout JPEG
 * en dessous partait BRUT — donc en pleine résolution (4032 × 3024 sur un
 * téléphone courant) ET avec son EXIF. Or la quasi-totalité des photos de
 * téléphone pèsent entre 2 et 4 Mo : le chemin d'optimisation ne servait donc
 * qu'aux HEIC et aux fichiers énormes, c'est-à-dire presque jamais.
 *
 * Deux conséquences, l'une chère et l'autre pire :
 *   · une photo de 3,5 Mo restait 3,5 Mo au lieu de ~250 Ko — facteur 14 sur
 *     le seul poste de stockage qui grossit vraiment ;
 *   · son EXIF partait avec, y compris les COORDONNÉES GPS. Déposer la photo
 *     brute d'un salon, c'est stocker la position du domicile d'un client dans
 *     l'ERP : une donnée personnelle que personne n'a demandée et dont aucun
 *     traitement n'a besoin.
 *
 * Le ré-encodage par canvas ne recopie AUCUNE métadonnée : elles disparaissent
 * sans qu'il faille les traquer. Ce n'est donc pas qu'une économie, c'est de
 * la minimisation de données au sens du RGPD — et elle a lieu AVANT l'envoi,
 * donc la donnée inutile ne quitte même pas l'appareil.
 */
const SEUIL_INTACT = 400 * 1024;

/** Une photo est-elle déjà un JPEG/PNG affichable partout ? */
function dejaAffichable(type) {
  const t = String(type || "").toLowerCase();
  return t === "image/jpeg" || t === "image/png" || t === "image/webp";
}

/**
 * Décode `file` en bitmap. createImageBitmap gère tout ce que le navigateur
 * sait décoder — y compris le HEIC sur les plateformes Apple. Repli sur un
 * <img> + objectURL pour les navigateurs sans createImageBitmap.
 */
async function decoder(file) {
  if (typeof createImageBitmap === "function") {
    // `imageOrientation: "from-image"` explicite : la rotation EXIF est
    // APPLIQUÉE aux pixels avant que les métadonnées ne disparaissent. Sans
    // ça, une photo prise en portrait ressort couchée — le défaut classique
    // du redimensionnement maison, et il ne se voit qu'après coup.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  }
  // Repli : Image + objectURL.
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("indécodable")); };
    img.src = url;
  });
}

function dimensions(bitmap) {
  const w = bitmap.width || bitmap.naturalWidth || 0;
  const h = bitmap.height || bitmap.naturalHeight || 0;
  return { w, h };
}

/**
 * Normalise une photo en JPEG affichable. Renvoie un File image/jpeg.
 * @param {File} file
 * @returns {Promise<File>}
 * @throws si la photo ne peut pas être décodée (→ l'appelant refuse).
 */
export async function normaliserPhoto(file) {
  // Déjà léger : rien à gagner, et on éviterait juste une perte de qualité.
  if (dejaAffichable(file.type) && file.size <= SEUIL_INTACT) {
    return file;
  }

  let bitmap;
  try {
    bitmap = await decoder(file);
  } catch {
    // Le navigateur ne sait pas décoder ce fichier (HEIC sur Chrome/Android
    // typiquement). On refuse — pas de photo invisible.
    throw new Error("HEIC_NON_DECODABLE");
  }

  const { w, h } = dimensions(bitmap);
  if (!w || !h) throw new Error("HEIC_NON_DECODABLE");

  const echelle = Math.min(1, CANVAS_MAX / Math.max(w, h));
  const cw = Math.round(w * echelle);
  const ch = Math.round(h * echelle);

  const canvas = document.createElement("canvas");
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, cw, ch);
  if (bitmap.close) bitmap.close();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITE_JPEG));
  if (!blob) throw new Error("HEIC_NON_DECODABLE");

  // Si le ré-encodage n'allège pas, on garde l'original — une image déjà
  // optimisée par un autre outil ne gagne rien à repasser au four. On ne le
  // fait QUE pour un format déjà affichable partout : sur un HEIC, garder
  // l'original produirait une photo invisible hors Safari.
  if (dejaAffichable(file.type) && blob.size >= file.size) return file;

  // Nom en .jpg pour que tout soit cohérent (chemin, affichage, téléchargement).
  const nomBase = (file.name || "photo").replace(/\.[^.]+$/, "");
  return new File([blob], `${nomBase}.jpg`, { type: "image/jpeg" });
}
