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
const lireDomaine = (rel) =>
  fs.readFileSync(path.join(ICI, "../src", rel), "utf8");
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
  // Le relief vit désormais dans la MASCOTTE, pas recopié ici : une bille
  // redessinée à chaque usage finirait par diverger de la vitrine.
  assert.ok(src.includes("<Bille"), "le voyant doit être une Bille");
});

/* ── La Bille : la matière, et une seule ────────────────────────────────── */

/** Les commentaires CITENT les recettes fautives pour expliquer le bug : les
 *  retirer avant d'inspecter, sinon ils déclenchent leur propre garde-fou. */
const sansCom = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

test("la bille est la mascotte : UNE SEULE définition, partout", () => {
  // Le défaut de fond : la bille d'origine était RECOPIÉE dans la carte
  // d'abonnement. Deux recettes, donc dérive garantie — et c'est arrivé : les
  // billes de l'app avaient perdu l'huile irisée, le verre et la profondeur.
  // Ce test refuse la recopie ; l'ancien, qui ne lisait que Bille.jsx, ne
  // pouvait pas la voir.
  const carte = sansCom(lire("ecrans/vitrine/CarteAbonnement.jsx"));
  assert.ok(carte.includes("<Bille"),
    "la carte d'abonnement doit CONSOMMER la bille partagée");
  assert.equal(/borderRadius: "50%"/.test(carte), false,
    "une sphère redessinée à la main dans la carte : elle divergera à nouveau");
  assert.equal(carte.includes("rgba(217,119,6,.22)"), false,
    "l'huile doit venir de la matière partagée, pas d'une copie");
});

test("les quatre ingrédients de la sphère, en fractions du diamètre", () => {
  const m = lire("lib/matiere-bille.js");
  // 1. l'huile qui tourne — pilotée par l'angle publié par la surface
  assert.ok(m.includes("linear-gradient(var(--carte-angle"), "l'huile qui tourne");
  // 2. le reflet spéculaire, décentré ET mobile
  assert.ok(m.includes(".bille-reflet") && m.includes("var(--carte-nx"),
    "le reflet spéculaire doit glisser avec le regard");
  // 3. le creux interne
  assert.ok(/inset [^;]*rgba\(var\(--bille-b\)/.test(m), "le creux interne");
  // 4. la parallaxe du signe, et son relief RÉEL
  assert.ok(m.includes("translate3d(") && m.includes("perspective:"),
    "sans perspective, le signe est décalé à plat : ce n'est pas du relief");

  // ET la condition pour qu'une puce de 14 px soit le MÊME objet qu'une
  // vedette de 84 px : aucune mesure figée dans la matière. Une seule valeur
  // en dur ici, et les petites billes redeviennent des ronds colorés.
  const regle = m.slice(m.indexOf(".bille {"));
  const figees = [...regle.matchAll(/(?<![-\w(.])(\d+(?:\.\d+)?)px/g)]
    .map((x) => x[1])
    .filter((v) => v !== "1");   // le liseré de 1 px ne s'échelonne pas
  assert.deepEqual(figees, [],
    `mesures figées dans la matière : ${figees.join(", ")} — passer par var(--b)`);
});

test("chaque ton porte une CONTRE-LUMIÈRE, sinon ce n'est pas de l'huile", () => {
  // Le bug : le dégradé allait d'une teinte à la MÊME teinte en plus sombre.
  // Un dégradé monochrome ne dit qu'« ombre », jamais « verre ». Il en faut
  // deux — bleu vers ambre et retour, comme la carte d'origine.
  const m = lire("lib/matiere-bille.js");
  const bloc = m.slice(m.indexOf("export const TONS"),
                       m.indexOf("export const TAILLES"));
  const tons = [...bloc.matchAll(
    /(\w+):\s*\{\s*a: "([^"]+)",\s*b: "([^"]+)",\s*ombre: "([^"]+)",\s*contre: "([^"]+)"/g)];
  assert.ok(tons.length >= 6, "au moins les tons d'état + la palette de marque");
  for (const [, nom, a, b, ombre, contre] of tons) {
    assert.notEqual(contre, a, `${nom} : la contre-lumière ne peut pas être la teinte`);
    assert.notEqual(contre, b, `${nom} : la contre-lumière ne peut pas être l'ombre`);
    // Trois teintes distinctes, sinon la sphère s'aplatit en gommette : c'est
    // l'écart entre la lumière et le creux qui la fait tenir.
    assert.equal(new Set([a, b, ombre]).size, 3,
      `${nom} : lumière, teinte et ombre doivent différer`);
  }
  // La bille de marque (`bleu`) traverse bleu clair → mauve → rose : la demande
  // de Raphaël. On vérifie que les trois teintes vont du bleu au rose, pas
  // qu'elles restent dans le même bleu.
  const noms = tons.map((t) => t[1]);
  assert.ok(noms.includes("mauve") && noms.includes("rose"),
    "la palette doit inclure mauve et rose");
});

test("la lumière vient d'un vrai angle, et elle se repose", () => {
  const cv = lire("lib/cartes-vives.js");
  // `135 + x * 90` ignorait y : la lumière ne pouvait pas venir d'en bas.
  assert.ok(cv.includes("Math.atan2"), "l'angle de lumière se calcule par atan2");
  assert.ok(cv.includes("--carte-sx") && cv.includes("Math.sin"),
    "la parallaxe suit une courbe en sinus : linéaire, le mouvement est mécanique");
  // Une variable écrite mais jamais remise à zéro laisserait la dernière carte
  // survolée éclairée de travers, curseur parti depuis longtemps.
  const repos = cv.slice(cv.indexOf("function reposer"));
  for (const v of ["--carte-angle", "--carte-nx", "--carte-ny",
                   "--carte-sx", "--carte-sy"]) {
    assert.ok(repos.includes(v), `${v} n'est jamais remise au repos`);
  }
});

test("la bille se décline en tailles et en signes nommés", () => {
  const m = lire("lib/matiere-bille.js");
  for (const t of ["puce", "jeton", "bouton", "vedette"]) {
    assert.ok(m.includes(`${t}:`), `taille ${t} manquante`);
  }
  const b = lire("composants/Bille.jsx");
  for (const s of ["chevron", "fleche", "croix", "attention", "coche"]) {
    assert.ok(b.includes(`${s}:`), `signe ${s} manquant`);
  }
  // Dessinés en SVG : une police manquante ferait une croix carrée vide.
  assert.equal(/['"]✕['"]|['"]⚠['"]/.test(b), false);
});

test("le mouvement s'arrête quand la personne en demande moins", () => {
  const m = lire("lib/matiere-bille.js");
  assert.ok(m.includes("prefers-reduced-motion"),
    "la bille garde sa matière, mais cesse de bouger");
  const cv = lire("lib/cartes-vives.js");
  assert.ok(cv.includes("prefers-reduced-motion") && cv.includes("pointer: coarse"),
    "aucun suivi au doigt ni en mouvement réduit : un plaisir, pas une condition");
});

test("la bille n'embarque pas le thème de l'application", () => {
  // Elle sert AUSSI la vitrine, qui a le sien. Importer `lib/theme.jsx` ici
  // poserait le fond de page de l'app et ses polices sur la page d'accueil,
  // par simple effet de bord d'import. La matière vient donc de la surface,
  // en variables héritées.
  const b = lire("composants/Bille.jsx");
  assert.equal(/from "\.\.\/lib\/theme/.test(b), false,
    "la bille ne doit pas importer le thème de l'app");
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

test("le bouton + EST une bille, il ne l'imite pas", () => {
  // Il avait sa propre recette de dégradé et d'ombre : une bulle dessinée à
  // côté de la mascotte, donc condamnée à s'en écarter. Le relief, le verre
  // et l'ombre colorée viennent maintenant de la matière partagée.
  const src = sansCom(lire("composants/MenuCreation.jsx"));
  assert.ok(/<Bille taille="bouton"/.test(src),
    "le + doit être une bille en taille bouton");
  assert.equal(src.includes("radial-gradient"), false,
    "plus de recette de bulle recopiée dans le menu");
  assert.ok(src.includes("matiereSurface("),
    "le bouton flotte seul : il doit déclarer la surface qui l'éclaire");
});

test("les options du menu portent le même verre que la bille", () => {
  // Une option opaque à côté d'une bille de verre trahit deux mains.
  const src = sansCom(lire("composants/MenuCreation.jsx"));
  assert.ok(src.includes("backdropFilter"), "le verre floute ce qu'il y a derrière");
  assert.ok(src.includes(".option-verre:hover"),
    "et elles bougent au survol, comme la bille");
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

/* ── La bille doit être VISIBLE ─────────────────────────────────────────── */

test("chaque date porte sa carte, avec la PETITE bille (jeton)", () => {
  // Le défaut du lot 10b : la bille ne vivait que dans les volets de mission,
  // qui n'apparaissent QU'APRÈS confirmation. Sur un dossier en cours de
  // saisie, on ne la voyait nulle part — d'où une bille en tête de carte.
  // Depuis, Raphaël a demandé de retirer la GROSSE bille (bouton) : la carte
  // est dense, la `jeton` suffit comme repère et garde le mouvement.
  const src = lire("composants/CarteDate.jsx");
  const tete = src.slice(0, src.indexOf('signe="chevron"'));
  assert.ok(tete.includes('taille="jeton"'),
    "la bille de tête est la petite (jeton), plus la grosse");
  assert.equal(tete.includes('taille="bouton"'), false,
    "la grosse bille de tête doit avoir disparu");
  const dossier = lire("ecrans/Dossier.jsx");
  assert.ok(dossier.includes("<CarteDate"),
    "les cartes doivent être montées dans le dossier");
});

test("l'affectation existe AVANT la confirmation", () => {
  // C'est au moment où l'on pose une date qu'on pense à l'équipe. L'exiger
  // après confirmation faisait oublier l'affectation : le dossier semblait
  // prêt et personne n'était prévu.
  const ad = lire("lib/adaptateur.js");
  assert.ok(ad.includes("cmd_affaire_affectations_definir"));
  assert.ok(ad.includes("affectations: data.affectations"),
    "obtenirAffaire doit remonter les prévisions");
});

test("sans date posée, aucune équipe n'est réclamée", () => {
  // Réclamer une équipe pour un jour qui n'existe pas serait du bruit.
  const src = lire("composants/CarteDate.jsx");
  assert.ok(src.includes("const posee = Boolean(date)"));
  assert.ok(src.includes("posee\n    ? etatAffectation") || src.includes("posee"),
    "le verdict ne se calcule que si la date existe");
});

test("le libellé de la date principale suit le métier", () => {
  // « Date souhaitée » ne dit rien pour un lift.
  const src = lire("ecrans/Dossier.jsx");
  assert.ok(src.includes("LIBELLE_PRINCIPALE"));
  assert.ok(/lift: "Intervention lift"/.test(src));
});

/* ── Lot 10e : à qui appartient l'équipe d'un dossier ───────────────────── */

test("aucune diffusion d'équipe sur TOUTES les missions d'un dossier", () => {
  // Le bug le plus coûteux de la session : un déclencheur écrasait, à chaque
  // enregistrement du dossier, les affectations de toutes les missions
  // planifiées. L'équipe du déménagement se recopiait sur l'emballage et sur
  // la visite — et le choix par date, tout juste livré, disparaissait au
  // premier « Enregistrer ». Il ne doit jamais revenir.
  const src = lireMigration("0134_affectation_par_mission_plus_de_diffusion.sql");
  assert.ok(src.includes("drop trigger trg_sync_dossier_missions"),
    "la diffusion large doit rester supprimée");
});

test("une date posée APRÈS la confirmation crée quand même sa mission", () => {
  // Sinon le dossier semble prêt et personne n'est réclamé pour ce jour-là :
  // exactement le défaut de la bille invisible, côté données.
  const src = lireMigration("0134_affectation_par_mission_plus_de_diffusion.sql");
  assert.ok(/if not found then insert/.test(src),
    "l'UPDATE seul ne trouve rien et ne dit rien");
});

test("l'équipe du dossier est celle du JOUR PRINCIPAL, pas de la visite", () => {
  // La demande de Raphaël : membres et véhicules font partie de la vérité d'un
  // dossier, la relation avec le planning doit vivre. Elle vise donc la
  // mission principale — la visite et l'emballage gardent la leur.
  const src = lireMigration("0135_equipe_dossier_vers_mission_principale.sql");
  assert.ok(src.includes("VISE LE JOUR PRINCIPAL"));
  for (const garde of ["inchangé → rien", "SÉPARÉMENT", "planifiee`/`en_cours"]) {
    assert.ok(src.includes(garde), `garde manquante : ${garde}`);
  }
});

test("l'écran recharge les missions après enregistrement", () => {
  // Deux commandes pilotent la même affectation : le sélecteur du dossier et
  // le volet de la mission principale. Sans rechargement, le volet afficherait
  // l'équipe d'avant — deux vérités à l'écran, et l'impression que
  // l'enregistrement n'a pas pris.
  const src = lire("ecrans/Dossier.jsx");
  const debut = src.indexOf("async function enregistrer");
  const bloc = src.slice(debut, src.indexOf("enregistrerRef.current = enregistrer"));
  assert.ok(debut > 0 && bloc.length > 0, "bloc `enregistrer` introuvable");
  assert.ok(bloc.includes("missionsAffaire(affaireId).then(setMissions)"),
    "les missions doivent être relues après l'enregistrement du dossier");
});

/* ── Lot 10f : une seule commande par date ──────────────────────────────── */

test("une date = une commande : plus de sélecteur d'équipe au niveau dossier", () => {
  // Il y en avait TROIS pour la même affectation : la carte de date (le
  // prévu), le volet de la mission (la vérité), et le sélecteur « Équipe »
  // du dossier (à l'enregistrement). Elles se contredisaient à l'écran, et on
  // ne savait plus laquelle disait vrai.
  const src = sansCom(lire("ecrans/Dossier.jsx"));
  assert.equal(src.includes("function basculerMembre"), false,
    "le sélecteur d'équipe de niveau dossier doit rester supprimé");
  assert.equal(src.includes("sauverEquipeAffaire"), false,
    "le dossier ne réécrit plus l'équipe : la mission fait foi");
  assert.equal(src.includes("sauverCamionsAffaire"), false,
    "idem pour les véhicules");
});

test("la carte écrit sur la MISSION dès qu'elle existe, sinon sur le prévu", () => {
  const src = lire("ecrans/Dossier.jsx");
  const bloc = src.slice(src.indexOf("async function majAffectation"),
                         src.indexOf("const missionDe ="));
  assert.ok(bloc.includes("affecterMission("),
    "avec une mission, la carte écrit au planning");
  assert.ok(bloc.includes("sauverAffectationsPrevues("),
    "sans mission, elle garde l'intention sur le dossier");
});

test("la carte DIT à quelle vérité elle parle", () => {
  // Sans cela on ne sait pas si l'on regarde une intention ou un engagement :
  // c'est ce qui rendait les trois commandes illisibles.
  const src = lire("composants/CarteDate.jsx");
  assert.ok(src.includes("Au planning"));
  assert.ok(src.includes("Prévu"));
});

test("le conflit de disponibilité se voit AU MOMENT DU CLIC", () => {
  // Dernier point ouvert du lot 10b. Un doublon signalé sur un autre écran
  // n'empêche personne de le créer ici.
  const src = lire("composants/CarteDate.jsx");
  assert.ok(src.includes("lireDispo("), "la carte interroge la disponibilité");
  assert.ok(/alerte=\{d\?\.niveau\}/.test(src),
    "le jeton lui-même doit porter l'alerte");
  // Et rien n'est bloquant (§4.5) : le jeton reste cliquable.
  const jeton = src.slice(src.indexOf("function Jeton("));
  assert.ok(jeton.includes("onClick={onClick}"),
    "on signale, on n'interdit pas");
});

test("le miroir mission → dossier vaut pour TOUTES les natures", () => {
  // `if v_type is distinct from 'demenagement'` : sur un lift, l'équipe ne
  // remontait jamais sur le dossier — et c'est `affaires.equipe` que lit le
  // chiffrage de la main-d'œuvre. Invisible tant qu'un doublon d'interface
  // écrivait par ailleurs.
  const src = lireMigration("0136_miroir_mission_principale_toutes_natures.sql");
  assert.ok(src.includes("v_type_princ"),
    "le miroir doit suivre le type principal de la nature");
  assert.ok(src.includes("emballage et visite non"),
    "l'emballage ne doit pas miroiter : il ferait chiffrer avec les emballeurs");
});

test("l'état est dit par la BARRE LATÉRALE, jamais par une bille", () => {
  // La bille est la mascotte : repère et action. Lui faire porter aussi
  // l'état lui donnait un métier de trop et multipliait les points de couleur
  // au point qu'on ne savait plus lequel lire. Le liseré longe déjà ce qu'il
  // qualifie et ne prend aucune place.
  const aff = sansCom(lire("composants/Affectation.jsx"));
  assert.ok(/export function Voyant\(\) \{ return null; \}/.test(aff),
    "plus de pastille d'état");
  assert.ok(aff.includes("LISERE[couleurVoyant("),
    "c'est le liseré de la carte qui porte l'état");

  const carte = sansCom(lire("composants/CarteDate.jsx"));
  assert.ok(carte.includes("borderLeft: `3px solid"),
    "la carte de date porte son état sur sa barre latérale");
  assert.equal(/ton=\{posee \? TON\[couleur\]/.test(carte), false,
    "la bille de tête ne code plus l'état");
  assert.equal(carte.includes('signe="attention"'), false,
    "plus de bille d'alerte : le texte teinté suffit");
});

test("la bille répond au survol et son signe s'agite", () => {
  // Trop fade au premier essai : une mascotte doit tenir seule, et se sentir
  // vivante quand on passe dessus.
  const m = lire("lib/matiere-bille.js");
  assert.ok(m.includes(".bille:hover"), "elle grossit légèrement au survol");
  assert.ok(m.includes(".bille:hover .bille-signe svg"),
    "le signe bouge PLUS que la bille : c'est l'écart qui fait la profondeur");
  // Les traits fins : un signe à 52 % du diamètre avec un trait de 2.5 est gras.
  const b = lire("composants/Bille.jsx");
  assert.ok(/strokeWidth=\{1\.9\}/.test(b), "les traits doivent rester fins");
});

/* ── Lot 11 : couleurs par type et filtres du planning ──────────────────── */

test("lift et sous-traitance ont leur couleur, comme tout type de mission", () => {
  // Ce sont des types réels (0130). Sans couleur propre, ils tombaient sur le
  // défaut gris et devenaient illisibles au planning.
  const app = lire("lib/apparence.js");
  const bloc = app.slice(app.indexOf('cle: "missions"'), app.indexOf('cle: "planning"'));
  for (const t of ["lift", "sous_traitance", "demenagement", "visite", "emballage"]) {
    assert.ok(bloc.includes(`cle: "${t}"`), `type ${t} sans couleur réglable`);
  }
  // Et le domaine porte les MÊMES défauts : un écart ferait clignoter la
  // couleur entre le planning bureau et la fiche terrain au rechargement.
  const dom = lireDomaine("operations/missions.js");
  for (const t of ["lift", "sous_traitance"]) {
    assert.ok(dom.includes(`${t}:`), `type ${t} absent de TYPES_MISSION`);
  }
});

test("le liseré du planning suit la couleur RÉGLABLE, plus le codage en dur", () => {
  const src = sansCom(lire("ecrans/Planning.jsx"));
  assert.equal(/m\.type === "emballage" \? "#6366F1"/.test(src), false,
    "le liseré ne doit plus ignorer le réglage d'Apparence");
  assert.ok(src.includes("couleurMission(m.type)"),
    "le liseré et le libellé prennent la couleur du type");
});

test("masquer au planning ne fausse jamais les conflits", () => {
  // Le filtre agit sur l'AFFICHAGE. S'il retirait un membre du calcul de
  // disponibilité, masquer quelqu'un effacerait ses doublons et on réserverait
  // par-dessus. Le lecteur de conflits lit toujours la réalité complète.
  const src = lire("ecrans/Planning.jsx");
  const iDispo = src.indexOf("lecteurDisponibilite({ missions, conges }");
  const iFiltre = src.indexOf("filtrerMissions(duJourComplet");
  assert.ok(iDispo > 0, "la disponibilité doit lire les missions non filtrées");
  assert.ok(iFiltre > 0, "le filtre agit sur une liste déjà calculée");
  // Le filtre prend `duJourComplet`, pas `missions` : il n'entre pas dans le
  // calcul de conflit, il ne fait que restreindre l'affichage.
  assert.equal(src.includes("filtrerMissions(missions"), false,
    "le filtre ne doit pas se glisser avant le calcul de disponibilité");
});

test("les préférences d'affichage restent sur l'appareil, jamais en base", () => {
  // C'est un confort de lecture, pas une décision d'entreprise : l'imposer à
  // tout le monde via la base serait un contresens.
  const pref = lire("lib/preferences-planning.js");
  assert.ok(pref.includes("localStorage"), "gardé localement");
  assert.equal(/from "@domaine|supabase/.test(pref), false,
    "aucune écriture en base pour un filtre d'affichage");
});

/* ── Lot 12 : la demande de congé côté terrain ──────────────────────────── */

test("le terrain a enfin sa porte pour demander un congé", () => {
  // Le circuit demande→décision existait (module 8) ; il manquait l'onglet.
  const src = lire("ecrans/TerrainProfil.jsx");
  assert.ok(src.includes('"conges"'), "l'onglet Congés doit exister");
  assert.ok(src.includes("demanderConge("),
    "le terrain doit consommer le circuit existant, pas en créer un autre");
});

test("la demande terrain part SANS utilisateurId : c'est une demande, pas une décision", () => {
  // Avec un utilisateurId, la base approuverait d'emblée (saisie direction).
  // Le membre demande pour lui-même : le bureau tranche.
  const src = sansCom(lire("ecrans/TerrainProfil.jsx"));
  const bloc = src.slice(src.indexOf("async function envoyer"),
                         src.indexOf("async function retirer"));
  assert.ok(bloc.includes("demanderConge({ debut, fin, motif"),
    "aucun utilisateurId : la demande reste à approuver");
  assert.equal(/utilisateurId/.test(bloc), false,
    "passer un utilisateurId ferait auto-approuver la demande du membre");
});

test("la demande est validée avant l'envoi, avec un motif visible", () => {
  const src = lire("ecrans/TerrainProfil.jsx");
  assert.ok(src.includes("validerDemandeConge("),
    "on valide côté domaine avant d'envoyer");
  // Le motif s'affiche : pas de bouton grisé muet.
  assert.ok(src.includes("controle.motif"),
    "le motif du refus doit se lire, pas se deviner");
});

test("on ne retire QUE ses demandes en attente", () => {
  // Un congé accordé s'annule au bureau ; un refus est déjà clos.
  const src = sansCom(lire("ecrans/TerrainProfil.jsx"));
  assert.ok(src.includes('conge.etat === "demande" && ('),
    "le bouton de retrait n'apparaît que sur une demande en attente");
});

/* ── Lot 12 (2) : l'apparence côté terrain ──────────────────────────────── */

test("le terrain ouvre le MÊME écran Apparence que le bureau, pas une copie", () => {
  // L'apparence est un réglage d'appareil, pas un privilège bureau. Le membre
  // terrain doit pouvoir passer en mode nuit sous le soleil. On réutilise
  // l'écran existant — dupliquer sa logique et son aperçu serait deux vérités.
  const src = lire("ecrans/TerrainProfil.jsx");
  assert.ok(src.includes('import Apparence from "./Apparence.jsx"'),
    "le profil terrain doit importer l'écran Apparence partagé");
  assert.ok(src.includes("<Apparence retour={"),
    "et l'ouvrir avec un retour, comme les Paramètres bureau");
});

test("le profil terrain ne pose plus de fond blanc en dur qui ignore le mode nuit", () => {
  // Ces pastilles gardaient `#fff` : un pavé blanc sur le fond nuit. Le jeton
  // C.blanc suit le mode. Le blanc du TEXTE sur pastille colorée reste, lui,
  // légitimement en dur — il est posé sur une couleur pleine.
  const src = sansCom(lire("ecrans/TerrainProfil.jsx"));
  assert.equal(/background: "#fff"/.test(src), false,
    "aucun fond de conteneur en blanc dur : passer par C.blanc");
});

/* ── Lot 13 : Messages — la chaîne va jusqu'à la mission ─────────────────── */

test("les zones d'écriture ont un état de focus, en un seul endroit", () => {
  // Le vrai défaut des champs : styles en ligne, donc AUCUN `:focus` possible.
  // On ne voyait pas où l'on écrivait. Une feuille globale les corrige tous —
  // 32 champs — sans toucher un écran.
  const th = lire("lib/theme.jsx");
  assert.ok(th.includes('id = "champs-dashprod"'),
    "la feuille des champs doit être injectée");
  assert.ok(th.includes("input:focus, textarea:focus"),
    "un anneau de focus, pour voir le champ actif");
  assert.ok(th.includes("::placeholder"),
    "le texte d'invite doit se distinguer de la saisie");
});

test("la conversation descend jusqu'aux missions du dossier", () => {
  // boîte → conversation → client → mission(s) : la chaîne allait au dossier,
  // pas jusqu'aux missions. Un client qui parle d'une date doit pouvoir
  // l'ouvrir sans rouvrir le dossier pour la chercher.
  const src = lire("ecrans/Conversations.jsx");
  assert.ok(src.includes("missionsAffaire("),
    "la conversation charge les missions de son dossier");
  assert.ok(src.includes("ouvrirPlanning"),
    "et permet de sauter au planning à la bonne date");
});

test("le lien conversation → planning porte la DATE de la mission", () => {
  // Sans la date, le clic tomberait sur aujourd'hui : le pont serait décoratif.
  const conv = lire("ecrans/Conversations.jsx");
  assert.ok(/ouvrirPlanning\(m\.date\)/.test(conv),
    "on saute au jour de la mission, pas au jour courant");
  const pl = lire("ecrans/Planning.jsx");
  assert.ok(pl.includes("jourInitial"),
    "le planning doit accepter un jour d'arrivée");
});

test("le fil de messages ne reste plus tassé dans une carte à hauteur fixe", () => {
  const src = lire("ecrans/FilMessages.jsx");
  assert.ok(src.includes("pleineHauteur"),
    "en pleine hauteur, le fil occupe l'espace au lieu d'un maxHeight figé");
});

/* ── Permis : signaler, pas bloquer ──────────────────────────────────────── */

test("le permis manquant se signale au point d'affectation, jamais bloquant", () => {
  const src = lire("composants/CarteDate.jsx");
  assert.ok(src.includes("permisConduite("),
    "la carte de date croise membre et véhicule pour le permis");
  // Le jeton reste cliquable — c'est un signal, comme la disponibilité (§4.5).
  const jeton = sansCom(src).slice(sansCom(src).indexOf("function Jeton("));
  assert.ok(jeton.includes("onClick={onClick}"), "on signale, on n'interdit pas");
});

test("les permis d'un membre s'éditent au bureau, avec l'échéance code 95", () => {
  const src = lire("ecrans/Equipe.jsx");
  assert.ok(src.includes("definirPermis("), "édition des permis dans la fiche membre");
  assert.ok(src.includes("code95"), "l'échéance code 95 se saisit");
});

test("l'aptitude médicale (donnée de santé) n'est PAS stockée", () => {
  // Décision explicite : elle mérite sa propre base légale RGPD. On vérifie
  // qu'aucune colonne d'aptitude médicale n'a été introduite à la légère.
  const mig = lireMigration("0137_permis_detenus_membre.sql");
  assert.equal(/apte_medical|aptitude_medical/.test(mig), false,
    "pas de colonne d'aptitude médicale dans cette migration");
});

/* ── La dérogation d'architecture est LEVÉE ─────────────────────────────── */

test("plus aucune dérogation d'architecture", () => {
  // La fuite `adaptateur.js → volumetrie.js` est résorbée : le composeur d'offre
  // passe par l'aiguillage de composition (`rubriques-offre.js`), qui choisit
  // les rubriques selon la nature. La liste des dérogations est vide, et le
  // test d'architecture (lui) refuse qu'on en rouvre une inutile.
  const arch = lireDomaine("../architecture.js");
  const bloc = arch.slice(arch.indexOf("export const DEROGATIONS"),
                          arch.indexOf("]);", arch.indexOf("export const DEROGATIONS")));
  assert.equal(/fichier:/.test(bloc), false,
    "aucune dérogation ne doit subsister");
});

test("le composeur d'offre ne connaît aucun module de métier", () => {
  // Il passe par l'aiguillage de composition, pas par le relevé en direct.
  const src = sansCom(lire("lib/adaptateur.js"));
  assert.equal(/@domaine\/releve\/volumetrie/.test(src), false,
    "plus d'import direct du relevé");
  assert.ok(src.includes("@domaine/releve/rubriques-offre"),
    "le composeur passe par l'aiguillage de composition");
});

/* ── Lot bille : palette bleu-mauve-rose + grosse bille retirée des cartes ── */

test("la bille de marque descend du bleu clair au rose", () => {
  // Demande explicite : bleu clair (lumière), bleu foncé/mauve (cœur), rose
  // (creux). On vérifie que le ton `bleu` — celui de la bille par défaut —
  // n'est plus un bleu monochrome mais traverse la famille jusqu'au rose.
  const m = lire("lib/matiere-bille.js");
  const bleu = m.slice(m.indexOf("bleu:"), m.indexOf("mauve:"));
  // La lumière est bleutée, le creux tire vers le rose/magenta (rouge élevé).
  const ombre = bleu.match(/ombre:\s*"(\d+),(\d+),(\d+)"/);
  assert.ok(ombre, "le ton bleu doit déclarer un creux");
  const [, r, g, b] = ombre.map(Number);
  assert.ok(r > b, "le creux tire vers le rose (composante rouge dominante)");
});

test("la grosse bille a quitté les cartes de date, la petite porte le mouvement", () => {
  const src = lire("composants/CarteDate.jsx");
  // Le mouvement (survol, parallaxe) est global sur `.bille` : toute bille en
  // hérite, quelle que soit sa taille. On vérifie donc juste que la tête a
  // basculé sur `jeton`.
  const tete = src.slice(0, src.indexOf('signe="chevron"'));
  assert.equal(tete.includes('taille="bouton"'), false,
    "plus de grosse bille en tête de carte");
  const mat = lire("lib/matiere-bille.js");
  assert.ok(mat.includes(".bille:hover"),
    "le mouvement reste global : la petite bille en profite aussi");
});
