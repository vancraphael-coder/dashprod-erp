// =============================================================================
// Inventaire d'export — maritime et aérien.
//
// Un relevé de déménagement local peut rester approximatif : « salon, 12 m³ ».
// Un envoi international, non. Le manifeste sert de déclaration douanière, de
// base d'assurance et de preuve en cas de litige. « Divers » sur une ligne
// fait bloquer un conteneur.
//
// Ce module produit une liste de colis numérotée, avec pour chaque objet :
// son colis, sa pièce d'origine, une désignation exploitable en douane, sa
// quantité, son volume, son poids et sa valeur déclarée.
//
// RÈGLES DE TARIFICATION RÉELLES, ne pas les confondre :
//   - Maritime groupage (LCL) : on paie au plus élevé du volume en m³ ou du
//     poids en tonnes. Un envoi lourd et compact se paie au poids.
//   - Aérien : poids taxable = max(poids réel, poids volumétrique), le poids
//     volumétrique valant 1 m³ = 167 kg selon le diviseur IATA de 6000.
// Un manifeste qui ignore ça sous-estime le fret, parfois du double.
// =============================================================================

/** 1 m³ = 1 tonne pour le maritime groupage (règle W/M). */
export const RATIO_MARITIME_KG_M3 = 1000;

/** Diviseur IATA 6000 cm³/kg, soit 167 kg par m³. */
export const RATIO_AERIEN_KG_M3 = 167;

/** Types de colis. Le bois massif impose une norme phytosanitaire. */
export const TYPES_COLIS = Object.freeze([
  { cle: "carton", nom: "Carton standard", bois: false },
  { cle: "carton_penderie", nom: "Carton penderie", bois: false },
  { cle: "carton_livres", nom: "Carton livres", bois: false },
  { cle: "caisse_bois", nom: "Caisse bois", bois: true },
  { cle: "caisse_tableau", nom: "Caisse tableau / miroir", bois: true },
  { cle: "palette", nom: "Palette", bois: true },
  { cle: "non_emballe", nom: "Non emballé (meuble nu)", bois: false },
]);

/**
 * Codes d'état, usage courant du déménagement international.
 * Ils protègent le déménageur autant que le client : un rayage préexistant
 * non noté au départ devient un dommage à l'arrivée.
 */
export const CODES_ETAT = Object.freeze({
  R: "Rayé", C: "Cassé / fêlé", E: "Écaillé", T: "Taché",
  U: "Usé", D: "Démonté", M: "Mouillé / auréole", A: "Manquant",
});

const n = (v) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : 0; };
const c = (v) => Math.round(Number(v) || 0);

/** Volume d'un colis en m³ depuis ses dimensions en cm. */
export function volumeM3({ longueur_cm, largeur_cm, hauteur_cm }) {
  const v = n(longueur_cm) * n(largeur_cm) * n(hauteur_cm);
  return v > 0 ? Math.round((v / 1e6) * 1000) / 1000 : 0;
}

/**
 * Numérotation des colis : « 003/025 ». Format fixe, trié naturellement,
 * lisible sur une étiquette et sur le manifeste douanier.
 */
export function numeroColis(index, total) {
  const large = Math.max(3, String(total ?? 0).length);
  return `${String(index).padStart(large, "0")}/${String(total ?? 0).padStart(large, "0")}`;
}

/** Normalise un objet de l'inventaire. */
export function objetInventaire(brut, index = 1) {
  const designation = String(brut?.designation ?? "").trim();
  return {
    numero: index,
    piece: String(brut?.piece ?? "").trim(),
    designation,
    quantite: Math.max(1, Math.round(n(brut?.quantite) || 1)),
    // Le matériau intéresse la douane et l'assurance.
    matiere: String(brut?.matiere ?? "").trim() || null,
    etat: Array.isArray(brut?.etat) ? brut.etat.filter((e) => CODES_ETAT[e]) : [],
    valeur_declaree_centimes: c(brut?.valeur_declaree_centimes),
    colis_numero: brut?.colis_numero ?? null,
    remarque: String(brut?.remarque ?? "").trim() || null,
  };
}

/**
 * Une désignation vague fait retenir un envoi en douane. « Divers »,
 * « cartons », « effets personnels » ne décrivent rien. On refuse à la source.
 */
const VAGUES = [/^divers$/i, /^carton/i, /^effets?$/i, /^affaires?$/i,
                /^misc/i, /^various$/i, /^objets?$/i, /^\W*$/];

export function designationAcceptable(texte) {
  const t = String(texte ?? "").trim();
  if (t.length < 3) return false;
  return !VAGUES.some((r) => r.test(t));
}

/** Construit un colis à partir de ses objets. */
export function colis(brut, index = 1, total = 1) {
  const objets = (brut?.objets || []).map((o, i) => objetInventaire(o, i + 1));
  const vol = brut?.volume_m3 != null ? n(brut.volume_m3) : volumeM3(brut || {});
  return {
    numero: numeroColis(index, total),
    index,
    type: String(brut?.type ?? "carton"),
    piece: String(brut?.piece ?? "").trim(),
    longueur_cm: n(brut?.longueur_cm),
    largeur_cm: n(brut?.largeur_cm),
    hauteur_cm: n(brut?.hauteur_cm),
    volume_m3: vol,
    poids_kg: n(brut?.poids_kg),
    objets,
    valeur_declaree_centimes: objets.reduce(
      (t, o) => t + o.valeur_declaree_centimes * o.quantite, 0),
    // Le bois massif d'emballage doit être traité et marqué (norme ISPM 15)
    // pour franchir une frontière. Un colis bois non marqué est refoulé.
    bois: !!(TYPES_COLIS.find((t) => t.cle === brut?.type)?.bois),
  };
}

/** Manifeste complet : colis numérotés + totaux + contrôles de conformité. */
export function manifeste(colisBruts, options = {}) {
  const total = (colisBruts || []).length;
  const liste = (colisBruts || []).map((x, i) => colis(x, i + 1, total));

  const volume = liste.reduce((t, x) => t + x.volume_m3, 0);
  const poids = liste.reduce((t, x) => t + x.poids_kg, 0);
  const valeur = liste.reduce((t, x) => t + x.valeur_declaree_centimes, 0);
  const nbObjets = liste.reduce(
    (t, x) => t + x.objets.reduce((s, o) => s + o.quantite, 0), 0);

  return {
    mode: options.mode || "maritime",
    colis: liste,
    totaux: {
      colis: total,
      objets: nbObjets,
      volume_m3: Math.round(volume * 1000) / 1000,
      poids_kg: Math.round(poids * 10) / 10,
      valeur_declaree_centimes: valeur,
      colis_bois: liste.filter((x) => x.bois).length,
    },
    fret: uniteTaxable(volume, poids, options.mode || "maritime"),
    anomalies: controler(liste, options),
  };
}

/**
 * Unité taxable selon le mode. C'est ce qui détermine le prix du fret.
 */
export function uniteTaxable(volume_m3, poids_kg, mode = "maritime") {
  const v = n(volume_m3), p = n(poids_kg);
  if (mode === "aerien") {
    const volumetrique = Math.round(v * RATIO_AERIEN_KG_M3 * 10) / 10;
    const taxable = Math.max(p, volumetrique);
    return { mode, poids_reel_kg: p, poids_volumetrique_kg: volumetrique,
             taxable_kg: taxable,
             base: taxable === volumetrique && volumetrique > p ? "volume" : "poids" };
  }
  // Maritime groupage : on compare m³ et tonnes, on retient le plus élevé.
  const tonnes = Math.round((p / RATIO_MARITIME_KG_M3) * 1000) / 1000;
  const taxable = Math.max(v, tonnes);
  return { mode, volume_m3: v, poids_tonnes: tonnes, taxable_wm: taxable,
           base: taxable === tonnes && tonnes > v ? "poids" : "volume" };
}

/**
 * Contrôles avant émission du manifeste.
 * Chaque anomalie est bloquante ou non : une désignation vague bloque
 * (la douane retiendra l'envoi), un poids manquant avertit.
 */
export function controler(liste, options = {}) {
  const a = [];
  const pousser = (bloquant, message, colisNum) =>
    a.push({ bloquant, message, colis: colisNum ?? null });

  if (!liste || liste.length === 0) {
    pousser(true, "Manifeste vide : aucun colis.");
    return a;
  }

  for (const x of liste) {
    if (x.objets.length === 0) {
      pousser(true, `Colis ${x.numero} : aucun contenu déclaré.`, x.numero);
    }
    for (const o of x.objets) {
      if (!designationAcceptable(o.designation)) {
        pousser(true, `Colis ${x.numero}, objet ${o.numero} : désignation trop `
          + `vague (« ${o.designation || "vide"} »). La douane exige une `
          + `description réelle.`, x.numero);
      }
    }
    if (x.poids_kg === 0) {
      pousser(false, `Colis ${x.numero} : poids non renseigné.`, x.numero);
    }
    if (x.volume_m3 === 0) {
      pousser(false, `Colis ${x.numero} : dimensions non renseignées.`, x.numero);
    }
    if (x.bois) {
      pousser(false, `Colis ${x.numero} : emballage bois — traitement `
        + `phytosanitaire ISPM 15 et marquage obligatoires à l'export.`, x.numero);
    }
    if (x.valeur_declaree_centimes === 0 && options.valeurRequise !== false) {
      pousser(false, `Colis ${x.numero} : aucune valeur déclarée `
        + `(base de l'assurance et de la douane).`, x.numero);
    }
  }
  return a;
}

/** Le manifeste peut-il partir ? */
export function manifestePret(m) {
  const bloquantes = (m?.anomalies || []).filter((x) => x.bloquant);
  return { pret: bloquantes.length === 0, bloquantes,
           avertissements: (m?.anomalies || []).filter((x) => !x.bloquant) };
}

/** Liste de colisage exportable en CSV — le format qu'attend un transitaire. */
export function packingListCsv(m) {
  const sep = ";";
  const entete = ["Colis", "Type", "Piece", "Dim L(cm)", "Dim l(cm)", "Dim H(cm)",
                  "Volume m3", "Poids kg", "N objet", "Designation", "Qte",
                  "Matiere", "Etat", "Valeur declaree"];
  const champ = (v) => {
    const s = String(v ?? "");
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lignes = [];
  for (const x of m?.colis || []) {
    for (const o of x.objets) {
      lignes.push([x.numero, x.type, o.piece || x.piece,
        x.longueur_cm || "", x.largeur_cm || "", x.hauteur_cm || "",
        x.volume_m3 || "", x.poids_kg || "",
        o.numero, o.designation, o.quantite, o.matiere || "",
        o.etat.join(""), (o.valeur_declaree_centimes / 100).toFixed(2),
      ].map(champ).join(sep));
    }
  }
  return "\uFEFF" + [entete.join(sep), ...lignes].join("\r\n");
}
