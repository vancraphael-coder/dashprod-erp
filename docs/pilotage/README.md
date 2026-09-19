<!-- FICHIER GÉNÉRÉ — régénéré par : node outils/pilotage.mjs -->

# Centre de pilotage — Dashprod

État : généré
Dernière revue : 2026-09-17

> **Où regarder d'abord :** [`SUIVI.md`](SUIVI.md).

## Ce que c'est

Un dossier par offre, et dans chacun ce qu'il faut savoir pour décider :
ce qu'elle **ouvre**, ce qu'elle **ne fait pas**, ce qu'un client en fait
**réellement**, et les **décisions** datées qui l'ont façonnée.

## La règle qui empêche cette doc de vieillir

Deux natures de fichiers, deux régimes :

| | Régime |
|---|---|
| **⚙️ Généré** — modules, parcours, prix, plafonds, verrous | Dérivé du code à chaque exécution. **Ne jamais éditer** : la correction se fait dans `packages/domaine/src/commercial/`. |
| **🟢🟡🔴 Écrit** — usages réels, dette, décisions | Amorcé une fois, écrit à la main. Le générateur ne l'écrase **jamais**. |

`docs/OFFRES.md` montre le coût de l'autre méthode : écrit le 2026-08-05, il
affirme encore que Pro est verrouillée et que l'essai porte sur Pro. Le
référentiel dit le contraire aujourd'hui. Personne n'a menti — la copie a
vieilli. Ici, ce qui est dérivable n'est plus recopié.

## Régénérer

```
npm run pilotage            # régénère tout le centre de pilotage
npm run pilotage:verifier   # échoue si un fichier généré est périmé (CI)
```

La CI exécute la vérification : un prix modifié dans le référentiel sans
régénération **bloque la fusion**. La doc ne peut plus dériver silencieusement.

## Structure

```
docs/pilotage/
├── README.md                    ce fichier
├── SUIVI.md                     ⬅ le tableau de bord
└── offres/
    ├── SUIVI.md                 les 8 offres et leur état
    ├── starter/                   Basique
    ├── regular/                   Regular
    ├── pro/                       Pro
    ├── donneur_ordre/             Donneur d'ordre
    ├── independant_manutention/   Indépendant manutention
    ├── garde_meubles/             Garde-meubles
    ├── groupe_liftier/            Groupe liftier
    └── logistique_mobilier/       Logistique mobilier
         ├── SUIVI.md
         ├── capacites/     modules.md ⚙️ · parcours.md ⚙️
         ├── limites/       plafonds.md ⚙️ · verrous.md ⚙️ · dette.md ✍️
         ├── usages-reels/  qui-fait-quoi.md ✍️ · cas-terrain.md ✍️
         └── decisions/     JOURNAL.md ✍️
```

## Ajouter une offre

Elle s'ajoute dans `referentiel-offres.js`, puis `npm run pilotage` crée son
dossier complet. Aucun dossier ne se crée à la main : une offre absente du
référentiel n'existe pas, et une offre du référentiel ne peut pas être oubliée
ici.
