// Tests — les trois offres commerciales.
// Ils vérifient surtout la COHÉRENCE de l'échelle : une grille de prix
// incohérente ne se rattrape pas par du marketing.
import test from "node:test";
import assert from "node:assert/strict";
import {
  MODULES, PLANS, PLAN_DEFAUT, module, plan, modulesSocle, planOuvre,
  modulesUtilisables, modulesAVenir, gainSurPrecedent, peutAjouterUtilisateur,
  prixMensuel, coutParUtilisateur, planMinimalPour,
} from "../src/commercial/plans.js";

test("chaque module dit ce qu'il APPORTE, pas ce qu'il est", () => {
  for (const m of MODULES) {
    assert.ok(m.titre && m.titre.length > 4, `titre : ${m.cle}`);
    assert.ok(m.valeur && m.valeur.length > 30, `valeur : ${m.cle}`);
    assert.equal(typeof m.livre, "boolean", `livré ? ${m.cle}`);
    // Une promesse de valeur ne se formule pas en jargon d'écran.
    assert.equal(/écran|module|fonctionnalité/i.test(m.valeur), false,
      `${m.cle} : la valeur est décrite en jargon`);
  }
});

test("trois offres, dans l'ordre croissant de prix", () => {
  assert.equal(PLANS.length, 3);
  for (let i = 1; i < PLANS.length; i++) {
    assert.ok(PLANS[i].prix_centimes > PLANS[i - 1].prix_centimes,
      `${PLANS[i].cle} devrait coûter plus que ${PLANS[i - 1].cle}`);
  }
});

test("Regular reste à 360 € HTVA — le prix déjà annoncé", () => {
  assert.equal(plan("regular").prix_centimes, 36000);
  assert.equal(prixMensuel("regular"), "360 € HTVA / mois");
  assert.equal(plan("regular").utilisateurs, 5);
});

test("le coût par utilisateur DÉCROÎT à chaque palier", () => {
  // Si monter en gamme coûtait plus cher par personne, personne ne monterait.
  const starter = coutParUtilisateur("starter");
  const regular = coutParUtilisateur("regular");
  assert.ok(starter > regular,
    `Starter ${starter} €/u devrait dépasser Regular ${regular} €/u`);
  assert.equal(coutParUtilisateur("pro"), null, "Pro est illimité");
});

test("chaque offre inclut TOUT le socle", () => {
  const socle = modulesSocle();
  for (const p of PLANS) {
    for (const c of socle) {
      assert.ok(p.modules.includes(c),
        `${p.cle} devrait inclure le socle ${c}`);
    }
  }
});

test("les offres s'emboîtent : rien ne se PERD en montant", () => {
  for (let i = 1; i < PLANS.length; i++) {
    for (const c of PLANS[i - 1].modules) {
      assert.ok(PLANS[i].modules.includes(c),
        `${PLANS[i].cle} perd ${c} par rapport à ${PLANS[i - 1].cle}`);
    }
  }
});

test("chaque palier apporte un gain RÉEL, et un motif de montée", () => {
  assert.ok(gainSurPrecedent("regular").length >= 3);
  assert.ok(gainSurPrecedent("pro").length >= 1);
  assert.equal(gainSurPrecedent("starter").length, 0, "premier palier");
  // Sauf le dernier, chaque offre dit en une phrase pourquoi monter.
  assert.ok(plan("starter").motif_montee);
  assert.ok(plan("regular").motif_montee);
  assert.equal(plan("pro").motif_montee, null);
});

test("la signature en ligne est le moteur du passage à Regular", () => {
  assert.equal(planOuvre("starter", "signature_client"), false);
  assert.equal(planOuvre("regular", "signature_client"), true);
  assert.equal(planMinimalPour("signature_client"), "regular");
});

test("Peppol n'est pas dans Starter — c'est ce qui force le B2B à monter", () => {
  assert.equal(planOuvre("starter", "peppol"), false);
  assert.equal(planOuvre("regular", "peppol"), true);
});

test("l'international est réservé à Pro", () => {
  assert.equal(planOuvre("regular", "international"), false);
  assert.equal(planOuvre("pro", "international"), true);
  assert.equal(planMinimalPour("international"), "pro");
});

test("Pro apporte au moins un module DÉJÀ LIVRÉ — sinon il est invendable", () => {
  const nouveautes = gainSurPrecedent("pro").filter((c) => module(c)?.livre);
  assert.ok(nouveautes.length > 0,
    "Pro ne doit pas reposer uniquement sur des promesses");
  assert.ok(nouveautes.includes("international"));
});

test("ce qui n'est pas livré est séparé de ce qui l'est", () => {
  const aVenir = modulesAVenir("pro");
  assert.ok(aVenir.includes("multi_depots"));
  assert.equal(modulesUtilisables("pro").includes("multi_depots"), false);
  // Aucun plan ne se contente de promesses.
  for (const p of PLANS) {
    assert.ok(modulesUtilisables(p.cle).length >= 8, `${p.cle} trop vide`);
  }
});

// — Limite d'utilisateurs —
test("la limite se dit avec un message, pas un refus muet", () => {
  const ok = peutAjouterUtilisateur("starter", 1);
  assert.equal(ok.ok, true);
  assert.equal(ok.restants, 1);

  const stop = peutAjouterUtilisateur("starter", 2);
  assert.equal(stop.ok, false);
  assert.match(stop.message, /Starter/);
  assert.match(stop.message, /offre supérieure/);
});

test("Pro n'a aucune limite d'utilisateurs", () => {
  assert.equal(peutAjouterUtilisateur("pro", 500).ok, true);
});

test("un plan inconnu retombe sur le défaut plutôt que de tout fermer", () => {
  // Une organisation sans plan renseigné ne doit pas se retrouver bloquée.
  assert.equal(planOuvre(null, "facturation"), true);
  assert.equal(planOuvre("inexistant", "signature_client"),
               planOuvre(PLAN_DEFAUT, "signature_client"));
  assert.equal(peutAjouterUtilisateur(undefined, 3).ok, true);
});

// — La liste des modules est DUPLIQUÉE en base (modules_du_plan) : c'est
//   assumé, la base doit pouvoir refuser seule. Mais les deux doivent dire la
//   même chose, sinon l'interface montre ce que la base refuse.
test("la grille du domaine correspond à celle de la base (0075)", () => {
  // Recopie littérale de `modules_du_plan` en base. Toute divergence ici
  // signale qu'une des deux a bougé sans l'autre.
  const EN_BASE = {
    starter: ["crm", "releve", "devis", "offre", "planning", "terrain",
              "flotte", "facturation"],
    regular: ["crm", "releve", "devis", "offre", "planning", "terrain",
              "flotte", "facturation", "signature_client", "espace_client",
              "peppol", "comptabilite", "rapport_chantier", "paie", "journal"],
    pro: ["crm", "releve", "devis", "offre", "planning", "terrain",
          "flotte", "facturation", "signature_client", "espace_client",
          "peppol", "comptabilite", "rapport_chantier", "paie", "journal",
          "international", "multi_depots", "stockage_3d"],
  };
  for (const p of PLANS) {
    assert.deepEqual([...p.modules].sort(), [...EN_BASE[p.cle]].sort(),
      `la grille de ${p.cle} diverge entre le domaine et la base`);
  }
});

test("les limites d'utilisateurs correspondent à celles de la base", () => {
  const EN_BASE = { starter: 2, regular: 5, pro: null };
  for (const p of PLANS) {
    assert.equal(p.utilisateurs, EN_BASE[p.cle],
      `limite divergente pour ${p.cle}`);
  }
});
