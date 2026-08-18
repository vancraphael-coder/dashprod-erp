# Lot 12 (partie 1) — la demande de congé côté terrain

`npm test` : **921/921 ✓** — build `apps/web` ✓ — 5 fichiers.
**Aucune migration.** Se pose par-dessus `dashprod-lot-11`.

## Ce que j'ai trouvé avant de coder

Le circuit des congés **existait entièrement** depuis le module 8 :
`demanderConge`, `deciderConge`, `annulerConge`, et les règles côté base (on ne
décide pas de son propre congé). Il manquait juste **la porte côté terrain** —
`TerrainProfil.jsx` n'avait que Véhicule / Inventaire / Heures.

## Ce qui change

**Un onglet Congés** dans le profil terrain. Le membre choisit deux dates, un
motif facultatif, et envoie. La demande part en état « demande » — pas
approuvée. Le bureau tranche depuis le planning, où elle apparaît déjà en
pastille creuse.

**La distinction qui compte : demande ≠ décision.** L'onglet appelle
`demanderConge` **sans utilisateurId**. C'est ce qui fait la différence : avec
un utilisateurId, la base traite l'acte comme une saisie de la direction et
approuve d'emblée. Le membre demande pour lui-même, donc pas d'utilisateurId,
donc ça reste à approuver. Verrouillé par test — passer son propre id
ferait auto-approuver sa demande.

**Validation avant envoi, motif visible.** `validerDemandeConge` (nouvelle,
dans le domaine, pure, date du jour injectée) refuse : dates manquantes, fin
avant début, date passée. Le motif du refus s'affiche sous les champs — pas de
bouton grisé qui laisse deviner ce qui cloche. On peut demander pour
aujourd'hui (un imprévu du matin), pas pour hier (un congé rétroactif masquerait
une absence déjà passée).

**Retrait tant que c'est en attente.** La liste « Mes demandes » montre l'état
(en attente / accordé / refusé) et, pour un refus, son motif. Le bouton × ne
paraît que sur une demande en attente : un congé accordé s'annule au bureau, un
refus est déjà clos.

## Reste du lot 12

Le thème réglable côté terrain (Apparence dans l'app terrain) n'est pas dans ce
paquet — c'est l'autre moitié du lot 12, à faire au prochain tour.

## À vérifier à l'œil

1. Onglet Congés → deux dates → « Envoyer » : la demande apparaît en « En
   attente », et se voit au planning bureau en pastille creuse le même jour.
2. Une date de fin avant le début : message ambre sous les champs, bouton
   inactif.
3. Retirer une demande en attente (×) : elle disparaît, et la pastille creuse
   du planning aussi.
4. Une demande approuvée par le bureau : elle passe à « Accordé », le × ne
   s'affiche plus.
