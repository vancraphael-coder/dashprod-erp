// =============================================================================
// ON NE PEUT PAS S'ENFERMER DEHORS.
//
// CE QUI CASSE SANS CES TESTS : une société qui retire `confier_les_acces` à
// son dernier rôle qui la porte. Plus personne ne peut redonner de droits, et
// l'application n'offre aucun chemin de retour — il faut une intervention en
// base. C'est aussi le geste qu'un salarié sur le départ pourrait faire par
// malveillance, en un clic.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { retraitPermis, detenteursApresRetrait, estCleDeVoute,
         CAPACITES_CLE_DE_VOUTE, CAPACITES }
  from "../src/rh/capacites.js";

const PAR_ROLE = {
  fondateur: ["confier_les_acces", "gerer_referentiels", "emettre_facture"],
  gerant: ["confier_les_acces", "gerer_referentiels"],
  secretaire: ["emettre_facture"],
  demenageur: ["pointer_chantier"],
};

test("les clés de voûte sont nommées, et elles sont deux", () => {
  assert.deepEqual([...CAPACITES_CLE_DE_VOUTE],
    ["confier_les_acces", "gerer_referentiels"]);
  assert.equal(estCleDeVoute("confier_les_acces"), true);
  assert.equal(estCleDeVoute("emettre_facture"), false);
});

test("une capacité ordinaire se retire librement", () => {
  // On peut toujours la redonner : aucune raison de bloquer.
  const membres = [{ actif: true, roles: ["secretaire"], capacitesIndividuelles: [] }];
  assert.equal(
    retraitPermis(membres, PAR_ROLE, "emettre_facture", "secretaire").permis,
    true);
});

test("REFUS — le dernier détenteur d'une clé de voûte", () => {
  const membres = [
    { actif: true, roles: ["fondateur"], capacitesIndividuelles: [] },
    { actif: true, roles: ["demenageur"], capacitesIndividuelles: [] },
  ];
  const r = retraitPermis(membres, PAR_ROLE, "confier_les_acces", "fondateur");
  assert.equal(r.permis, false);
  assert.equal(r.restants, 0);
  assert.match(r.motif, /verrouillerait dehors/);
});

test("un autre rôle qui la porte suffit", () => {
  const membres = [
    { actif: true, roles: ["fondateur"], capacitesIndividuelles: [] },
    { actif: true, roles: ["gerant"], capacitesIndividuelles: [] },
  ];
  assert.equal(
    retraitPermis(membres, PAR_ROLE, "confier_les_acces", "fondateur").permis,
    true);
});

test("une dérogation individuelle suffit aussi", () => {
  // Les deux origines comptent. Ne regarder que les rôles refuserait un
  // retrait pourtant sans danger — et c'est le cas réel mesuré chez Roovers.
  const membres = [
    { actif: true, roles: ["fondateur"], capacitesIndividuelles: [] },
    { actif: true, roles: ["demenageur"],
      capacitesIndividuelles: ["confier_les_acces"] },
  ];
  const r = retraitPermis(membres, PAR_ROLE, "confier_les_acces", "fondateur");
  assert.equal(r.permis, true);
  assert.equal(r.restants, 1);
});

test("un membre désactivé ou retiré ne compte pas", () => {
  // Compter quelqu'un qui ne peut plus se connecter, c'est laisser la porte
  // se fermer en croyant qu'elle reste ouverte.
  const membres = [
    { actif: true, roles: ["fondateur"], capacitesIndividuelles: [] },
    { actif: false, roles: ["gerant"], capacitesIndividuelles: [] },
    { actif: true, retire: true, roles: ["gerant"], capacitesIndividuelles: [] },
  ];
  assert.equal(
    retraitPermis(membres, PAR_ROLE, "confier_les_acces", "fondateur").permis,
    false);
});

test("le compte ne se trompe pas sur le rôle retiré", () => {
  // Deux membres du MÊME rôle : le retrait les prive tous les deux. Compter
  // l'un d'eux comme détenteur serait le bug le plus facile à écrire.
  const membres = [
    { actif: true, roles: ["fondateur"], capacitesIndividuelles: [] },
    { actif: true, roles: ["fondateur"], capacitesIndividuelles: [] },
  ];
  assert.equal(
    detenteursApresRetrait(membres, PAR_ROLE, "confier_les_acces", "fondateur"),
    0);
});

test("aucun membre : le retrait d'une clé de voûte est refusé", () => {
  assert.equal(retraitPermis([], PAR_ROLE, "gerer_referentiels", "fondateur").permis,
    false);
  assert.equal(retraitPermis(null, PAR_ROLE, "gerer_referentiels", "fondateur").permis,
    false);
});

test("le catalogue du domaine couvre les capacités de la base", () => {
  // DIVERGENCE MESURÉE le 13/09/2026 : la base distribuait
  // `confier_les_acces` et `cloturer_dossier` sans que le domaine les
  // connaisse. Aucun écran ne pouvait donc les lister ni les décrire — y
  // compris la plus puissante de toutes.
  //
  // Recopie de la table `capacites` en base. Une nouvelle capacité doit
  // atterrir aux deux endroits, et ce test le dit.
  const EN_BASE = ["approuver_conge", "cloturer_chantier", "cloturer_dossier",
    "confier_les_acces", "creer_affaire", "demander_conge", "emettre_facture",
    "faire_signer", "gerer_depot", "gerer_planning", "gerer_referentiels",
    "pointer_chantier", "signaler_materiel", "valider_intake", "voir_paie",
    "voir_prix", "voir_tresorerie"];
  const auCatalogue = CAPACITES.map((c) => c.cle).sort();
  assert.deepEqual(auCatalogue, [...EN_BASE].sort());
});

test("chaque capacité a un titre, et les sensibles un détail", () => {
  for (const c of CAPACITES) {
    assert.ok(c.titre, `${c.cle} sans titre`);
    if (c.sensible) {
      assert.ok(c.detail && c.detail.length > 30,
        `${c.cle} est sensible et n'explique pas ce qu'elle ouvre`);
    }
  }
});
