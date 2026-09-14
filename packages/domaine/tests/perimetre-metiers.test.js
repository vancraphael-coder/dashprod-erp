// =============================================================================
// LE PÉRIMÈTRE DE CHAQUE MÉTIER — figé, donc vérifiable.
//
// CE QUE CE FICHIER EMPÊCHE. Un écran conçu pour un métier finit toujours par
// apparaître chez un autre : on ajoute une posture « pour que ce soit
// pratique », on oublie une condition, et un indépendant seul se retrouve
// devant l'écran de création de dossier de déménagement ou devant un bouton
// d'invitation que la base refusera. C'est déjà arrivé deux fois — la
// navigation d'entreprise servie à un indépendant, et le vivier de
// particuliers affiché sur son compte.
//
// Le registre dit qui voit quoi. Ces tests figent le RÉSULTAT, métier par
// métier. Toute variation devient visible : ajouter une posture à un écran
// casse l'arbre et oblige à dire pourquoi.
//
// LES DEUX CONDITIONS, rappelées parce que c'est là que les erreurs se
// glissent :
//   · le MODULE dit que l'offre a payé la capacité ;
//   · la POSTURE dit que cette personne-là en a l'usage.
// Un écran n'apparaît que si les deux sont vraies. Le module seul laisserait
// passer tous les métiers d'une même offre.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import { ECRANS } from "../src/produit/ecrans.js";
import { POSTURES, posturesDeLOffre, ancrageDeLOffre, posture }
  from "../src/produit/postures.js";
import { REGLAGES } from "../src/produit/reglages-portee.js";
import { REFERENTIEL_OFFRES, offreReferentiel }
  from "../src/commercial/referentiel-offres.js";
import { naturesDuMenu } from "../src/commercial/natures.js";

/**
 * Les écrans réellement atteignables dans une offre : module porté par
 * l'offre ET posture existant dans cette offre. Les écrans transverses
 * (connexion, compte, réglages) ne dépendent d'aucun métier.
 */
function ecransDeLOffre(code) {
  const o = offreReferentiel(code);
  const postures = new Set(posturesDeLOffre(code).map((p) => p.cle));
  return ECRANS.filter((e) => {
    if (e.etat === "manquant") return false;
    if (e.transverse) return false;
    if (e.module !== null && !o.modules.includes(e.module)) return false;
    return e.postures.some((p) => postures.has(p));
  }).map((e) => e.cle).sort();
}

/** Les réglages réellement atteignables dans une offre, même règle. */
function reglagesDeLOffre(code) {
  const o = offreReferentiel(code);
  const postures = new Set(posturesDeLOffre(code).map((p) => p.cle));
  return REGLAGES.filter((r) => {
    if (r.etat !== "livre") return false;
    if (r.module !== null && !o.modules.includes(r.module)) return false;
    return r.postures.some((p) => postures.has(p));
  }).map((r) => r.cle).sort();
}

test("L'INDÉPENDANT — périmètre figé, et rien de plus", () => {
  // Le métier le plus étroit, et celui où une fuite se voit tout de suite :
  // il est SEUL. Tout écran d'équipe, de dossier de déménagement ou de dépôt
  // qui apparaît ici est une erreur.
  // VINGT écrans. Un indépendant A des dossiers — il les reçoit en
  // sous-traitance, il y pointe, il les facture. Ce qu'il n'a pas, c'est la
  // panoplie de CRÉATION : voir le test sur les natures du menu « + ».
  assert.deepEqual(ecransDeLOffre("independant_manutention"), [
    "abonnement", "apparence", "carnet", "confidentialite", "conversations",
    "dossier", "facture", "facture_doc", "fil_messages", "identite",
    "liste_affaires", "ma_disponibilite", "mes_missions", "molettes_couleur",
    "planning", "rapport_chantier", "rituel_independant", "signature_offre",
    "terrain", "vente_rapide",
  ]);

  const interdits = ["releve", "devis", "offre", "equipe", "ressources",
                     "centres", "stockage", "paie", "heures", "comptabilite",
                     "espace_client", "materiel", "journal",
                     "demandes_reseau", "confier_mission"];
  const vus = ecransDeLOffre("independant_manutention");
  for (const x of interdits) {
    assert.ok(!vus.includes(x),
      `« ${x} » ne concerne pas un indépendant seul`);
  }
});

test("L'INDÉPENDANT — ses réglages, et rien de plus", () => {
  assert.deepEqual(reglagesDeLOffre("independant_manutention"), [
    "abonnement", "apparence", "confidentialite", "disponibilites",
    "facturation", "identite",
  ]);
  for (const x of ["cout", "services", "roles", "depots", "stockage",
                   "contrats", "bareme", "textes", "materiel_terrain"]) {
    assert.ok(!reglagesDeLOffre("independant_manutention").includes(x),
      `le réglage « ${x} » ne concerne pas un indépendant`);
  }
});

test("LE MENU « + » — on ne propose que ce que l'offre permet de créer", () => {
  // L'encadrement se fait là où le GESTE commence. Le menu proposait les six
  // natures à tout le monde, dont « Déménagement » avec relevé, emballage et
  // fournitures — à un indépendant dont l'offre n'ouvre ni `releve` ni
  // `devis`. Créer un dossier qu'on ne peut pas traiter est un cul-de-sac.
  const menu = (code) =>
    naturesDuMenu(offreReferentiel(code).modules).map((n) => n.cle);

  assert.deepEqual(menu("independant_manutention"), ["sous_traitance"],
    "un indépendant est sous-traitant, et c'est tout ce qu'il crée");
  assert.ok(menu("starter").includes("demenagement"));
  assert.ok(!menu("starter").includes("boxe"), "pas de box sans stockage 3D");
  assert.ok(menu("pro").includes("boxe"));
  assert.ok(menu("pro").includes("zone"));
});

test("BASIQUE — pas de dépôt, donc pas d'écran de dépôt", () => {
  // `centres_limite` vaut 0 en Basique : la posture `depot` n'existe pas. Ce
  // n'est pas un écran caché, c'est une fonction qui n'existe pas dans ces
  // entreprises.
  const vus = ecransDeLOffre("starter");
  for (const x of ["centres", "rapport_centres", "stockage",
                   "contrats_stockage"]) {
    assert.ok(!vus.includes(x), `« ${x} » suppose un dépôt, absent de Basique`);
  }
  // Et ce qui DOIT y être : le circuit de vente complet.
  for (const x of ["releve", "devis", "offre", "facture", "terrain",
                   "carnet", "liste_affaires", "dossier"]) {
    assert.ok(vus.includes(x), `Basique doit ouvrir « ${x} »`);
  }
});

test("REGULAR — le B2B s'ouvre, le multi-dépôt reste fermé", () => {
  const vus = ecransDeLOffre("regular");
  for (const x of ["facture_peppol", "comptabilite", "paie", "journal"]) {
    assert.ok(vus.includes(x), `Regular doit ouvrir « ${x} »`);
  }
  for (const x of ["centres", "rapport_centres", "stockage"]) {
    assert.ok(!vus.includes(x), `« ${x} » est réservé à Pro`);
  }
});

test("PRO — le seul métier à porter le dépôt", () => {
  const vus = ecransDeLOffre("pro");
  for (const x of ["centres", "rapport_centres", "stockage",
                   "contrats_stockage"]) {
    assert.ok(vus.includes(x), `Pro doit ouvrir « ${x} »`);
  }
  // Un métier n'hérite pas de l'autre par accident : Pro contient Regular.
  for (const x of ecransDeLOffre("regular")) {
    assert.ok(vus.includes(x), `Pro devrait contenir « ${x} » (hérité de Regular)`);
  }
});

test("les offres sectorielles non construites n'ouvrent aucun écran métier", () => {
  // Leurs modules sont vides tant que leur parcours n'existe pas : aucun écran
  // conditionné par un module ne doit donc apparaître. Si l'un le fait, c'est
  // qu'il est déclaré sans module — donc ouvert à tout le monde par erreur.
  for (const code of ["donneur_ordre", "garde_meubles", "groupe_liftier",
                      "logistique_mobilier"]) {
    const o = offreReferentiel(code);
    assert.equal(o.modules.length, 0, `${code} porte des modules maintenant`);
    for (const cle of ecransDeLOffre(code)) {
      const e = ECRANS.find((x) => x.cle === cle);
      assert.equal(e.module, null,
        `${code} ouvre « ${cle} » sans porter son module`);
    }
  }
});

test("chaque offre a un ancrage, et cet ancrage lui est atteignable", () => {
  // L'ancrage codé en dur à « liste » faisait atterrir un indépendant sur les
  // dossiers de déménagement. Il se déclare désormais avec la posture — et
  // doit être un écran que l'offre ouvre réellement, sinon on ancre sur du
  // vide.
  for (const o of REFERENTIEL_OFFRES) {
    const a = ancrageDeLOffre(o.code);
    assert.ok(a, `${o.code} n'a aucun ancrage`);
    if (o.modules.length === 0) continue;   // offre non construite
    assert.ok(ecransDeLOffre(o.code).includes(a),
      `${o.code} ancre sur « ${a} », qui ne lui est pas atteignable`);
  }
});

test("chaque posture déclare son ancrage", () => {
  for (const p of POSTURES) {
    assert.ok(p.ancrage, `la posture ${p.cle} n'a pas d'ancrage`);
    const e = ECRANS.find((x) => x.cle === p.ancrage);
    assert.ok(e, `l'ancrage « ${p.ancrage} » de ${p.cle} n'est pas un écran`);
  }
});

test("l'ancrage de l'indépendant est son rituel, pas les dossiers", () => {
  // Le défaut signalé à la mise en service, figé pour ne pas revenir.
  assert.equal(posture("independant").ancrage, "rituel_independant");
  assert.equal(ancrageDeLOffre("independant_manutention"), "rituel_independant");
  assert.notEqual(ancrageDeLOffre("independant_manutention"), "liste");
});

test("aucun écran ne s'adresse à toutes les postures à la fois", () => {
  // Un écran visible par les neuf postures n'encadre plus rien : c'est un
  // écran transverse qui n'a pas été déclaré comme tel.
  const total = POSTURES.length;
  for (const e of ECRANS) {
    if (e.transverse) continue;
    assert.ok(e.postures.length < total,
      `« ${e.cle} » s'adresse à toutes les postures : le déclarer transverse`);
  }
});
