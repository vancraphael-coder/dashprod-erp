// =============================================================================
// LES CARTES MÉTIER — le catalogue, l'effectif vendu, et le tri.
//
// Trois sujets, un seul fichier, parce qu'ils tiennent au même défaut : la
// carte d'une mission ne savait pas ce qu'on avait VENDU. Elle comparait
// l'équipe à une constante du code et triait les gens dans l'ordre de la base.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  CARTES_METIER, carteMetier, cartesDeNature, cartePrincipale,
  effectifAttendu, origineEffectif, trierMembres, trierVehicules,
  grouperVehicules, titreCategorie, CATEGORIES_VEHICULE,
} from "../src/metiers/cartes.js";
import {
  EXIGENCES, exigence, effectifRequis, etatAffectation, resumeEffectif,
} from "../src/planning/affectation.js";
import { NATURES } from "../src/commercial/natures.js";
import { verdictEquipe, affectationDepuisEquipes, missionsImpactees, modeleDepuisEquipe } from "../src/planning/equipes.js";

/* ── Le catalogue ────────────────────────────────────────────────────────── */

test("chaque carte est complète : sans quoi elle s'affiche muette", () => {
  for (const c of CARTES_METIER) {
    assert.ok(c.cle && c.titre && c.role, `carte incomplète : ${c.cle}`);
    assert.ok(Array.isArray(c.natures) && c.natures.length > 0,
      `${c.cle} n'est rattachée à aucune nature — elle n'apparaîtrait nulle part`);
    assert.ok(c.effectif?.plancher >= 1, `${c.cle} : plancher d'effectif absent`);
    assert.ok(c.vehicule?.besoin, `${c.cle} : besoin de véhicule non dit`);
    assert.ok(c.note, `${c.cle} : la règle du métier doit être dite à l'écran`);
  }
});

test("toute nature qui passe par le planning a une carte principale", () => {
  // CE QUI CASSE SANS CE TEST : une nature ajoutée à `NATURES` avec
  // `planning: true` mais oubliée dans le catalogue donne un dossier SANS
  // aucune carte de date. Le travail est vendu et rien ne peut être planifié —
  // et ça ne se voit qu'en ouvrant un dossier de cette nature.
  for (const n of NATURES) {
    if (!n.etapes?.planning) continue;
    assert.ok(cartePrincipale(n.cle),
      `la nature « ${n.cle} » passe par le planning mais n'a pas de carte principale`);
  }
});

test("une nature n'a jamais DEUX cartes principales", () => {
  // Deux travaux « principaux » sur un dossier, c'est deux prix et deux
  // équipes pour une seule vente.
  for (const n of NATURES) {
    const principales = cartesDeNature(n.cle).filter((c) => c.role === "principale");
    assert.ok(principales.length <= 1,
      `${n.cle} : ${principales.length} cartes principales`);
  }
});

test("les cartes sortent dans l'ordre du parcours réel", () => {
  // Le travail vendu d'abord, l'optionnel ensuite. L'inverse ferait commencer
  // un dossier par une visite facultative.
  const cles = cartesDeNature("demenagement").map((c) => c.cle);
  assert.equal(cles[0], "demenagement");
  assert.deepEqual(cles, ["demenagement", "visite", "emballage"]);
});

test("un lift n'a ni visite ni emballage", () => {
  // La règle « un lift n'a pas de relevé » vivait dans `natures.js`. Elle doit
  // tenir ici aussi, sinon le dossier d'un lift proposerait d'emballer.
  assert.deepEqual(cartesDeNature("lift").map((c) => c.cle), ["lift"]);
  assert.deepEqual(cartesDeNature("sous_traitance").map((c) => c.cle), ["sous_traitance"]);
});

test("une nature de location n'a aucune carte : elle ne passe pas au planning", () => {
  for (const cle of ["boxe", "zone"]) {
    assert.deepEqual(cartesDeNature(cle), []);
  }
});

test("carteMetier rend null plutôt que d'inventer un défaut", () => {
  // Un repli silencieux sur « déménagement » ferait exiger un camion pour un
  // métier futur qui n'en a pas besoin.
  assert.equal(carteMetier("archivage_2027"), null);
});

/* ── EXIGENCES dérivé, plus recopié ──────────────────────────────────────── */

test("EXIGENCES découle du catalogue — une seule liste, plus trois", () => {
  // CE QUI CASSE SANS CE TEST : la table revient écrite à la main, et un
  // métier ajouté au catalogue s'affiche sans exigence — carte visible,
  // verdict muet.
  for (const c of CARTES_METIER) {
    const e = exigence(c.cle);
    assert.equal(e.titre, c.titre, `${c.cle} : titre désaccordé`);
    assert.equal(e.membres_min, c.effectif.plancher);
    assert.equal(e.vehicule, c.vehicule.besoin);
    assert.equal(e.categorie, c.vehicule.categorie);
    assert.equal(e.note, c.note);
  }
  assert.equal(Object.keys(EXIGENCES).length, CARTES_METIER.length);
});

/* ── L'effectif VENDU — le cœur du lot ───────────────────────────────────── */

test("le dénominateur suit le devis, pas une constante du code", () => {
  // LE DÉFAUT CORRIGÉ : `membres_min` valait 2 en dur, pendant que le prix
  // venait de BAREME_HORAIRE[nbDemenageurs] (2 à 6). Un dossier vendu à quatre
  // déménageurs passait au vert à deux — sous-staffé ET sous-facturé, sans
  // qu'aucun écran ne le dise.
  const carte = carteMetier("demenagement");
  assert.equal(effectifAttendu(carte, { nbDemenageurs: 4 }), 4);
  assert.equal(effectifAttendu(carte, { nbDemenageurs: 6 }), 6);
  assert.equal(origineEffectif(carte, { nbDemenageurs: 4 }), "devis");
});

test("sans devis, le plancher du métier rattrape — jamais zéro", () => {
  // `Number(null) === 0` déclarerait « aucune personne attendue » et rendrait
  // toute carte verte à vide. C'est le piège de coercition rencontré six fois
  // dans ce dépôt ; il est ici verrouillé.
  const carte = carteMetier("demenagement");
  for (const chiffrage of [{}, { nbDemenageurs: null }, { nbDemenageurs: 0 },
                           { nbDemenageurs: undefined }, { nbDemenageurs: "" },
                           { nbDemenageurs: NaN }]) {
    assert.equal(effectifAttendu(carte, chiffrage), 2,
      `repli manqué pour ${JSON.stringify(chiffrage)}`);
    assert.equal(origineEffectif(carte, chiffrage), "métier");
  }
});

test("un devis SOUS le plancher du métier ne fait pas descendre la carte", () => {
  // Un déménagement chiffré à une personne est un devis à revoir, pas une
  // consigne de terrain. Le plancher gagne, et l'origine le dit.
  const carte = carteMetier("demenagement");
  assert.equal(effectifAttendu(carte, { nbDemenageurs: 1 }), 2);
  assert.equal(origineEffectif(carte, { nbDemenageurs: 1 }), "métier");
});

test("une visite reste à une personne, quel que soit le devis", () => {
  // Son effectif ne vient pas du chiffrage : quatre déménageurs vendus ne font
  // pas passer quatre personnes estimer.
  const carte = carteMetier("visite");
  assert.equal(effectifAttendu(carte, { nbDemenageurs: 4 }), 1);
  assert.equal(origineEffectif(carte, { nbDemenageurs: 4 }), "métier");
});

test("l'emballage a son propre effectif, distinct du déménagement", () => {
  // Un emballage se fait souvent à deux quand le camion part à quatre.
  const carte = carteMetier("emballage");
  assert.equal(effectifAttendu(carte, { nbDemenageurs: 4, nbEmballeurs: 2 }), 2);
  // Sans effectif d'emballage propre, on ne reprend PAS celui du déménagement.
  assert.equal(effectifAttendu(carte, { nbDemenageurs: 4 }), 1);
});

test("le verdict d'affectation dit le nombre attendu ET son origine", () => {
  // « 4 attendus » sans motif passe pour une règle du logiciel, et on
  // corrigerait la carte au lieu du devis.
  const flotte = [{ id: "v1", categorie: "camion" }];
  const v = etatAffectation("demenagement",
    { membres: ["a", "b"], vehicules: ["v1"] }, flotte, { nbDemenageurs: 4 });
  assert.equal(v.etat, "partiel");
  assert.match(v.manques[0], /4 personnes attendues/);
  assert.match(v.manques[0], /effectif du devis/);
});

test("une équipe au complet selon le devis passe au vert", () => {
  const flotte = [{ id: "v1", categorie: "camion" }];
  const v = etatAffectation("demenagement",
    { membres: ["a", "b", "c", "d"], vehicules: ["v1"] }, flotte,
    { nbDemenageurs: 4 });
  assert.equal(v.etat, "complet");
  assert.deepEqual(v.manques, []);
});

test("resumeEffectif rend la fraction lisible d'un coup d'œil", () => {
  assert.equal(
    resumeEffectif({ membres: ["a", "b"], vehicules: ["v"] }, "demenagement",
      { nbDemenageurs: 4 }),
    "2 membres / 4 · 1 véhicule");
  assert.equal(resumeEffectif({ membres: [] }, "visite", {}), "0 membre / 1");
});

test("effectifRequis reste utilisable sans chiffrage du tout", () => {
  // Les appelants d'avant ce lot n'en passent pas : ils doivent continuer de
  // fonctionner, sur le plancher.
  assert.deepEqual(effectifRequis("demenagement"), { nombre: 2, origine: "métier" });
});

/* ── Le tri des catalogues ───────────────────────────────────────────────── */

/** Les trois catégories réelles de la base. */
const FLOTTE = [
  { id: "a", nom: "Camion 10", categorie: "camion" },
  { id: "b", nom: "Camion 2", categorie: "camion" },
  { id: "c", nom: "Lift B", categorie: "lift" },
  { id: "d", nom: "Kangoo", categorie: "voiture" },
];

const GENS = [
  { id: "3", nom: "Zoé" }, { id: "1", nom: "émile" },
  { id: "2", nom: "Ana" }, { id: "4", nom: "Bob" },
];

test("les membres sortent dans un ordre STABLE, accents ignorés", () => {
  // CE QUI CASSE SANS CE TEST : `listerMembresSimples()` n'a aucun `order by`.
  // PostgREST rend alors les lignes dans l'ordre physique de la table — qui
  // change après une mise à jour. On coche une équipe en visant une position
  // mémorisée : un jeton qui bouge se coche à la place d'un autre, et l'erreur
  // ne se voit qu'au départ du camion.
  assert.deepEqual(trierMembres(GENS).map((m) => m.nom),
    ["Ana", "Bob", "émile", "Zoé"]);
  // Deux appels sur la même entrée rendent le même ordre.
  assert.deepEqual(trierMembres(GENS).map((m) => m.id),
    trierMembres(GENS).map((m) => m.id));
});

test("le tri ne modifie pas la liste reçue", () => {
  // Trier en place réordonnerait la liste du parent et ferait sauter les
  // jetons pendant qu'on clique.
  const avant = GENS.map((m) => m.id);
  trierMembres(GENS);
  assert.deepEqual(GENS.map((m) => m.id), avant);
});

test("les affectés remontent, les indisponibles descendent sans disparaître", () => {
  // On relit les affectés pour VÉRIFIER, pas pour les chercher. Et un
  // indisponible reste proposé : on signale, on n'interdit pas — le bureau
  // peut passer outre un congé.
  const r = trierMembres(GENS, {
    affectes: ["3"], estIndisponible: (id) => id === "2",
  });
  assert.equal(r[0].nom, "Zoé", "l'affecté est en tête");
  assert.equal(r[r.length - 1].nom, "Ana", "l'indisponible est en queue");
  assert.equal(r.length, GENS.length, "personne n'est retiré de la liste");
});

test("les véhicules se trient par catégorie, chiffres lus comme des nombres", () => {
  // « Camion 10 » après « Camion 2 » : un tri texte les inverserait.
  // L'ordre des catégories suit l'énumération RÉELLE de la base
  // (`categorie_vehicule` : camion | lift | voiture) — la première version de
  // ce test citait « fourgon » et « remorque », qui n'existent pas.
  assert.deepEqual(trierVehicules(FLOTTE).map((v) => v.nom),
    ["Camion 2", "Camion 10", "Lift B", "Kangoo"]);
});

test("toute la flotte est offerte, groupée, rien n'est caché", () => {
  // DÉCISION DE RAPHAËL : tout type de véhicule peut être posé sur une carte
  // mission. Le groupe attendu remonte, mais AUCUN véhicule ne disparaît —
  // c'est un ordre, pas un filtre. Avant, un lift n'offrait que des lifts : on
  // ne pouvait pas ajouter la voiture qui le suit.
  const groupes = grouperVehicules(FLOTTE, { categorieAttendue: "lift" });
  assert.equal(groupes[0].cle, "lift", "le groupe attendu vient en tête");
  assert.equal(groupes[0].attendue, true);
  const tous = groupes.flatMap((g) => g.vehicules.map((v) => v.id));
  assert.equal(tous.length, FLOTTE.length, "aucun véhicule n'est retiré");
});

test("une catégorie inconnue reste visible plutôt que de s'évaporer", () => {
  // Une valeur ajoutée à l'énumération SQL sans passer par le catalogue doit
  // rester affichée : un véhicule invisible ne se cherche pas, il se rachète.
  const g = grouperVehicules([...FLOTTE, { id: "x", nom: "Nacelle", categorie: "nacelle" }]);
  const inconnue = g.find((x) => x.cle === "nacelle");
  assert.ok(inconnue, "le groupe inconnu doit exister");
  assert.equal(inconnue.titre, "Nacelles");
  assert.equal(g[g.length - 1].cle, "nacelle", "et passer en fin de liste");
});

test("les groupes vides ne laissent pas d'en-tête orphelin", () => {
  // Un titre « Lifts » au-dessus de rien ressemble à un bug.
  const g = grouperVehicules([{ id: "a", nom: "C1", categorie: "camion" }]);
  assert.deepEqual(g.map((x) => x.cle), ["camion"]);
  assert.deepEqual(grouperVehicules([]), []);
});

test("les listes vides et les entrées bancales ne font pas tomber le tri", () => {
  // Un écran ne doit pas blanchir parce qu'un membre n'a pas de nom.
  assert.deepEqual(trierMembres(), []);
  assert.deepEqual(trierVehicules(null), []);
  assert.equal(trierMembres([{ id: "x" }, { id: "y", nom: "A" }]).length, 2);
});


test("le catalogue de catégories colle à l'énumération SQL", () => {
  // CE QUI CASSE SANS CE TEST : le code cite « fourgon » et « remorque » — ce
  // fut le cas — alors que `categorie_vehicule` ne connaît que camion, lift et
  // voiture. Les rangs ne s'appliquent alors à rien et le groupement retombe
  // silencieusement sur l'ordre alphabétique.
  assert.deepEqual(CATEGORIES_VEHICULE.map((c) => c.cle),
    ["camion", "lift", "voiture"]);
  assert.equal(titreCategorie("lift"), "Lifts");
  assert.equal(titreCategorie(null), "Autres");
});

/* ── Le véhicule dans l'équipe du jour (0144) ────────────────────────────── */

test("un véhicule sur deux créneaux DISJOINTS du même jour ne gêne pas", () => {
  // Le même camion peut servir le matin puis l'après-midi. Une contrainte
  // aveugle en base interdirait ce cas parfaitement légitime — c'est pourquoi
  // la règle vit ici et non dans un `unique(jour, vehicule)`.
  const v = verdictEquipe(
    { membres: ["a", "b"], vehicules: ["c1"],
      missions: [{ id: "m1", heure_debut: "08:00", heure_fin: "12:00" }] },
    { flotte: [{ id: "c1", nom: "Camion 1" }],
      engagementsParVehicule: {
        c1: [{ id: "m9", heure_debut: "13:00", heure_fin: "17:00" }] } });
  assert.equal(v.avertissements.some((a) => a.includes("Camion 1")), false);
});

test("un véhicule sur deux créneaux QUI SE CHEVAUCHENT est signalé", () => {
  // CE QUI CASSE SANS CE TEST : deux équipes se croient chacune propriétaire
  // du même camion et ne s'en aperçoivent qu'au dépôt, le matin, quand il n'y
  // en a qu'un.
  const v = verdictEquipe(
    { membres: ["a", "b"], vehicules: ["c1"],
      missions: [{ id: "m1", heure_debut: "08:00", heure_fin: "12:00" }] },
    { flotte: [{ id: "c1", nom: "Camion 1" }],
      engagementsParVehicule: {
        c1: [{ id: "m9", heure_debut: "10:00", heure_fin: "14:00" }] } });
  assert.ok(v.avertissements.some((a) => a.includes("Camion 1")));
  // SIGNALE, N'INTERDIT PAS : le bureau garde la main (véhicule libéré plus
  // tôt, permutation de dernière minute).
  assert.equal(v.ok, true, "un conflit de véhicule ne doit jamais bloquer");
  assert.deepEqual(v.bloquant, []);
});

test("le message d'un véhicule s'accorde au masculin", () => {
  // « Déjà engagée » est écrit pour une personne. Sur un camion, l'accord faux
  // fait douter du message — et un avertissement dont on doute cesse d'être lu.
  const v = verdictEquipe(
    { membres: ["a"], vehicules: ["c1"],
      missions: [{ id: "m1", heure_debut: "08:00", heure_fin: "12:00" }] },
    { flotte: [{ id: "c1", nom: "Camion 1" }],
      engagementsParVehicule: {
        c1: [{ id: "m9", heure_debut: "10:00", heure_fin: "14:00" }] } });
  const msg = v.avertissements.find((a) => a.includes("Camion 1"));
  assert.match(msg, /déjà engagé /, "accord masculin attendu");
  assert.equal(/engagée/.test(msg), false);
});

test("une équipe avec missions mais sans véhicule mérite un regard", () => {
  const v = verdictEquipe(
    { membres: ["a", "b"], vehicules: [],
      missions: [{ id: "m1", heure_debut: "08:00", heure_fin: "12:00" }] },
    { flotte: [] });
  assert.ok(v.avertissements.some((a) => /Aucun véhicule/.test(a)));
  assert.equal(v.ok, true);
});

test("une équipe SANS mission ne réclame pas de véhicule", () => {
  // La question ne se pose pas encore : réclamer un camion pour une équipe
  // qu'on vient de nommer serait du bruit.
  const v = verdictEquipe({ membres: ["a"], vehicules: [], missions: [] }, {});
  assert.equal(v.avertissements.some((a) => /Aucun véhicule/.test(a)), false);
});

test("le verdict d'équipe reste valide sans aucune donnée de véhicule", () => {
  // Les appelants d'avant 0144 n'en passent pas.
  const v = verdictEquipe({ membres: ["a"], missions: [] }, {});
  assert.equal(v.ok, true);
  assert.equal(v.vehicules, 0);
});

/* ── Les ressources d'équipe réservées pour ses missions (lot 37a) ───────── */

test("une équipe verse ses membres ET véhicules à la mission qu'elle vise", () => {
  // DÉCISION DE RAPHAËL : composer une équipe et lui donner un camion, c'est
  // mettre ce camion sur les chantiers de cette équipe — sans ressaisir
  // l'affectation mission par mission.
  const eqs = [{ missions: ["m1"], membres: ["a", "b"], vehicules: ["c1"] }];
  assert.deepEqual(affectationDepuisEquipes("m1", eqs),
    { membres: ["a", "b"], vehicules: ["c1"] });
  // Une mission qu'aucune équipe ne vise ne reçoit rien.
  assert.deepEqual(affectationDepuisEquipes("m2", eqs),
    { membres: [], vehicules: [] });
});

test("deux équipes sur la même mission s'ADDITIONNENT, sans s'écraser", () => {
  // CE QUI CASSE SANS CE TEST : l'équipe du matin et celle de l'après-midi
  // visent le même gros déménagement. Écraser à l'enregistrement effacerait le
  // travail de l'autre. On fait l'union — et les doublons fondent.
  const eqs = [
    { missions: ["m1"], membres: ["a", "b"], vehicules: ["c1"] },
    { missions: ["m1", "m2"], membres: ["b", "c"], vehicules: ["c2"] },
  ];
  const r = affectationDepuisEquipes("m1", eqs);
  assert.deepEqual([...r.membres].sort(), ["a", "b", "c"]);
  assert.deepEqual([...r.vehicules].sort(), ["c1", "c2"]);
  assert.equal(r.membres.filter((x) => x === "b").length, 1, "pas de doublon");
});

test("on recalcule les missions QUITTÉES autant que celles reprises", () => {
  // Sinon un camion retiré d'une équipe resterait collé à l'ancienne mission.
  assert.deepEqual(
    missionsImpactees({ missions: ["m1", "m3"] }, { missions: ["m1", "m2"] }).sort(),
    ["m1", "m2", "m3"]);
  // Nouvelle équipe (pas d'avant) : seules les missions visées.
  assert.deepEqual(missionsImpactees(null, { missions: ["m5"] }), ["m5"]);
});

test("toute carte porte les deux sélections — la visite y compris (lot 37a)", () => {
  // DÉCISION DE RAPHAËL : membres ET véhicules sur chaque carte mission, même
  // la visite. Aucune carte ne doit interdire le véhicule (`besoin: "aucun"`) —
  // la voiture de service qui emmène l'estimateur doit pouvoir être notée.
  for (const c of CARTES_METIER) {
    assert.notEqual(c.vehicule.besoin, "aucun",
      `la carte « ${c.cle} » interdit le véhicule : plus aucune ne le doit`);
  }
  // La visite précise : facultatif, pas exigé — elle ne réclame pas de camion,
  // mais en accepte un.
  const visite = carteMetier("visite");
  assert.equal(visite.vehicule.besoin, "facultatif");
  // Et son verdict ne se plaint JAMAIS d'un véhicule manquant.
  const v = etatAffectation("visite", { membres: ["m1"], vehicules: [] }, []);
  assert.equal(v.etat, "complet");
  assert.equal(v.manques.some((m) => /véhicule|lift/i.test(m)), false);
});

/* ── Panne critique et double équipe (lot 37b) ───────────────────────────── */

test("un véhicule en panne BLOQUE l'équipe — premier blocage matériel", () => {
  // DÉCISION DE RAPHAËL : un véhicule modifiable à volonté, mais une panne
  // (« urgent ») force à réorganiser l'équipe. Une panne n'est pas un congé
  // qu'on assume d'un clic : le camion ne roulera pas.
  const flotte = [
    { id: "hs", nom: "Camion HS", etat_mecanique: "urgent" },
    { id: "ok", nom: "Camion OK", etat_mecanique: "ok" },
    { id: "sv", nom: "Camion Surv", etat_mecanique: "surveiller" },
  ];
  const mis = [{ id: "m1", heure_debut: "08:00", heure_fin: "12:00" }];
  const panne = verdictEquipe(
    { membres: ["a", "b"], missions: mis, vehicules: ["hs"] }, { flotte });
  assert.equal(panne.ok, false, "une panne bloque");
  assert.match(panne.bloquant.join(" "), /en panne/);
  assert.match(panne.bloquant.join(" "), /réorganisez/);
});

test("« surveiller » n'immobilise pas : le véhicule roule encore", () => {
  // CE QUI CASSE SANS CE TEST : bloquer sur « surveiller » clouerait au sol un
  // camion en état de rouler, pour un simple point de vigilance. Seul
  // « urgent » est une panne.
  const flotte = [{ id: "sv", nom: "Surv", etat_mecanique: "surveiller" }];
  const mis = [{ id: "m1", heure_debut: "08:00", heure_fin: "12:00" }];
  const v = verdictEquipe(
    { membres: ["a", "b"], missions: mis, vehicules: ["sv"] }, { flotte });
  assert.equal(v.ok, true, "surveiller ne bloque pas");
  // Il ne doit pas non plus passer en silence : la flotte le signale par
  // ailleurs (alertesVehicule), mais l'équipe reste enregistrable.
});

test("un membre dans deux équipes distinctes le même jour est signalé, nommé", () => {
  // PRÉCISION DE RAPHAËL : une équipe peut porter plusieurs missions ; le
  // défaut est une PERSONNE dans deux équipes distinctes en même temps. Le
  // message nomme l'autre équipe — « déjà dans l'équipe du matin » se corrige
  // d'un coup d'œil.
  const mA = [{ id: "m1", heure_debut: "08:00", heure_fin: "12:00", libelle: "Dupont" }];
  const v = verdictEquipe(
    { membres: ["a"], missions: mA, vehicules: [] },
    { membres: [{ id: "a", nom: "Ana" }],
      engagementsParMembre: {
        a: [{ id: "m2", heure_debut: "10:00", heure_fin: "14:00", libelle: "Martin" }] },
      equipesDuMembre: { a: ["Équipe matin"] } });
  assert.equal(v.ok, false);
  assert.match(v.bloquant[0], /^Ana/, "le nom de la personne est résolu");
  assert.match(v.bloquant[0], /Équipe matin/, "l'autre équipe est nommée");
});

test("deux missions NON simultanées dans une équipe ne créent aucun défaut", () => {
  // Une équipe qui enchaîne matin puis après-midi est légitime.
  const missions = [
    { id: "m1", heure_debut: "08:00", heure_fin: "12:00" },
    { id: "m2", heure_debut: "13:00", heure_fin: "17:00" },
  ];
  const v = verdictEquipe({ membres: ["a", "b"], missions, vehicules: [] }, {});
  assert.equal(v.ok, true);
});

test("un MODÈLE (pré-enregistrement) n'applique aucun contrôle de conflit", () => {
  // PRÉCISION DE RAPHAËL : une personne peut figurer dans plusieurs modèles
  // sans défaut — ce sont des rosters réutilisables, pas des engagements d'un
  // jour. Le modèle ne passe pas par les engagements du jour (contexte vide).
  //
  // CE QUI CASSE SANS CE TEST : quelqu'un branche la détection de conflit sur
  // la création de modèle, et il devient impossible de mettre la même personne
  // dans « Équipe A » et « Équipe B » alors que ce sont deux gabarits parmi
  // lesquels on choisira selon le jour.
  const modele = modeleDepuisEquipe({ membres: ["a", "b", "c"] }, "Grand camion");
  assert.equal(modele.ok, true, "un modèle se crée sans vérifier de conflit de jour");
  assert.deepEqual(modele.modele.membres, ["a", "b", "c"]);
  // Et un modèle ne retient QUE des personnes : ni date, ni mission, ni
  // véhicule — rien qui puisse entrer en conflit.
  assert.equal("missions" in modele.modele, false);
  assert.equal("vehicules" in modele.modele, false);
});
