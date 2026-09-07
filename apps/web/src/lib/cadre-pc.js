// =============================================================================
// LE CADRE PC — poser l'app sur le bureau, au lieu de la laisser flotter.
//
// LE DÉFAUT : l'app est bornée à ~520 px et centrée. Sur mobile, parfait. Sur un
// écran de bureau, elle flotte au milieu d'un vide blanc — deux tiers de l'écran
// perdus, et une impression de « site mobile étiré » qui abîme la crédibilité.
//
// CE QU'ON NE FAIT PAS : élargir le contenu à 1200 px. Un texte, une liste, un
// formulaire sur toute la largeur d'un moniteur sont ILLISIBLES (l'œil perd la
// ligne). La bonne largeur de lecture ne dépend pas de la taille de l'écran.
//
// CE QU'ON FAIT : au-dessus d'un seuil « bureau », on habille le fond DERRIÈRE la
// colonne (dégradé ambiant discret), et on fait « poser » l'app dessus — bordure
// fine, ombre douce, coins arrondis. L'app garde sa largeur de lecture, mais elle
// devient une VRAIE application encadrée, pas un ruban perdu. C'est le réflexe des
// apps pro sur desktop (Slack, Linear, Notion en fenêtre étroite).
//
// Tout passe par un <style> injecté ciblant le conteneur de page (.dp-page) : on
// ne touche aucun écran, et le mobile n'est pas affecté (le média-query ne se
// déclenche qu'au-delà du seuil).
// =============================================================================

const ID = "dp-cadre-pc";
const SEUIL = 900;              // px : en-deçà, on reste en pleine largeur mobile

/**
 * Installe le cadre PC. Idempotent (ré-appel = mise à jour du même <style>).
 * @param {string} largeurApp   la largeur de la colonne (ex. "520px")
 * @param {boolean} nuit        thème sombre ? (le fond ambiant s'y adapte)
 */
export function installerCadrePc(largeurApp = "520px", nuit = false) {
  if (typeof document === "undefined") return;

  // Le fond de bureau : deux voiles colorés très doux, différents selon le mode.
  // Assez présent pour ne plus voir de « vide », assez discret pour ne pas
  // concurrencer l'app.
  const fond = nuit
    ? `radial-gradient(1100px 600px at 12% -8%, rgba(37,99,235,.14), transparent 55%),
       radial-gradient(900px 520px at 100% 110%, rgba(14,165,233,.10), transparent 60%),
       #05070f`
    : `radial-gradient(1100px 600px at 12% -8%, rgba(37,99,235,.08), transparent 55%),
       radial-gradient(900px 520px at 100% 110%, rgba(14,165,233,.07), transparent 60%),
       #eef2fb`;

  const ombre = nuit
    ? "0 30px 80px -30px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.05)"
    : "0 30px 80px -34px rgba(15,23,42,.28), 0 0 0 1px rgba(15,23,42,.05)";

  const css = `
    @media (min-width: ${SEUIL}px) {
      body { background: ${fond} !important; background-attachment: fixed; }
      /* L'App bureau rend UN wrapper unique : on le borne à la largeur de
         lecture et on le pose sur le bureau. Un seul élément visé, aucun écran
         touché. Le terrain (autre wrapper) reçoit le même traitement. */
      .dp-cadre-pc-hote > div {
        width: ${largeurApp};
        max-width: ${largeurApp};
        margin: 20px auto !important;
        min-height: calc(100vh - 40px);
        box-shadow: ${ombre};
        border-radius: 20px;
        position: relative;
      }
      /* Les barres fixes s'alignent sur la colonne (même largeur, centrées) et
         suivent les coins bas arrondis. */
      .dpnav {
        border-radius: 0 0 20px 20px !important;
        bottom: 20px !important;
      }
    }
  `;

  let el = document.getElementById(ID);
  if (!el) {
    el = document.createElement("style");
    el.id = ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}
