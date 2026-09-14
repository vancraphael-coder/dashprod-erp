# 50 — L'ARCHITECTURE TIENT-ELLE À DIX SECTEURS ?

Audit du 14/09/2026, sur mesures et non sur impressions. État de départ :
8 offres, 9 postures, 19 modules, 6 natures, 32 réglages, 83 écrans déclarés,
85 tables dont 69 cloisonnées, 99 politiques RLS, 182 commandes.

---

## 1. Ce qui tient, et pourquoi

Six mécanismes sont **agnostiques au secteur** : construits une fois, ils
servent le dixième secteur comme le premier.

| mécanisme | pourquoi il ne se refait pas |
|---|---|
| Le noyau pur (`packages/domaine`) | 1 474 tests sans base ni réseau. Un secteur ajoute des règles, pas une architecture. |
| Le référentiel + génération du SQL | Une offre se publie, elle ne se code pas. Le générateur ne sait pas oublier un champ. |
| Posture × module | Le scoping par métier ET par niveau. C'est ce qui rend un secteur étanche sans écrire de conditions. |
| L'objet-frontière (`engagements`) | UNE table pour toute relation inter-organisation, quel que soit le métier. Un liftier et un manutentionnaire se confient une mission par le même mécanisme. |
| Publiable ou privé (table séparée) | Tarifs, vitrine, disponibilités : le même principe se réapplique sans réfléchir. |
| La chaîne probante | `rang` / `empreinte` / `empreinte_prec`. Sert n'importe quel document de n'importe quel secteur. |

**Le test décisif : le coût marginal d'un secteur est-il dominé par les
écrans ?** Si oui, l'architecture tient — parce que l'écran est le produit, et
qu'on ne mécanise pas le produit. Réponse mesurée : oui, depuis aujourd'hui.

---

## 2. Les deux murs abattus aujourd'hui

### Le verrou RLS était écrit à la main

Douze politiques, chacune portant trois conditions : organisation, capacité,
module. À dix secteurs, plus de cent. **C'est le seul endroit de Dashprod où
une faute d'inattention produit une fuite silencieuse plutôt qu'un test
rouge** — une condition oubliée n'échoue pas, elle ouvre.

Les quatre formes relevées en base sont régulières (`tenant`, `capacite`,
`centre`, `parent`). Elles sont donc déclarées en donnée et le SQL se génère.

**La preuve que le générateur est digne de confiance n'est pas qu'il est bien
écrit : c'est qu'il reproduit les douze politiques qui tournent en
production.** Un test le vérifie composant par composant. Sans cette preuve,
générer cent politiques serait naviguer à l'aveugle plus vite.

### Le secteur était déclaré trois fois

`offres.secteur` en texte libre, `reutilisation.js` en énumération,
`corps_metier.secteur` en base. **Quatrième récidive de la même maladie** —
après la grille de modules, la liste des offres et les prix. Et cette fois sur
l'axe même de l'expansion.

En regardant les trois, elles ne disaient pas la même chose, et c'est ça qui
les avait laissées diverger :

- le **secteur** est une famille d'activité. Deux corps du même secteur se
  croisent sur le même travail. Énumération fermée.
- la **clientèle visée** est un argument commercial. « Self-storage »,
  « Débit industriel » : ça dit à qui on parle, pas ce qu'on fait.

Un mot pour deux choses — exactement ce qui était arrivé à « pyramide ».
`secteurs.js` porte le premier ; le second reste sur l'offre, en texte libre.
Trois tests tiennent la dérivation.

---

## 3. Les deux murs qui restent

**La barre de navigation est codée en dur.** `itemsNav` dans `main.jsx` liste
les entrées par posture. Ajouter une posture, c'est éditer du code — et à dix
secteurs, les postures se multiplieront (opérateur machine, cariste,
préparateur). Mécanisable : la barre se déduit de l'ancrage et des écrans de la
posture, tous deux déjà déclarés dans le registre. **Non fait.**

**Le cycle de vie d'un dossier est codé par nature.** `scenario-nature.js`
décrit ce qui se passe entre la création et la facture, nature par nature. Six
aujourd'hui, une trentaine à dix secteurs. C'est le poste le plus lourd qui
reste, et le moins évident à mécaniser : un cycle de garde-meubles n'a rien à
voir avec un cycle de déménagement. **Probablement irréductible en partie —
à instruire avant le troisième secteur, pas après.**

---

## 4. Ce que l'audit dit de la VISION, et c'est le point le plus important

L'objectif énoncé : **sortir un patron de l'opérationnel**, faire de Dashprod
son fourre-tout ordonné.

Ce qui sert cet objectif est en place : les postures et les capacités SONT le
mécanisme de délégation. Un chef d'équipe qui voit sa journée, un responsable
de dépôt qui voit son centre, une coordination qui voit les trous — c'est du
travail que le patron ne fait plus.

**Mais rien ne mesure si la délégation a réellement lieu.** Et c'est un manque
d'architecture, pas un manque d'écran :

- aucune vue ne dit « voici ce qui s'est passé cette semaine sans toi » ;
- aucune vue ne dit « voici les trois décisions qui n'attendent que toi » ;
- rien ne distingue, dans les 83 écrans, ceux qui LIBÈRENT le patron de ceux
  qui le rappellent.

Le produit sait aujourd'hui répartir le travail. Il ne sait pas encore montrer
au patron **ce qu'il a cessé de porter** — et c'est pourtant la seule preuve
que l'app fait ce qu'elle promet.

**Proposition : un axe de plus dans le registre des écrans.** Chaque écran
déclare s'il `libere` le patron (quelqu'un d'autre le fait), s'il le `rappelle`
(lui seul peut décider), ou s'il est `neutre`. Le compteur devient une mesure
de la vision, pas une intuition. Un produit qui a 60 écrans « rappelle » et 20
« libère » ne sort personne de l'opérationnel, quel que soit son nombre de
fonctionnalités.

C'est le seul endroit de cet audit où je propose un axe nouveau plutôt qu'une
correction. Il est à trancher, pas à supposer.

---

## 5. Verdict

**L'architecture tient.** Pas parce qu'elle est élégante, mais parce que le
coût marginal d'un secteur est désormais dominé par le poste irréductible —
les écrans. Les deux postes mécanisables l'ont été aujourd'hui ou sont
identifiés avec leur solution.

**Deux réserves nommées, pas minimisées** : la navigation par posture et le
cycle de dossier par nature. Elles ne bloquent pas le deuxième secteur ; elles
bloqueraient le cinquième.

**Un manque de vision, pas de technique** : rien ne mesure la libération du
patron, qui est le but. Voir section 4.
