# ADR-008 — Clôture du « blocage » tarifaire (correction d'une erreur d'analyse)

**Statut** : accepté · juillet 2026 · corrige ADR-005 à ADR-007 et le journal

## Contexte
Pendant plusieurs sessions, cette documentation (ADR-005, 006, 007 ; journal
sessions 1 et 2) a présenté les « grilles tarifaires du client » comme une
dépendance bloquante empêchant la construction du module Chiffrage.

## Constat
Ce blocage était une erreur d'analyse. Les tarifs nécessaires au moteur de
chiffrage figurent déjà, chiffrés et validés par le client, dans les trois
modèles d'offre intégrés dès la première itération de l'application :

- barème horaire : 2 dém. 85 € / 3 dém. 130 € / 4 dém. 170 € / 5 dém. 215 € /
  6 dém. 255 € (par heure, HTVA) ;
- élévateur 150 € ; kilométrage facturé 1 €/km/camion ;
- emballage en régie : 75 €/h + 0,75 €/km ;
- heures supplémentaires forfait : 42,50 € HTVA/déménageur/heure ;
- assurance complémentaire : 50 € HTVA (60,50 € TVAC) ;
- report 25/50/75 % ; annulation 50/70/100 % ; TVA 21 %.

Une note de mémoire (« prix pas formellement validés, à confirmer avec le
contact opérationnel ») a été convertie à tort en obstacle dur et répétée à
chaque session. Le fondateur a confirmé explicitement que ces prix sont les
bons et définitifs.

## Décision
1. Le module Chiffrage est débloqué et construit sur ces valeurs (Module 4).
2. Ces tarifs deviennent le premier référentiel versionné en base (seed
   `0002`), publiables en nouvelle version via `cmd_publier_referentiel` sans
   modification de code (C-07).
3. Les mentions de « dépendance bloquante / grilles manquantes » des ADR et du
   journal sont caduques et remplacées par le présent ADR.

## Note de méthode (pour l'avenir)
Une information de mémoire au statut incertain ne doit pas être promue en
contrainte dure sans vérification contre les sources déjà disponibles. Ici, les
sources (documents d'offre validés) contenaient la réponse depuis le début.

## Point ouvert résiduel (non bloquant)
Seul le palier « 3 déménageurs — 130 € » apparaît dans le texte des offres ;
les paliers 2/4/5/6 proviennent du barème interne de l'application. Ils sont
repris tels quels sur confirmation du fondateur et versionnés : toute évolution
future passe par une republication, pas par une modification.
