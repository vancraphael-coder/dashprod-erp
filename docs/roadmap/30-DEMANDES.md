# 30 — DEMANDES (boîte d'entrée)

Toute directive arrive ici **telle qu'elle a été dite**, datée, avant d'être
classée. Une demande sort par une seule porte : elle devient une ligne de
`20-LOTS.md`, ou elle est écartée avec son motif écrit.

Pourquoi la reprise littérale : une directive reformulée à chaud devient la
compréhension qu'en a eue celui qui l'a notée. Trois semaines plus tard,
personne ne peut plus vérifier ce qui avait été demandé — et c'est là que le
produit se met à dériver de son propriétaire.

**Format d'une entrée :** date, la demande, puis son classement.

---

## 10/09/2026

### D-01 — Trouver chaque écran manquant, par offre et par niveau

> « Trouve chaque écran manquant de chaque offre et pour chaque niveau
> différent dans une entreprise et chez le client. »

**Classé :** `10-AUDIT-ECRANS.md`, sections 1 à 4. Sept postures dégagées des
15 rôles en base, plus l'indépendant. Côté client traité en section 3.
**Fait.**

### D-02 — Les écrans existants ne sont pas au point

> « Tous les écrans actuels ne sont pas encore au point, surtout la partie
> terrain, clients et les pdf qui ne collent pas encore avec la réalité, comme
> ce qu'attend un vrai utilisateur qui arrive sur Dashprod et pas comme un dev
> qui veut forcément la perfection de son point de vue. »

**Classé :** devient la règle de conception de `00-SYSTEME.md` (« on conçoit
depuis ce qu'un utilisateur voit en arrivant ») avec ses quatre corollaires.
Terrain → lot 7. Client → lot 8. PDF → lot 6.

### D-03 — Certains écrans existent pour ne pas perdre l'idée

> « Certains écrans ont été créés pour ne pas oublier l'idée mais tout n'est
> pas encore bien pensé. »

**Classé :** devient l'état **esquisse** dans le vocabulaire du système, et
un champ du registre au lot 1. C'est l'état le plus dangereux des trois : il
donne l'illusion que le sujet est traité.

### D-04 — Les paramètres doivent être un point de vérité

> « Il faut surtout que le 3ème angle de la pyramide soit un point de vérité
> (les paramètres) → s'il y a un manque ici c'est toute la cohérence qui
> s'effondre. »

**Classé :** règle de cohérence de `00-SYSTEME.md`, dix manques recensés en
`10-AUDIT-ECRANS.md` §5, et **lot 2 placé avant tout écran**. L'invariant
devient exécutable au lot 1 : un écran qui consomme une configuration
inexistante casse l'arbre.

C'est la demande qui a le plus changé l'ordre des lots. Sans elle, on
construisait « Ma disponibilité » avant son réglage, donc deux fois.

### D-05 — Priorité : l'indépendant et sa relation avec Pro

> « Toujours avec ma priorité de tester l'indépendant et la relation entre
> cette offre et celle de pro. »

**Classé :** lots 3, 4, 5. La relation a fait apparaître un manque qu'aucun
audit côté indépendant n'aurait montré : **les cinq écrans du miroir côté
Pro n'existent pas**. Une offre gratuite pour l'indépendant sans donneur
d'ordre en face ne vaut rien.

Point dur identifié : deux organisations distinctes, un cloisonnement RLS fait
pour les séparer, et une mission qui doit traverser. Trois voies, à instruire
au lot 3 — en commençant par vérifier `demandes_reseau` / `visible_reseau`, qui
existent déjà.

### D-06 — Un système de documentation et un dossier d'outils

> « Si c'est plus simple pour toi, crée un nouveau système dans doc. → crée
> aussi dans la doc un dossier outils pour toi format prompt ou autre, que tu
> utiliseras pour lancer tes propres sous-agents internes. »

**Classé :** ce dossier `docs/roadmap/` (quatre fichiers) et `docs/outils/`.
**Fait.**

### D-07 — Coûts réductibles dès maintenant

> « Contenu texte sur la gestion des coûts que l'on peut réduire dès
> maintenant, comme la résolution d'image et les méta-données. »

**Classé :** `docs/maitre/17-COUTS-STOCKAGE.md`. Le levier résolution +
métadonnées est **fait** (seuil de 4 Mo → 400 Ko, 2000 → 1600 px, EXIF
supprimé au ré-encodage). Les vignettes deviennent le lot 9.

### D-08 — Ne pas supprimer l'organisation pro

> « Ne supprime pas le "pro", je le garde pour les différents tests futurs. »

**Classé :** aucune action. `cmd_supprimer_organisation` reste disponible et
refuse de toute façon cette organisation tant qu'elle porte le drapeau
éditeur. Le drapeau reste où il est.

### D-09 — L'offre indépendant n'ouvre pas au public

> « Tant que maintenant je suis sur les écrans de "Indépendant manutention"
> c'est ok et n'ouvre pas encore au grand public, laisse pour bientôt. »

**Classé :** `statut = bientot`, `souscriptible = false`. Tenu par la
contrainte `offres_souscriptible_si_disponible` en base. Ne passera
`disponible` qu'à la fin du lot 5.

### D-10 — Les paramètres sont propres à chaque métier et à chaque niveau

> « Pour les paramètres chacun a les siens et certains existants chez l'un, ne
> doit pas forcément apparaître chez l'autre (déménageurs (mêmes interne) /
> indépendants / liftier (même interne) / etc...). »

**Classé :** le modèle de portée dans
`packages/domaine/src/produit/reglages-portee.js` — deux conditions, module ET
posture. C'est la posture qui fait le tri entre les métiers, parce que le
module `facturation` est acheté par l'indépendant comme par le déménageur
alors que « Coûts internes » ne concerne que la direction. Le « même interne »
de la demande est couvert par les 9 postures : dans une même entreprise,
direction, dépôt, chef d'équipe et exécution n'ont pas les mêmes réglages.

Tenu par un test qui vérifie explicitement qu'un indépendant ne voit ni
`cout`, ni `services`, ni `roles`, ni `depots`, ni `stockage`, ni `contrats`,
ni `espace_client`, ni `prestataires` — et qu'il voit bien `identite`,
`facturation`, `disponibilites` et `abonnement`. Éprouvé par sabotage.

### D-11 — La pyramide a trois angles, et ce ne sont pas ceux-là

> « La pyramide c'est plus, le légal (le produit final), le paramétrage, la
> prise en main / compréhension rapide. »

**Classé :** `00-SYSTEME.md`, section « La pyramide — ses trois angles ».
L'ancienne formulation (`PLAN → ORGANISATION → UTILISATEURS → RÔLES → MODULES
→ LIMITES`) décrivait comment le produit est gréé, pas ce qui le fait tenir.
Les trois angles deviennent trois familles de tests dans
`produit-registre.test.js`.

### D-12 — L'ordre des lots

> « 1 puis 2, etc... »

**Classé :** ordre de `20-LOTS.md` confirmé. Lot 1 **fait** : le registre
existe et l'audit est devenu exécutable. Lot 2 (les dix réglages manquants)
enchaîne.

## 13/09/2026

### D-13 — Pyramide ou hexagone ?

> « Attention, je parle de pyramide mais si tu vois que mon architecture
> ressemble plus a un hexagone et que je ne le vois pas dis le, j'aime ajouter
> a l'existant mais je ne vois pas toujours si te donner certaine explication
> ne te fais pas effondrer ce que tu fais d'exellent. »

**Classé :** `40-ARCHITECTURE.md`. Réponse : ce ne sont pas deux descriptions
concurrentes mais **trois axes distincts** — la forme du code (hexagonale, et
déjà en place), les trois exigences de qualité (légal / paramétrage / prise en
main), et la cloison inter-organisation (ni couche ni exigence : une
frontière). Le mot « pyramide » n'était pas faux, il était vague : il
désignait tantôt la chaîne technique, tantôt les trois exigences.

Sur la question de fond : les corrections apportées ont toutes amélioré le
résultat, et deux ont changé l'ordre des travaux pour de bonnes raisons. Le
risque n'est pas dans les explications, il est dans l'adoption d'une image
comme si c'était une contrainte — d'où les invariants dans des tests plutôt
que dans la prose.

### D-14 — Le blocage réel : donneur d'ordre et confirmation chez l'indépendant

> « Voici un blocage de l'utilisation réel, j'attends qu'on l'utilise au lieu
> de l'utiliser moi, donc il faudrait 'donneurs d'ordre' et un possibilité dans
> le 'carnet' d'ajouter un indépendant pour lui proposer une date, chez
> l'indépendant, sur son dashboard il doit avoir une demande de confirmation.
> Le prix de l'indépendant est fourni par les paramètres (d'une logique à
> partager certaines données sans liée les données sensibles entre
> organisation-> trouve la logique la plus pure et sécurisée-> pour le
> promovoir). »

**Classé :** lot 3 avancé et découpé en quatre. 3a et 3b **faits**
(migrations 0181 à 0184) :

- **3a — tarifs publiés.** Principe retenu : on ne protège pas une donnée
  sensible par une politique, on met la donnée publiable dans une AUTRE table.
  Une politique peut être mal écrite ; une table qui ne contient rien de
  sensible ne peut rien divulguer de sensible.
- **3b — l'objet-frontière `engagements`.** Seule table de la base sans
  `org_id`. Aucune clé étrangère vers les données privées. Adresse
  physiquement absente avant l'accord. Aucune écriture directe. Chaîne
  d'empreintes append-only.
- **3c — les écrans** (carnet → ajouter un indépendant, tableau de bord
  indépendant → demande de confirmation) : reste à faire.
- **3d — la facture entrante** rattachée à l'engagement : reste à faire.

### D-15 — Sécurité anti-sabotage interne

> « N'oublie jamais la sécurité total anti sabotage interne ou réduire au
> maximum comme on fait avec la sûreté d'enregistrement dans les dossiers. »

**Classé :** appliqué dans 0181 à 0184, sur le même modèle que le registre
probant des messages de dossier (`rang`, `empreinte`, `empreinte_prec`) —
volontairement le MÊME mécanisme, parce qu'un second dispositif pour le même
besoin finirait par diverger du premier.

Quatre verrous, tous éprouvés par sabotage : un tarif publié ne se modifie ni
ne se supprime ; un événement d'engagement est immuable et non supprimable ;
les termes d'un engagement accepté sont figés ; l'adresse ne peut pas exister
avant l'accord. Ajout non demandé mais cohérent : `est_editeur()` n'apparaît
dans AUCUNE politique de ces tables — l'exploitant de la plateforme ne lit pas
les conditions commerciales que ses clients se consentent entre eux.

### D-16 — Le tableau de bord est un rituel, pas un centre de KPI

> « Le dashboard ne doit pas etre un centre kpi, il doit être un rituel qui
> n'assome pas a 6h du matin, meme philosophie pour le dashboard du bureau et
> du terrain d'un employé.
> Un tableau de board en plus (en onglet), pour les gestionnaire de trésorerie,
> ->centre kpi. »

**Classé :** doctrine du rituel dans `00-SYSTEME.md`, sept règles dont trois
sont tenues par des tests — un rituel par posture, trois blocs au plus, un
seul centre de chiffres dans tout Dashprod.

Conséquences sur le registre : les écrans d'arrivée du lot 7 sont marqués
`rituel` avec leur nombre de blocs ; deux rituels manquants apparaissent
(commerce et indépendant) ; le centre de chiffres devient un écran distinct,
`tableau_tresorerie`, en onglet et jamais en arrivée.

Décision technique prise au passage : **`voir_tresorerie` est une capacité à
part**, et non un effet de `emettre_facture`. Une secrétaire émet des factures
toute la journée sans avoir à voir la marge ni les impayés globaux ; un
gestionnaire de trésorerie doit voir l'ensemble sans nécessairement pouvoir
numéroter une facture. Séparer les deux est ce qui permettra de confier la
trésorerie à quelqu'un sans lui donner le reste de la direction. Accordée aux
rôles portant déjà `emettre_facture` ET `voir_paie` — aucun rôle ne gagne un
accès qu'il n'avait pas en substance (migration 0186).

---

## Écartées

*(vide)*
