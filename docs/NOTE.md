# Lot 40 — le circuit : pointage individuel → coût réel

**27/08/2026.** **1153 tests verts**, build vert. **Migrations 0146, 0147, 0148**
appliquées et vérifiées.

Livré en un bloc, comme demandé. Deux corrections, la suppression des anciens
postes, et le cœur du circuit terrain → Calcul définitif.

---

## Les deux corrections

- **Permis** : l'alerte n'apparaît QUE si le membre ne possède pas le bon
  permis. `permisConduite` le faisait déjà ; c'est maintenant verrouillé par
  test (dont « un permis supérieur couvre le requis »).
- **Équipe à plusieurs missions** : deux missions du même jour affiliées à la
  MÊME équipe ne sont plus un doublon. Le vrai doublon reste deux équipes
  DISTINCTES. Corrigé dans `disponibiliteRessource`, câblé par `equipeParMission`.

## Les anciens postes supprimés — migration 0146

Seuls les 11 postes transmis subsistent. Les membres de « direction » ont été
remontés en « gerant » AVANT suppression (fondateur et gérant ont les mêmes
droits ; tu désigneras le(s) fondateur(s)). Résultat vérifié en base : 0 ancien
poste, 0 lien orphelin, 8 membres conservent leur poste.

J'ai aussi corrigé au passage une incohérence dépôt↔base : le nettoyage avait
été fait en base sans fichier de migration. C'est maintenant tracé (0146).

## Le circuit — pointage individuel (choix A)

**Migration 0147** : `chrono_sessions.utilisateur_id`. Chacun pointe pour soi.
**Migration 0148** : `cmd_pointage_definir` cible la session DE L'ACTEUR (même
signature, l'app terrain n'a rien à changer) ; nouvelle `cmd_heures_membres_affaire`
qui rend les heures par membre.

Les 32 sessions collectives d'avant 0147 gardent `utilisateur_id null` : lisibles
comme « heures du chantier, non ventilées ». On ne réécrit pas le passé.

**La main-d'œuvre réelle** (`pilotage/main-oeuvre-reelle.js`) : les heures
pointées de chaque membre × son **coût interne**. C'est ta décision, et ta
raison est juste : la paie agrège au niveau du JOUR (deux déménagements d'un
membre dans une journée y sont fondus), on ne peut pas la répartir par mission.
Le pointage, lui, est par mission.

Ce module remplace le défaut où `heuresMO = faits.heures` : le « réel » du
Calcul définitif était l'estimation du devis déguisée. Désormais, dès que le
terrain a pointé, le réel est le vrai.

**Ton principe est respecté par construction.** Les heures des membres sont un
coût interne : elles grossissent la colonne « réel » et réduisent la marge, sans
jamais toucher le « facturé ». Le module MESURE l'écart prévu/réel ; il ne juge
PAS s'il est facturable ou interne — cette décision est celle du bureau, et
c'est le lot suivant (surcoût interne).

**La carte info « heures pointées »** apparaît dans dossier/devis/Calcul
définitif dès que le terrain a pointé — là où tu l'as située. Elle montre les
heures par membre, le coût interne, l'écart au devis, et signale les pointages
manquants. Réservée à `voir_prix`.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| la même équipe redevient un doublon | 1 |
| le permis alerte même quand il est détenu | 2 |
| heures uniformes pour tous (défaut d'origine) | 4 |
| taux inconnu compté 0 sans le signaler | 1 |
| le non-pointé disparaît de la liste | 1 |
| la session collective se voit attribuée | 1 |

---

## Ce qui reste (prochains lots du circuit)

- **Surcoût interne** : marquer un dépassement d'heures comme interne (panne
  retour, retard, nettoyage) — il reste dans le réel, jamais dans le facturé.
  Tes réponses sont acquises : marquable au chantier ET au bureau, décision de
  facturer au bureau ; terrain déclare et fige, secrétaire corrige.
- **Photos** attachées aux constats (le seul élément manquant du rapport).
- Puis **39** (écrans permissions).

## À vérifier à l'œil

1. App terrain : pointer un départ/arrivée → c'est TA session, tu ne vois pas
   celle des coéquipiers.
2. Dossier → Devis → Calcul définitif : une fois pointé, la carte « Heures
   pointées » montre chaque membre avec ses vraies heures, et le « réel »
   reflète le coût interne, pas l'estimation.
3. Deux missions d'un dossier faites par la même équipe : plus d'alerte
   « déjà pris » à tort.
