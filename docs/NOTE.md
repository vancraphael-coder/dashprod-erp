# Lot 52 — les centres deviennent des espaces de travail (Option A, socle)

**28/08/2026.** **1194 tests verts**, build vert.

Suite à ta décision : un nouveau centre = un **espace de travail vierge**, comme
une organisation à part, sous une seule société. Ce lot pose le socle — le
mécanisme qui transforme le *tri* en *espace*.

## Le vrai changement : ce qu'on crée dans un centre lui appartient

Avant, le centre n'était qu'un filtre sur une liste commune. Maintenant :

- **Créer un dossier dans l'espace d'un centre le rattache à ce centre.** Tu
  ouvres l'espace « Anvers », tu crées un dossier → il vit dans Anvers, invisible
  ailleurs. Un centre neuf devient un vrai espace de travail, pas une vue vide.
- **Le responsable dépôt crée toujours dans SON centre**, jamais ailleurs — même
  s'il tentait autre chose. Verrouillé côté domaine.
- **Le terrain** crée aussi dans son centre.
- Les anciens dossiers (créés sans centre) restent en **maison mère** — rien ne
  bouge pour l'existant.

## Le sélecteur devient « Espace de travail »

Plus « Centre » (qui sonnait comme un filtre) : « Espace de travail ». Choisir un
espace, c'est y entrer — on voit ses dossiers, on crée dedans. La maison mère est
un espace comme un autre, celui de la tête de réseau.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| le responsable dépôt peut créer ailleurs que chez lui | 1 |

Plus le test « carnet » qui m'a rappelé à l'ordre : il garantit qu'un contact
existant ne crée pas de doublon client — j'ai vérifié que je préserve bien ça.

## À vérifier à l'œil

1. Crée un centre (Paramètres → Centres), ouvre son espace dans les dossiers :
   il est **vierge**.
2. Crée un dossier depuis cet espace : il apparaît dans l'espace du centre, et
   PAS dans la maison mère ni les autres centres.
3. Reviens à la maison mère : tes anciens dossiers sont toujours là.

## RESTE À FAIRE (prochain lot centres) — consigné dans 10-DECISIONS

1. **Comptabilité** : y amener le tri/centres consolidé (maison mère voit tout,
   ventilé par centre). L'écran Comptabilite.jsx existe déjà.
2. **Planning** : vérifier que la création d'une mission hérite bien du centre
   de son dossier (la mission porte déjà centre_id).
3. Éventuel écran d'accueil « choisir un espace », si tu le souhaites.

C'est un socle : la mécanique d'Option A est posée et testée. Les deux points
ci-dessus la complètent — je te les propose au prochain tour.
