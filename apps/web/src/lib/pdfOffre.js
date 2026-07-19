// =============================================================================
// PDF de l'offre — pièce jointe envoyée au client.
//
// jsPDF est chargé en IMPORT DYNAMIQUE : la bibliothèque (~350 ko) n'entre pas
// dans le paquet principal, elle n'est téléchargée que si l'on génère un PDF.
// Le contenu vient de composerOffre() — la MÊME source que l'offre à l'écran et
// que l'instance gelée : un seul chiffrage, trois rendus.
// =============================================================================

const A4 = { largeur: 210, hauteur: 297 };
const MARGE = 16;

const euros = (c) => ((c || 0) / 100).toLocaleString("fr-BE", {
  style: "currency", currency: "EUR",
});

function dateLongue(iso) {
  if (!iso) return "";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("fr-BE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return iso; }
}

/**
 * Construit le PDF de l'offre et le renvoie en Blob.
 * @param {object} contenu  sortie de composerOffre()
 * @param {string} numero   référence affichée (facultatif)
 */
export async function pdfOffre(contenu, numero) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const org = contenu.organisation || {};
  let y = MARGE;

  const ligne = (txt, { taille = 10, gras = false, couleur = [15, 23, 42], saut = 5 } = {}) => {
    doc.setFont("helvetica", gras ? "bold" : "normal");
    doc.setFontSize(taille);
    doc.setTextColor(...couleur);
    doc.text(String(txt ?? ""), MARGE, y);
    y += saut;
  };
  const droite = (txt, { taille = 10, gras = false } = {}) => {
    doc.setFont("helvetica", gras ? "bold" : "normal");
    doc.setFontSize(taille);
    doc.text(String(txt ?? ""), A4.largeur - MARGE, y, { align: "right" });
  };
  const filet = () => {
    doc.setDrawColor(228, 236, 252);
    doc.line(MARGE, y, A4.largeur - MARGE, y);
    y += 6;
  };

  // ── En-tête : l'entreprise ────────────────────────────────────────────────
  ligne(org.nom || "Organisation", { taille: 17, gras: true, saut: 6 });
  const adresse = [org.adresse, [org.cp, org.ville].filter(Boolean).join(" ")]
    .filter(Boolean).join(" · ");
  if (adresse) ligne(adresse, { taille: 9, couleur: [100, 116, 139], saut: 4 });
  const contact = [org.tel, org.email].filter(Boolean).join(" · ");
  if (contact) ligne(contact, { taille: 9, couleur: [100, 116, 139], saut: 4 });
  if (org.tva) ligne(`TVA ${org.tva}`, { taille: 9, couleur: [100, 116, 139], saut: 4 });

  y += 4;
  ligne("OFFRE DE PRIX", { taille: 13, gras: true, couleur: [37, 99, 235], saut: 5 });
  const emis = contenu.emis_le ? new Date(contenu.emis_le).toLocaleDateString("fr-BE") : "";
  ligne([numero ? `Référence ${numero}` : "", emis ? `Établie le ${emis}` : ""]
    .filter(Boolean).join(" · "), { taille: 9, couleur: [100, 116, 139], saut: 7 });
  filet();

  // ── Client ────────────────────────────────────────────────────────────────
  ligne("CLIENT", { taille: 8, gras: true, couleur: [100, 116, 139], saut: 5 });
  ligne(contenu.client?.nom || "—", { taille: 11, gras: true, saut: 5 });
  const cli = [contenu.client?.tel, contenu.client?.email].filter(Boolean).join(" · ");
  if (cli) ligne(cli, { taille: 9, couleur: [100, 116, 139], saut: 5 });
  y += 2;

  // ── Prestation ────────────────────────────────────────────────────────────
  ligne("PRESTATION", { taille: 8, gras: true, couleur: [100, 116, 139], saut: 5 });
  if (contenu.date_dem) {
    ligne(`Date : ${dateLongue(contenu.date_dem)}${
      contenu.heure_dem ? ` — arrivée ${String(contenu.heure_dem).slice(0, 5)}` : ""}`,
      { saut: 5 });
  }
  const adr = (liste) => (liste || []).map((a) => a.adresse).filter(Boolean).join(" | ");
  if (adr(contenu.charges)) ligne(`Chargement : ${adr(contenu.charges)}`, { saut: 5 });
  if (adr(contenu.decharges)) ligne(`Déchargement : ${adr(contenu.decharges)}`, { saut: 5 });
  if (contenu.volume_m3) ligne(`Volume estimé : ${contenu.volume_m3} m³`, { saut: 5 });
  if (contenu.formule === "forfait") {
    ligne("Formule : forfait", { saut: 5 });
  } else if (contenu.nb_demenageurs) {
    ligne(`Équipe : ${contenu.nb_demenageurs} déménageurs${
      contenu.heures ? ` — ${contenu.heures} h estimées` : ""}`, { saut: 5 });
  }
  if (contenu.elevateur) ligne("Élévateur / lift inclus", { saut: 5 });
  if ((contenu.a_demonter || []).length) {
    ligne(`À démonter : ${contenu.a_demonter.map((x) => x.nom || x).join(", ")}`, { saut: 5 });
  }
  y += 2;
  filet();

  // ── Montants ──────────────────────────────────────────────────────────────
  ligne("MONTANT", { taille: 8, gras: true, couleur: [100, 116, 139], saut: 6 });
  const montant = (lib, val, gras = false) => {
    doc.setFont("helvetica", gras ? "bold" : "normal");
    doc.setFontSize(gras ? 12 : 10);
    doc.setTextColor(15, 23, 42);
    doc.text(lib, MARGE, y);
    droite(val, { taille: gras ? 12 : 10, gras });
    y += gras ? 7 : 5.5;
  };
  montant("Total HTVA", euros(contenu.htva_centimes));
  montant("TVA 21 %", euros(contenu.tva_centimes));
  if (contenu.reduction) {
    montant(`Réduction ${contenu.reduction.pct} % (${
      contenu.reduction.motif === "degats" ? "dégâts" : "promotion"})`, "");
  }
  y += 1;
  montant("TOTAL TVAC", euros(contenu.tvac_centimes), true);

  if (contenu.remarques) {
    y += 3;
    ligne("Remarques", { taille: 8, gras: true, couleur: [100, 116, 139], saut: 5 });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const lignes = doc.splitTextToSize(String(contenu.remarques), A4.largeur - 2 * MARGE);
    doc.text(lignes, MARGE, y);
    y += lignes.length * 4.5;
  }

  // ── Pied : conditions ─────────────────────────────────────────────────────
  const yPied = A4.hauteur - 22;
  doc.setDrawColor(228, 236, 252);
  doc.line(MARGE, yPied, A4.largeur - MARGE, yPied);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Prestation soumise aux conditions générales de la Chambre Belge des Déménageurs"
    + (contenu.cgv_version ? ` (version ${contenu.cgv_version})` : "")
    + ", jointes à cette offre.",
    MARGE, yPied + 5,
  );
  if (org.iban) doc.text(`IBAN ${org.iban}`, MARGE, yPied + 9.5);

  return doc.output("blob");
}

/** Nom de fichier lisible pour le client : Offre - Nom - 2026-07-18.pdf */
export function nomFichierOffre(contenu) {
  const nom = String(contenu?.client?.nom || "client")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 -]/g, "").trim() || "client";
  const jour = (contenu?.emis_le || new Date().toISOString()).slice(0, 10);
  return `Offre - ${nom} - ${jour}.pdf`;
}

/** Déclenche le téléchargement d'un Blob dans le navigateur. */
export function telecharger(blob, nomFichier) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nomFichier;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
