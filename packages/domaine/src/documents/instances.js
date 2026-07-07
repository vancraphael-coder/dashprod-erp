// =============================================================================
// Documents — Instanciation immuable
// Source : Réf. 2 (C-02 « le document n'existe pas » ; S6 « l'instance est
// immuable »). Résout le constat le plus grave du diagnostic.
// Logique PURE : geler le contenu d'un document à l'envoi/signature, calculer
// une empreinte déterministe (même contenu → même empreinte), et refuser toute
// mutation ultérieure. La persistance (fichier PDF, ligne SQL) est ailleurs ;
// ici, la garantie d'intégrité.
// =============================================================================

/**
 * Sérialise un contenu de manière STABLE (clés triées récursivement), pour que
 * l'empreinte ne dépende pas de l'ordre d'insertion des propriétés. Deux objets
 * sémantiquement identiques produisent la même chaîne, donc la même empreinte.
 * @param {*} valeur
 * @returns {string}
 */
export function serialiserStable(valeur) {
  if (valeur === null || typeof valeur !== "object") {
    return JSON.stringify(valeur);
  }
  if (Array.isArray(valeur)) {
    return "[" + valeur.map(serialiserStable).join(",") + "]";
  }
  const cles = Object.keys(valeur).sort();
  return "{" + cles.map((k) => JSON.stringify(k) + ":" + serialiserStable(valeur[k])).join(",") + "}";
}

/**
 * Empreinte déterministe d'un contenu (variante FNV-1a 32 bits, en hex).
 * Suffisante comme somme de contrôle d'intégrité déterministe et testable sans
 * dépendance ; en base, l'empreinte cryptographique SHA-256 est calculée côté
 * serveur (colonne empreinte_sha256, migration 0007). Les deux servent le même
 * but : détecter toute altération d'une instance figée.
 * @param {*} contenu
 * @returns {string} empreinte hexadécimale
 */
export function empreinte(contenu) {
  const s = serialiserStable(contenu);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Fige un document en instance immuable.
 * @param {Object} params
 * @param {string} params.modeleVersionId  version de modèle utilisée
 * @param {*}      params.contenu           données figées (déjà rendues)
 * @param {string} [params.cbdVersionId]    version C.B.D. jointe (offres)
 * @param {string} params.horodatage        ISO 8601 (fourni par l'appelant)
 * @returns {Readonly<Object>} instance gelée (Object.freeze) avec son empreinte
 */
export function figerInstance({ modeleVersionId, contenu, cbdVersionId, horodatage }) {
  if (!modeleVersionId) throw new Error("figerInstance : modeleVersionId requis");
  if (!horodatage) throw new Error("figerInstance : horodatage requis");
  const instance = {
    modeleVersionId,
    cbdVersionId: cbdVersionId || null,
    contenu,
    horodatage,
    empreinte: empreinte(contenu),
    statut: "generee",
  };
  return Object.freeze(instance);
}

/**
 * Vérifie qu'une instance figée n'a pas été altérée : recalcule l'empreinte de
 * son contenu et la compare à celle mémorisée. C'est le test d'intégrité qu'un
 * litige ou un audit pourra rejouer (C-02).
 * @param {{contenu: *, empreinte: string}} instance
 * @returns {boolean} true si intègre
 */
export function instanceIntacte(instance) {
  if (!instance || typeof instance.empreinte !== "string") return false;
  return empreinte(instance.contenu) === instance.empreinte;
}
