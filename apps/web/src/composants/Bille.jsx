// =============================================================================
// LA BILLE — la mascotte de Dashprod.
//
// Elle vient des cartes d'abonnement de la vitrine, et c'est délibéré : ce que
// le visiteur touche en découvrant Dashprod doit être ce qu'il retrouve tous
// les jours dans l'outil. Une identité visuelle qui s'arrête à la page
// d'accueil n'est pas une identité, c'est une affiche.
//
// CE QUI A CHANGÉ, ET POURQUOI. Les petites billes n'avaient pas la matière de
// celle de la carte : dégradé monochrome au lieu de l'huile irisée, opacité de
// peinture au lieu du verre, angle de lumière calculé sur x seul, aucune
// profondeur réelle. Et surtout : chaque bille écoutait SA propre boîte, si
// bien que le suivi était coupé sous 44 px — une puce de 14 px ne mesure que
// du bruit. Elles étaient donc figées, là où la carte qui les porte calculait
// déjà, en un seul écouteur, un champ de lumière que personne ne lisait.
//
// Désormais la bille ne s'éclaire plus elle-même : elle est ÉCLAIRÉE PAR LA
// SURFACE. La carte publie l'angle de la lumière et la position du regard
// (`cartes-vives.js`), la bille les hérite en CSS. Résultat : une puce de
// 14 px vit exactement comme une vedette de 84 px, sans un rendu de plus, et
// toutes les billes d'une même carte s'éclairent ENSEMBLE — c'est cet accord
// qui se lit comme du relief.
//
// La recette est dans `lib/matiere-bille.js`, une seule fois, en fractions du
// diamètre. Lire ce fichier avant d'y toucher.
//
// Ce composant n'importe PAS le thème de l'app : il sert aussi la vitrine, qui
// a le sien. La matière (verre ou peinte) vient de la surface, par variables
// héritées — pas d'un import qui embarquerait tout le thème de l'app, ses
// polices et son fond de page, sur la page d'accueil.
// =============================================================================

import React from "react";
import { installerMatiereBille, TONS, TAILLES } from "../lib/matiere-bille.js";

export { TONS, TAILLES };

installerMatiereBille();

/**
 * Les signes. Dessinés en SVG plutôt qu'en police : une police manquante
 * transformerait une croix en carré vide, et un signe illisible sur un bouton
 * d'action est pire que pas de signe du tout.
 */
const SIGNES = {
  chevron: <polyline points="6 9 12 15 18 9" />,
  fleche: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  croix: <><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>,
  plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
  attention: <><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16.5" x2="12" y2="16.6" /></>,
  coche: <polyline points="5 13 10 18 19 6" />,
};

/**
 * @param {"puce"|"jeton"|"bouton"|"vedette"|number} taille
 * @param {keyof TONS} ton
 * @param {keyof SIGNES|null} signe
 * @param {boolean} actif fait pivoter le chevron et gonfle légèrement la bille
 * @param {boolean} deplie quand la bille EST le bouton de dépliage : sans
 *   `aria-expanded`, un lecteur d'écran annonce un bouton sans dire s'il ouvre
 *   ou referme. `actif` est visuel, celui-ci est dit à voix haute.
 */
export default function Bille({
  taille = "jeton", ton = "bleu", signe = null, actif = false,
  onClick, titre, style, deplie,
}) {
  const px = typeof taille === "number" ? taille : (TAILLES[taille] || TAILLES.jeton);
  const t = TONS[ton] || TONS.bleu;
  const Balise = onClick ? "button" : "span";
  const glyphe = signe && SIGNES[signe];

  return (
    <Balise
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`bille${actif ? " bille-actif" : ""}`}
      aria-label={onClick ? titre : undefined}
      aria-expanded={onClick && deplie !== undefined ? deplie : undefined}
      aria-hidden={onClick ? undefined : true}
      title={!onClick && titre ? titre : undefined}
      style={{
        // Le diamètre pilote TOUT le reste : ombres, creux, reflet, parallaxe
        // et relief sont des fractions de `--b`. Une seule valeur à donner.
        "--b": px,
        "--bille-a": t.a, "--bille-b": t.b, "--bille-contre": t.contre,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}>

      <span aria-hidden className="bille-corps" />
      <span aria-hidden className="bille-huile" />
      <span aria-hidden className="bille-reflet" />

      {glyphe && (
        <span aria-hidden
              className={`bille-signe${signe === "chevron" ? " bille-pivote" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}
               strokeLinecap="round" strokeLinejoin="round">
            {glyphe}
          </svg>
        </span>
      )}
    </Balise>
  );
}
