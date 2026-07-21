// =============================================================================
// Catalogues réglables par entreprise.
//
// Trois listes que chaque entreprise adapte à sa façon de travailler :
//   - pieces           : les pièces proposées dans le relevé
//   - fournitures      : le matériel d'emballage facturable au client
//   - materiel_terrain : l'équipement de manutention (diable, planche…)
//
// Stockage : organisations.parametres_catalogues (jsonb).
// Une liste absente ou vide retombe sur le défaut : une entreprise nouvelle
// démarre avec un catalogue utilisable sans rien saisir.
//
// Le coût interne de chaque ligne alimente « Coûts internes » : ce que
// l'entreprise paie pour l'article, distinct du prix facturé au client.
// =============================================================================

/** Pièces proposées au relevé, dans l'ordre d'affichage. */
export const PIECES_DEFAUT = Object.freeze([
  "Salon", "Salle à manger", "Cuisine", "Chambre", "Chambre 2",
  "Bureau", "Salle de bain", "Cave", "Grenier", "Garage", "Jardin",
]);

/**
 * Fournitures d'emballage. cout_centimes = ce que l'article coûte à
 * l'entreprise, consommable = déduit du stock à chaque chantier.
 */
export const FOURNITURES_DEFAUT = Object.freeze([
  { cle: "carton_standard", nom: "Carton standard", unite: "pièce", cout_centimes: 150, consommable: true },
  { cle: "carton_livre", nom: "Carton livres", unite: "pièce", cout_centimes: 180, consommable: true },
  { cle: "carton_penderie", nom: "Carton penderie", unite: "pièce", cout_centimes: 900, consommable: true },
  { cle: "papier_bulle", nom: "Papier bulle (rouleau)", unite: "rouleau", cout_centimes: 1200, consommable: true },
  { cle: "papier_soie", nom: "Papier de soie (paquet)", unite: "paquet", cout_centimes: 800, consommable: true },
  { cle: "adhesif", nom: "Rouleau adhésif", unite: "rouleau", cout_centimes: 200, consommable: true },
  { cle: "housse_matelas", nom: "Housse matelas", unite: "pièce", cout_centimes: 400, consommable: true },
  { cle: "housse_canape", nom: "Housse canapé", unite: "pièce", cout_centimes: 600, consommable: true },
  { cle: "film_etirable", nom: "Film étirable", unite: "rouleau", cout_centimes: 1000, consommable: true },
]);

/**
 * Matériel de terrain — non consommable, il revient au dépôt.
 * cout_centimes sert à l'amortissement et au remplacement.
 */
export const MATERIEL_TERRAIN_DEFAUT = Object.freeze([
  { cle: "diable", nom: "Diable", unite: "pièce", cout_centimes: 12000, consommable: false },
  { cle: "planche_roulettes", nom: "Planche à roulettes", unite: "pièce", cout_centimes: 6500, consommable: false },
  { cle: "bandes_porter", nom: "Bandes à porter", unite: "paire", cout_centimes: 4500, consommable: false },
  { cle: "sangles", nom: "Sangles d'arrimage", unite: "pièce", cout_centimes: 1500, consommable: false },
  { cle: "couverture", nom: "Couverture de déménagement", unite: "pièce", cout_centimes: 1200, consommable: false },
  { cle: "chariot", nom: "Chariot plateau", unite: "pièce", cout_centimes: 9000, consommable: false },
  { cle: "monte_meuble", nom: "Monte-meuble / élévateur", unite: "journée", cout_centimes: 0, consommable: false },
  { cle: "protection_sol", nom: "Protection de sol", unite: "rouleau", cout_centimes: 2500, consommable: true },
  { cle: "boite_outils", nom: "Boîte à outils", unite: "pièce", cout_centimes: 5000, consommable: false },
]);

export const CATALOGUES_DEFAUT = Object.freeze({
  pieces: PIECES_DEFAUT,
  fournitures: FOURNITURES_DEFAUT,
  materiel_terrain: MATERIEL_TERRAIN_DEFAUT,
});

/** Description des listes, pour construire l'écran de réglage. */
export const LISTES_CATALOGUE = Object.freeze([
  {
    cle: "pieces", titre: "Pièces du relevé", icone: "🏠",
    resume: "Les pièces proposées lors du relevé chez le client.",
    texteSimple: true,
  },
  {
    cle: "fournitures", titre: "Fournitures d'emballage", icone: "📦",
    resume: "Cartons, papier, housses — facturables au client.",
  },
  {
    cle: "materiel_terrain", titre: "Matériel de terrain", icone: "🛠️",
    resume: "Diable, planche à roulettes, bandes à porter, sangles…",
  },
]);

/** Liste effective : le réglage de l'entreprise, sinon le défaut. */
export function catalogue(stockes, cle) {
  const perso = (stockes || {})[cle];
  if (Array.isArray(perso) && perso.length > 0) return perso;
  return CATALOGUES_DEFAUT[cle] || [];
}

/** Vrai si l'entreprise a personnalisé cette liste. */
export function estPersonnalise(stockes, cle) {
  const perso = (stockes || {})[cle];
  return Array.isArray(perso) && perso.length > 0;
}

/** Normalise une saisie en article exploitable. Renvoie null si inutilisable. */
export function normaliserArticle(brut, simple = false) {
  if (simple) {
    const nom = String(brut ?? "").trim();
    return nom || null;
  }
  const nom = String(brut?.nom ?? "").trim();
  if (!nom) return null;
  const cle = String(brut?.cle ?? "").trim()
    || nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const cout = Number(brut?.cout_centimes);
  return {
    cle,
    nom,
    unite: String(brut?.unite ?? "pièce").trim() || "pièce",
    cout_centimes: Number.isFinite(cout) && cout >= 0 ? Math.round(cout) : 0,
    consommable: brut?.consommable !== false,
  };
}

/**
 * Coûts internes dérivés des catalogues : une ligne par article ayant un coût.
 * C'est ce qui alimente automatiquement l'écran « Coûts internes » — ajouter
 * un article au matériel le fait apparaître dans les coûts, sans double saisie.
 */
export function coutsMateriel(stockes) {
  const lignes = [];
  for (const cle of ["fournitures", "materiel_terrain"]) {
    for (const a of catalogue(stockes, cle)) {
      if (!a || typeof a !== "object") continue;
      if (!(a.cout_centimes > 0)) continue;
      lignes.push({
        source: cle,
        cle: a.cle,
        nom: a.nom,
        unite: a.unite || "pièce",
        cout_centimes: a.cout_centimes,
        consommable: a.consommable !== false,
      });
    }
  }
  return lignes;
}

/** Total du coût unitaire de tout le matériel non consommable (parc). */
export function valeurParcMateriel(stockes) {
  return coutsMateriel(stockes)
    .filter((l) => !l.consommable)
    .reduce((t, l) => t + l.cout_centimes, 0);
}
