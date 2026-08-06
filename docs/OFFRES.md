# Les trois offres — Dashprod

> Grille commerciale et ce qu'elle ouvre techniquement. Établie le 2026-08-05.
> Source de vérité : `packages/domaine/src/commercial/plans.js` (interface) et
> `modules_du_plan()` en base (contrainte). Les deux sont comparées par un test.

## La règle qui a construit l'échelle

**Un seul motif de montée par palier.** Un client qui ne sait pas dire en une
phrase pourquoi il passe au palier suivant ne montera pas.

```
Starter → Regular : « je veux faire signer en ligne et facturer des entreprises »
Regular → Pro     : « j'ai plusieurs équipes, ou je fais de l'international »
```

## La grille

| | **Starter** | **Regular** | **Pro** |
|---|---|---|---|
| Prix HTVA/mois | **180 €** | **360 €** | **720 €** *(verrouillée)* |
| Utilisateurs | 2 | 5 | illimité |
| Coût par utilisateur | 90 € | 72 € | dégressif |
| Promesse | Sortir du papier | Le circuit complet, du premier appel au paiement | Plusieurs centres logistiques |
| Pour qui | Le déménageur seul ou à deux, encore sur Excel | L'entreprise établie, bureau + équipes terrain | L'entreprise qui exploite plusieurs dépôts, chacun avec son gestionnaire |

**Le coût par utilisateur décroît à chaque palier** — 90 € → 72 € → dégressif.
C'est la condition d'une échelle qui tient : si monter en gamme coûtait plus
cher par tête, personne ne monterait. Un test le vérifie, parce qu'une grille
incohérente ne se rattrape pas au discours.

*Note sur le prix Starter* : il ne peut pas descendre sous ~180 €. À 120 € pour
2 personnes, le coût par utilisateur (60 €) passerait sous celui de Regular
(72 €) et casserait l'échelle. 180 € = la moitié de Regular, facile à annoncer.

## Ce que chaque offre ouvre

### Socle — dans les trois offres
Clients et dossiers · Relevé de mobilier · Chiffrage et barème · Offre et
conditions · Planning d'équipe · Application terrain · Véhicules · Facturation.

> Un client Starter doit pouvoir **travailler complètement**. Le socle n'est
> pas une démo : c'est un outil qui remplace le papier.

### Regular ajoute
**Signature en ligne** (+ certificat opposable) · **Espace client** ·
**Facturation Peppol** · **Exports comptables** · **Rapports de chantier** ·
**Préparation de paie** · **Journal et décisions** · **Déménagement
international** (colisage, douane, poids taxable).

Les deux arguments qui font vendre : la signature à distance supprime les
relances pour un papier signé, et **Peppol est obligatoire en B2B belge depuis
2026** — sans lui, on ne peut plus facturer une entreprise. Un déménageur qui
travaille pour des sociétés n'a pas le choix.

### Pro — VERROUILLÉE (décision du 2026-08-05)
**Centres logistiques** · **Gestionnaire de dépôt** · Stockage et
garde-meubles. Aucun n'est construit.

> Pro est **annoncée mais pas souscriptible**. Ce qui la définit — plusieurs
> centres, chacun avec ses équipes et son responsable, et la direction une vue
> consolidée — reste à bâtir. Encaisser pour une promesse est le plus sûr moyen
> de perdre un client au premier mois. Le verrou vit dans
> `plan_souscriptible()` en base : c'est le seul endroit à changer pour
> l'ouvrir.

**Conséquence traitée** : l'international était dans Pro. Il est **livré et
testé** ; le laisser dans une offre qu'on ne peut pas souscrire l'aurait rendu
invendable. Il rejoint **Regular**, et pourra remonter si Pro s'ouvre — sa
valeur propre, la logistique multi-sites, se suffit à elle-même.

**Seconde conséquence** : l'essai porte désormais sur **Regular**, la meilleure
offre souscriptible. Faire essayer une offre qu'on ne peut pas acheter ensuite
ne crée que de la frustration. La constante suit automatiquement l'ouverture
de Pro.

## Comment la contrainte s'applique

Le prix est une **contrainte technique d'accès**, pas une page marketing :
masquer un bouton ne vend rien, n'importe qui peut appeler la fonction.

```
PLAN → ORGANISATION → UTILISATEURS → RÔLES → MODULES → LIMITES
```

Deux étages qui se composent, et il faut les **deux** :
- le **plan** dit quels modules existent pour l'entreprise ;
- la **capacité** dit ce que cette personne-là peut y faire.

Un chef d'équipe chez un client Starter n'a pas la signature en ligne parce que
son entreprise ne l'a pas achetée — pas parce qu'il lui manque un droit.

Points de contrôle en base (migration 0075) : `org_a_module()`,
`exiger_module()`, `limite_utilisateurs()`. Le message de refus **nomme l'offre
nécessaire** : « disponible à partir de l'offre Regular » est une proposition
commerciale, « accès refusé » est une impasse.

## Facturation et essai — tranchés le 2026-08-05

**Périodicité** : mensuelle, ou annuelle **remisée de 5 %**. Sur Regular,
l'annuel revient à 4 104 € au lieu de 4 320 € — 216 € économisés, soit
342 €/mois. Un test vérifie que l'annuel est toujours plus avantageux que
douze mensualités, sur les trois offres.

**Essai** : **5 jours sur l'offre Pro**. On montre le meilleur, pas le socle.
Techniquement, `plan` n'est pas modifié pendant l'essai : c'est
`plan_effectif()` qui renvoie `pro` tant que `essai_fin` court. À l'échéance,
l'entreprise retrouve son offre réelle **sans qu'aucune écriture n'ait à être
défaite** — donc sans risque de rester bloquée dans un état intermédiaire.

## Le changement d'offre — et le principe qui le gouverne

> **On ne supprime jamais de données. C'est ce qui aide à remonter.**

Une entreprise qui redescend garde **tout**. Ce qui dépasse la nouvelle limite
est **archivé** (`actif = false`), jamais effacé : les comptes, leurs heures,
leurs affectations et leur historique restent intacts. Réactiver suffit.

Un logiciel qui punit la descente en détruisant des données perd le client
deux fois : à la descente, et à la remontée qu'il ne fera pas.

**Monter** ne demande aucun arbitrage. **Redescendre** en dépassant la limite
ouvre une page de transition qui :

1. annonce les **modules perdus** — sans rien demander : leurs données restent
   en base, simplement inaccessibles, et redeviennent lisibles si l'entreprise
   remonte ;
2. fait **désigner qui conserve son accès**. Le système ne choisit jamais à la
   place du client : trancher soi-même qui perd son compte serait la pire des
   automatisations. La commande `cmd_changer_offre` REFUSE tant que le choix
   n'est pas fait.

Deux garde-fous : on ne peut pas désigner plus de personnes qu'il n'y a de
places, et **l'administrateur ne peut pas se retirer lui-même** — sinon plus
personne ne pourrait remonter d'offre ensuite.

## Décisions qui restent à Raphaël

1. **Confirmer 180 € et 720 €** (Regular fixé à 360 €). Contrainte à respecter :
   coût par utilisateur strictement décroissant.
2. **Le paiement lui-même** : aucun encaissement n'est construit. Il faudra
   choisir un prestataire (Stripe, Mollie…) et décider ce qui se passe à
   l'échéance impayée — suspension ou simple relance.
3. **Qui déclenche l'essai** : automatique à l'inscription, ou sur demande ?
