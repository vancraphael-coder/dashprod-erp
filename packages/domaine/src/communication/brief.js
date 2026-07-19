// =============================================================================
// Communication — Brief équipe & itinéraire
// Source : modèle validé roovers-mobile.jsx (teamMsg l. ~453, openMaps l. ~517)
// — alignement pages 09 §3 et 02 §3. Logique PURE : formatage de texte et
// construction d'URL, testables sans écran.
//
// Le brief est LE geste quotidien réel : briefer l'équipe du lendemain en un
// tap WhatsApp. Format repris du modèle à l'identique (validé sur le terrain).
// =============================================================================

/** Date longue française : « vendredi 4 juillet ». */
function dateLongue(iso) {
  if (!iso) return "date à définir";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long",
    });
  } catch { return iso; }
}

/** Une adresse en ligne de brief : « Rue X 14, Wavre (étage 2, ascenseur) ». */
function ligneAdresse(a) {
  const precisions = [];
  if (a.etage) precisions.push(`étage ${a.etage}`);
  if (a.ascenseur) precisions.push("ascenseur");
  if (a.monteMeubles) precisions.push("monte-meubles");
  return a.adresse + (precisions.length ? ` (${precisions.join(", ")})` : "");
}

/**
 * Compose le brief d'équipe (format WhatsApp du modèle validé).
 * @param {object} p
 * @param {string} p.date  ISO
 * @param {string} [p.heure]
 * @param {{nom: string}[]} [p.camions]
 * @param {{nom: string, chef?: boolean}[]} [p.equipe]
 * @param {{adresse: string, etage?: string, ascenseur?: boolean, monteMeubles?: boolean}[]} [p.charges]
 * @param {{adresse: string}[]} [p.decharges]
 * @param {{nom: string, quantite?: number, demont?: boolean}[]} [p.inventaire]
 * @param {string} [p.remarques]
 * @param {string} [p.iban]
 * @param {string} [p.organisation] nom de l'entreprise (en-tête du brief)
 * @param {string} [p.signature]  ex. « Prénom — 00 000 00 00 »
 * @param {number} [p.maxArticles=6]
 * @returns {string}
 */
export function briefMission(p) {
  const l = [];
  // Nom de l'entreprise fourni par l'appelant : jamais une constante, sinon
  // tous les tenants envoient le brief au nom d'une autre société.
  l.push(`🚛 *${(p.organisation || "").toUpperCase()}*`.replace("**", "*"));
  l.push(`📅 ${dateLongue(p.date)}${p.heure ? ` — ${p.heure}` : ""}`);

  if (p.camions?.length) l.push(`🚚 ${p.camions.map((c) => c.nom).join(", ")}`);
  if (p.equipe?.length) {
    l.push(`👷 Équipe : ${p.equipe
      .map((m) => m.chef ? `${m.nom} (chef)` : m.nom).join(", ")}`);
  }

  const charges = (p.charges || []).filter((a) => a.adresse);
  if (charges.length === 1) l.push(`📍 Chargement : ${ligneAdresse(charges[0])}`);
  else if (charges.length > 1) {
    l.push("📍 Chargement :");
    charges.forEach((a, i) => l.push(`  ${i + 1}. ${ligneAdresse(a)}`));
  }
  const decharges = (p.decharges || []).filter((a) => a.adresse);
  if (decharges.length === 1) l.push(`🏠 Déchargement : ${ligneAdresse(decharges[0])}`);
  else if (decharges.length > 1) {
    l.push("🏠 Déchargement :");
    decharges.forEach((a, i) => l.push(`  ${i + 1}. ${ligneAdresse(a)}`));
  }

  const inv = p.inventaire || [];
  if (inv.length) {
    const max = p.maxArticles ?? 6;
    const tetes = inv.slice(0, max).map((it) =>
      `${it.quantite || 1}× ${it.nom}${it.demont ? " (démontage)" : ""}`);
    const reste = inv.length - max;
    l.push(`📦 Meubles : ${tetes.join(", ")}${reste > 0 ? ` … +${reste} autres` : ""}`);
  }

  if (p.remarques) l.push(`📝 ${p.remarques}`);
  if (p.iban) l.push(`💳 Virement ${p.iban}`);
  l.push(`🙏 Merci à toute l'équipe !${p.signature ? ` — ${p.signature}` : ""}`);
  return l.join("\n");
}

/** URL WhatsApp portant le brief (wa.me sans numéro = choix du destinataire). */
export function urlWhatsApp(texte) {
  return `https://wa.me/?text=${encodeURIComponent(texte)}`;
}

// Le dépôt est propre à chaque entreprise : il vient de organisations.adresse,
// jamais d'une constante. Aucune valeur par défaut (AUDIT_REAL.md §5).

/**
 * URL Google Maps multi-arrêts. Le trajet part TOUJOURS du dépôt et y revient
 * (les camions dorment au dépôt) : dépôt → chargements → déchargements → dépôt.
 * Le kilométrage lu dans Maps est donc le vrai trajet facturable, aller ET
 * retour compris. Zéro API payante.
 * @param {{adresse: string, code_postal?: string, ville?: string}[]} charges
 * @param {{adresse: string, code_postal?: string, ville?: string}[]} decharges
 * @param {string} [depot] adresse de départ/retour du tenant. Si absente, le
 *   trajet ne couvre que les chantiers (le km dépôt→chantier→dépôt n'est alors
 *   PAS compté : passer l'adresse de l'organisation pour un km facturable juste).
 * @returns {string|null} null si aucune adresse de chantier
 */
export function urlItineraire(charges, decharges, depot = null) {
  // Compose « rue, CP ville » quand les champs séparés existent.
  const composer = (a) => [a.adresse, [a.code_postal, a.ville].filter(Boolean).join(" ")]
    .filter(Boolean).join(", ");
  const chantier = [
    ...(charges || []).map(composer),
    ...(decharges || []).map(composer),
  ].filter(Boolean);
  if (chantier.length === 0) return null;

  // Départ dépôt, retour dépôt : les arrêts de chantier sont tous des waypoints.
  const origin = encodeURIComponent(depot);
  const destination = encodeURIComponent(depot);
  const way = chantier.map(encodeURIComponent).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}` +
         `&waypoints=${way}&travelmode=driving`;
}

/**
 * Compose l'email d'envoi d'offre (alignement page 07 §2 — format du modèle).
 * @param {object} p
 * @param {{nom: string, email?: string}} p.client
 * @param {boolean} [p.signee]  l'offre jointe est-elle signée ?
 * @param {{adresse: string}[]} [p.charges]
 * @param {{adresse: string}[]} [p.decharges]
 * @param {string} [p.formule]  tarifaire|emballage|forfait
 * @param {number} [p.heures]
 * @param {number} [p.nbDemenageurs]
 * @param {number} p.tvacCentimes
 * @param {string} [p.date]  ISO
 * @param {string} [p.heure]
 * @param {string} [p.dateEmballage]
 * @param {string} [p.remarques]
 * @param {{nom?: string, tel?: string, email?: string}} [p.organisation]
 * @param {number} [p.validiteJours=10]
 * @returns {{a: string, objet: string, corps: string}}
 */
/**
 * Modèles par défaut de l'email d'offre. Chaque ligne est surchargeable depuis
 * Compte → Textes (organisations.parametres_textes) sans toucher au code.
 * Variables disponibles : {famille} {client} {organisation} {validite}.
 */
export const TEXTES_OFFRE_DEFAUT = Object.freeze({
  objet: "Offre de prix — {organisation} — {client}",
  salutation: "Bonjour {famille},",
  intro: "vous trouverez en pièce jointe votre offre de prix détaillée",
  intro_signee: ", revêtue de votre bon pour accord signé",
  mention_km: "Kilométrage offert.",
  validite: "Offre valable {validite} jours ouvrables.",
  validite_jours: 10,
  formule_politesse: "Bien à vous,",
  signataire: "Raphaël Van Cutsem",
  pied: "",
});

/** Remplace les {variables} d'un modèle. Une variable inconnue devient vide. */
function remplir(modele, vars) {
  return String(modele ?? "").replace(/\{(\w+)\}/g, (_, cle) => vars[cle] ?? "");
}

export function emailOffre(p) {
  const org = p.organisation || {};
  const euros = (c) => (c / 100).toLocaleString("fr-BE", {
    style: "currency", currency: "EUR",
  });
  // Salutation par nom de famille : dernier mot du nom complet (modèle).
  const famille = String(p.client?.nom || "").trim().split(/\s+/).pop() || "";

  // Textes du bureau (Compte → Textes) par-dessus les modèles par défaut.
  const T = { ...TEXTES_OFFRE_DEFAUT, ...(p.textes || {}) };
  const validite = p.validiteJours ?? T.validite_jours ?? 10;
  const vars = {
    famille, client: p.client?.nom || "",
    organisation: org.nom || "", validite,
  };

  const l = [];
  l.push(remplir(T.salutation, vars));
  l.push("");
  l.push(`${remplir(T.intro, vars)}${p.signee ? remplir(T.intro_signee, vars) : ""}.`);
  l.push("");
  const charge = (p.charges || []).map((a) => a.adresse).filter(Boolean).join(" | ");
  const decharge = (p.decharges || []).map((a) => a.adresse).filter(Boolean).join(" | ");
  if (charge) l.push(`Chargement : ${charge}`);
  if (decharge) l.push(`Déchargement : ${decharge}`);
  l.push("");
  if (p.formule === "forfait") {
    l.push(`Montant forfaitaire : ${euros(p.tvacCentimes)} TVAC (TVA 21 %).`);
  } else {
    l.push(`Montant pour ${p.heures || "…"} h avec ${p.nbDemenageurs || "…"} déménageurs : ${
      euros(p.tvacCentimes)} TVAC (TVA 21 %).`);
  }
  l.push([remplir(T.mention_km, vars), remplir(T.validite, vars)]
    .filter(Boolean).join(" "));
  l.push("");
  if (p.date) {
    const longue = new Date(p.date + "T00:00:00").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long",
    });
    l.push(`Date prévue : ${longue}${p.heure ? ` — arrivée ${p.heure}` : ""}.`);
  }
  if (p.dateEmballage) {
    const longueE = new Date(p.dateEmballage + "T00:00:00").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long",
    });
    l.push(`Emballage : ${longueE}.`);
  }
  if (p.remarques) { l.push(""); l.push(`Remarques : ${p.remarques}`); }
  l.push("");
  l.push(remplir(T.formule_politesse, vars));
  if (T.signataire) l.push(remplir(T.signataire, vars));
  l.push(org.nom || "");
  l.push([org.tel, org.email].filter(Boolean).join(" · "));
  if (T.pied) { l.push(""); l.push(remplir(T.pied, vars)); }

  return {
    a: p.client?.email || "",
    objet: remplir(T.objet, vars),
    corps: l.filter((x, i, arr) => !(x === "" && arr[i - 1] === "")).join("\n"),
  };
}

/** URL mailto: portant destinataire, objet et corps encodés. */
export function urlMailto({ a, objet, corps }) {
  return `mailto:${encodeURIComponent(a || "")}` +
         `?subject=${encodeURIComponent(objet || "")}` +
         `&body=${encodeURIComponent(corps || "")}`;
}
