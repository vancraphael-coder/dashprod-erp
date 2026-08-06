// Tests — les trois offres commerciales.
// Ils vérifient surtout la COHÉRENCE de l'échelle : une grille de prix
// incohérente ne se rattrape pas par du marketing.
import test from "node:test";
import assert from "node:assert/strict";
import {
  MODULES, PLANS, PLAN_DEFAUT, module, plan, modulesSocle, planOuvre,
  planDisponible, plansDisponibles, meilleurPlanDisponible,
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

test("l'international est vendu dès Regular tant que Pro est verrouillée", () => {
  // Il est LIVRÉ et testé : le laisser dans une offre qu'on ne peut pas
  // souscrire le rendrait invendable.
  assert.equal(planOuvre("regular", "international"), true);
  assert.equal(planMinimalPour("international"), "regular");
});

test("une offre VENDUE ne repose jamais uniquement sur des promesses", () => {
  // La règle vaut pour ce qu'on encaisse. Pro est annoncée mais VERROUILLÉE
  // précisément parce que ce qui la définit n'est pas construit — c'est la
  // manière honnête de tenir la règle plutôt que de la contourner.
  for (const p of plansDisponibles()) {
    if (PLANS.indexOf(p) === 0) continue;
    const nouveautes = gainSurPrecedent(p.cle).filter((c) => module(c)?.livre);
    assert.ok(nouveautes.length > 0,
      `${p.cle} est vendue sans apporter un seul module livré`);
  }
  assert.equal(planDisponible("pro"), false, "Pro ne doit pas être souscriptible");
  assert.ok(plan("pro").verrou_motif, "et le motif du verrou doit être dit");
});

test("Pro n'apporte que du non-livré — d'où le verrou", () => {
  const livres = gainSurPrecedent("pro").filter((c) => module(c)?.livre);
  assert.deepEqual(livres, [],
    "si Pro gagnait un module livré, elle devrait être ouverte à la vente");
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
              "peppol", "comptabilite", "rapport_chantier", "paie", "journal",
              "international"],
    pro: ["crm", "releve", "devis", "offre", "planning", "terrain",
          "flotte", "facturation", "signature_client", "espace_client",
          "peppol", "comptabilite", "rapport_chantier", "paie", "journal",
          "international", "multi_depots", "gestionnaire_depot", "stockage_3d"],
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

// — Périodicité, essai, changement d'offre —
import {
  REMISE_ANNUELLE_PCT, ESSAI_JOURS, ESSAI_PLAN, prixPeriode, finEssai,
  essaiActif, joursEssaiRestants, exigencesChangement, selectionRecevable,
} from "../src/commercial/plans.js";

test("l'annuel remise 5 % sur douze mois", () => {
  assert.equal(REMISE_ANNUELLE_PCT, 5);
  const a = prixPeriode("regular", "annuel");
  assert.equal(a.total_centimes, 410400, "360 × 12 = 4320 € − 5 % = 4104 €");
  assert.equal(a.economie_centimes, 21600, "216 € économisés");
  assert.equal(a.equivalent_mensuel_centimes, 34200);
});

test("le mensuel reste au prix affiché, sans remise", () => {
  const m = prixPeriode("regular");
  assert.equal(m.total_centimes, 36000);
  assert.equal(m.economie_centimes, 0);
});

test("l'annuel est toujours moins cher que douze mensualités", () => {
  for (const p of PLANS) {
    const m = prixPeriode(p.cle).total_centimes * 12;
    const a = prixPeriode(p.cle, "annuel").total_centimes;
    assert.ok(a < m, `${p.cle} : l'annuel devrait être plus avantageux`);
  }
});

test("l'essai dure 5 jours, sur la meilleure offre SOUSCRIPTIBLE", () => {
  assert.equal(ESSAI_JOURS, 5);
  // Faire essayer une offre verrouillée serait une impasse : le client ne
  // pourrait pas la souscrire à la fin. La constante suit l'ouverture de Pro.
  assert.equal(ESSAI_PLAN, meilleurPlanDisponible());
  assert.equal(planDisponible(ESSAI_PLAN), true);
  const fin = finEssai(new Date("2026-08-05T10:00:00"));
  assert.equal(fin.toISOString().slice(0, 10), "2026-08-10");
});

test("l'essai expire proprement", () => {
  const maintenant = new Date("2026-08-05T10:00:00");
  assert.equal(essaiActif("2026-08-10T10:00:00", maintenant), true);
  assert.equal(essaiActif("2026-08-01T10:00:00", maintenant), false);
  assert.equal(essaiActif(null, maintenant), false);
  assert.equal(joursEssaiRestants("2026-08-10T10:00:00", maintenant), 5);
  assert.equal(joursEssaiRestants("2026-08-01T10:00:00", maintenant), 0);
});

// — Le changement d'offre : archiver, JAMAIS supprimer —
test("monter d'offre ne demande aucun arbitrage", () => {
  const r = exigencesChangement({ planActuel: "starter", planCible: "regular",
                                  utilisateursActifs: 2 });
  assert.equal(r.immediat, true);
  assert.equal(r.montee, true);
  assert.deepEqual(r.exigences, []);
});

test("redescendre avec trop d'utilisateurs EXIGE de désigner qui reste", () => {
  const r = exigencesChangement({ planActuel: "regular", planCible: "starter",
                                  utilisateursActifs: 4 });
  assert.equal(r.immediat, false);
  const e = r.exigences[0];
  assert.equal(e.type, "utilisateurs");
  assert.equal(e.a_conserver, 2);
  assert.equal(e.a_archiver, 2);
  assert.match(e.detail, /désignez 2 personnes/);
});

test("les modules perdus sont ANNONCÉS, mais ne demandent rien", () => {
  // Leurs données restent : c'est ce qui permet de remonter sans rien perdre.
  const r = exigencesChangement({ planActuel: "regular", planCible: "starter",
                                  utilisateursActifs: 2 });
  assert.ok(r.modules_perdus.includes("signature_client"));
  assert.ok(r.modules_perdus.includes("peppol"));
  assert.equal(r.immediat, true, "aucun arbitrage pour les modules");
});

test("Pro n'impose jamais de limite d'utilisateurs", () => {
  const r = exigencesChangement({ planActuel: "regular", planCible: "pro",
                                  utilisateursActifs: 50 });
  assert.equal(r.immediat, true);
});

test("la sélection guide au lieu de refuser sèchement", () => {
  const e = { a_conserver: 2 };
  assert.equal(selectionRecevable(e, 3).ok, false);
  assert.match(selectionRecevable(e, 3).message, /3 personnes pour 2 place/);
  assert.equal(selectionRecevable(e, 1).ok, true);
  assert.match(selectionRecevable(e, 1).message, /reste 1 place/);
  assert.equal(selectionRecevable(e, 2).message, null);
});
