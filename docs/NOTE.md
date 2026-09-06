# Verrous de sortie pro — trois défauts réels, corrigés

**01/09/2026.** **1262 tests verts**, build vert. **Migrations 0167 + 0168**
appliquées et vérifiées.

Tu avais raison sur les deux points, et j'ai trouvé pire en creusant. Je te dois
la vérité complète : **une de ces régressions vient de mon travail.**

## 1. Une facture VIDE a été émise avec un numéro légal ⚠️

**Constaté sur tes données** : la facture **2026-000019** (un lift) porte
**zéro ligne** et un total de **0 €** — et elle a consommé un numéro légal. C'est
un trou dans ta séquence et un document non conforme.

**Corrigé, verrou en base** : émettre refuse désormais s'il n'y a aucune ligne ou
si le total est nul. Message clair au lieu d'un numéro gâché. C'est la base qui
refuse, pas seulement l'écran — un appel direct ne passe pas non plus.

## 2. La prestation manquait, et le libellé mentait

**Constaté** : la facture **2026-000020** (lift) ne portait que des fournitures,
sans la prestation. Et **toutes** les prestations s'intitulaient
« Déménagement — client », même pour un lift.

**Corrigé :**
- Le libellé suit la **nature** : « Lift — Dupont », « Boxe — … ». Fini le
  « Déménagement » universel.
- **Plus de ligne fantôme à 0 €** : une prestation à zéro signale un chiffrage
  inabouti, pas une prestation gratuite. On ne l'écrit plus.
- **L'écran t'avertit** : si tu factures des fournitures sans prestation, un
  bandeau ambre te le dit avant d'émettre.

**Ma part de responsabilité** : mes lots « fournitures jointes » ont rendu
possible d'émettre une facture ne contenant que des fournitures. Le garde-fou
aurait dû venir avec. Il est là maintenant.

## 3. Personne ne pouvait clôturer — et ce n'était pas toi

**La cause exacte** : la fonction de clôture exige la capacité « Clôturer un
dossier ». Cette capacité existe dans le référentiel, mais elle n'était
attribuée à **aucun rôle** — zéro ligne dans la table des droits. Donc **personne
au monde ne pouvait clôturer**, gérant et fondateur compris. Ton accès était
correct ; c'est le droit qui n'avait jamais été relié.

**Corrigé** : la capacité va aux rôles qui portent déjà « émettre une facture »
(fondateur, gérant) — qui facture peut clôturer. Vérifié : chef d'équipe et
secrétaire ne l'ont pas, c'est voulu.

## 4. L'onglet « Clos » existe

Ajouté entre « À clôturer » et « Tous ». Un dossier clôturé se retrouve sans
fouiller le fourre-tout qui mêle aussi les annulés.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| le libellé « Déménagement » revient en dur | 1 |
| la ligne de prestation à 0 € repasse | 1 |

## À vérifier à l'œil

1. **Clôture** : sur un dossier effectué et payé, le bouton clôturer fonctionne
   maintenant.
2. **Liste** : l'onglet « Clos » apparaît et contient tes dossiers clôturés.
3. **Facture d'un lift** : la prestation s'intitule « Lift — … », pas
   « Déménagement ».
4. **Facture sans chiffrage** : impossible d'émettre à vide ; message explicite.

## Ce que je n'ai pas fait

Les factures **2026-000019 et 2026-000020 restent telles quelles** — elles sont
émises, donc immuables. La 19 est vide et la 20 sans prestation. Si elles doivent
être corrigées, c'est par **avoir**, pas par réécriture : dis-moi si tu veux que
je prépare ça. C'est une décision comptable, pas technique.

## Suite

Le terrain est déblayé pour **A1 — le cycle de vie par nature**, avec le modèle
Shurgard/Go Box pour le boxe comme tu l'as indiqué. J'attaque au prochain tour.
