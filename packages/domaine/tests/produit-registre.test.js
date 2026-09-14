// =============================================================================
// LE REGISTRE DES ÉCRANS TIENT LES TROIS ANGLES.
//
//   1. LE LÉGAL — un écran qui produit un artefact contraint par la loi doit
//      tirer ses mentions d'un réglage, jamais du code.
//   2. LE PARAMÉTRAGE — aucun écran ne dépend d'un réglage inexistant.
//   3. LA PRISE EN MAIN — chaque posture a un écran d'arrivée dans chaque
//      offre où elle existe.
//
// CE QUI CASSE SANS CES TESTS : l'inventaire redevient de la prose, et la
// prose se périme en silence. Le test qui figeait la grille de modules à la
// date de la migration 0075 en est la preuve : quand la décision a changé, il
// a verrouillé la version périmée et refusé la correction.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { ECRANS, ecran, ecransParEtat, reglagesManquantsDe }
  from "../src/produit/ecrans.js";
import { POSTURES, posture, postureDuRole, posturesDeLOffre }
  from "../src/produit/postures.js";
import { REGLAGES, reglage, CLES_REGLAGES }
  from "../src/produit/reglages-portee.js";
import { REFERENTIEL_OFFRES, offreReferentiel }
  from "../src/commercial/referentiel-offres.js";
import { MODULES } from "../src/commercial/plans.js";
import { PARCOURS_OFFRES } from "../src/commercial/parcours-offres.js";
import { CAPACITES } from "../src/rh/capacites.js";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DOSSIER_ECRANS = join(RACINE, "apps", "web", "src", "ecrans");

// `theme-client.jsx` est une palette, pas un écran.
const PAS_UN_ECRAN = new Set(["theme-client.jsx"]);

const estLivre = (cle) => reglage(cle)?.etat === "livre";

test("tout fichier d'écran est déclaré au registre", () => {
  // Un écran ajouté sans déclaration casse l'arbre. C'est le seul moyen que
  // l'inventaire reste vrai sans que personne y pense.
  const fichiers = readdirSync(DOSSIER_ECRANS)
    .filter((f) => f.endsWith(".jsx") && !PAS_UN_ECRAN.has(f));
  const declares = new Set(ECRANS.map((e) => e.fichier).filter(Boolean));

  for (const f of fichiers) {
    assert.ok(declares.has(f),
      `${f} existe mais n'est pas déclaré dans produit/ecrans.js`);
  }
});

test("tout écran déclaré avec un fichier a bien ce fichier", () => {
  const fichiers = new Set(readdirSync(DOSSIER_ECRANS));
  for (const e of ECRANS) {
    if (!e.fichier) continue;
    assert.ok(fichiers.has(e.fichier),
      `${e.cle} déclare ${e.fichier}, qui n'existe pas`);
  }
});

test("un écran manquant n'a pas de fichier, et l'inverse", () => {
  for (const e of ECRANS) {
    if (e.etat === "manquant") {
      assert.equal(e.fichier, null, `${e.cle} est « manquant » mais a un fichier`);
      assert.equal(e.monte, false, `${e.cle} est « manquant » mais monté`);
    } else {
      assert.ok(e.fichier, `${e.cle} est « ${e.etat} » sans fichier`);
    }
  }
});

test("les clés d'écran sont uniques", () => {
  const cles = ECRANS.map((e) => e.cle);
  assert.deepEqual([...new Set(cles)], cles, "clé d'écran en double");
});

test("ANGLE 2 — aucun écran livré ne dépend d'un réglage inexistant", () => {
  // La règle du produit : aucun écran ne peut afficher, imprimer ou calculer
  // une donnée de configuration qui n'a pas d'entrée dans les paramètres.
  // Sinon elle finit codée en dur — trois précédents payés dans ce projet.
  for (const e of ECRANS) {
    for (const r of e.reglages) {
      assert.ok(CLES_REGLAGES.includes(r),
        `${e.cle} dépend du réglage « ${r} », qui n'est pas déclaré`);
    }
  }
});

test("ANGLE 2 — un écran livré sur un réglage manquant est signalé", () => {
  // Ce test ne bloque pas : il MESURE la dette. Un écran déjà livré qui
  // dépend d'un réglage absent porte forcément sa configuration en dur.
  // Les compter permet de les corriger dans l'ordre plutôt que d'en découvrir
  // un par surprise.
  const dette = ECRANS
    .filter((e) => e.etat !== "manquant")
    .map((e) => [e.cle, reglagesManquantsDe(e.cle, estLivre)])
    .filter(([, m]) => m.length > 0);

  // Le chiffre est volontairement figé : il ne peut que DESCENDRE. S'il
  // remonte, un écran a été livré sur un réglage absent — exactement ce
  // qu'on cherche à empêcher.
  assert.ok(dette.length <= 15,
    `la dette de paramétrage augmente (${dette.length} écrans) :\n`
    + dette.map(([c, m]) => `  ${c} → ${m.join(", ")}`).join("\n"));
});

test("ANGLE 1 — un écran légal dépend d'au moins un réglage", () => {
  // Un artefact contraint par la loi tire ses mentions d'un réglage. Un écran
  // marqué `legal` sans aucun réglage porte ses mentions dans le code : c'est
  // le mécanisme exact qui a mis « 360 € » en dur dans l'inscription.
  const tolerees = new Set([
    // Le certificat de signature ne porte aucune mention paramétrable : il
    // atteste un horodatage et une empreinte, produits par la base.
    "certificat_signature",
    // La preuve reçue d'un externe n'est pas NOTRE document : on l'accueille
    // telle qu'elle a été signée chez lui.
    "reception_preuve",
    // Les heures sont une mesure, pas un document : leur mise en forme légale
    // est faite par `releve_heures_doc`.
    "heures", "paie", "pointage_hors_chantier",
  ]);
  for (const e of ECRANS) {
    if (!e.legal || tolerees.has(e.cle)) continue;
    assert.ok(e.reglages.length > 0,
      `${e.cle} produit un artefact légal sans dépendre d'aucun réglage`);
  }
});

test("le module d'un écran existe et est porté par une offre", () => {
  const connus = new Set(MODULES.map((m) => m.cle));
  for (const e of ECRANS) {
    if (e.module === null) continue;
    assert.ok(connus.has(e.module), `${e.cle} cite un module inconnu : ${e.module}`);
    const offres = REFERENTIEL_OFFRES.filter((o) => o.modules.includes(e.module));
    assert.ok(offres.length > 0,
      `${e.cle} s'appuie sur ${e.module}, qu'aucune offre ne porte`);
  }
});

test("le module d'un réglage existe et est porté par une offre", () => {
  const connus = new Set(MODULES.map((m) => m.cle));
  for (const r of REGLAGES) {
    if (r.module === null) continue;
    assert.ok(connus.has(r.module), `${r.cle} cite un module inconnu : ${r.module}`);
    assert.ok(REFERENTIEL_OFFRES.some((o) => o.modules.includes(r.module)),
      `le réglage ${r.cle} s'appuie sur ${r.module}, qu'aucune offre ne porte`);
  }
});

test("les postures citées existent", () => {
  for (const e of ECRANS) {
    for (const p of e.postures) {
      assert.ok(posture(p), `${e.cle} cite la posture inconnue « ${p} »`);
    }
    // Un écran sans posture ET sans `transverse` n'est visible par personne.
    if (e.postures.length === 0) {
      assert.equal(e.transverse, true,
        `${e.cle} n'a aucune posture et n'est pas marqué transverse`);
    }
  }
  for (const r of REGLAGES) {
    for (const p of r.postures) {
      assert.ok(posture(p), `le réglage ${r.cle} cite la posture inconnue « ${p} »`);
    }
    assert.ok(r.postures.length > 0, `le réglage ${r.cle} n'est visible par personne`);
  }
});

test("les 15 rôles de la base sont tous rattachés à une posture", () => {
  // Un rôle sans posture est un utilisateur qui ouvre l'app et ne sait pas
  // quoi regarder.
  const EN_BASE = ["chauffeur", "chef_equipe", "commercial", "coordination",
    "demenageur", "direction", "fondateur", "gerant", "interimaire",
    "liftier", "livreur", "monteur", "responsable_depot", "secretaire",
    "visite_terrain"];
  for (const r of EN_BASE) {
    assert.ok(postureDuRole(r), `le rôle « ${r} » n'a aucune posture`);
  }
  // Et l'inverse : une posture ne cite pas un rôle qui n'existe pas en base.
  for (const p of POSTURES) {
    for (const r of p.roles) {
      assert.ok(EN_BASE.includes(r),
        `la posture ${p.cle} cite le rôle « ${r} », absent de la base`);
    }
  }
});

test("chaque offre a des postures, et chaque posture une offre", () => {
  for (const o of REFERENTIEL_OFFRES) {
    assert.ok(posturesDeLOffre(o.code).length > 0,
      `l'offre ${o.code} n'a aucune posture : personne ne l'utiliserait`);
  }
  for (const p of POSTURES) {
    for (const code of p.offres) {
      assert.ok(offreReferentiel(code),
        `la posture ${p.cle} cite l'offre inconnue « ${code} »`);
    }
  }
});

test("L'INVARIANT MÉTIER — un réglage ne fuit pas vers un métier voisin", () => {
  // Le cœur de la correction du 10/09 : ce qui existe chez l'un ne doit pas
  // forcément apparaître chez l'autre. Un indépendant seul n'a pas de coût
  // interne à ventiler, ni de rôles à distribuer, ni de dépôt.
  const vusParIndependant = REGLAGES
    .filter((r) => r.postures.includes("independant"))
    .map((r) => r.cle);
  for (const interdit of ["cout", "services", "roles", "depots", "stockage",
                          "contrats", "espace_client", "prestataires"]) {
    assert.ok(!vusParIndependant.includes(interdit),
      `« ${interdit} » ne concerne pas un indépendant seul`);
  }
  // Et le minimum qu'il DOIT voir.
  for (const requis of ["identite", "facturation", "disponibilites",
                        "abonnement"]) {
    assert.ok(vusParIndependant.includes(requis),
      `un indépendant a besoin du réglage « ${requis} »`);
  }
});

test("un écran livré est monté, sinon c'est du travail perdu", () => {
  // Un écran complet importé nulle part est du travail déjà fait qu'on
  // s'apprête à refaire. `Societes.jsx` est dans ce cas : il est déclaré
  // `esquisse` + `monte: false`, ce qui le rend visible ici.
  const perdus = ECRANS.filter((e) => e.etat === "livre" && !e.monte);
  assert.deepEqual(perdus.map((e) => e.cle), [],
    "écrans livrés mais atteignables depuis nulle part");

  const orphelins = ECRANS.filter((e) => e.fichier && !e.monte);
  assert.deepEqual(orphelins.map((e) => e.cle), ["societes_editeur"],
    "la liste des écrans orphelins a changé — à monter ou à supprimer");
});

test("ANGLE 3 — chaque posture a un écran d'arrivée, ou c'est un manque connu", () => {
  // Une posture sans écran d'arrivée doit naviguer pour trouver ce qui la
  // concerne. Pour un exécutant debout dans un camion avec des gants, c'est
  // disqualifiant : il ne navigue pas.
  const SANS_ARRIVEE_CONNU = new Set([
    "execution",      // lot 7 — « ma_journee »
    "depot",          // lot 7 — « vue_du_matin »
    "acces_ponctuel", // hors roadmap : rôle sans parcours, à trancher
  ]);
  for (const p of POSTURES) {
    if (SANS_ARRIVEE_CONNU.has(p.cle)) continue;
    const siens = ECRANS.filter((e) => e.postures.includes(p.cle)
                                    && e.etat !== "manquant");
    assert.ok(siens.length > 0,
      `la posture ${p.cle} n'a aucun écran livré : elle n'a nulle part où arriver`);
  }
});

test("les écrans des parcours d'offre sont couverts par le registre", () => {
  // La landing décrit des écrans ; le registre dit lesquels existent. Une
  // offre souscriptible ne peut pas promettre un écran manquant.
  const vides = [];
  for (const [code, p] of Object.entries(PARCOURS_OFFRES)) {
    const o = offreReferentiel(code);
    if (!o?.souscriptible) continue;
    for (const etape of p.parcours) {
      if (!etape.module) continue;
      const couvert = ECRANS.some((e) =>
        (e.module === etape.module || (e.aussi || []).includes(etape.module))
        && e.etat !== "manquant");
      if (!couvert) vides.push(`${code}/${etape.module}`);
    }
  }

  // DETTE DE VENTE, figée. Le parcours Pro promet une étape « International »
  // adossée au module `international`, qui n'a AUCUN écran : pas d'inventaire
  // colis par colis, pas de liste de colisage douanière, pas de poids
  // taxable. Le module est pourtant vendu dans Regular (360 €) comme dans Pro
  // (720 €) — Regular ne le promet simplement pas sur la landing, ce qui
  // limite le mensonge sans le supprimer.
  //
  // La liste ne peut que DESCENDRE. Si elle s'allonge, une offre s'est mise à
  // promettre autre chose qu'elle ne tient.
  assert.deepEqual(vides, ["pro/international"],
    "une offre souscriptible promet un module sans écran livré");
});

test("LE RITUEL — un écran d'arrivée par posture, trois blocs au plus", () => {
  // CE QUI CASSE SANS CE TEST : le glissement naturel d'un écran d'arrivée
  // vers un tableau de bord. On ajoute un chiffre, puis un graphique, puis
  // une liste — et un déménageur qui ouvre l'app à 6 h du matin, debout dans
  // un camion, reçoit un rapport de gestion au lieu de son adresse du jour.
  const SANS_RITUEL = new Set(["acces_ponctuel"]);  // rôle sans parcours
  for (const p of POSTURES) {
    if (SANS_RITUEL.has(p.cle)) continue;
    const rituels = ECRANS.filter((e) => e.rituel && e.postures.includes(p.cle));
    assert.equal(rituels.length, 1,
      `la posture ${p.cle} doit avoir EXACTEMENT un rituel d'arrivée, `
      + `elle en a ${rituels.length} (${rituels.map((r) => r.cle).join(", ")})`);
    assert.ok(rituels[0].blocs >= 1 && rituels[0].blocs <= 3,
      `${rituels[0].cle} présente ${rituels[0].blocs} blocs : au-delà de 3, `
      + "on assomme");
  }
});

test("LE RITUEL — un rituel n'est jamais un centre de chiffres", () => {
  for (const e of ECRANS) {
    if (!e.rituel) continue;
    assert.notEqual(e.kpi, true,
      `${e.cle} est à la fois rituel et centre de chiffres : il faut choisir`);
    // Un rituel qui exige une capacité serait vide pour une partie de son
    // public — donc ce ne serait pas un rituel.
    assert.equal(e.capacite, undefined,
      `${e.cle} est un rituel : il ne peut pas dépendre d'une capacité`);
  }
});

test("LE RITUEL — un seul centre de chiffres dans tout Dashprod", () => {
  // Le seul public qui veut de la densité est celui qui vient la chercher.
  // Deux centres de chiffres signifieraient qu'un autre écran a commencé à en
  // devenir un.
  const kpis = ECRANS.filter((e) => e.kpi);
  assert.deepEqual(kpis.map((e) => e.cle), ["tableau_tresorerie"],
    "la liste des centres de chiffres a changé");
  assert.equal(kpis[0].capacite, "voir_tresorerie",
    "le centre de chiffres doit être réservé par une capacité");
  assert.notEqual(kpis[0].rituel, true, "un centre de chiffres n'est pas un rituel");
});

test("une capacité citée par un écran existe au catalogue", () => {
  // Un écran réservé par une capacité inexistante serait ouvert à tous ou
  // fermé à tous — dans les deux cas, pas ce qu'on croyait avoir écrit.
  const connues = new Set(CAPACITES.map((c) => c.cle));
  for (const e of ECRANS) {
    if (!e.capacite) continue;
    assert.ok(connues.has(e.capacite),
      `${e.cle} cite la capacité inconnue « ${e.capacite} »`);
  }
});

test("l'état du produit est mesurable", () => {
  // Le registre doit rendre un chiffre. Sans chiffre, « où en est-on » se
  // répond à l'intuition.
  const livres = ecransParEtat("livre").length;
  const esquisses = ecransParEtat("esquisse").length;
  const manquants = ecransParEtat("manquant").length;
  assert.equal(livres + esquisses + manquants, ECRANS.length,
    "un écran porte un état hors vocabulaire");
  assert.ok(livres > 0 && manquants > 0);
  // « ma_disponibilite » était l'exemple de référence des écrans manquants ;
  // il est livré depuis le 13/09/2026. On prend un manquant encore ouvert,
  // sinon ce test mesurerait un état révolu.
  // Le parcours de l'indépendant est complet ; on mesure sur un manquant du
  // lot 5, encore ouvert.
  assert.equal(ecran("reception_preuve")?.etat, "manquant");
  assert.equal(ecran("ma_disponibilite")?.etat, "livre");
  assert.equal(ecran("mes_missions")?.etat, "livre");
});

test("le registre ne cite aucun réglage orphelin", () => {
  // Un réglage déclaré que personne ne consomme est soit un oubli de
  // câblage, soit un réglage inutile. Les deux méritent d'être vus.
  const consommes = new Set(ECRANS.flatMap((e) => e.reglages));
  const orphelins = CLES_REGLAGES.filter((c) => !consommes.has(c));
  assert.deepEqual(orphelins, [],
    "la liste des réglages que rien ne consomme a changé");
});

test("le dossier produit est cité dans le dossier maître", () => {
  // Un registre que la documentation ignore ne sera pas mis à jour.
  const src = readFileSync(
    join(RACINE, "docs", "maitre", "00-DEMARRER-ICI.md"), "utf8");
  assert.match(src, /produit\//,
    "00-DEMARRER-ICI.md ne mentionne pas le registre des écrans");
});
