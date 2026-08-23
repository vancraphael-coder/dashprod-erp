# La méthode de travail

Comment un lot se conçoit, se vérifie et se livre. Suivre cette méthode est ce
qui permet à n'importe quelle session de reprendre sans dériver.

---

## Le cycle d'un lot

```
       VÉRIFIER ce qui existe      ← la moitié des bugs sont ici
              ↓
       SIGNALER les hypothèses     ← avant de coder, pas après
              ↓
          CONSTRUIRE
              ↓
   ÉPROUVER (tests verts + build vert + migration exercée)
              ↓
   VERROUILLER par un test qui dit ce qui casse sans lui
              ↓
     LIVRER (zip des seuls fichiers modifiés + NOTE.md)
              ↓
      CONSIGNER dans PASSATION.md
```

## Vérifier avant de construire

Trois fois sur trois, l'infrastructure existait déjà et le défaut se trouvait
ailleurs qu'annoncé. Exemples réels :

- Les filtres de planning, les couleurs et le tri étaient **déjà faits** avant
  qu'on demande de les construire.
- L'émission Peppol complète existait alors qu'on croyait devoir la bâtir.
- `valoriserEmballage` produisait déjà les lignes de fourniture — elle n'était
  simplement **jamais appelée**.

**Corollaire, appris à mes dépens** : vérifier que la LOGIQUE est correcte ne
suffit pas. Il faut vérifier que la **donnée arrive**. `lignesFournitures` était
branché correctement, mais `obtenirAffaire` ne remontait pas la colonne
`emballage` : la chaîne était juste, rien n'arrivait.

## Éprouver, pas espérer

**Migrations.** Le connecteur applique sans broncher une fonction PL/pgSQL qui
référence une table inexistante — l'erreur ne sort qu'à l'exécution. Toute
migration s'exerce dans un bloc `do $$ … raise exception 'ROLLBACK' $$`
immédiatement après application.

**Écrans.** Le build vert ne prouve rien sur le rendu. Un import manquant, une
const fléchée appelée avant sa déclaration (TDZ), un hook après un `return` :
tout compile, tout plante à l'affichage. Les écrans se **rendent** pour de vrai
avant livraison.

**Un test qui ne rougit jamais ne prouve rien.** Après avoir écrit un garde-fou,
casser volontairement le code pour vérifier qu'il proteste — puis remettre.

## Verrouiller

Chaque règle métier importante est figée par un test dont le **commentaire dit
ce qui casse sans lui**. Un test sans cette phrase se fait supprimer par le
prochain qui le trouve gênant.

Quand un bug est compris, il devient un test **statique** plutôt qu'une
vigilance : hooks après return, const avant déclaration, imports manquants,
fonds clairs qui ignorent le mode nuit, dérogations d'architecture. Ces
garde-fous ont attrapé de vraies régressions.

## Livrer

- Zip contenant **uniquement** les fichiers qui diffèrent réellement de la
  livraison précédente. Vérifier par `diff` avant d'inclure.
- Arborescence identique au dépôt.
- Un `NOTE.md` qui dit : ce qui a été trouvé, ce qui a été décidé et pourquoi,
  ce qui n'a **pas** été fait, et quoi vérifier à l'œil.
- Mettre `PASSATION.md` à jour dans le même zip.

## Écrire du code qui se relit

- Une fonction de décision rend **`{ ok, motif }`**, jamais un booléen nu :
  le motif s'affiche à l'utilisateur et se teste.
- Les commentaires expliquent le **pourquoi** et citent le bug évité, pas ce que
  le code fait déjà lire.
- Les montants sont des **entiers de centimes**. Jamais de flottant.
- Enrichir une primitive partagée (thème, helper de domaine) plutôt
  qu'improviser dans chaque écran.

## Dire ce qu'on n'a pas prouvé

Une limite énoncée vaut mieux qu'une confiance fabriquée. Quand une migration
n'a pas pu être éprouvée, quand une règle attend un professionnel, quand un lot
laisse un chantier entier de côté : **le dire dans la NOTE**, pas l'enterrer.
