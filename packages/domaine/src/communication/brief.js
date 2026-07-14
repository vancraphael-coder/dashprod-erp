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
 * @param {string} [p.signature]  ex. « Raphaël — 0455/17.16.79 »
 * @param {number} [p.maxArticles=6]
 * @returns {string}
 */
export function briefMission(p) {
  const l = [];
  l.push("🚛 *DÉMÉNAGEMENTS ROOVERS*");
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

/**
 * URL Google Maps multi-arrêts : origin = 1er chargement, destination =
 * dernier déchargement, waypoints = tout le reste dans l'ordre. Zéro API
 * payante : Maps s'ouvre, le bureau/chauffeur lit distance et durée.
 * @param {{adresse: string}[]} charges
 * @param {{adresse: string}[]} decharges
 * @returns {string|null} null si moins de deux adresses exploitables
 */
export function urlItineraire(charges, decharges) {
  const arrets = [
    ...(charges || []).map((a) => a.adresse),
    ...(decharges || []).map((a) => a.adresse),
  ].filter(Boolean);
  if (arrets.length < 2) return null;
  const origin = encodeURIComponent(arrets[0]);
  const destination = encodeURIComponent(arrets[arrets.length - 1]);
  const way = arrets.slice(1, -1).map(encodeURIComponent).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}` +
         (way ? `&waypoints=${way}` : "") + `&travelmode=driving`;
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
export function emailOffre(p) {
  const org = p.organisation || {};
  const euros = (c) => (c / 100).toLocaleString("fr-BE", {
    style: "currency", currency: "EUR",
  });
  // Salutation par nom de famille : dernier mot du nom complet (modèle).
  const famille = String(p.client?.nom || "").trim().split(/\s+/).pop() || "";

  const l = [];
  l.push(`Bonjour ${famille},`);
  l.push("");
  l.push(`vous trouverez en pièce jointe votre offre de prix détaillée${
    p.signee ? ", revêtue de votre bon pour accord signé" : ""}.`);
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
  l.push(`Kilométrage offert. Offre valable ${p.validiteJours ?? 10} jours ouvrables.`);
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
  l.push("Bien à vous,");
  l.push("Raphaël Van Cutsem");
  l.push(org.nom || "");
  l.push([org.tel, org.email].filter(Boolean).join(" · "));

  return {
    a: p.client?.email || "",
    objet: `Offre de prix — ${org.nom || "Déménagements Roovers"} — ${p.client?.nom || ""}`,
    corps: l.filter((x, i, arr) => !(x === "" && arr[i - 1] === "")).join("\n"),
  };
}

/** URL mailto: portant destinataire, objet et corps encodés. */
export function urlMailto({ a, objet, corps }) {
  return `mailto:${encodeURIComponent(a || "")}` +
         `?subject=${encodeURIComponent(objet || "")}` +
         `&body=${encodeURIComponent(corps || "")}`;
}
