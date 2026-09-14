// =============================================================================
// LE VERROU D'OFFRE, DÉCLARÉ EN DONNÉE.
//
// LE MUR QU'ON ABAT ICI. Chaque module vendu doit fermer ses tables par une
// politique RLS portant TROIS conditions : l'organisation, la capacité du
// rôle, et le module de l'offre. Ces politiques étaient écrites à la main,
// une par une — douze aujourd'hui.
//
// À dix secteurs, ce sera soixante modules et plus de cent politiques. Écrites
// à la main, c'est cent occasions de se tromper, et l'erreur ne se voit pas :
// une condition oubliée n'échoue pas, elle OUVRE. C'est le seul endroit de
// Dashprod où une faute d'inattention produit une fuite silencieuse plutôt
// qu'un test rouge.
//
// LA PARADE. On déclare quelle table est fermée par quel module, sous quelle
// forme, et on GÉNÈRE le SQL. Le générateur ne peut pas oublier une condition
// qu'il ne sait pas ne pas écrire.
//
// LA PREUVE QUE LE GÉNÉRATEUR EST FIDÈLE. Un test régénère les douze
// politiques existantes et les compare au texte relevé en base. Si elles
// correspondent, le générateur est digne de confiance pour les cent suivantes.
// C'est la seule façon d'accélérer sans naviguer à l'aveugle : on ne fait pas
// confiance au générateur parce qu'il est bien écrit, on lui fait confiance
// parce qu'il reproduit ce qui tourne déjà.
//
// QUATRE FORMES, RELEVÉES EN BASE — il n'y en a pas d'autre, et c'est ce qui
// rend la génération possible :
//
//   tenant   org_id = jwt_org() AND org_a_module(M)
//   capacite org_id = jwt_org() AND acteur_a_capacite(C) AND org_a_module(M)
//   centre   org_id = jwt_org() AND peut_voir_centre(COL) AND org_a_module(M)
//   parent   EXISTS(… table parente …) AND org_a_module(M)
//
// La forme `parent` sert les tables sans `org_id` : elles s'appuient sur le
// cloisonnement de leur parent. Les inventer autrement aurait dupliqué
// `org_id` dans des tables filles, donc créé deux sources pour la même
// vérité.
// =============================================================================

/**
 * Les verrous d'offre. Chaque entrée ferme UNE table pour UN module.
 *
 * `cmd` vaut "SELECT" ou "ALL". Une table peut porter les deux : une
 * politique de lecture large et une politique d'écriture restreinte par
 * capacité — c'est le cas de `transmissions`, où tout le monde lit les envois
 * Peppol mais où seul qui peut facturer en déclenche un.
 */
export const VERROUS_OFFRE = Object.freeze([
  // ── multi_depots ────────────────────────────────────────────────────────
  { table: "centres_logistiques", politique: "centres_org", cmd: "SELECT",
    module: "multi_depots", forme: "centre", colonneCentre: "id" },

  // ── paie ────────────────────────────────────────────────────────────────
  { table: "donnees_paie", politique: "paie_capacite", cmd: "SELECT",
    module: "paie", forme: "capacite", capacite: "voir_paie" },
  { table: "donnees_paie", politique: "paie_ecriture", cmd: "ALL",
    module: "paie", forme: "capacite", capacite: "voir_paie" },
  { table: "paie_periodes", politique: "paie_periodes_lecture", cmd: "SELECT",
    module: "paie", forme: "capacite", capacite: "voir_paie" },
  { table: "paie_periodes", politique: "paie_periodes_ecriture", cmd: "ALL",
    module: "paie", forme: "capacite", capacite: "voir_paie" },

  // ── stockage_3d ─────────────────────────────────────────────────────────
  { table: "stock_boxes", politique: "stock_boxes_org", cmd: "SELECT",
    module: "stockage_3d", forme: "centre", colonneCentre: "centre_id" },
  { table: "stock_zones", politique: "stock_zones_org", cmd: "SELECT",
    module: "stockage_3d", forme: "centre", colonneCentre: "centre_id" },
  { table: "stock_contrats", politique: "stock_contrats_org", cmd: "SELECT",
    module: "stockage_3d", forme: "centre", colonneCentre: "centre_id" },
  { table: "stock_contrat_lignes", politique: "stock_lignes_org", cmd: "SELECT",
    module: "stockage_3d", forme: "parent",
    parent: "stock_contrats", cleEnfant: "contrat_id", cleParent: "id",
    parentCentre: "centre_id" },
  { table: "stock_echeances", politique: "stock_echeances_tenant", cmd: "ALL",
    module: "stockage_3d", forme: "tenant" },

  // ── peppol ──────────────────────────────────────────────────────────────
  { table: "transmissions", politique: "transmissions_lecture", cmd: "SELECT",
    module: "peppol", forme: "tenant" },
  { table: "transmissions", politique: "transmissions_ecriture", cmd: "ALL",
    module: "peppol", forme: "capacite", capacite: "emettre_facture" },
]);

/** Les quatre formes, et rien d'autre. Une cinquième doit être discutée. */
export const FORMES = Object.freeze(["tenant", "capacite", "centre", "parent"]);

/**
 * La condition d'un verrou, en SQL. C'est le seul endroit où le texte d'une
 * politique s'écrit.
 */
export function conditionSql(v) {
  const module = `org_a_module('${v.module}')`;
  switch (v.forme) {
    case "tenant":
      return `org_id = jwt_org() and ${module}`;
    case "capacite":
      return `org_id = jwt_org() and acteur_a_capacite('${v.capacite}')`
           + ` and ${module}`;
    case "centre":
      return `org_id = jwt_org() and peut_voir_centre(${v.colonneCentre})`
           + ` and ${module}`;
    case "parent":
      return `exists (select 1 from ${v.parent} p`
           + ` where p.${v.cleParent || "id"} = ${v.table}.${v.cleEnfant}`
           + ` and p.org_id = jwt_org()`
           + (v.parentCentre ? ` and peut_voir_centre(p.${v.parentCentre})` : "")
           + `) and ${module}`;
    default:
      throw new Error(`forme de verrou inconnue : ${v.forme}`);
  }
}

/**
 * Le SQL complet d'un verrou : on remplace plutôt qu'on ajoute.
 *
 * `drop policy if exists` puis `create policy` : une politique ajoutée à côté
 * d'une autre ne la remplace pas, elle s'y AJOUTE — et en RLS, deux politiques
 * permissives sur la même commande s'additionnent par OU. Ajouter sans
 * remplacer ouvrirait donc au lieu de fermer. C'est la faute la plus coûteuse
 * possible ici, et le générateur la rend impossible.
 */
export function verrouSql(v) {
  const c = conditionSql(v);
  const lignes = [
    `drop policy if exists ${v.politique} on public.${v.table};`,
    `create policy ${v.politique} on public.${v.table}`
    + ` for ${v.cmd.toLowerCase()}`,
    `  using (${c})`,
  ];
  // Une politique `ALL` sans `with check` laisse l'écriture libre : le `using`
  // ne filtre que la lecture des lignes existantes. L'oubli est classique et
  // silencieux.
  if (v.cmd === "ALL") lignes.push(`  with check (${c})`);
  return `${lignes.join("\n")};`;
}

/** Tous les verrous d'un module. C'est l'unité qu'on ajoute par secteur. */
export function verrousDuModule(module) {
  return VERROUS_OFFRE.filter((v) => v.module === module);
}

/** Les modules effectivement verrouillés. Un module absent n'est pas fermé. */
export function modulesVerrouilles() {
  return [...new Set(VERROUS_OFFRE.map((v) => v.module))].sort();
}

/** Le SQL de tous les verrous, dans un ordre stable. */
export function toutLeSql() {
  return VERROUS_OFFRE
    .slice()
    .sort((a, b) => a.table.localeCompare(b.table)
                 || a.politique.localeCompare(b.politique))
    .map(verrouSql)
    .join("\n\n");
}

/**
 * Les incohérences de déclaration. Un verrou mal déclaré ne se voit pas à
 * l'exécution — il ouvre. D'où ce contrôle.
 */
export function incoherences() {
  const out = [];
  const vus = new Set();
  for (const v of VERROUS_OFFRE) {
    const cle = `${v.table}.${v.politique}`;
    if (vus.has(cle)) out.push(`${cle} déclaré deux fois`);
    vus.add(cle);
    if (!FORMES.includes(v.forme)) out.push(`${cle} : forme « ${v.forme} » inconnue`);
    if (v.forme === "capacite" && !v.capacite) {
      out.push(`${cle} : forme « capacite » sans capacité`);
    }
    if (v.forme === "centre" && !v.colonneCentre) {
      out.push(`${cle} : forme « centre » sans colonne de centre`);
    }
    if (v.forme === "parent" && (!v.parent || !v.cleEnfant)) {
      out.push(`${cle} : forme « parent » sans parent ni clé`);
    }
    if (!["SELECT", "ALL"].includes(v.cmd)) {
      out.push(`${cle} : commande « ${v.cmd} » hors SELECT/ALL`);
    }
  }
  return out;
}
