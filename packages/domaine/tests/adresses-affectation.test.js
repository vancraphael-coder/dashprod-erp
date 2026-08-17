// =============================================================================
// Adresses par métier, et vérité de chaque affectation.
//
// Le point de départ : lift, sous-traitance, logistique et garde-meubles sont
// des MÉTIERS, pas des variantes du déménagement. « Chargement / Déchargement »
// est leur vocabulaire à lui, et il ne veut rien dire ailleurs.
// =============================================================================
import test from "node:test";
import assert from "node:assert/strict";
import {
  planAdresses, groupeUtilise, titreAdresse, manquesAdresses, estRemplie,
  peutAjouter, toutesLesAdresses, resumeTrajet, metier,
} from "../src/commercial/adresses.js";
import {
  EXIGENCES, exigence, etatAffectation, couleurVoyant, resumeAffectation,
  missionsAPourvoir,
} from "../src/planning/affectation.js";

/* ── Les adresses ───────────────────────────────────────────────────────── */

test("un lift a des ADRESSES numérotées, pas un chargement", () => {
  // Un lift ne charge rien : il se pose devant une façade.
  const p = planAdresses("lift");
  assert.equal(p.length, 1);
  assert.equal(p[0].titre, "Adresse");
  assert.equal(p[0].numerote, true);
  assert.equal(groupeUtilise("lift", "decharges"), false,
    "il n'y a pas de déchargement pour un lift");
  assert.equal(titreAdresse(p[0], 0, 3), "Adresse 1");
  assert.equal(titreAdresse(p[0], 4, 5), "Adresse 5");
});

test("le déménagement garde chargement puis déchargement", () => {
  const p = planAdresses("demenagement");
  assert.deepEqual(p.map((g) => g.titre), ["Chargement", "Déchargement"]);
  // Une seule adresse : pas de numéro inutile.
  assert.equal(titreAdresse(p[0], 0, 1), "Chargement");
  assert.equal(titreAdresse(p[0], 1, 2), "Chargement 2");
});

test("une sous-traitance part d'un enlèvement vers plusieurs livraisons", () => {
  const p = planAdresses("sous_traitance");
  assert.deepEqual(p.map((g) => g.titre), ["Enlèvement", "Livraison"]);
  // L'enlèvement est FACULTATIF : le donneur d'ordre livre parfois lui-même
  // la marchandise sur place.
  assert.equal(p[0].min, 0);
  assert.equal(p[1].min, 1);
  assert.equal(p[1].numerote, true, "les livraisons se suivent dans la tournée");
});

test("une zone est un flux, pas un trajet", () => {
  const p = planAdresses("zone");
  assert.deepEqual(p.map((g) => g.titre), ["Arrivée", "Enlèvement"]);
  // Les deux sont facultatifs : une zone peut n'avoir que des entrées.
  assert.ok(p.every((g) => g.min === 0));
});

test("un boxe n'a qu'une adresse, et elle est facultative", () => {
  const p = planAdresses("boxe");
  assert.equal(p.length, 1);
  assert.equal(p[0].min, 0, "le client peut déposer lui-même");
});

test("chaque nature annonce son métier", () => {
  assert.equal(metier("lift"), "Flottes nationales");
  assert.equal(metier("zone"), "Logistique");
  assert.equal(metier("boxe"), "Garde-meubles");
  assert.match(metier("sous_traitance"), /multi-sectorielle/);
  assert.equal(metier("bricolage"), null);
});

test("une adresse vide ne compte pas comme remplie", () => {
  // Sinon un formulaire pré-rempli d'une ligne blanche passerait pour rempli.
  assert.equal(estRemplie({ adresse: "", ville: "" }), false);
  assert.equal(estRemplie({ adresse: "   " }), false);
  assert.equal(estRemplie({ ville: "Namur" }), true);
  assert.equal(estRemplie(null), false);
});

test("les manques sont nommés dans le vocabulaire du métier", () => {
  const m = manquesAdresses("sous_traitance", { charges: [], decharges: [] });
  assert.equal(m.length, 1, "seule la livraison est obligatoire");
  assert.match(m[0], /livraison/i);

  assert.deepEqual(
    manquesAdresses("sous_traitance",
      { charges: [], decharges: [{ ville: "Liège" }] }), []);
  // Un boxe sans adresse est parfaitement valide.
  assert.deepEqual(manquesAdresses("boxe", { charges: [] }), []);
});

test("le nombre d'adresses est borné", () => {
  const g = planAdresses("lift")[0];
  assert.equal(peutAjouter(g, [1, 2, 3, 4]), true);
  assert.equal(peutAjouter(g, [1, 2, 3, 4, 5]), false);
});

test("on peut lire toutes les adresses sans savoir où elles sont rangées", () => {
  const t = toutesLesAdresses("lift", { charges: [{ ville: "Gand" }, {}] });
  assert.equal(t.length, 1);
  assert.equal(t[0].groupe, "charges");
});

test("le résumé n'invente pas un trajet là où il n'y en a pas", () => {
  assert.equal(resumeTrajet("demenagement",
    { charges: [{ ville: "Bruxelles" }], decharges: [{ ville: "Namur" }] }),
    "Bruxelles → Namur");
  // Un lift n'a qu'une liste : pas de flèche.
  assert.equal(resumeTrajet("lift", { charges: [{ ville: "Gand" }] }), "Gand");
  assert.equal(resumeTrajet("demenagement", {}), "");
});

/* ── La vérité des affectations ─────────────────────────────────────────── */

const FLOTTE = [
  { id: "c1", nom: "Iveco", categorie: "camion" },
  { id: "l1", nom: "Böcker", categorie: "lift" },
  { id: "v1", nom: "Clio", categorie: "voiture" },
];

test("rien d'affecté : le voyant est gris, pas orange", () => {
  // Vide et incomplet sont deux choses différentes : l'un n'a pas commencé,
  // l'autre est en cours et mal fait.
  const r = etatAffectation("demenagement", { membres: [], vehicules: [] }, FLOTTE);
  assert.equal(r.etat, "vide");
  assert.equal(couleurVoyant(r.etat), "gris");
});

test("une visite se fait à UNE personne, sans camion", () => {
  const seul = etatAffectation("visite", { membres: ["m1"], vehicules: [] }, FLOTTE);
  assert.equal(seul.etat, "complet");

  const trop = etatAffectation("visite", { membres: ["m1", "m2"], vehicules: [] }, FLOTTE);
  assert.equal(trop.etat, "partiel");
  assert.match(trop.manques[0], /une seule personne/i);
});

test("un déménagement exige deux personnes ET un camion", () => {
  const un = etatAffectation("demenagement", { membres: ["m1"], vehicules: ["c1"] }, FLOTTE);
  assert.equal(un.etat, "partiel");
  assert.match(un.manques[0], /2 personnes/);

  const sansCamion = etatAffectation("demenagement",
    { membres: ["m1", "m2"], vehicules: [] }, FLOTTE);
  assert.equal(sansCamion.etat, "partiel");
  assert.match(sansCamion.manques[0], /véhicule/i);

  const ok = etatAffectation("demenagement",
    { membres: ["m1", "m2"], vehicules: ["c1"] }, FLOTTE);
  assert.equal(ok.etat, "complet");
  assert.equal(couleurVoyant(ok.etat), "vert");
});

test("un fourgon sur un lift est une ERREUR, pas une variante", () => {
  const faux = etatAffectation("lift", { membres: ["m1"], vehicules: ["c1"] }, FLOTTE);
  assert.equal(faux.etat, "partiel");
  assert.match(faux.manques.join(" "), /n'est pas un lift/);

  const vrai = etatAffectation("lift", { membres: ["m1"], vehicules: ["l1"] }, FLOTTE);
  assert.equal(vrai.etat, "complet");
});

test("l'emballage se passe de véhicule", () => {
  const r = etatAffectation("emballage", { membres: ["m1"], vehicules: [] }, FLOTTE);
  assert.equal(r.etat, "complet");
  assert.match(r.note, /sans être nécessaire/);
});

test("une sous-traitance sans camion reste complète", () => {
  // Le donneur d'ordre fournit parfois le sien.
  const r = etatAffectation("sous_traitance", { membres: ["m1"], vehicules: [] }, FLOTTE);
  assert.equal(r.etat, "complet");
});

test("le résumé se lit sans déplier", () => {
  assert.equal(resumeAffectation({ membres: [], vehicules: [] }), "Personne");
  assert.equal(resumeAffectation({ membres: ["a", "b"], vehicules: ["c1"] }),
    "2 personnes · 1 véhicule");
});

test("on sait dire ce qu'il reste à pourvoir sans tout déplier", () => {
  const missions = [
    { id: "1", type: "demenagement",
      affectation: { membres: ["a", "b"], vehicules: ["c1"] } },
    { id: "2", type: "emballage", affectation: { membres: [], vehicules: [] } },
  ];
  const reste = missionsAPourvoir(missions, FLOTTE);
  assert.equal(reste.length, 1);
  assert.equal(reste[0].mission.id, "2");
});

test("chaque type de mission déclare sa règle", () => {
  for (const t of ["visite", "emballage", "demenagement", "lift", "sous_traitance"]) {
    assert.ok(EXIGENCES[t], `${t} sans exigence déclarée`);
    assert.ok(exigence(t).note, `${t} sans explication`);
  }
  // Un type inconnu retombe sur le déménagement plutôt que de tout accepter.
  assert.equal(exigence("zzz").titre, "Déménagement");
});

/* ── Le câblage ─────────────────────────────────────────────────────────── */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ICI = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(ICI, "../../../apps/web/src");
const lire = (p) => fs.readFileSync(path.join(WEB, p), "utf8");
const lireMigration = (f) =>
  fs.readFileSync(path.join(ICI, "../../../supabase/migrations", f), "utf8");

test("le dossier n'écrit plus « Chargement » en dur", () => {
  // C'est le vocabulaire du déménagement : le laisser en dur le ferait
  // apparaître sur un lift, qui ne charge rien.
  const src = lire("ecrans/Dossier.jsx");
  assert.equal(src.includes('titre="Chargement"'), false);
  assert.equal(src.includes('titre="Déchargement"'), false);
  assert.ok(src.includes("planAdresses("),
    "les groupes viennent du métier");
});

test("aucune adresse fantôme n'est créée dans un groupe inutilisé", () => {
  // Amorcer `decharges` sur un lift laisserait une ligne vide en base, dans
  // un groupe que l'écran n'affiche même pas.
  const src = lire("ecrans/Dossier.jsx");
  assert.ok(src.includes("groupes.includes(cle) ? [adrVide()] : []"),
    "l'amorce doit suivre le plan du métier");
});

test("le voyant a trois états, pas un dégradé", () => {
  // Un dégradé de nuances ne se lit pas d'un coup d'œil.
  const src = lire("composants/Affectation.jsx");
  for (const t of ["gris", "orange", "vert"]) {
    assert.ok(src.includes(`${t}:`), `teinte ${t} manquante`);
  }
  assert.ok(src.includes("radial-gradient"), "le relief fait la bulle");
});

test("rien n'est repris d'une mission à l'autre", () => {
  // Reprendre l'équipe du déménagement sur l'emballage ferait bloquer trois
  // personnes une journée parce qu'on aurait oublié de corriger.
  const src = lire("composants/Affectation.jsx");
  assert.ok(/Vide par défaut/.test(src));
  assert.equal(/heriter|reprise automatique/i.test(src), false);
});

test("le volet n'offre que les véhicules de la bonne catégorie", () => {
  const src = lire("composants/Affectation.jsx");
  assert.ok(src.includes("ex.categorie"));
  assert.ok(src.includes('(v.categorie || "camion") === ex.categorie'));
});

/* ── Lot 10b : une mission par date ─────────────────────────────────────── */

test("le report d'équipe n'a lieu qu'À LA CRÉATION de la mission", () => {
  // Le bug corrigé : il s'exécutait à CHAQUE confirmation. Retirer quelqu'un
  // puis repasser l'affaire en « confirmé » le réajoutait en silence.
  const src = lireMigration("0130_une_mission_par_date.sql");
  assert.ok(src.includes("if v_neuve then"),
    "le report doit être conditionné à la création");
});

test("un lift produit une mission de LIFT, pas de déménagement", () => {
  const src = lireMigration("0130_une_mission_par_date.sql");
  assert.ok(/when 'lift' then 'lift'/.test(src));
  // Boxe et zone sont récurrents : aucune mission de chantier.
  assert.ok(/in \('boxe', 'zone'\)/.test(src));
});

test("l'affectation se pose mission par mission", () => {
  const ad = lire("lib/adaptateur.js");
  assert.ok(ad.includes("cmd_mission_affecter"));
  assert.ok(ad.includes("cmd_missions_affaire"));
  const src = lire("ecrans/Dossier.jsx");
  assert.ok(src.includes("VoletAffectation"),
    "chaque mission a son volet dans le dossier");
});

test("le bouton + est une bulle, pas un disque plat", () => {
  const src = lire("composants/MenuCreation.jsx");
  assert.ok(src.includes("radial-gradient"), "le relief fait la bulle");
  assert.ok(src.includes("inset"), "le creux du bord");
  // Une ombre grise sous un objet bleu paraît sale.
  assert.ok(/0 10px 24px -8px #1D4ED8/.test(src), "ombre portée colorée");
});

test("le menu respecte prefers-reduced-motion", () => {
  // Une animation subie donne le mal des transports à qui y est sensible.
  const src = lire("composants/MenuCreation.jsx");
  assert.ok(src.includes("prefers-reduced-motion"));
});

test("chaque entrée du menu annonce son métier", () => {
  const src = lire("composants/MenuCreation.jsx");
  assert.ok(src.includes("metier(n.cle)"),
    "c'est ce qui lève l'ambiguïté entre « lift » l'engin et la prestation");
});
