# L'identité desktop de Dashprod — un shell à rail

**01/09/2026.** **1332 tests verts**, build vert.

## D'abord, je reviens en arrière

Tu avais raison : mon « cadre redimensionné » de la fois précédente était un
pansement de mauvais goût — une app mobile posée sur un fond, rien de plus. **Je
l'ai révoqué.** Sur téléphone, tu retrouves exactement l'app d'avant : la barre
du bas, la colonne, tel quel. Un test garantit que l'ancien cadre ne peut pas
revenir.

## Ce que devient Dashprod sur un ordinateur

Ce n'est plus une question de largeur, c'est une autre **façon d'habiter
l'écran**. Au-delà de 1024 px, la disposition change entièrement :

**Un rail vertical à gauche**, toujours présent, qui remplace la barre du bas.
- Replié, il ne montre que les icônes — fin, discret, 76 px.
- Au survol, il **se déploie en douceur** (232 px) et révèle les libellés. Le
  logo et le nom de ta société apparaissent en haut.
- L'onglet actif porte un **galet lumineux qui GLISSE** d'un item à l'autre quand
  tu changes de page — l'œil suit le mouvement, c'est ce qui rend une navigation
  vivante plutôt que mécanique.
- L'icône active **se trace au feutre** à l'activation, comme la barre mobile.
- Un bouton **« Nouveau »** en accent, en haut, pour créer.

**Un canvas à droite** qui respire : un fond de travail ambiant (adapté nuit/jour
et à ta couleur d'accent), et l'écran courant posé dedans. Plus de barre en bas
qui mange l'espace — le rail l'a remplacée, on récupère la hauteur.

Tout suit **ta couleur d'accent** et **ton mode** (clair/sombre) : le rail, le
galet, le fond. Ce n'est pas un thème plaqué, c'est le tien.

## Comment c'est fait — proprement

- **Aucun des 40 écrans n'a été touché.** Le shell les enveloppe. Sur mobile, il
  est totalement transparent (il rend ses enfants tels quels) — d'où le mobile
  intact.
- **Une seule source de navigation** : le rail (desktop) et la barre (mobile)
  lisent exactement les mêmes entrées, elles ne peuvent pas diverger.
- **Réactif** : passe la fenêtre de large à étroit, le shell bascule tout seul.
- **Mouvement réduit respecté** : sur un appareil réglé pour limiter les
  animations, le galet et le feutre se figent.
- Éprouvé par sabotage (le shell qui déborderait sur mobile fait rougir un test).

## À vérifier à l'œil (et c'est là que ça se juge)

1. Sur **ordinateur** : le rail à gauche, survole-le → il se déploie, les
   libellés apparaissent. Change de page → le galet glisse, l'icône se trace.
2. Change ta couleur d'accent dans Apparence → le rail et le fond suivent.
3. Mode sombre → tout s'assombrit en cohérence.
4. Sur **téléphone** : rien n'a changé, l'app d'avant.

## Ce que je n'ai pas encore fait — et la suite que je propose

C'est la **fondation** de l'expérience desktop : le shell. Ce n'est pas encore le
**maître-détail** (voir la liste des dossiers À GAUCHE et le dossier ouvert À
DROITE, sans quitter la liste) ni la largeur de contenu repensée par écran — ça,
c'est le vrai « promax » que tu vises, et c'est un chantier par écran qui touche
la mise en page de chacun.

Je te propose de le faire **écran par écran**, en commençant par le plus payant :
**Dossiers en maître-détail** (liste + aperçu côte à côte). C'est là que
l'expérience devient bluffante — mais je préfère te livrer d'abord ce socle
solide et te laisser juger le rail, plutôt que de tout remuer d'un coup. Dis-moi
si le rail te plaît, et on attaque le maître-détail.

## Réserve d'honnêteté

Le rendu exact (fluidité du déploiement, glisse du galet, densité) se juge sur
ton écran — le build est vert, mais l'œil est le juge. Deux détails à surveiller
que je te signale : le petit « i » (balise de page) reste en haut à droite en
fixe et le bandeau de sections d'un dossier reste centré en bas — ils fonctionnent
mais méritent d'être repensés pour le desktop au prochain passage.
