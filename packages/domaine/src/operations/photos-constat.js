// =============================================================================
// LES PHOTOS DE CONSTAT — la preuve visuelle d'un écart terrain.
//
// Quand le terrain déclare un constat (piano non prévu, accès difficile), une
// photo vaut mieux qu'une description : le bureau décide sur pièce. Ce module
// est PUR — il valide ce qui peut être attaché (image, taille, nombre), il ne
// téléverse rien lui-même. L'upload passe par l'adaptateur (bucket privé).
// =============================================================================

/** Formats d'image acceptés. On reste sur ce que tout téléphone produit. */
export const TYPES_IMAGE = Object.freeze([
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
]);

/** Au plus 6 photos par constat — assez pour documenter, pas de déversoir. */
export const MAX_PHOTOS_CONSTAT = 6;

/** 12 Mo par photo — large pour un cliché de téléphone, borné quand même. */
export const TAILLE_MAX_PHOTO = 12 * 1024 * 1024;

/** Est-ce un type d'image accepté ? (tolère la casse et les variantes) */
export function typeImageAccepte(type) {
  return TYPES_IMAGE.includes(String(type || "").toLowerCase());
}

/**
 * Valide UNE photo candidate (avant upload).
 * @param {{ type?: string, size?: number }} f
 */
export function photoValide(f = {}) {
  if (!typeImageAccepte(f.type)) {
    return { ok: false, message: "Seules les photos (JPEG, PNG, WebP) sont acceptées." };
  }
  if (Number(f.size) > TAILLE_MAX_PHOTO) {
    return { ok: false, message: "Photo trop lourde (12 Mo maximum)." };
  }
  if (Number(f.size) <= 0) {
    return { ok: false, message: "Fichier vide." };
  }
  return { ok: true };
}

/**
 * Peut-on encore ajouter `combien` photos à un constat qui en a déjà `dejaLa` ?
 * Renvoie combien on peut réellement accepter, et un message si on déborde.
 */
export function placePourPhotos(dejaLa = 0, combien = 0) {
  const reste = Math.max(0, MAX_PHOTOS_CONSTAT - Number(dejaLa || 0));
  const accepte = Math.min(reste, Math.max(0, Number(combien || 0)));
  const refuse = Math.max(0, Number(combien || 0) - accepte);
  return {
    accepte, refuse, reste,
    message: refuse > 0
      ? `${MAX_PHOTOS_CONSTAT} photos maximum par constat — ${refuse} ignorée(s).`
      : null,
  };
}

/**
 * Filtre une liste de fichiers : ne garde que les photos valides, dans la
 * limite de place. Pur — l'appelant fait ensuite l'upload de `retenues`.
 * @returns {{ retenues: object[], rejets: {nom:string,message:string}[], message: string|null }}
 */
export function trierPhotos(fichiers = [], dejaLa = 0) {
  const valides = [];
  const rejets = [];
  for (const f of fichiers || []) {
    const v = photoValide(f);
    if (v.ok) valides.push(f);
    else rejets.push({ nom: f?.name || "photo", message: v.message });
  }
  const place = placePourPhotos(dejaLa, valides.length);
  const retenues = valides.slice(0, place.accepte);
  const messages = [];
  if (place.message) messages.push(place.message);
  return {
    retenues, rejets,
    message: messages.length ? messages.join(" ") : null,
  };
}
