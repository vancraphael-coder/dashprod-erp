// =============================================================================
// ON PUBLIE UNE DISPONIBILITÉ, JAMAIS UNE OCCUPATION.
//
// CE QUI CASSE SANS CES TESTS, deux choses de nature différente :
//
//   · une FUITE COMMERCIALE. Publier un agenda d'occupation dit à un donneur
//     d'ordre quand l'indépendant travaille pour un autre. Un indépendant très
//     occupé et un indépendant en vacances doivent présenter la même chose :
//     rien.
//   · un AGENDA QUI MENT. Si l'occupation ne se déduit pas des engagements
//     acceptés, il faut retirer sa disponibilité à la main après chaque
//     acceptation — et on l'oublie. On reçoit alors des propositions pour des
//     jours déjà pris.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import {
  JOURS, PREVENANCE_HEURES_DEFAUT, jourSemaine, datesDeLaPlage, etatDuJour,
  calendrier, datesPubliables, proposable, resumeRegles,
} from "../src/planning/disponibilites.js";

// Semaine du 14 au 20 septembre 2026 : le 14 est un lundi.
const REGLES = [{ jour: 1 }, { jour: 2 }, { jour: 3 }, { jour: 4 }, { jour: 5 }];

test("la convention de jour est ISO : lundi = 1", () => {
  assert.equal(jourSemaine("2026-09-14"), 1);
  assert.equal(jourSemaine("2026-09-20"), 7);   // dimanche
  assert.equal(jourSemaine("pas une date"), null);
  assert.equal(JOURS.length, 7);
});

test("un jour hors règle n'est pas disponible", () => {
  // Le samedi n'est pas déclaré : ce n'est ni un refus ni un congé, c'est
  // simplement en dehors du rythme.
  assert.equal(etatDuJour("2026-09-14", { regles: REGLES }), "libre");
  assert.equal(etatDuJour("2026-09-19", { regles: REGLES }), "hors_regle");
});

test("une exception ouvre ou ferme une date précise", () => {
  const s = { regles: REGLES, exceptions: [
    { date: "2026-09-19", disponible: true },     // samedi exceptionnel
    { date: "2026-09-16", disponible: false, motif: "congé" },
  ] };
  assert.equal(etatDuJour("2026-09-19", s), "libre");
  assert.equal(etatDuJour("2026-09-16", s), "ferme");
});

test("UN ENGAGEMENT ACCEPTÉ OCCUPE LA JOURNÉE, sans rien saisir", () => {
  // C'est ce qui évite l'agenda qui ment. Sans cette déduction, il faudrait
  // retirer sa disponibilité à la main après chaque acceptation.
  const s = { regles: REGLES, engagements: [
    { date: "2026-09-15", etat: "acceptee", contrepartie: "Roovers" },
  ] };
  assert.equal(etatDuJour("2026-09-15", s), "pris");
  // Et il l'emporte même sur une exception qui déclare le jour disponible :
  // un accord passe avant une intention.
  assert.equal(etatDuJour("2026-09-15", { ...s,
    exceptions: [{ date: "2026-09-15", disponible: true }] }), "pris");
});

test("une PROPOSITION n'occupe rien", () => {
  // Elle peut être refusée. Bloquer la journée dès la proposition permettrait
  // à n'importe qui de geler l'agenda d'un indépendant en le sollicitant.
  const s = { regles: REGLES, engagements: [
    { date: "2026-09-15", etat: "proposee" },
    { date: "2026-09-16", etat: "refusee" },
    { date: "2026-09-17", etat: "annulee" },
  ] };
  for (const d of ["2026-09-15", "2026-09-16", "2026-09-17"]) {
    assert.equal(etatDuJour(d, s), "libre");
  }
});

test("LA FUITE — ce qui est publié ne contient que des dates libres", () => {
  const s = {
    regles: REGLES,
    exceptions: [{ date: "2026-09-16", disponible: false, motif: "chantier concurrent" }],
    engagements: [{ date: "2026-09-15", etat: "acceptee", contrepartie: "Roovers" }],
  };
  const publiees = datesPubliables("2026-09-14", "2026-09-20", s);

  // Lundi, jeudi, vendredi. Mardi pris, mercredi fermé, week-end hors règle.
  assert.deepEqual(publiees, ["2026-09-14", "2026-09-17", "2026-09-18"]);

  // Et rien d'autre ne sort : ni état, ni motif, ni nom de donneur d'ordre.
  // Un tableau de chaînes ne peut pas fuiter ce qu'il ne contient pas.
  for (const d of publiees) assert.equal(typeof d, "string");
  const brut = JSON.stringify(publiees);
  assert.ok(!brut.includes("Roovers"));
  assert.ok(!brut.includes("concurrent"));
  assert.ok(!brut.includes("pris"));
});

test("occupé et en vacances présentent la même chose : rien", () => {
  // Personne ne doit pouvoir distinguer les deux depuis l'extérieur.
  const occupe = datesPubliables("2026-09-15", "2026-09-15", {
    regles: REGLES,
    engagements: [{ date: "2026-09-15", etat: "acceptee", contrepartie: "X" }] });
  const vacances = datesPubliables("2026-09-15", "2026-09-15", {
    regles: REGLES,
    exceptions: [{ date: "2026-09-15", disponible: false, motif: "vacances" }] });
  assert.deepEqual(occupe, vacances);
  assert.deepEqual(occupe, []);
});

test("le motif reste sur l'écran de son propriétaire", () => {
  // `calendrier` sert l'indépendant lui-même : il a droit de savoir pourquoi
  // son mercredi est fermé et pour qui son mardi est pris.
  const cal = calendrier("2026-09-15", "2026-09-16", {
    regles: REGLES,
    exceptions: [{ date: "2026-09-16", disponible: false, motif: "congé" }],
    engagements: [{ date: "2026-09-15", etat: "acceptee", contrepartie: "Roovers" }],
  });
  assert.equal(cal[0].etat, "pris");
  assert.equal(cal[0].pour, "Roovers");
  assert.equal(cal[1].etat, "ferme");
  assert.equal(cal[1].motif, "congé");
});

test("LE DÉLAI DE PRÉVENANCE protège l'indépendant", () => {
  // Recevoir à 22 h une proposition pour le lendemain 7 h n'est pas une
  // opportunité, c'est une pression.
  assert.equal(PREVENANCE_HEURES_DEFAUT, 48);
  const maintenant = new Date("2026-09-14T22:00:00");
  const trop = proposable("2026-09-15", { maintenant, regles: REGLES });
  assert.equal(trop.ok, false);
  assert.match(trop.motif, /48 h de prévenance/);

  const bon = proposable("2026-09-18", { maintenant, regles: REGLES });
  assert.equal(bon.ok, true);

  // Le délai se règle : 48 h pour un manutentionnaire et pour un liftier ne
  // sont pas la même contrainte.
  //
  // Le délai se compte jusqu'au DÉBUT DE LA JOURNÉE, pas jusqu'à l'heure du
  // chantier — la disponibilité est déclarée à la journée. Le 15 à minuit est
  // donc à 2 h du 14 à 22 h : un délai de 2 h passe, un délai de 6 h non.
  assert.equal(proposable("2026-09-15", {
    maintenant, regles: REGLES, prevenanceHeures: 2 }).ok, true);
  assert.equal(proposable("2026-09-15", {
    maintenant, regles: REGLES, prevenanceHeures: 6 }).ok, false);
});

test("le refus rendu à l'extérieur reste PAUVRE", () => {
  // « Pas disponible » ne dit ni pourquoi, ni pour qui. Un motif riche
  // ferait fuiter par la porte du message d'erreur ce qu'on a protégé
  // partout ailleurs.
  const r = proposable("2026-09-15", {
    maintenant: new Date("2026-09-01T09:00:00"),
    regles: REGLES,
    engagements: [{ date: "2026-09-15", etat: "acceptee", contrepartie: "Roovers" }],
  });
  assert.equal(r.ok, false);
  assert.equal(r.motif, "le prestataire n'est pas disponible ce jour-là");
  assert.ok(!r.motif.includes("Roovers"));
});

test("les plages absurdes ne produisent rien", () => {
  assert.deepEqual(datesDeLaPlage("2026-09-20", "2026-09-14"), []);
  assert.deepEqual(datesDeLaPlage("n'importe quoi", "2026-09-14"), []);
  // Et la plage est bornée : une requête sur dix ans ne doit pas générer
  // 3 650 lignes par inadvertance.
  assert.equal(datesDeLaPlage("2026-01-01", "2036-01-01").length, 120);
});

test("le rythme se résume en clair", () => {
  assert.equal(resumeRegles(REGLES), "Lun, Mar, Mer, Jeu, Ven");
  assert.equal(resumeRegles([]), "Aucun jour déclaré");
  assert.equal(resumeRegles(JOURS.map((j) => ({ jour: j.num }))), "Tous les jours");
});
