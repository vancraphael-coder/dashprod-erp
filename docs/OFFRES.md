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
| Prix HTVA/mois | **180 €** | **360 €** | **720 €** |
| Utilisateurs | 2 | 5 | illimité |
| Coût par utilisateur | 90 € | 72 € | dégressif |
| Promesse | Sortir du papier | Le circuit complet, du premier appel au paiement | Plusieurs équipes, l'international |
| Pour qui | Le déménageur seul ou à deux, encore sur Excel | L'entreprise établie, bureau + équipes terrain | L'entreprise à plusieurs équipes, ou qui expédie à l'étranger |

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
**Préparation de paie** · **Journal et décisions**.

Les deux arguments qui font vendre : la signature à distance supprime les
relances pour un papier signé, et **Peppol est obligatoire en B2B belge depuis
2026** — sans lui, on ne peut plus facturer une entreprise. Un déménageur qui
travaille pour des sociétés n'a pas le choix.

### Pro ajoute
**Déménagement international** (livré) · Multi-dépôts *(à venir)* ·
Stockage et garde-meubles *(à venir)*.

> Pro repose sur **au moins un module déjà livré** — l'international. Vendre
> un palier qui ne contient que des promesses se paie très cher. Un test
> l'interdit.

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

## Décisions qui restent à Raphaël

1. **Les prix de Starter et Pro** (180 € et 720 €). Regular est fixé à 360 €.
   La contrainte à respecter : coût par utilisateur strictement décroissant.
2. **Engagement et facturation** : mensuel sans engagement, ou remise à
   l'année ? Rien n'est construit là-dessus.
3. **Période d'essai** : combien de jours, et sur quelle offre ? Non construit.
4. **Le passage d'offre** : qui le déclenche, et que se passe-t-il si une
   entreprise redescend avec 4 utilisateurs vers Starter (limite 2) ? Le code
   refuse aujourd'hui l'ajout, pas la descente — à trancher.
