// =============================================================================
// LES ÉQUIPES D'UNE JOURNÉE.
//
// Trois règles posées par Raphaël, et une seule est bloquante :
//   · une personne au minimum        → BLOQUE
//   · l'effectif hors barème         → AVERTIT seulement
//   · deux équipes le même jour      → autorisé SI les missions ne se
//                                       chevauchent pas
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import { plage, seChevauchent, peutRejoindre, effectifSuggere,
         verdictEquipe, modeleDepuisEquipe }
  from "../src/planning/equipes.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)),
                 "..", "..", "..", "apps", "web", "src");
const lireEcran = (rel) => readFileSync(join(APP, rel), "utf8");

const MATIN = { id: "m1", libelle: "Déménagement Dupont",
                heure_debut: "08:00", heure_fin: "12:00" };
const APREM = { id: "m2", libelle: "Lift Martin",
                heure_debut: "13:00", heure_fin: "17:00" };
const CHEVAUCHE = { id: "m3", libelle: "Autre", heure_debut: "11:00", heure_fin: "15:00" };
const SANS_HEURE = { id: "m4", libelle: "Sans horaire" };

const CTX = {
  membres: [{ id: "u1", nom: "Alex" }, { id: "u2", nom: "Sam" }],
  engagementsParMembre: {},
};

/* ── Le chevauchement, cœur de la règle ─────────────────────────────────── */

test("deux missions qui se suivent ne se chevauchent pas", () => {
  // Le cas réel visé : un déménagement le matin, un lift l'après-midi.
  assert.equal(seChevauchent(plage(MATIN), plage(APREM)), false);
  assert.equal(peutRejoindre([APREM], [MATIN]).ok, true);
});

test("deux missions qui se recouvrent, même d'une minute, s'excluent", () => {
  assert.equal(seChevauchent(plage(MATIN), plage(CHEVAUCHE)), true);
  const r = peutRejoindre([CHEVAUCHE], [MATIN]);
  assert.equal(r.ok, false);
  assert.match(r.motif, /08h.*12h/, "le motif dit QUAND, pas seulement que c'est pris");
});

test("se toucher bout à bout n'est pas se chevaucher", () => {
  const a = { heure_debut: "08:00", heure_fin: "12:00" };
  const b = { heure_debut: "12:00", heure_fin: "16:00" };
  assert.equal(seChevauchent(plage(a), plage(b)), false);
});

test("une mission SANS horaire occupe la journée : on ne suppose pas", () => {
  // Prudence assumée : sans heures, impossible de prouver qu'elle laisse de la
  // place. Le motif explique quoi faire pour débloquer.
  const p = plage(SANS_HEURE);
  assert.equal(p.debut, 0);
  assert.equal(p.fin, 24 * 60);
  assert.equal(p.floue, true);

  const r = peutRejoindre([APREM], [SANS_HEURE]);
  assert.equal(r.ok, false);
  assert.match(r.motif, /[Pp]osez des heures/);
});

test("un chantier de nuit ne rend pas une durée négative", () => {
  // 22h → 02h : la fin est « avant » le début. Sans garde, la plage serait
  // inversée et tout chevauchement passerait inaperçu.
  const nuit = plage({ heure_debut: "22:00", heure_fin: "02:00" });
  assert.ok(nuit.fin > nuit.debut);
});

test("la même mission dans deux équipes n'est PAS un conflit", () => {
  // C'est la même présence comptée deux fois, pas une personne dédoublée.
  assert.equal(peutRejoindre([MATIN], [MATIN]).ok, true);
});

/* ── Les trois règles ───────────────────────────────────────────────────── */

test("une équipe vide est REFUSÉE — c'est le seul vrai blocage", () => {
  const v = verdictEquipe({ membres: [], missions: [APREM] }, CTX);
  assert.equal(v.ok, false);
  assert.match(v.bloquant[0], /au moins une personne/);
});

test("une seule personne suffit", () => {
  const v = verdictEquipe({ membres: ["u1"], missions: [APREM] }, CTX);
  assert.equal(v.ok, true, "le minimum est UNE personne, pas deux");
});

test("un effectif hors barème AVERTIT, il ne bloque jamais", () => {
  // Discipline du projet : on signale, on n'interdit pas. Le bureau connaît
  // son terrain mieux que la règle.
  const v = verdictEquipe({ membres: ["u1"], missions: [MATIN, APREM] }, CTX);
  assert.equal(v.ok, true, "sous-effectif : autorisé");
  assert.ok(v.avertissements.length > 0, "mais signalé");
  assert.match(v.avertissements[0], /habituellement/);
});

test("un sureffectif manifeste est signalé aussi", () => {
  const v = verdictEquipe(
    { membres: ["u1", "u2", "u3", "u4", "u5", "u6"], missions: [MATIN] }, CTX);
  assert.equal(v.ok, true);
  assert.ok(v.avertissements.some((a) => /immobilisé/.test(a)));
});

test("une personne dans DEUX équipes le même jour : autorisé si pas de chevauchement", () => {
  const ctx = { ...CTX, engagementsParMembre: { u1: [MATIN] } };
  const ok = verdictEquipe({ membres: ["u1", "u2"], missions: [APREM] }, ctx);
  assert.equal(ok.ok, true, "matin puis après-midi : c'est le cas visé");

  const ko = verdictEquipe({ membres: ["u1"], missions: [CHEVAUCHE] }, ctx);
  assert.equal(ko.ok, false);
  assert.match(ko.bloquant[0], /Alex/, "le message nomme la personne");
});

test("une équipe sans mission est formée mais signalée", () => {
  const v = verdictEquipe({ membres: ["u1"], missions: [] }, CTX);
  assert.equal(v.ok, true);
  assert.match(v.avertissements[0], /aucun chantier/);
});

/* ── Le modèle réutilisable ─────────────────────────────────────────────── */

test("un modèle ne retient QUE les personnes, jamais la date ni les missions", () => {
  // Les mêmes trois personnes travaillent souvent ensemble, mais jamais sur le
  // même chantier deux jours de suite. Garder la date ferait rejouer un passé.
  const r = modeleDepuisEquipe({ membres: ["u1", "u2"], missions: [MATIN],
    date: "2026-08-22" }, "Équipe Alex & Sam");
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.modele).sort(), ["membres", "nom"]);
  assert.deepEqual(r.modele.membres, ["u1", "u2"]);
});

test("un modèle sans nom ou sans personne est refusé, avec son motif", () => {
  assert.equal(modeleDepuisEquipe({ membres: ["u1"] }, "  ").ok, false);
  assert.equal(modeleDepuisEquipe({ membres: [] }, "Nom").ok, false);
});

test("l'effectif suggéré respecte une exigence explicite de mission", () => {
  assert.equal(effectifSuggere([{ demenageurs_requis: 4 }]), 4);
  // Sans exigence : deux personnes minimum par mission — un déménagement à un
  // seul homme n'existe pas.
  assert.equal(effectifSuggere([{}]), 2);
  assert.equal(effectifSuggere([]), 1);
});

/* ── Le branchement à l'écran ───────────────────────────────────────────── */

test("l'écran AFFICHE le verdict du domaine, il ne le rejuge pas", () => {
  // Deux moteurs de règles finiraient par diverger. L'écran appelle
  // `verdictEquipe` et se contente de montrer ce qu'il rend.
  const src = lireEcran("composants/PlanningJour.jsx");
  assert.ok(src.includes("verdictEquipe("), "le verdict vient du domaine");
  assert.ok(src.includes("verdict?.bloquant") && src.includes("verdict?.avertissements"),
    "les deux niveaux sont affichés séparément");
  // Le bouton n'est bloqué QUE par `bloquant` — un avertissement n'empêche rien.
  assert.ok(/disabled=\{!verdict\?\.ok\}/.test(src),
    "seul un bloquant empêche d'enregistrer");
});

test("les engagements des AUTRES équipes nourrissent le verdict", () => {
  // Sans cette entrée, le domaine croirait tout le monde libre et le
  // chevauchement ne serait jamais détecté à l'écran.
  const src = lireEcran("composants/PlanningJour.jsx");
  assert.ok(src.includes("engagementsParMembre"),
    "l'écran calcule ce que chacun tient déjà ce jour-là");
  assert.ok(src.includes("e.id === brouillon.id"),
    "une équipe ne se compare pas à elle-même");
});

test("la note rapide est distincte de la balise d'atelier", () => {
  // La note de planning est opérationnelle (« Jean part à 15h ») ; la balise
  // « i » sert à corriger le logiciel. Deux tables, deux usages.
  const src = lireEcran("composants/PlanningJour.jsx");
  assert.ok(src.includes("notesDuJour(") && src.includes("ajouterNoteJour("),
    "elle passe par les notes de planning");
  assert.equal(/noterAtelier\(/.test(src), false,
    "et jamais par la balise d'atelier");
});
