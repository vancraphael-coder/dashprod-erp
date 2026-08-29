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

const CANVAS_MAX = 2000;          // côté le plus long, en pixels
const QUALITE_JPEG = 0.85;

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
    return await createImageBitmap(file);   // lève si le format est indécodable
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
  // Un JPEG/PNG raisonnable et pas énorme : on le laisse tel quel (rien à
  // gagner à le ré-encoder, on éviterait juste une perte de qualité).
  if (dejaAffichable(file.type) && file.size <= 4 * 1024 * 1024) {
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

  // Nom en .jpg pour que tout soit cohérent (chemin, affichage, téléchargement).
  const nomBase = (file.name || "photo").replace(/\.[^.]+$/, "");
  return new File([blob], `${nomBase}.jpg`, { type: "image/jpeg" });
}
