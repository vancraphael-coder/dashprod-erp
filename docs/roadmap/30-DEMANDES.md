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

### D-17 — Un indépendant n'est pas une entreprise en réduction

> « Un indépendant n'a pas a avoir la panoplie d'interaction de l'interface de
> nouveaux dossier, il est généralement sous-traitant des postes allant de
> livreur à déménageurs; il ne doit pas pouvoir inviter quelqu'un dans sa
> 'société'. »

**Classé :** fait. La barre de navigation dépend désormais de la POSTURE, pas
seulement des modules : un indépendant a trois entrées — Ma journée, Planning,
Compte. Ni « Dossiers » avec la création d'affaire, ni « Ressources » pour
inviter. Lui montrer un écran d'invitation, c'est lui proposer une action que
la base refusera (`membres_limite: 1`) : le pire des deux mondes.

### D-18 — Lier les boutons d'options payantes au paiement

> « Lier le boutons des options payante a la bonne page de payement et a la
> confirmation de payement. (Dès que j'ai lié mes info de payement-> avant
> d'etre payer je dois surment voir un avocat et l'assurance si je ne peux pas
> le faire en ligne. »

**Classé :** lot 10, volontairement APRÈS le lot 2, et voici pourquoi. Encaisser
suppose des mentions légales, des conditions générales, une politique de
remboursement et une identité d'entreprise vérifiée — soit quatre entrées de
réglages qui n'existent pas encore (`mentions`, `sequences`,
`identite_verifiee`, `conservation`). Brancher un bouton de paiement avant
elles, c'est coder en dur ce qui engage juridiquement.

**Blocage réel, à traiter hors code et en parallèle :** encaisser des
abonnements engage une responsabilité personnelle. Conseil juridique belge et
assurance RC professionnelle à voir avant la première facture — pas avant la
première ligne de code. Ce point rejoint P6 et P7 du dossier maître, qui
courent déjà.

### D-19 — Supprimer les doublons, corréler paramètres / UI / UX

> « Supprimer les doublons et améliorer la correlation d'info entre
> paramètres/ui/ux-> clarté pure. »

**Classé :** lot 11, et le registre le rend mesurable. Les doublons déjà
identifiés : `Societes.jsx` (écran éditeur orphelin), `Equipe` et `Ressources`
qui se chevauchent sur les rôles, `Cout` et `Services` qui se chevauchent sur
les grilles, `Contrat` et `Offre`, `Facture` et `FactureDoc`. La corrélation
paramètres / écrans est déjà tenue par l'invariant du deuxième angle ; ce lot
en tire les conséquences côté interface plutôt que côté données.

### D-20 — Les documents d'accès à la profession

> « Trouver la bonne place pour les documents d'accès a la profession (ex:
> licence de transport pour ceux qui en ont besoin legalement). »

**Classé :** lot 2, nouvelle entrée de réglage `acces_profession`. Sa place est
dans « Mon entreprise », à côté de `identite_verifiee` — c'est la même famille
de questions : qu'est-ce qui prouve que cette société a le droit d'exercer.

Deux raisons de ne PAS le mettre ailleurs : ce n'est pas un document de dossier
(il ne concerne aucun client en particulier) et ce n'est pas une pièce
comptable (il ne se facture pas). Une licence de transport, une attestation
d'assurance RC, un accès à la profession de déménageur : même nature, même
place, avec une date d'échéance et un rappel — un document périmé est plus
dangereux qu'un document absent, parce qu'on croit l'avoir.

Portée : toutes les offres, postures `direction` et `independant`. Un
indépendant en manutention n'a pas besoin de licence de transport ; un
indépendant qui livre, oui. C'est le métier déclaré qui décide, pas l'offre.

### D-21 — Encadrer chaque page et chaque SQL par métier

> « Encadre bien chaque pages de chaque offres et/ou sql de dashprod pour bien
> délimiter chaques métiers et chaque page attentant spécifique a chaque
> métier. »

**Classé :** `perimetre-metiers.test.js`. Le périmètre de chaque offre est
calculé (module porté ET posture existante) puis **figé** : la liste exacte des
écrans et des réglages de chaque métier est écrite dans le test. Toute
variation casse l'arbre et oblige à dire pourquoi.

L'encadrement se fait donc à deux étages, et les deux sont nécessaires :

- **côté SQL** — le verrou d'offre en RLS (12 politiques) et
  `modules_du_plan()` ferment la donnée. C'est ce qui fait qu'un indépendant ne
  LIT pas ce qui ne le concerne pas, même en appelant l'API directement.
- **côté écrans** — la posture ferme l'interface. C'est ce qui fait qu'on ne
  lui PROPOSE pas une action que la base refuserait.

Le module seul ne suffisait pas : `crm` est dans l'offre indépendant (une
facture s'accroche techniquement à une affaire), et lui ouvrait donc le carnet,
la liste des affaires et l'écran de dossier. **Cinq écrans du circuit de vente
déménagement ont été retirés de sa posture** : carnet, liste des affaires,
dossier, conversations, vente rapide. Son périmètre tombe à 13 écrans et
5 réglages, figés.

### D-22 — L'ancrage était les dossiers de déménagement

> « quand je charge la page indépendant, elle se lance en d'abord sur l'écran
> dossier déménagement comme page d'encrage au lieu du Dashboard, et le
> Dashboard n'a pas encore de bouton dans la barre de navigation. »

**Classé :** fait. Trois défauts distincts sous un seul symptôme.

1. La route initiale valait « liste » en dur : tout le monde atterrissait sur
   les dossiers de déménagement. L'ancrage est **une propriété du métier**, pas
   une valeur par défaut de l'application — il se déclare désormais avec la
   posture (`postures.js`, champ `ancrage`), et l'application n'affiche RIEN
   avant de savoir à qui elle parle.
2. Le correctif précédent ne déplaçait la route qu'après la réponse du
   serveur : l'écran des dossiers s'affichait donc le temps de l'aller-retour,
   et parfois restait.
3. `rituel_independant` était absent de `RACINES` : aucune barre de
   navigation. Ajouté, avec une barre réduite à trois entrées pour cette
   posture.

Défaut de conception révélé au passage : le registre et le routeur parlaient
deux langues (`liste_affaires` d'un côté, « liste » de l'autre). La
correspondance est maintenant déclarée dans le registre (champ `route`) plutôt
que tenue dans une table ailleurs.

### D-23 — La distribution d'une demande ne se fait pas

> « la distribution de la demande ne se fait pas encore, (sur le Dashboard
> c'est un kpi de 'demande reseau'). »

**Classé :** lot 5. Deux choses à ne pas confondre, et c'est la confusion que
la tuile entretenait :

- **`demandes_reseau`** est un vivier de PARTICULIERS qui cherchent un
  déménageur. Un indépendant en manutention n'y répond pas. La tuile a été
  retirée de son compte — elle lui promettait un flux qui ne le concerne pas.
- **la distribution d'une mission à un prestataire** passe par un engagement
  (`cmd_proposer_engagement`), et elle fonctionne en base : l'engagement du
  20/09 existe et attend la réponse. Ce qui manquait, c'est que l'indépendant
  ne voyait pas son écran — voir D-22.

Reste à construire au lot 5 : partir d'une demande du réseau ou d'un dossier
existant pour la confier, plutôt que de resaisir date, ville et nature à la
main.

*(vide)*
