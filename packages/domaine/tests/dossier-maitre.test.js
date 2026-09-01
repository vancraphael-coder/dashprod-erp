// =============================================================================
// LE DOSSIER MAÎTRE — l'adaptateur documentaire.
//
// Il existe pour qu'une nouvelle session, une autre conversation ou un autre
// LLM reprenne le projet sans dériver. Sa valeur tient à une seule propriété :
// **il dit qui a raison quand deux sources se contredisent**.
//
// Ces tests le protègent de la dérive qui guette toute documentation : perdre
// sa hiérarchie, se contredire, ou se mettre à affirmer des choses que la base
// dément.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const MAITRE = join(dirname(fileURLToPath(import.meta.url)),
                    "..", "..", "..", "docs", "maitre");
const lire = (f) => readFileSync(join(MAITRE, f), "utf8");

test("le dossier maître est complet et se lit dans un ordre", () => {
  // La numérotation N'EST PAS décorative : elle donne l'ordre de lecture à
  // quelqu'un qui arrive sans contexte.
  const attendus = ["00-DEMARRER-ICI.md", "10-DECISIONS-PRODUIT.md",
    "20-OUVERT.md", "25-PARAMETRES-ROADMAP.md", "26-GARDE-MEUBLES-ROADMAP.md",
    "30-REGLES-IA-EXTERNE.md", "40-METHODE.md", "50-ARCHIVE.md",
    // La carte du territoire et l'ordre de marche (29/08/2026).
    "60-CIRCUITS-QUATRE-COUCHES.md", "70-ROADMAP.md",
    // Les remarques de l'atelier classées en lots (30/08/2026).
    "80-REMARQUES-ATELIER.md",
    // La cartographie des paramètres et le cap registre (31/08/2026).
    "90-PARAMETRES-CARTOGRAPHIE.md"];
  const presents = readdirSync(MAITRE).filter((f) => f.endsWith(".md")).sort();
  assert.deepEqual(presents, attendus.sort());
});

test("la hiérarchie des sources est énoncée, et la base arrive en premier", () => {
  // C'est LA raison d'être du dossier. Sans elle, un document de réflexion
  // vaut autant qu'un fait vérifié — et c'est ainsi qu'on dérive.
  const d = lire("00-DEMARRER-ICI.md");
  assert.match(d, /hiérarchie des sources/i);
  const iBase = d.indexOf("base de données");
  const iDepot = d.indexOf("dépôt");
  const iReste = d.indexOf("Matière à instruire");
  assert.ok(iBase > 0 && iDepot > iBase && iReste > iDepot,
    "base → dépôt → … → matière à instruire, dans cet ordre");
});

test("le démarrage dit ce qu'il ne faut PAS rouvrir", () => {
  // Une doc qui ne dit que ce qu'il faut faire laisse rediscuter le reste.
  const d = lire("00-DEMARRER-ICI.md");
  assert.match(d, /ne faut PAS rouvrir/i);
  // Insensible à la casse : c'est la PRÉSENCE de l'acquis qui compte, pas son
  // orthographe en début de phrase.
  const bas = d.toLowerCase();
  for (const acquis of ["typescript", "vite", "français"]) {
    assert.ok(bas.includes(acquis), `l'acquis « ${acquis} » doit être listé`);
  }
});

test("décidé et ouvert sont dans DEUX fichiers séparés", () => {
  // Les mélanger, c'est laisser croire qu'une décision est négociable ou
  // qu'une question ouverte est tranchée. C'est la confusion la plus coûteuse.
  const decide = lire("10-DECISIONS-PRODUIT.md");
  const ouvert = lire("20-OUVERT.md");
  assert.match(decide, /arrêtées|tranché/i);
  assert.match(ouvert, /n'est PAS tranché/i);
  assert.match(ouvert, /Ne décidez aucun de ces points seul/i);
});

test("les questions ouvertes disent QUEL professionnel trancher", () => {
  // « À valider par un professionnel » sans dire lequel n'aide personne.
  const o = lire("20-OUVERT.md");
  for (const qui of ["Conseiller TVA", "DPO", "Expert-comptable"]) {
    assert.ok(o.includes(qui), `${qui} doit être nommé`);
  }
});

test("les prix publiés figurent, et correspondent au barème appliqué", () => {
  // Le CADRAGE d'origine affirmait que les prix manquaient : c'était vrai en
  // août, faux après la migration 0140. Une doc qui garde une affirmation
  // périmée est pire qu'une doc absente.
  const d = lire("10-DECISIONS-PRODUIT.md");
  for (const v of ["180", "2 052", "360", "4 104", "720", "8 208", "148,20", "570"]) {
    assert.ok(d.includes(v), `le prix ${v} doit figurer`);
  }
});

test("la méthode consigne le piège du « la logique est juste mais rien n'arrive »", () => {
  // Bug vécu : lignesFournitures branché correctement, mais la colonne
  // manquait au select. Vérifier la logique ne suffit pas.
  const m = lire("40-METHODE.md");
  assert.match(m, /donnée arrive/i);
  assert.match(m, /ROLLBACK/, "l'exercice des migrations doit être rappelé");
});

test("l'archive se déclare NON normative", () => {
  // Sans cette mention, une idée gardée finit par être prise pour une décision.
  const a = lire("50-ARCHIVE.md");
  assert.match(a, /n'est pas normatif/i);
  assert.match(a, /rapproche un client|preuve avant l'extension/i,
    "le filtre de Raphaël doit être rappelé");
});

/* ── Organisation des écrans Compte et Paramètres (lot 33) ──────────────── */

const APP = join(dirname(fileURLToPath(import.meta.url)),
                 "..", "..", "..", "apps", "web", "src");
const lireEcran = (rel) => readFileSync(join(APP, rel), "utf8");

test("Compte et Paramètres partagent UNE forme de ligne, pas quatre", () => {
  // Le Compte portait quatre formes pour une seule idée — « une ligne qui
  // ouvre un écran » : un bloc cousu, deux cartes copiées caractère pour
  // caractère, et une quatrième pour l'avis. Un commentaire du fichier
  // avertissait déjà qu'« une copie finit toujours par diverger » ; elle avait
  // divergé (bordure et ombre propres d'un côté, pas de l'autre).
  //
  // CE QUI CASSE SANS CE TEST : la prochaine porte ajoutée au Compte est
  // recopiée à la main, et les deux écrans redivergent.
  const profil = lireEcran("ecrans/Profil.jsx");
  const params = lireEcran("ecrans/Parametres.jsx");
  for (const [nom, src] of [["Profil", profil], ["Parametres", params]]) {
    assert.match(src, /from "\.\.\/composants\/ListeReglages\.jsx"/,
      `${nom} consomme le composant partagé`);
    assert.equal(/function (Groupe|Entree)\(/.test(src), false,
      `${nom} ne redéfinit pas sa propre forme`);
  }
  // Les trois formes mortes du Compte ont bien disparu.
  for (const mort of ["carteAction", "function Porte(", "function BlocPortes("]) {
    assert.equal(profil.includes(mort), false,
      `forme morte encore présente : ${mort}`);
  }
});

test("les lignes de réglage portent leurs états dans la FEUILLE, pas en ligne", () => {
  // Un style inline ne connaît ni :hover, ni :active, ni :focus-visible. Les
  // lignes de réglage étaient donc inertes — et la règle globale de survol
  // (filtre de luminosité) ne produit RIEN sur un fond transparent, qui est
  // justement le leur. Les deux écrans les plus denses de l'app n'avaient
  // aucun retour au geste.
  const composant = lireEcran("composants/ListeReglages.jsx");
  assert.ok(composant.includes('className="reglage-entree"'),
    "l'entrée porte la classe qui la rend vivante");
  const theme = lireEcran("lib/theme.jsx");
  for (const etat of [".reglage-entree:not(:disabled):hover",
                      ".reglage-entree:not(:disabled):active",
                      ".reglage-entree:focus-visible"]) {
    assert.ok(theme.includes(etat), `état manquant dans la feuille : ${etat}`);
  }
  // Le survol doit suivre l'ACCENT réglable, pas un bleu écrit en dur.
  assert.ok(theme.includes("--dp-survol") && theme.includes("--dp-accent"),
    "les surfaces d'interaction suivent la couleur d'accent choisie");
});


/* ── La roadmap des paramètres (lot 34) ─────────────────────────────────── */

test("la roadmap des paramètres nomme, pour chaque chantier, QUI décide", () => {
  // Une roadmap qui liste des manques sans dire à qui appartient la décision
  // se transforme en liste de tâches — et un assistant finit par trancher à la
  // place de Raphaël, ou pire, à la place d'un expert-comptable.
  //
  // CE QUI CASSE SANS CE TEST : le document dérive vers un backlog technique,
  // et la distinction « décision produit / décision réglementaire » se perd.
  const r = lire("25-PARAMETRES-ROADMAP.md");
  for (const qui of ["Raphaël", "Expert-comptable", "Conseiller TVA"]) {
    assert.ok(new RegExp(qui, "i").test(r), `${qui} doit être nommé`);
  }
  // Chaque chantier dit ce qu'on OBSERVE, pas seulement ce que le code semble
  // faire. C'est ce qui distingue un constat d'une supposition.
  assert.match(r, /16 factures émises/,
    "le constat en base doit figurer, chiffré");
  assert.match(r, /select .*factures/is,
    "les requêtes de contrôle doivent être rejouables");
});

test("la roadmap dit que les mentions « pas encore appliqué » doivent mourir", () => {
  // Une mention qui survit à sa cause redevient un mensonge : elle annoncerait
  // qu'un réglage est inerte alors qu'il agit.
  const r = lire("25-PARAMETRES-ROADMAP.md");
  assert.match(r, /doivent disparaître|survit à sa cause/i);
  // Et l'écran porte bien ces mentions.
  const id = lireEcran("ecrans/Identite.jsx");
  assert.ok(id.includes("function PasEncoreApplique("),
    "le composant de signalement existe");
  assert.ok((id.match(/<PasEncoreApplique /g) || []).length >= 3,
    "les trois réglages inertes sont signalés");
});

test("la roadmap garde-meubles nomme la dépendance qui la bloque", () => {
  // Le piège serait de bâtir l'établissement réservé au « bon centre » sans les
  // permissions par membre — une barrière contournable qu'on croirait fermée.
  const r = lire("26-GARDE-MEUBLES-ROADMAP.md");
  assert.match(r, /permissions par membre/i);
  assert.match(r, /création d'un nouveau centre|création de centre/i);
  assert.match(r, /fausse barrière|sécurité de façade|garde-fou d'affichage/i,
    "le risque d'une sécurité de façade doit être écrit");
  assert.match(r, /faisable/i, "ce qui est faisable maintenant doit être distingué");
});

/* ── La carte des circuits et l'ordre de marche (29/08/2026) ─────────────── */

test("les quatre couches sont nommées et ordonnées", () => {
  // L'ordre n'est pas décoratif : une couche ne tient que si celle du dessus
  // tient. Métier réel → paramétrage → facturation → comptabilité.
  const c = lire("60-CIRCUITS-QUATRE-COUCHES.md");
  const iMetier = c.indexOf("Métier réel");
  const iParam = c.indexOf("Paramétrage");
  const iFact = c.indexOf("Facturation");
  const iCompta = c.indexOf("Comptabilité");
  assert.ok(iMetier > 0 && iParam > iMetier && iFact > iParam && iCompta > iFact,
    "les quatre couches doivent apparaître dans l'ordre");
});

test("la carte des circuits énonce les invariants inter-couches", () => {
  // Le plus important : le surcoût interne ne franchit jamais 2→3. C'est une
  // décision de Raphaël, pas une commodité technique.
  const c = lire("60-CIRCUITS-QUATRE-COUCHES.md");
  assert.match(c, /surcoût interne ne franchit jamais/i);
  assert.match(c, /refuse plutôt que de deviner/i);
  assert.match(c, /immuable/i);
});

test("la roadmap ordonne par vagues et dit ce qu'il ne faut PAS faire", () => {
  // Une roadmap qui n'énonce que des envies laisse tout rouvrir.
  const r = lire("70-ROADMAP.md");
  assert.match(r, /VAGUE 0/);
  assert.match(r, /VAGUE 1/);
  assert.match(r, /ne faut PAS faire/i);
});

test("la roadmap place le juridique AVANT le code", () => {
  // Les obligations RGPD naissent quand une société saisit des données réelles
  // — c'est déjà le cas. Le code ne les fait pas attendre.
  const r = lire("70-ROADMAP.md");
  assert.ok(r.indexOf("VAGUE 0") < r.indexOf("VAGUE 1"),
    "la vague juridique précède la première vague de code");
  assert.match(r, /RGPD/);
});

/* ── Les remarques de l'atelier classées en lots (30/08/2026) ────────────── */

test("les remarques de l'atelier sont classées en lots R1→R9", () => {
  const r = lire("80-REMARQUES-ATELIER.md");
  // Les neuf lots doivent exister.
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    assert.match(r, new RegExp(`R${n} —`), `le lot R${n} doit être décrit`);
  }
});

test("le pilote Roovers récent est explicitement exclu des remarques", () => {
  // Consigne de Raphaël : ne relever que l'org test, pas le pilote de la semaine.
  const r = lire("80-REMARQUES-ATELIER.md");
  assert.match(r, /pilote/i);
  assert.match(r, /exclu/i);
});

test("les remarques déjà traitées ne réengendrent pas de lot", () => {
  // Le tri par centre en comptabilité est fait (lot 53) : il doit être marqué
  // clos, pas reprogrammé.
  const r = lire("80-REMARQUES-ATELIER.md");
  assert.match(r, /DÉJÀ traité|déjà traité/i);
  assert.match(r, /Lot 53/);
});

/* ── Deuxième relevé des remarques (31/08/2026) ──────────────────────────── */

test("le deuxième relevé classe les lots R10 à R16", () => {
  const r = lire("80-REMARQUES-ATELIER.md");
  for (const n of [10, 11, 12, 13, 14, 15, 16]) {
    assert.match(r, new RegExp(`R${n} —`), `le lot R${n} doit être décrit`);
  }
  assert.match(r, /Deuxième relevé/i);
});

test("le relevé note que R10 confirme l'approche des lots A–D", () => {
  // La facture se fige à l'émission, jamais avant : la remarque le confirme.
  const r = lire("80-REMARQUES-ATELIER.md");
  assert.match(r, /confirme/i);
  assert.match(r, /fige à l'émission|figer à l'émission|gel à l'émission/i);
});

/* ── Cartographie des paramètres et cap registre (31/08/2026) ────────────── */

test("la cartographie des paramètres nomme les quatre coffres et le carton", () => {
  const c = lire("90-PARAMETRES-CARTOGRAPHIE.md");
  for (const coffre of ["parametres_prix", "parametres_catalogues",
                        "parametres_facturation", "parametres_textes"]) {
    assert.match(c, new RegExp(coffre), `${coffre} doit être cartographié`);
  }
  // Le constat du carton défini plusieurs fois à des valeurs contradictoires.
  assert.match(c, /carton/i);
});

test("le cap est : registre unique AVANT map et connecteur", () => {
  // Le point de méthode : consolider une source unique avant de cartographier.
  const c = lire("90-PARAMETRES-CARTOGRAPHIE.md");
  assert.match(c, /registre/i);
  assert.match(c, /consolider/i);
  // Et l'emballage comme pilote.
  assert.match(c, /pilote|emballage/i);
});
