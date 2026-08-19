# Lot 21 — la balise note 'i'

`npm test` : **948/948 ✓** — build `apps/web` ✓ — 6 fichiers.
Migration **0138** déjà appliquée en live. Se pose par-dessus le lot 20.

## Ce que c'est

Un petit 'i' dans un rond, en haut à droite de **chaque page du bureau**. On
clique : une note s'ouvre, ancrée **sous** le bouton (pas en bas de l'écran, où
elle serait hors de vue — largeur lisible, calée à droite pour ne pas
déborder). On reclique le 'i' : elle se referme. Cliquer à côté la referme
aussi.

Deux onglets rapides :
- **Remarque** — ce qui cloche ou manque sur cette page. On écrit, on envoie :
  la note part vers le dossier interne.
- **Historique** — les notes déjà déposées sur cette page, plus récentes
  d'abord. La mémoire du segment.

## L'acheminement, et la provenance

Les notes vont dans une table dédiée — le « dossier interne » — cloisonnée par
organisation. La **seule** communication de provenance est la **page**
(`route.ecran`), affichée en clair dans la balise (« Page : Planning ») pour que
tu saches ce qui partira. Aucune donnée métier, aucun contexte client : c'est un
carnet de corrections, pas un rapport.

## Volontairement minimal

La table a une page, un onglet, un texte, un auteur, une date. **Pas** de
statut, pas d'assignation, pas de fil de discussion. Le besoin est un carnet, et
un carnet se tient à une page. On étendra si l'usage le réclame — pas avant.
C'est exactement l'esprit de ce que tu écris : construire la chose qui sert,
maintenant, pas le gestionnaire de tickets pour un million d'utilisateurs.

## Pourquoi c'était le bon dernier geste de la session

Tu l'as dit toi-même : cette balise te sert à **corriger l'app segment par
segment**, et elle me sert de **balise de travail**. Elle transforme chaque
page en surface de retour. Au lieu de deviner ce qui cloche, tu poses un 'i'
là où ça cloche, et la remarque arrive avec sa page. C'est un outil pour rendre
Dashprod plus réel un segment à la fois — la preuve avant l'extension.

## Sécurité vérifiée

La commande d'écriture a été éprouvée en rollback avant livraison : insertion
OK, l'onglet hors liste est rejeté, un texte vide est rejeté, la relecture par
page fonctionne. (Le piège Supabase habituel — une fonction qui passe la
migration mais réfère une table inexistante — écarté par cet exercice.)

## À vérifier à l'œil

1. Sur n'importe quelle page (planning, un dossier, l'équipe) : le 'i' est en
   haut à droite. Cliquer l'ouvre ; recliquer le referme.
2. Onglet Remarque : « Page : … » affiche le bon nom ; écrire, Envoyer → « Noté
   ✓ ».
3. Onglet Historique : la note qu'on vient de déposer y apparaît, avec sa date.
4. Ouvrir le 'i' sur une autre page : l'historique est différent (chaque page a
   ses notes).
