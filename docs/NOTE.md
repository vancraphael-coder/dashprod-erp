# Lot 31 — Planning : note rapide et formation d'équipes

`npm test` : **1032/1032 ✓** — build `apps/web` ✓ — 6 fichiers.
**Migration `0142` appliquée et éprouvée.**

Point 1 sur 3 de ta liste. Les deux autres suivent.

## La note rapide

Attachée à une journée, opérationnelle : « Jean part à 15h », « camion 2 au
garage ». Saisie en une ligne, Entrée valide, retrait d'un clic.

**Volontairement distincte de la balise « i »** du lot 21 : celle-ci sert à
corriger le *logiciel*, celle-là note la *journée*. Deux tables, deux usages —
les mélanger aurait transformé ton carnet de corrections en pense-bête
d'exploitation.

## La formation d'équipe

L'écran **n'invente aucune règle** : il appelle `verdictEquipe` et affiche ce
qu'il rend. Deux moteurs de règles finiraient par diverger.

Et il affiche les deux niveaux **séparément**, ce qui est tout l'intérêt :

- ⛔ **bloquant** — empêche d'enregistrer (équipe vide, personne déjà engagée
  sur une mission qui chevauche) ;
- ⚠ **avertissement** — s'affiche, n'empêche rien (effectif hors barème,
  équipe sans mission).

Le bouton n'est désactivé que par un bloquant. C'est ta règle : le maximum
avertit, il n'interdit pas.

**Le point technique qui fait marcher le chevauchement** : l'écran calcule ce
que chaque personne tient *déjà* dans les **autres** équipes du jour, et le
passe au domaine. Sans cette entrée, le domaine croirait tout le monde libre et
le chevauchement ne serait jamais détecté. Une équipe qu'on modifie ne se
compare évidemment pas à elle-même.

**Les équipes types** : « Garder comme équipe type » enregistre le groupe de
personnes sous un nom. Un clic sur le nom le reforme un autre jour — sans les
missions ni la date, comme prévu.

## Côté base

`equipes_jour` accepte volontairement **deux équipes le même jour pour la même
personne**. C'est le domaine qui juge le chevauchement : une contrainte aveugle
en base interdirait un cas parfaitement légitime — déménagement le matin, lift
l'après-midi.

Les tables de liaison n'ont pas d'`org_id` : leur cloisonnement passe par une
jointure sur l'équipe. Sans ça, un identifiant deviné donnerait accès à
l'équipe d'une autre organisation.

## À vérifier à l'œil

1. Planning, un jour avec des missions : « Note du jour » et « Équipes du jour »
   apparaissent au-dessus des missions.
2. Former une équipe d'une personne sur une mission du matin → enregistrable.
3. Former une seconde équipe avec la même personne sur une mission de
   l'après-midi → **autorisé**. Sur une mission qui chevauche → **bloqué**, avec
   les heures dans le message.
4. Une personne pour trois missions → enregistrable, avec un avertissement.
