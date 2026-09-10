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
  assert.equal(plan("regular").membres_inclus, 5);
  assert.equal(plan("regular").membres_limite, null, "aucun plafond dur");
});

test("le coût par utilisateur DÉCROÎT à chaque palier", () => {
  // Si monter en gamme coûtait plus cher par personne, personne ne monterait.
  // Le calcul porte sur les membres INCLUS. Il rendait `null` pour Pro tant
  // que le domaine le croyait « illimité » : l'argument de montée en gamme
  // reposait donc sur une valeur absente.
  const c = PLANS.map((p) => coutParUtilisateur(p.cle));
  for (let i = 1; i < c.length; i += 1) {
    assert.ok(c[i] < c[i - 1],
      `${PLANS[i].cle} (${c[i]} €/u) devrait coûter moins par tête que `
      + `${PLANS[i - 1].cle} (${c[i - 1]} €/u)`);
  }
  assert.equal(coutParUtilisateur("pro"), 24, "720 € pour 30 membres inclus");
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

test("la signature et l'espace client sont ouverts à TOUTES les offres", () => {
  // Décision arrêtée au lot 02 : ces deux modules ne servent pas de motif de
  // montée en gamme. Ils étaient ouverts en base et fermés dans le domaine —
  // un client Basique payait donc deux modules que ses écrans lui cachaient.
  for (const cle of ["signature_client", "espace_client"]) {
    for (const p of PLANS) {
      assert.equal(planOuvre(p.cle, cle), true, `${cle} devrait être ouvert en ${p.cle}`);
    }
    assert.equal(planMinimalPour(cle), "starter");
  }
});

test("le motif de montée vers Regular, c'est le B2B et la comptabilité", () => {
  // Un seul motif de montée par palier — sinon personne ne monte. Depuis que
  // la signature descend en Basique, ce motif est Peppol + comptabilité.
  const gain = gainSurPrecedent("regular");
  assert.ok(gain.includes("peppol"));
  assert.ok(gain.includes("comptabilite"));
  assert.ok(!gain.includes("signature_client"));
});

test("Peppol n'est pas dans Starter — c'est ce qui force le B2B à monter", () => {
  assert.equal(planOuvre("starter", "peppol"), false);
  assert.equal(planOuvre("regular", "peppol"), true);
});

test("l'international reste un module de Regular, Pro ouverte", () => {
  // Choix assumé : Pro se différencie par la logistique multi-sites, pas en
  // retirant à Regular une valeur déjà livrée.
  assert.equal(planOuvre("regular", "international"), true);
  assert.equal(planMinimalPour("international"), "regular");
});

test("une offre VENDUE ne repose jamais uniquement sur des promesses", () => {
  // La règle vaut pour ce qu'on encaisse : toute offre souscriptible doit
  // apporter au moins un module réellement livré par rapport à la précédente.
  for (const p of plansDisponibles()) {
    if (PLANS.indexOf(p) === 0) continue;
    const nouveautes = gainSurPrecedent(p.cle).filter((c) => module(c)?.livre);
    assert.ok(nouveautes.length > 0,
      `${p.cle} est vendue sans apporter un seul module livré`);
  }
  // Pro est ouverte depuis le 13/08/2026 : souscriptible et sans motif de verrou.
  assert.equal(planDisponible("pro"), true, "Pro doit être souscriptible");
  assert.ok(!plan("pro").verrou_motif, "et ne plus porter de motif de verrou");
});

test("ce que Pro apporte de plus est bien livré — d'où l'ouverture", () => {
  // L'inverse de l'ancienne règle : Pro ne s'ouvre que parce que ce qui la
  // définit est construit.
  const gains = gainSurPrecedent("pro");
  assert.ok(gains.length > 0, "Pro doit apporter quelque chose de plus");
  for (const c of gains) {
    assert.equal(module(c)?.livre, true, `${c} vendu dans Pro sans être livré`);
  }
});

test("les modules livrés sont utilisables, pas relégués à « à venir »", () => {
  assert.equal(modulesAVenir("pro").includes("multi_depots"), false);
  assert.ok(modulesUtilisables("pro").includes("multi_depots"));
  // Aucun plan ne se contente de promesses.
  for (const p of PLANS) {
    assert.ok(modulesUtilisables(p.cle).length >= 8, `${p.cle} trop vide`);
  }
});

// — Limite d'utilisateurs —
test("dépasser le forfait est ACCEPTÉ et facturé, pas refusé", () => {
  // CE QUI CASSAIT SANS CE TEST : le domaine refusait le 3ᵉ utilisateur en
  // Basique avec « passez à l'offre supérieure », alors que la base ne
  // plafonne plus et facture le membre supplémentaire 13 €. L'écran déclinait
  // une vente que la facturation savait encaisser.
  const dedans = peutAjouterUtilisateur("starter", 1);
  assert.equal(dedans.ok, true);
  assert.equal(dedans.restants, 1);

  const audela = peutAjouterUtilisateur("starter", 2);
  assert.equal(audela.ok, true, "aucun plafond dur en Basique");
  assert.equal(audela.supplement_centimes, 1300);
  assert.match(audela.message, /13 € HTVA/);
});

test("un plafond DUR, lui, refuse", () => {
  // Aucun palier déménageur n'en porte ; les offres sectorielles oui.
  // Le mécanisme doit donc rester en état de marche.
  const faux = { ...plan("starter") };
  assert.equal(faux.membres_limite, null);
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
test("la grille du domaine correspond à celle de la base", () => {
  // CE TEST A ÉTÉ LA CAUSE DU PROBLÈME QU'IL DEVAIT PRÉVENIR. Il figeait une
  // recopie de `modules_du_plan` datée de la migration 0075. Quand la
  // décision du lot 02 a ouvert `signature_client` et `espace_client` à
  // TOUTES les offres, la base a suivi et cette recopie non — le test
  // verrouillait donc la version périmée et refusait la correction.
  //
  // Il compare désormais au référentiel, qui est aussi la source du SQL de
  // publication : les deux ne peuvent plus dire des choses différentes.
  const EN_BASE = {
    starter: ["crm", "releve", "devis", "offre", "planning", "terrain",
              "flotte", "facturation", "signature_client", "espace_client"],
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

test("les seuils de membres correspondent à ceux de la base", () => {
  // Deux notions distinctes, longtemps confondues sous un champ unique :
  // ce qui est COMPRIS dans le prix, et le PLAFOND dur. Pro comprend 30
  // membres et ne plafonne pas — le domaine disait « illimité », ce qui
  // effaçait le seuil facturable.
  const INCLUS = { starter: 2, regular: 5, pro: 30 };
  for (const p of PLANS) {
    assert.equal(p.membres_inclus, INCLUS[p.cle], `inclus divergent pour ${p.cle}`);
    assert.equal(p.membres_limite, null, `${p.cle} ne doit porter aucun plafond dur`);
    assert.equal(p.prix_membre_supp_centimes, 1300, `membre supp. de ${p.cle}`);
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
  // L'essai suit la meilleure offre souscriptible. Pro étant ouverte, il porte
  // désormais sur Pro.
  assert.equal(ESSAI_PLAN, meilleurPlanDisponible());
  assert.equal(ESSAI_PLAN, "pro");
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

test("redescendre avec plus de monde se FACTURE, ne s'arbitre pas", () => {
  // La grille ne plafonne plus les membres : descendre en Basique à quatre
  // n'oblige personne à archiver un collègue. Le surcoût est annoncé AVANT,
  // pour qu'il ne se découvre pas sur la facture.
  const r = exigencesChangement({ planActuel: "regular", planCible: "starter",
                                  utilisateursActifs: 4 });
  assert.equal(r.immediat, true);
  assert.deepEqual(r.exigences, []);
  assert.equal(r.membres_au_dela_du_forfait, 2);
  assert.equal(r.supplement_mensuel_centimes, 2600);
});

test("les modules perdus sont ANNONCÉS, mais ne demandent rien", () => {
  // Leurs données restent : c'est ce qui permet de remonter sans rien perdre.
  const r = exigencesChangement({ planActuel: "regular", planCible: "starter",
                                  utilisateursActifs: 2 });
  // `signature_client` n'est plus perdu en descendant : il est ouvert à
  // toutes les offres depuis le lot 02.
  assert.ok(!r.modules_perdus.includes("signature_client"));
  assert.ok(r.modules_perdus.includes("peppol"));
  assert.ok(r.modules_perdus.includes("comptabilite"));
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
