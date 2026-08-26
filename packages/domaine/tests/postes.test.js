// =============================================================================
// LES POSTES — la grille de permissions, sa hiérarchie, et qui confie les accès.
//
// Ce que ces tests protègent : la traduction « 13 capacités éparses » → « des
// postes lisibles et rangés ». Une erreur ici, et un déménageur se retrouve à
// pouvoir émettre des factures, ou une secrétaire à distribuer les accès sans
// qu'on le lui ait permis.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  POSTES, PAGES_MODIFIABLES, poste, capacitesDuPoste, posteADroit,
  postePromu, posteRetrograde, peutConfierAcces, peutOctroyerConfiance,
  accesVisiteTerrain, visiteTerrainPeutModifier, capacitesFantomes,
} from "../src/rh/postes.js";
import { CAPACITES } from "../src/rh/capacites.js";

test("aucun poste ne cite une capacité qui n'existe pas", () => {
  // CE QUI CASSE SANS CE TEST : une faute de frappe (« voir_paye ») dans un
  // paquet de poste accorde silencieusement rien du tout, ou fait échouer la
  // migration qui synchronise `role_capacites`. Le poste s'affiche complet
  // mais ne donne pas le droit annoncé.
  assert.deepEqual(capacitesFantomes(), [],
    "un poste référence une capacité inconnue");
});

test("les 11 profils demandés existent, nommés", () => {
  const attendus = ["fondateur", "gerant", "secretaire", "chef_equipe",
    "livreur", "monteur", "chauffeur", "liftier", "demenageur",
    "interimaire", "visite_terrain"];
  for (const cle of attendus) {
    assert.ok(poste(cle), `le poste « ${cle} » doit exister`);
  }
  assert.equal(POSTES.length, attendus.length, "ni plus, ni moins");
});

test("les cinq métiers d'exécution ont EXACTEMENT les mêmes droits", () => {
  // La distinction voulue par Raphaël : métier ≠ permission. Un chauffeur et un
  // déménageur font des choses différentes sur le terrain, mais le logiciel
  // leur ouvre la même chose. Les séparer en droits ne ferait qu'égarer.
  const refs = capacitesDuPoste("demenageur");
  for (const cle of ["livreur", "monteur", "chauffeur", "liftier"]) {
    assert.deepEqual(capacitesDuPoste(cle), refs,
      `« ${cle} » doit avoir les mêmes droits qu'un déménageur`);
    // …mais un métier distinct (l'étiquette, elle, diffère).
    assert.equal(poste(cle).metier, cle);
  }
});

test("la hiérarchie n'est PAS un empilement pur : le bureau ne clôture pas un chantier", () => {
  // NUANCE DE CONCEPTION, à assumer explicitement. `cloturer_chantier` est un
  // geste de TERRAIN — arrêter sur place le décompte de toute l'équipe. La
  // secrétaire, au bureau, ne l'a pas, même si son rang dépasse celui du chef
  // d'équipe. « Plus haut dans la hiérarchie » ne veut pas dire « surensemble
  // de tous les droits du dessous » : direction ≠ terrain.
  //
  // Ce que la promotion garantit vraiment : monter vers la DIRECTION ouvre
  // l'argent et les réglages. C'est cette montée-là qui compte, pas un
  // empilement mécanique.
  assert.equal(posteADroit("chef_equipe", "cloturer_chantier"), true);
  assert.equal(posteADroit("secretaire", "cloturer_chantier"), false,
    "le bureau ne clôture pas un chantier — c'est un geste de terrain");
  // En revanche, DANS la voie direction, chaque cran ajoute sans retirer.
  const secr = new Set(capacitesDuPoste("secretaire"));
  for (const c of secr) {
    assert.ok(posteADroit("gerant", c),
      `le gérant doit garder « ${c} » de la secrétaire`);
    assert.ok(posteADroit("fondateur", c),
      `le fondateur doit garder « ${c} » de la secrétaire`);
  }
  // Et le socle de terrain se retrouve partout, du bas au sommet : tout le
  // monde peut pointer et signaler le matériel.
  for (const cle of ["demenageur", "chef_equipe", "secretaire", "gerant", "fondateur"]) {
    assert.ok(posteADroit(cle, "pointer_chantier"), `${cle} pointe`);
    assert.ok(posteADroit(cle, "signaler_materiel"), `${cle} signale le matériel`);
  }
});

test("le terrain ne voit ni les prix, ni la paie, ni la facturation", () => {
  // Le cœur de la séparation : un exécutant ne doit pas voir l'argent.
  for (const cle of ["demenageur", "livreur", "monteur", "chauffeur",
                     "liftier", "chef_equipe", "interimaire"]) {
    for (const interdit of ["voir_prix", "voir_paie", "emettre_facture",
                            "gerer_referentiels"]) {
      assert.equal(posteADroit(cle, interdit), false,
        `« ${cle} » ne doit pas avoir « ${interdit} »`);
    }
  }
});

test("la secrétaire administre mais ne touche ni à la paie ni à la facture", () => {
  assert.ok(posteADroit("secretaire", "creer_affaire"));
  assert.ok(posteADroit("secretaire", "gerer_planning"));
  assert.equal(posteADroit("secretaire", "voir_paie"), false);
  assert.equal(posteADroit("secretaire", "emettre_facture"), false);
  assert.equal(posteADroit("secretaire", "gerer_referentiels"), false);
});

test("seuls fondateur et gérant ouvrent l'argent et les réglages", () => {
  for (const cle of ["fondateur", "gerant"]) {
    for (const droit of ["voir_paie", "emettre_facture", "gerer_referentiels"]) {
      assert.ok(posteADroit(cle, droit), `${cle} doit avoir ${droit}`);
    }
  }
});

test("promouvoir monte d'un cran ; les métiers de même rang sautent au-dessus", () => {
  // Cinq métiers partagent le rang 4 : promouvoir un déménageur mène au chef
  // d'équipe (rang 3), pas à « chauffeur » de même rang.
  assert.equal(postePromu("demenageur").cle, "chef_equipe");
  assert.equal(postePromu("chauffeur").cle, "chef_equipe");
  assert.equal(postePromu("chef_equipe").cle, "secretaire");
  assert.equal(postePromu("secretaire").cle, "gerant");
  assert.equal(postePromu("gerant").cle, "fondateur");
  assert.equal(postePromu("fondateur"), null, "le sommet ne se promeut pas");
});

test("rétrograder descend d'un cran, symétrique de la promotion", () => {
  assert.equal(posteRetrograde("fondateur").cle, "gerant");
  assert.equal(posteRetrograde("gerant").cle, "secretaire");
  assert.equal(posteRetrograde("secretaire").cle, "chef_equipe");
  // Sous le chef d'équipe, le rang 4 : on tombe sur le premier de ce rang.
  assert.equal(posteRetrograde("chef_equipe").rang, 4);
  assert.equal(posteRetrograde("interimaire"), null, "le bas ne se rétrograde pas");
});

test("l'accès sur mesure n'entre pas dans l'échelle de promotion", () => {
  // On ne « promeut » personne EN visite terrain : c'est une bascule
  // explicite, pas un cran de la hiérarchie.
  assert.equal(postePromu("visite_terrain"), null);
  assert.equal(posteRetrograde("visite_terrain"), null);
});

test("confier les accès : gérant de droit, secrétaire si octroyée, terrain jamais", () => {
  // La règle exacte de Raphaël.
  assert.equal(peutConfierAcces("fondateur"), true);
  assert.equal(peutConfierAcces("gerant"), true);
  assert.equal(peutConfierAcces("secretaire", false), false, "sans octroi : non");
  assert.equal(peutConfierAcces("secretaire", true), true, "avec octroi : oui");
  for (const cle of ["chef_equipe", "demenageur", "chauffeur", "interimaire"]) {
    assert.equal(peutConfierAcces(cle, true), false,
      `le terrain ne confie jamais les accès, même « octroyé » (${cle})`);
  }
});

test("l'octroi à une secrétaire ne peut venir que d'un fondateur ou d'un gérant", () => {
  // CE QUI CASSE SANS CE TEST : une secrétaire à qui l'on a octroyé la
  // confiance pourrait l'octroyer à une autre — une élévation de privilège en
  // chaîne. Seul le haut de la hiérarchie octroie.
  assert.equal(peutOctroyerConfiance("fondateur"), true);
  assert.equal(peutOctroyerConfiance("gerant"), true);
  assert.equal(peutOctroyerConfiance("secretaire"), false);
  assert.equal(peutOctroyerConfiance("chef_equipe"), false);
});

test("visite terrain : lecture seule par défaut, écriture page par page", () => {
  // Raphaël : « définir la sélection multiple des pages que l'acteur pourra
  // modifier ». Sans page, on ne peut que consulter.
  assert.equal(accesVisiteTerrain([]).lectureSeule, true);
  const a = accesVisiteTerrain(["planning", "dossiers"]);
  assert.equal(a.lectureSeule, false);
  assert.deepEqual(a.pagesModifiables, ["dossiers", "planning"]);
  assert.ok(visiteTerrainPeutModifier(["planning"], "planning"));
  assert.equal(visiteTerrainPeutModifier(["planning"], "releve"), false);
});

test("une page inconnue ne peut pas être ouverte en écriture", () => {
  // CE QUI CASSE SANS CE TEST : passer « paie » ou « parametres » (absents du
  // catalogue partageable) ouvrirait l'écriture sur un écran sensible par une
  // porte dérobée. On ignore l'inconnu.
  const a = accesVisiteTerrain(["planning", "paie", "parametres", "n_importe_quoi"]);
  assert.deepEqual(a.pagesModifiables, ["planning"], "seule la page connue passe");
});

test("le catalogue de pages ne contient rien de sensible", () => {
  // On ne rend JAMAIS partageable la paie, les paramètres, la facturation ou la
  // compta : ces écrans ne s'ouvrent pas à un accès sur mesure.
  const cles = PAGES_MODIFIABLES.map((p) => p.cle);
  for (const sensible of ["paie", "parametres", "facture", "compta",
                          "comptabilite", "abonnement"]) {
    assert.equal(cles.includes(sensible), false,
      `« ${sensible} » ne doit pas être une page modifiable par visite terrain`);
  }
});

test("chaque poste se présente : titre, résumé, rang", () => {
  for (const p of POSTES) {
    assert.ok(p.titre && p.resume, `${p.cle} : titre et résumé requis`);
    assert.equal(typeof p.rang, "number", `${p.cle} : rang numérique requis`);
  }
});
