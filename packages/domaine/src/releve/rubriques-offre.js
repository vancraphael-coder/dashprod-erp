// =============================================================================
// LES RUBRIQUES D'OFFRE — l'aiguillage de COMPOSITION.
//
// Deux aiguillages coexistent dans le domaine, pour deux questions distinctes :
//   · `chiffrage/scenario-nature.js` choisit le moteur de PRIX. Il importe lift
//     ET sous-traitance : la plomberie ne peut donc pas l'appeler sans hériter
//     de ces métiers (le test d'architecture le refuse, à juste titre).
//   · CE fichier choisit les RUBRIQUES qu'un document annonce selon la nature.
//     Il n'importe, aujourd'hui, que le déménagement — parce que lui seul a des
//     rubriques d'offre propres (volume, articles à démonter/remonter). Il est
//     donc sûr à appeler depuis la plomberie : l'importer n'entraîne aucun
//     autre métier.
//
// Pourquoi cet aiguillage existe : le composeur d'offre (`adaptateur.js`,
// horizontal) importait `releve/volumetrie.js` en direct — le socle dépendait
// d'un métier (dérogation 2026-08-17). Il passe désormais par cette porte, qui
// assemble les rubriques SELON la nature. La flèche repart dans le bon sens.
//
// Le jour où le lift ou le garde-meubles voudront leurs rubriques, on ajoute
// ici une branche et l'import de LEUR module — et cet aiguillage sera déclaré
// dans architecture.js pour rester le seul point qui connaît plusieurs métiers
// côté documents.
// =============================================================================

import {
  volumeTotal, articlesADemonter, articlesARemonter, articlesAvecRemarque,
} from "./volumetrie.js";
import { nature as natureDe } from "../commercial/natures.js";
import { valoriserEmballage } from "../stocks/emballage.js";

/**
 * Les rubriques d'un déménagement, à partir de l'inventaire du relevé.
 * @param {any[]} inventaire
 */
function rubriquesDemenagement(inventaire) {
  return {
    volume_m3: volumeTotal(inventaire),
    a_demonter: articlesADemonter(inventaire),
    a_remonter: articlesARemonter(inventaire),
    remarques_articles: articlesAvecRemarque(inventaire),
  };
}

/**
 * Les rubriques que l'offre annonce, choisies selon la nature. Le composeur
 * fusionne l'objet rendu sans savoir ce qu'il contient — c'est ce qui le
 * dispense de connaître le moindre module de métier.
 *
 * @param {string} cle nature de l'affaire
 * @param {{inventaire?: any[]}} entrees
 * @returns {object} rubriques à fusionner ; objet VIDE (jamais null) pour une
 *   nature sans rubrique propre — une absence de rubrique n'est pas une erreur.
 */
export function rubriquesOffre(cle, entrees = {}) {
  const n = natureDe(cle) || natureDe("demenagement");
  if (n.chiffrage === "volume") {
    return rubriquesDemenagement(entrees.inventaire || []);
  }
  return {};
}

/**
 * LES FOURNITURES facturables d'un dossier — vente de BIENS, distincte de la
 * prestation.
 *
 * Passe par cet aiguillage pour la même raison que les rubriques : le
 * composeur de facture est horizontal et n'a pas à connaître `stocks/emballage`
 * (test d'architecture). Ici, on a le droit.
 *
 * Vendre un carton n'est pas prester une manutention : ce sont deux catégories
 * d'opération (§4.18), qui n'ont pas le même traitement comptable — et le
 * client a le droit de voir ce qu'il achète, dénommé et quantifié, plutôt
 * qu'un total opaque.
 *
 * @param {string} cle nature de l'affaire
 * @param {object} entrees { emballage, catalogueFournitures }
 * @returns {object[]} lignes prêtes à poser sur la facture (vide si aucune)
 */
export function lignesFournitures(cle, entrees = {}) {
  const n = natureDe(cle) || natureDe("demenagement");
  // Seules les natures qui consomment de l'emballage en produisent.
  if (n.chiffrage !== "volume") return [];

  const v = valoriserEmballage(entrees.emballage || {},
                               entrees.catalogueFournitures || []);
  return (v.lignes || [])
    .filter((l) => l.montant_centimes > 0)
    .map((l) => ({
      type: "fourniture",
      categorie_operation: "vente_biens",
      libelle: `${l.nom} (${l.quantite} ${l.unite})`,
      quantite: l.quantite,
      unite: l.unite,
      prix_unitaire_centimes: l.cout_unitaire_centimes,
      montant_htva_centimes: l.montant_centimes,
    }));
}
