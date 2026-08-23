# Lot 34 — CORRECTIF : six tables étaient inécrivables

`npm test` : **1049/1049 ✓** — build `apps/web` ✓ — 4 fichiers.
**Migration `0143` appliquée et éprouvée. Rien à redéployer côté code : le
correctif est en base.**

## C'était ça, et c'était moi

Tu avais raison d'insister. Ce n'était ni le rendu, ni le déploiement, ni un
fichier manquant. J'ai cherché du mauvais côté pendant trois échanges.

Les tables historiques (`affaires`, `missions`) portent :

```sql
org_id uuid not null default jwt_org()
```

**Les six tables que j'ai créées avaient le `not null` mais pas le défaut.**

Le front insère sans `org_id` — et c'est correct : l'organisation vient de la
session, jamais du navigateur. Mais sans défaut, chaque insertion violait la
contrainte et échouait.

**Toutes les écritures ont échoué depuis leur création :**

| Table | Lot | Ce qui ne marchait pas |
|---|---|---|
| `notes_atelier` | 21 | la balise « i » n'a **jamais** rien enregistré |
| `factures_fournisseur` | 26 | réception Peppol |
| `peppol_evenements` | 29 | journal du webhook |
| `equipes_jour` | 31 | les équipes |
| `modeles_equipe` | 31 | les équipes types |
| `notes_planning` | 31 | la note rapide |

Le planning s'affichait probablement très bien. C'est l'enregistrement qui
tombait — donc rien ne restait, donc « rien n'a changé ».

## Pourquoi mes propres vérifications n'ont rien vu

C'est la partie que je dois t'expliquer, parce qu'elle remet en cause une
habitude que je croyais solide.

J'éprouve chaque migration dans un bloc `do $$ … rollback $$`. Ces blocs
écrivaient :

```sql
insert into equipes_jour (org_id, jour, nom) values (v_org, ...)
                          ^^^^^^ je fournissais l'org_id moi-même
```

Ils prouvaient que **la structure** tenait. Ils ne testaient jamais **le chemin
que l'application emprunte** — celui où l'org_id n'est pas fourni.

> **Une migration doit être exercée telle que l'application l'utilise,
> pas telle qu'il est commode de la tester.**

C'est consigné en §3.17 de la passation, à côté des autres pièges vécus.

C'est aussi le miroir exact du bug de l'emballage du lot 32 : là, la logique
était juste mais la donnée n'arrivait pas. Ici, la donnée partait mais la table
la refusait. Même famille — **vérifier la logique ne suffit jamais, il faut
suivre le chemin complet.**

## Le garde-fou

`ecriture-org.test.js` refuse désormais toute nouvelle table à
`org_id not null` sans `default jwt_org()`.

Portée assumée et dite : il ne regarde que les migrations à partir de 0138.
Les antérieures sont des stubs — le SQL a été appliqué en direct, leur fichier
ne porte pas l'historique. Prétendre les vérifier depuis les fichiers
produirait un test faux, pire qu'un test absent. La base fait foi sur elles.

## À vérifier — ça devrait marcher maintenant

1. **Planning** → une note du jour → « Noter ». Elle doit rester après
   rechargement.
2. **Planning** → « Former une équipe » → une personne → une mission →
   « Enregistrer ». L'équipe doit apparaître dans la liste.
3. **La balise « i »** de n'importe quelle page → une remarque → « Envoyer » →
   onglet Historique : elle doit y être. (Elle n'a jamais fonctionné jusqu'ici.)

Si l'un des trois échoue encore, dis-le-moi : ce sera un autre problème, et
j'aurai éliminé celui-là pour de bon.
