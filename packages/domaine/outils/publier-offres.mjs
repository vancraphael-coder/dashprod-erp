// =============================================================================
// PUBLIER LES OFFRES — le SQL de publication se DÉRIVE, il ne s'écrit pas.
//
// La table `offres` et le domaine portaient chacun leur version des mêmes
// chiffres, et ont divergé. La parade n'est pas la vigilance : c'est de n'avoir
// qu'une seule saisie. Le référentiel
// (packages/domaine/src/commercial/referentiel-offres.js) est cette saisie ;
// ce script en produit le bloc SQL, qui est collé tel quel dans la migration
// de publication.
//
// Un test (offres-referentiel.test.js) régénère le bloc et vérifie qu'il figure
// mot pour mot dans la migration : retoucher le SQL à la main casse l'arbre.
//
// Usage :  node packages/domaine/outils/publier-offres.mjs [publie_le ISO]
// =============================================================================

import { REFERENTIEL_OFFRES } from "../src/commercial/referentiel-offres.js";

const euros = (centimes) =>
  centimes == null ? "null" : String(Math.round(centimes) / 100);

const texte = (v) =>
  v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`;

const entier = (v) => (v == null ? "null" : String(v));

const tableau = (liste) =>
  liste.length === 0
    ? "'{}'::text[]"
    : `array[${liste.map((m) => `'${m}'`).join(",")}]`;

/**
 * Le bloc `insert` complet pour une date de publication donnée.
 * Idempotent : `on conflict do nothing`. Republier la même date ne fait rien,
 * republier à une nouvelle date ajoute une version sans toucher aux anciennes.
 */
export function sqlPublication(publieLe) {
  const lignes = REFERENTIEL_OFFRES.map((o) => [
    `  (${texte(o.code)}, ${texte(publieLe)}, ${texte(o.libelle)}, ${o.rang},`,
    `   ${o.souscriptible}, ${texte(o.statut)}, ${texte(o.secteur)}, ${texte(o.unite)},`,
    `   ${euros(o.prix_base_centimes)},`,
    `   ${o.prix_base_centimes == null || o.remise_annuelle_pct == null ? "null"
         : Math.round(o.prix_base_centimes * 12 * (100 - o.remise_annuelle_pct)) / 10000},`,
    `   ${entier(o.membres_limite)}, ${entier(o.membres_inclus)}, ${euros(o.prix_membre_supp_centimes)},`,
    `   ${entier(o.centres_limite)}, ${entier(o.centres_inclus)}, ${euros(o.prix_centre_supp_centimes)},`,
    `   ${tableau(o.modules)},`,
    `   ${o.prix_membre_supp_centimes == null || o.remise_annuelle_pct == null ? "null"
         : Math.round(o.prix_membre_supp_centimes * 12 * (100 - o.remise_annuelle_pct)) / 10000},`,
    `   ${o.prix_centre_supp_centimes == null || o.remise_annuelle_pct == null ? "null"
         : Math.round(o.prix_centre_supp_centimes * 12 * (100 - o.remise_annuelle_pct)) / 10000},`,
    `   ${entier(o.remise_annuelle_pct)})`,
  ].join("\n"));

  return [
    "insert into public.offres (",
    "  code, publie_le, libelle, rang,",
    "  souscriptible, statut, secteur, unite,",
    "  prix_base_htva_mensuel,",
    "  prix_base_htva_annuel,",
    "  membres_limite, membres_inclus, prix_membre_supp_htva,",
    "  centres_limite, centres_inclus, prix_centre_supp_htva,",
    "  modules,",
    "  prix_membre_supp_htva_annuel,",
    "  prix_centre_supp_htva_annuel,",
    "  remise_annuelle_pct)",
    "values",
    lignes.join(",\n"),
    "on conflict (code, publie_le) do nothing;",
  ].join("\n");
}

// Exécution directe : on écrit sur la sortie standard, à copier dans la
// migration. Pas d'écriture de fichier — une migration se relit avant d'exister.
if (process.argv[1] && process.argv[1].endsWith("publier-offres.mjs")) {
  const date = process.argv[2] || new Date().toISOString();
  process.stdout.write(`${sqlPublication(date)}\n`);
}
