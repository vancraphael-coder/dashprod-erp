// =============================================================================
// Congés — le circuit demande → confirmation.
//
// Tout existait et rien n'était branché : l'enum `etat_conge` prévoyait
// demande | approuve | refuse | annule, les capacités `demander_conge` et
// `approuver_conge` étaient déclarées — mais l'application insérait
// directement 'approuve' sans vérifier quoi que ce soit.
//
// Les règles vivent en base (migrations 0120/0121). Ces tests verrouillent le
// versant INTERFACE, où une régression ne se voit ni au build ni aux tests
// d'exécution : afficher une demande comme une absence acquise, ou bloquer une
// affectation sur un congé non accordé.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(ICI, "../../../apps/web/src");
const lire = (p) => fs.readFileSync(path.join(WEB, p), "utf8");
const sansCommentaires = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

/* ── L'écriture passe par les commandes ─────────────────────────────────── */

test("l'application n'écrit plus jamais 'approuve' en direct", () => {
  // C'était le cœur du problème : un membre créait son congé déjà approuvé.
  // Depuis 0121 la table n'a plus de politique d'écriture, mais un appel
  // direct laissé en place produirait une erreur muette côté écran.
  const src = sansCommentaires(lire("lib/adaptateur.js"));
  assert.equal(/from\("conges"\)\s*\.insert/.test(src), false,
    "l'insertion directe dans `conges` est fermée : passer par cmd_conge_demander");
  assert.equal(/from\("conges"\)\s*\.delete/.test(src), false,
    "un congé s'annule (trace conservée), il ne se supprime pas");
});

test("les trois commandes du circuit sont câblées", () => {
  const src = lire("lib/adaptateur.js");
  for (const cmd of ["cmd_conge_demander", "cmd_conge_decider",
                     "cmd_conge_annuler", "cmd_conges"]) {
    assert.ok(src.includes(cmd), `${cmd} n'est pas appelée`);
  }
});

/* ── Une demande n'est pas une absence ──────────────────────────────────── */

test("seuls les congés ACCORDÉS rendent un membre indisponible", () => {
  // Sinon un membre bloquerait son propre planning en demandant : la décision
  // reviendrait de fait au demandeur, pas au bureau.
  // La composition a migré dans le domaine (lot 10f) : elle était recopiée en
  // closures dans Planning.jsx, et il aurait fallu une troisième copie pour
  // les cartes de date. On vérifie donc la règle là où elle vit désormais.
  const src = fs.readFileSync(
    path.join(ICI, "../src/operations/missions.js"), "utf8");
  const bloc = src.slice(src.indexOf("export function lecteurDisponibilite"));
  assert.ok(bloc.includes('c.etat !== "demande"'),
    "le lecteur de disponibilité doit écarter les demandes en attente");
  // Et l'écran ne doit pas en garder une copie divergente.
  const ecran = sansCommentaires(lire("ecrans/Planning.jsx"));
  assert.ok(ecran.includes("lecteurDisponibilite"),
    "le planning doit déléguer au lecteur du domaine, pas le recopier");
});

test("le planning charge les demandes ET les congés accordés", () => {
  // Une absence probable doit se voir, sans bloquer.
  const src = lire("ecrans/Planning.jsx");
  assert.ok(/listerConges\(\[\s*"approuve"\s*,\s*"demande"\s*\]\)/.test(src),
    "le planning doit charger les deux états");
});

test("le calendrier distingue visuellement demande et congé", () => {
  const src = sansCommentaires(lire("ecrans/Planning.jsx"));
  assert.ok(src.includes("nbDemandes"), "les demandes doivent être comptées à part");
  assert.ok(src.includes('couleurPlanning("demande")'),
    "la demande a sa propre couleur, réglable dans Apparence");
  assert.ok(src.includes('couleurPlanning("conge")'));
});

test("le bandeau du jour ne compte pas une demande comme une absence", () => {
  const src = sansCommentaires(lire("ecrans/Planning.jsx"));
  assert.ok(src.includes("enDemande"),
    "les demandes du jour sont annoncées séparément");
  assert.ok(/enConge\s*=\s*surLeJour\.filter\(\(c\) => c\.etat !== "demande"\)/.test(src),
    "« X en congé » ne doit compter que les congés accordés");
});

/* ── Les deux portes ────────────────────────────────────────────────────── */

test("le membre demande, le bureau tranche — deux composants distincts", () => {
  const src = lire("composants/Conges.jsx");
  for (const c of ["DemanderConge", "MesConges", "DemandesConges"]) {
    assert.ok(src.includes(`export function ${c}`), `${c} manquant`);
  }
});

test("le bureau voit la corbeille, le membre voit ses demandes", () => {
  assert.ok(lire("ecrans/Equipe.jsx").includes("DemandesConges"),
    "la corbeille du bureau doit être montée dans Equipe");
  const profil = lire("ecrans/Profil.jsx");
  assert.ok(profil.includes("DemanderConge") && profil.includes("MesConges"),
    "le membre doit pouvoir demander et suivre depuis son compte");
});

test("l'écran ne propose pas des boutons que la base refuserait", () => {
  // `decidable` est calculé en base : elle seule sait qu'on ne tranche pas sa
  // propre demande. L'écran s'y fie au lieu de recalculer une règle en double.
  const src = lire("composants/Conges.jsx");
  assert.ok(src.includes("c.decidable"),
    "les boutons Approuver/Refuser doivent suivre `decidable` renvoyé par la base");
});
