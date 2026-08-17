// =============================================================================
// Carnet de contacts — regroupement et pré-remplissage.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import {
  GROUPES, groupeDe, parGroupe, nbMissions, typesHabituels,
  natureHabituelle, preRemplissage, coordonneesManquantes,
} from "../src/crm/carnet.js";

test("les quatre groupes demandés existent, dans l'ordre du bureau", () => {
  const cles = GROUPES.map((g) => g.cle);
  for (const g of ["en_cours", "confirmees", "planifiees", "effectuees"]) {
    assert.ok(cles.includes(g), `groupe ${g} manquant`);
  }
  // Ce qui arrive vient avant ce qui est fait.
  assert.ok(cles.indexOf("en_cours") < cles.indexOf("effectuees"));
});

test("chaque état d'affaire tombe dans un groupe", () => {
  assert.equal(groupeDe("en_cours"), "en_cours");
  assert.equal(groupeDe("confirme"), "confirmees");
  assert.equal(groupeDe("planifie"), "planifiees");
  // Facturé et payé sont bien des missions EFFECTUÉES : le travail a eu lieu.
  for (const e of ["effectue", "facture", "paye", "clos"]) {
    assert.equal(groupeDe(e), "effectuees", `${e} doit être effectué`);
  }
  // Un report reste attendu, il n'est pas fait.
  assert.equal(groupeDe("reporte"), "planifiees");
  // Un état inconnu ne casse rien.
  assert.equal(groupeDe("zzz"), "pistes");
});

test("un devis n'est pas une mission", () => {
  // Les mêler gonflerait le carnet de choses qui n'ont jamais eu lieu.
  for (const e of ["brouillon", "devis", "envoye"]) {
    assert.equal(groupeDe(e), "pistes");
  }
  const missions = [{ etat: "devis" }, { etat: "effectue" }, { etat: "paye" }];
  assert.equal(nbMissions(missions), 2);
});

test("seuls les groupes NON VIDES sont rendus", () => {
  // « Effectuées (0) » sur un nouveau client n'apprend rien.
  const g = parGroupe([{ etat: "confirme" }, { etat: "confirme" }]);
  assert.equal(g.length, 1);
  assert.equal(g[0].cle, "confirmees");
  assert.equal(g[0].missions.length, 2);
  assert.deepEqual(parGroupe([]), []);
});

test("le groupe fourni par la base prime sur le calcul local", () => {
  // La base range déjà les missions : recalculer ouvrirait une divergence.
  const g = parGroupe([{ etat: "devis", groupe: "effectuees" }]);
  assert.equal(g[0].cle, "effectuees");
});

/* ── Le pré-remplissage ─────────────────────────────────────────────────── */

test("la nature habituelle d'un contact est la plus fréquente", () => {
  const m = [{ nature: "sous_traitance" }, { nature: "sous_traitance" },
             { nature: "demenagement" }];
  assert.equal(natureHabituelle(m), "sous_traitance");
});

test("à égalité, on ne devine pas", () => {
  // Deux natures aussi fréquentes ne désignent aucune habitude ; imposer un
  // mauvais parcours coûte plus cher que ne rien proposer.
  const m = [{ nature: "lift" }, { nature: "boxe" }];
  assert.equal(natureHabituelle(m), null);
  assert.equal(natureHabituelle([]), null);
  assert.equal(natureHabituelle(null), null);
});

test("le pré-remplissage ne rend que ce qu'on sait", () => {
  const c = { id: "c1", nom: "Meubles Dupont", tel: "0470", email: "",
              societe: "Dupont SA",
              missions: [{ nature: "sous_traitance" }, { nature: "sous_traitance" }] };
  const p = preRemplissage(c);
  assert.equal(p.clientId, "c1");
  assert.equal(p.nature, "sous_traitance");
  assert.equal(p.email, "");        // vide, pas inventé
  assert.equal(preRemplissage(null), null);
});

test("les types habituels s'écrivent en clair", () => {
  assert.deepEqual(typesHabituels(["sous_traitance", "lift"]),
    ["Sous-traitance", "Lift"]);
  // Une nature inconnue est écartée, pas affichée brute.
  assert.deepEqual(typesHabituels(["bricolage"]), []);
});

test("un contact sans coordonnées est signalé", () => {
  assert.deepEqual(coordonneesManquantes({ tel: "0470", email: "a@b.c" }), []);
  assert.deepEqual(coordonneesManquantes({ tel: "", email: "" }),
    ["téléphone", "e-mail"]);
});

/* ── Le câblage ─────────────────────────────────────────────────────────── */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ICI = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(ICI, "../../../apps/web/src");
const lire = (p) => fs.readFileSync(path.join(WEB, p), "utf8");

test("le carnet est bâti sur `clients`, sans table parallèle", () => {
  // Deux fiches pour un même client, ce sont deux numéros à tenir à jour —
  // et un jour l'un des deux est faux sans qu'on sache lequel.
  const ad = lire("lib/adaptateur.js");
  assert.ok(ad.includes("cmd_carnet"));
  assert.equal(/from\("carnet"\)/.test(ad), false,
    "aucune table `carnet` ne doit exister");
});

test("partir d'un contact ne crée PAS un doublon de client", () => {
  // C'est tout l'intérêt du carnet pour un récurrent : réutiliser la fiche.
  const ad = lire("lib/adaptateur.js");
  assert.ok(/creerDossierVide\(nature = "demenagement", clientId = null\)/.test(ad));
  assert.ok(ad.includes("? creerAffaire({ clientId, nature })"),
    "avec un clientId, aucun client ne doit être inséré");
});

test("le carnet se consulte depuis la liste des dossiers", () => {
  // C'est là qu'on cherche un client, pas dans les réglages.
  assert.ok(lire("ecrans/ListeAffaires.jsx").includes("versCarnet"));
  assert.ok(lire("main.jsx").includes('ecran: "carnet"'));
});

test("chaque mission du carnet ouvre son dossier", () => {
  const src = lire("ecrans/Carnet.jsx");
  assert.ok(src.includes("ouvrirDossier && ouvrirDossier(m.id)"),
    "le raccourci vers la mission est le point de la demande");
});
