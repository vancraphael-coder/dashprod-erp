# OUTIL — VÉRIFIER L'EXISTANT AVANT DE CONSTRUIRE

*Placer d'abord le PRÉAMBULE de `00-SYSTEME-OUTILS.md`.*

## Mission

Répondre à une seule question : **est-ce que ça existe déjà ?**

Sujet : `__________`

## Pourquoi cet outil est le premier à lancer

Trois fois sur trois dans ce projet, l'infrastructure était déjà en place et le
défaut se trouvait ailleurs qu'annoncé. Exemples :

- l'écran de création de société collectait déjà le code d'invitation, la
  chaîne complète fonctionnait — le seul manque était une ligne en base ;
- le multi-société était entièrement câblé (`cmd_mes_societes`,
  `cmd_choisir_societe`, `appartenance_active`) : il manquait une porte dans
  l'interface, pas un mécanisme ;
- la carte d'offre sectorielle existait, conçue exprès, et n'était montée
  nulle part.

Construire avant de vérifier a coûté à chaque fois plus que la vérification.

## La méthode — dans cet ordre, la base d'abord

1. **Les tables et colonnes.** `information_schema.columns` sur les noms
   plausibles, pas seulement le nom exact. Une table peut porter un autre nom
   que le concept.
2. **Les fonctions.** `pg_proc` filtré sur le schéma `public`, en cherchant
   dans le CORPS aussi (`pg_get_functiondef` + `ilike`) : une fonction peut
   traiter le sujet sans le nommer.
3. **Les politiques RLS.** `pg_policies`. Un cloisonnement existe peut-être
   déjà, avec un périmètre différent de celui qu'on imagine.
4. **Les contraintes.** `pg_constraint`. Une règle métier est peut-être déjà
   posée en dur.
5. **Le dépôt** : migrations, domaine, adaptateur, écrans. Chercher les
   synonymes, pas le mot exact.
6. **Les écrans orphelins.** Un fichier peut exister sans être importé nulle
   part — c'est du travail déjà fait qu'on s'apprête à refaire.

## Le livrable

- **Ce qui existe**, avec le chemin ou le nom exact.
- **Ce qui manque vraiment.**
- **Verdict** : construire / réutiliser / brancher ce qui existe.
- **Le coût évité**, s'il y en a un. C'est ce qui justifie cet outil.

## Ce que tu ne fais pas

Aucune écriture, aucune migration, aucun test mutant sur la production. Cet
outil regarde.
