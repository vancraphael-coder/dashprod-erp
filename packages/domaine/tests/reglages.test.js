// =============================================================================
// L'ORGANISATION DES RÉGLAGES — testée sur les DONNÉES, pas sur le source.
//
// Ces règles étaient « vérifiées » en comptant des motifs dans le texte de
// `Parametres.jsx`. Compter des `titre: "` dans un fichier prouve une mise en
// page, pas un comportement : le jour où quelqu'un écrit la même chose
// autrement, le test rougit sans qu'il y ait de faute — et le jour où le
// rangement casse vraiment sans changer la forme, il reste vert.
//
// La logique vivant désormais dans le domaine, on l'exerce.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { famillesReglages, filtrerReglages, compterReglages }
  from "../src/organisation/reglages.js";
import { LISTES_CATALOGUE } from "../src/stocks/catalogues.js";

const PRO = ["multi_depots", "stockage_3d", "comptabilite", "journal"];
const tout = (modules = PRO) => famillesReglages({
  modules, listesCatalogue: LISTES_CATALOGUE, organisation: {},
});

test("cinq à sept familles : en deçà on n'a rien rangé, au-delà on éparpille", () => {
  const f = tout();
  assert.ok(f.length >= 5 && f.length <= 7, `${f.length} familles`);
});

test("aucune famille solitaire — en offre Pro comme en offre Basique", () => {
  // CE QUI CASSE SANS CE TEST : un titre de section pour un item unique double
  // la hauteur sans rien apprendre. Et le cas VRAIMENT dangereux n'est pas
  // l'offre Pro — c'est l'offre Basique, où le filtrage retire des entrées et
  // peut laisser une famille à une seule ligne. On ne le voit jamais en
  // développant : on développe toujours tous modules ouverts.
  for (const modules of [PRO, [], ["journal"], ["stockage_3d"], ["comptabilite"]]) {
    for (const f of tout(modules)) {
      assert.ok(f.entrees.length >= 2,
        `famille solitaire « ${f.titre} » avec modules=[${modules}]`);
    }
  }
});

test("une porte fermée par l'abonnement ne s'affiche pas du tout", () => {
  // Pas grisée, pas « à débloquer » : absente. La base refuse de toute façon
  // l'accès ; l'afficher ne ferait qu'un clic inutile et une publicité pour ce
  // qu'on n'a pas acheté.
  const cles = (mods) => tout(mods).flatMap((f) => f.entrees.map((e) => e.cle));
  const basique = cles([]);
  for (const ferme of ["depots", "stockage", "contrats", "comptabilite", "journal"]) {
    assert.equal(basique.includes(ferme), false,
      `« ${ferme} » ne doit pas s'afficher sans son module`);
  }
  // Et ce qui appartient au socle reste, sinon on aurait tout coupé.
  for (const socle of ["identite", "bareme", "facturation", "archivage", "abonnement"]) {
    assert.ok(basique.includes(socle), `« ${socle} » doit rester en offre Basique`);
  }
});

test("une famille entièrement fermée disparaît, titre compris", () => {
  // « Mon dépôt » ne contient que des entrées gardées par stockage_3d. Sans le
  // module, elle ne doit pas laisser un cadre vide sous son titre : un
  // conteneur creux ressemble à un bug.
  const titres = tout([]).map((f) => f.titre);
  assert.equal(titres.includes("Mon dépôt"), false);
  assert.ok(tout(["stockage_3d"]).map((f) => f.titre).includes("Mon dépôt"));
});

test("les coûts internes et l'abonnement ne sont PAS dans la même famille", () => {
  // Le rangement précédent les réunissait sous « Ce que ça vous coûte ». Ce
  // sont deux sujets sans rapport : l'un est votre métier (taux horaire,
  // carburant), l'autre est ce que vous payez à Dashprod. Les mélanger, c'est
  // ranger un devis fournisseur avec sa propre facture d'électricité.
  const f = tout();
  const familleDe = (cle) => f.find((x) => x.entrees.some((e) => e.cle === cle))?.cle;
  assert.notEqual(familleDe("cout"), familleDe("abonnement"));
  assert.equal(familleDe("cout"), "couts");
  assert.equal(familleDe("abonnement"), "dashprod");
});

test("consulter n'est pas régler : les écrans de lecture ont leur famille", () => {
  // Comptabilité, Journal et Archivage ne se règlent pas — ils s'ouvrent pour
  // regarder. Mélangés aux réglages, ils allongeaient la page sans qu'on
  // comprenne pourquoi elle était longue.
  const consulter = tout().find((f) => f.cle === "consulter");
  assert.ok(consulter, "la famille « Consulter » existe");
  for (const cle of ["comptabilite", "journal", "archivage"]) {
    assert.ok(consulter.entrees.some((e) => e.cle === cle), cle);
  }
});

test("chaque entrée sait se dire : une clé, un titre, une icône", () => {
  // Une entrée sans titre laisserait une ligne muette ; sans clé, l'écran ne
  // saurait pas où l'envoyer.
  const vues = new Set();
  for (const f of tout()) {
    for (const e of f.entrees) {
      assert.ok(e.cle && e.titre && e.icone, `entrée incomplète : ${JSON.stringify(e)}`);
      assert.equal(vues.has(e.cle), false, `clé en double : ${e.cle}`);
      vues.add(e.cle);
    }
  }
});

test("la recherche traverse les familles, et rend une structure vide plutôt que rien", () => {
  const f = tout();
  const tva = filtrerReglages(f, "TVA");
  assert.ok(compterReglages(tva) >= 1, "« TVA » doit trouver les réglages de facturation");
  // On peut chercher par NOM DE FAMILLE : c'est utile précisément quand on ne
  // se souvient pas du nom exact du réglage.
  assert.ok(compterReglages(filtrerReglages(f, "dépôt")) >= 1);
  // Une recherche sans résultat rend un tableau vide, pas null : l'écran
  // affiche « aucun réglage » au lieu de planter sur une longueur indéfinie.
  const rien = filtrerReglages(f, "zzzzzz");
  assert.deepEqual(rien, []);
  // Une requête vide ne filtre rien.
  assert.equal(compterReglages(filtrerReglages(f, "  ")), compterReglages(f));
});

test("le badge d'identité dit l'état réel, il ne le mémorise pas", () => {
  // Un badge « complète » sur une identité incomplète laisserait partir un
  // devis à en-tête vide.
  const entree = (org) => famillesReglages({
    modules: PRO, listesCatalogue: LISTES_CATALOGUE, organisation: org,
  })[0].entrees[0];
  assert.match(entree({}).badge, /manquant/);
  assert.equal(entree({}).actif, true);
  const complete = {
    nom: "X", bce: "BE0123456789", tva: "BE0123456789", adresse: "R 1",
    cp: "1000", ville: "Bruxelles", tel: "02", email: "a@b.be",
    iban: "BE68539007547034",
  };
  assert.equal(entree(complete).badge, "complète");
  assert.equal(entree(complete).actif, false);
  // Un IBAN faux ne doit pas passer pour un champ manquant : ce n'est pas le
  // même geste de correction.
  assert.equal(entree({ ...complete, iban: "BE00000000000000" }).badge, "champ invalide");
});

test("une famille réduite à une entrée se dissout, l'entrée n'est pas perdue", () => {
  // CE QUI CASSE SANS CE TEST : en offre Basique, « Consulter » ne contenait
  // plus qu'Archivage — un titre de section pour un item unique. Le premier
  // réflexe serait de supprimer la famille ; ce serait perdre le réglage.
  // Il se replie sur « Mon entreprise ».
  const basique = tout([]);
  assert.equal(basique.some((f) => f.cle === "consulter"), false,
    "« Consulter » se dissout quand elle n'a plus qu'Archivage");
  const entreprise = basique.find((f) => f.cle === "entreprise");
  assert.ok(entreprise.entrees.some((e) => e.cle === "archivage"),
    "Archivage rejoint « Mon entreprise » — il n'est jamais perdu");
  // Aucune entrée non gardée ne disparaît, quel que soit l'abonnement.
  for (const modules of [[], ["journal"], ["comptabilite"], PRO]) {
    const cles = tout(modules).flatMap((f) => f.entrees.map((e) => e.cle));
    for (const socle of ["identite", "bareme", "facturation", "textes", "cout",
                         "services", "fermetures", "archivage", "abonnement",
                         "apparence", "confidentialite"]) {
      assert.ok(cles.includes(socle),
        `« ${socle} » perdu avec modules=[${modules}]`);
    }
  }
});
