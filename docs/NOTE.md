# Lot 32 — correctif emballage + dossier maître

`npm test` : **1042/1042 ✓** — build `apps/web` ✓ — 10 fichiers.
**Aucune migration.**

## D'abord : le planning n'était pas cassé

J'ai rendu l'écran Planning pour de vrai avant de conclure. « Note du jour »,
« Équipes du jour » et « Former une équipe » sont **tous présents** dans le
rendu. Le code du lot 31 est correct.

Ce qui manque, c'est le déploiement : le lot 31 contenait un **fichier neuf**,
`apps/web/src/composants/PlanningJour.jsx`. S'il n'a pas été déposé, l'import
échoue et l'écran ne peut pas monter les composants. Vérifie que ce fichier
existe bien dans le dépôt.

## L'emballage : là, c'était un vrai bug, et il était à moi

`lignesFournitures` était branché correctement, l'aiguillage respecté, les tests
verts — mais **`obtenirAffaire` ne sélectionnait pas la colonne `emballage`**.
`a.emballage` valait donc toujours `undefined`. Aucune fourniture ne pouvait
être facturée, quelle que soit la qualité du reste.

**La leçon, que j'ai consignée dans la méthode** : vérifier que la logique est
correcte ne suffit pas, il faut vérifier que **la donnée arrive**. J'avais
supposé la présence du champ au lieu de la constater. Un test statique surveille
désormais ce `select`.

En vérifiant les données réelles, j'ai aussi trouvé quelque chose que je
n'aurais pas deviné : la clé **`terrain`** de l'emballage regroupe le matériel
de l'entreprise — sangles, couvertures, monte-meuble. **Ce n'est pas une vente
au client.** Elle est exclue par construction (absente du catalogue de
fournitures) ; j'ai figé la propriété par un test pour qu'un ajout de catalogue
ne la casse pas par inadvertance.

## Le dossier maître — `docs/maitre/`

Six documents, à lire dans l'ordre de leur numéro. C'est l'adaptateur
documentaire que tu voulais : ouvrir une nouvelle session, une autre
conversation ou un autre LLM, et repartir sans dériver.

Sa valeur tient à **une seule propriété** : il dit qui a raison quand deux
sources se contredisent.

```
1. la base Supabase          → l'ÉTAT réel
2. le dépôt                  → le CODE réel
3. PASSATION.md              → décisions techniques, pièges
4. 10-DECISIONS-PRODUIT.md   → décisions commerciales
5. 20-OUVERT.md              → ce qui n'est pas tranché
6. tout le reste             → matière à instruire, JAMAIS vérité
```

C'est ce qui manquait : plusieurs documents circulent, certains se contredisent,
et sans hiérarchie un texte de réflexion pèse autant qu'un fait vérifié. Le
CADRAGE affirmait par exemple que les prix de base manquaient — vrai en août,
faux depuis le lot 28.

**Décidé et ouvert sont dans deux fichiers séparés**, volontairement. Les
mélanger laisse croire qu'une décision est négociable, ou qu'une question est
tranchée. Et chaque question ouverte **nomme le professionnel** qui doit
trancher : « à valider par un professionnel » sans dire lequel n'aide personne.

Le fichier de démarrage dit aussi **ce qu'il ne faut PAS rouvrir** — JS pur,
Vite, français, l'architecture horizontale. Une doc qui ne dit que ce qu'il faut
faire laisse rediscuter le reste.

`50-ARCHIVE.md` garde les grandes idées non construites (moteur de conformité,
socle comptable complet, cartographie des métiers, pilotage IA) avec, pour
chacune, **pourquoi elle attend**. Il se déclare explicitement non normatif,
et rappelle ton filtre : une idée ne se construit que si elle rapproche un
client, un usage ou un paiement.

Huit tests protègent le dossier de la dérive : la hiérarchie doit rester
énoncée dans l'ordre, les prix documentés doivent correspondre au barème
appliqué, l'archive doit rester non normative.

## À vérifier à l'œil

1. Vérifier que `apps/web/src/composants/PlanningJour.jsx` existe dans le dépôt.
   Sinon, redéposer le lot 31.
2. Un dossier avec des cartons consommés : la facture montre maintenant les
   fournitures en lignes séparées.
3. Aucun matériel de terrain (sangles, couvertures) sur la facture.
