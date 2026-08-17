# Lot 10c — Correctif d'enregistrement & la Bille

**Aucune migration.** `npm test` : **868/868 ✓** — build : **✓ (210 modules)**.
⚠️ **À déployer en priorité** : contient le correctif du bug d'enregistrement.

## Le bug — il venait de moi

> `null value in column "resultats" of relation "scenarios" violates
> not-null constraint`

`scenarios.resultats` est **NOT NULL sans valeur par défaut**. Mon
`sauverMission` (lot 2b-2) créait un scénario sans le fournir : impossible
d'enregistrer un dossier de lift ou de sous-traitance qui n'avait pas encore
de scénario.

Corrigé : `resultats: {}` à la création. Un objet vide est honnête ici — la
mission est saisie, elle n'est pas encore chiffrée, et c'est le devis qui
remplira ce champ. Vérifié en base : sans `resultats` l'insert échoue bien,
avec `{}` il passe, et la relecture du montant sur un `resultats` vide ne
casse rien (le carnet lit `resultats->>'tvac_centimes'`).

**Ce que j'aurais dû faire :** vérifier `is_nullable` **et** `column_default`
avant d'écrire un insert. Je ne regardais que les noms de colonnes. C'est
ajouté aux pièges de `PASSATION.md` (§3.6).

## La Bille — la mascotte

`apps/web/src/composants/Bille.jsx`. Reprise **exactement** des cartes
d'abonnement de la vitrine : ce que le visiteur touche en découvrant Dashprod
doit être ce qu'il retrouve tous les jours. Une identité qui s'arrête à la page
d'accueil n'est pas une identité, c'est une affiche.

**Quatre ingrédients**, et c'est leur combinaison qui fait la sphère :

1. **L'huile qui tourne** avec le curseur — bleu, ambre, bleu. Un aplat
   donnerait un jeton.
2. **Le reflet spéculaire** ovale et décentré en haut : il place la source de
   lumière.
3. **Le creux interne** en bas, qui empêche la bille de paraître collée.
4. **La parallaxe INVERSÉE du signe** — la flèche, la croix ou l'attention se
   déplacent à l'**inverse** du curseur, comme si elles flottaient au-dessus du
   verre. C'est ce détail qui fait le relief ; dans l'autre sens, le signe
   collerait au doigt et la bille paraîtrait plate.

**Quatre tailles nommées** — `puce` (14), `jeton` (22), `bouton` (44),
`vedette` (84). Nommées et non chiffrées : un badge ne « fait pas 18 px », il
est une puce.

**Six signes**, dessinés en SVG : chevron, flèche, croix, plus, attention,
coche. En SVG parce qu'une police manquante transformerait une croix en carré
vide — et un signe illisible sur un bouton d'action est pire que pas de signe.

**Six tons**, chacun disant une chose : bleu (action), vert (fait), orange
(attention), rouge (refus), gris (vide), ambre (le lift).

### Où elle sert déjà

- **Voyants d'affectation** — gris / orange / vert, en taille puce
- **Flèche de dépliage** des volets — elle pivote à l'ouverture
- **Pastilles de métier** du menu « + »

Le voyant que j'avais écrit au lot 10a est **supprimé** : il redessinait la
bille à côté, et deux définitions auraient divergé de la vitrine à la première
retouche. Un test le verrouille.

### Réglages respectés

Le suivi du curseur s'arrête sous la taille `bouton` — sur une puce de 14 px,
une parallaxe de 2 px n'est que du bruit — et sous
`prefers-reduced-motion`.

## Reste du lot 10

⚠️ **Le backfill des affaires déjà confirmées** n'est toujours pas fait : elles
n'ont ni mission d'emballage ni mission de visite. C'est la prochaine chose,
avec vérification d'exécution.

Puis lots 11 (couleurs et filtres du planning — la Bille y servira pour les
types de mission), 12 (terrain : thème et congé), 13 (écran Messages).
