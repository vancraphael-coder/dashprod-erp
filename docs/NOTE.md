# Lot 12 — app terrain : congés + apparence

`npm test` : **923/923 ✓** — build `apps/web` ✓ — 5 fichiers.
**Aucune migration.** Se pose par-dessus `dashprod-lot-11`.

> Ce paquet REMPLACE le `dashprod-lot-12` précédent (partie 1 seule). Il
> contient le lot 12 complet — congés ET apparence.

## Le fil du lot : réutiliser, pas copier

Les deux besoins terrain de ce lot existaient déjà côté bureau. Dans les deux
cas, le travail n'était pas de construire une logique, mais d'**ouvrir la
porte** — et surtout de ne pas en dupliquer une seconde qui finirait par
diverger.

## 1. Demander un congé

Le circuit `demanderConge` / `deciderConge` / `annulerConge` vit depuis le
module 8. Il manquait l'onglet dans `TerrainProfil.jsx`.

**Un onglet Congés** : deux dates, un motif facultatif, envoi. La demande part
en état « demande », le bureau tranche depuis le planning.

**La distinction technique qui compte** : l'onglet appelle `demanderConge`
**sans utilisateurId**. Avec un id, la base approuverait d'emblée (saisie
direction). Sans, ça reste une demande à valider. Verrouillé par test — passer
son propre id ferait auto-approuver sa demande.

**Validé avant l'envoi, motif visible** : `validerDemandeConge` (nouvelle, dans
le domaine, pure, date du jour injectée) refuse dates manquantes, fin avant
début, date passée. On peut demander pour aujourd'hui (imprévu du matin), pas
pour hier. Le motif du refus s'affiche sous les champs.

**Retrait tant que c'est en attente** : le × n'apparaît que sur une demande non
tranchée. Un congé accordé s'annule au bureau, un refus est déjà clos.

## 2. Changer d'apparence

Le terrain n'avait aucun accès à Apparence — c'était un écran bureau. Or
l'apparence est un réglage d'**appareil**, pas un privilège : un déménageur en
plein soleil a autant besoin du mode nuit.

**Une entrée Apparence** dans le profil terrain, qui ouvre le MÊME écran
`Apparence.jsx` que les Paramètres bureau (un état qui bascule le rendu, avec un
`retour`). Aucune copie — la logique, l'aperçu et les réglages vivent à un seul
endroit.

**Corollaire mode nuit** : quelques fonds `#fff` en dur du profil terrain
posaient un pavé blanc sur le fond nuit. Passés au jeton `C.blanc`, qui suit le
mode. Le blanc du texte sur une pastille de couleur pleine reste en dur — il est
posé sur une couleur, il doit rester blanc dans les deux modes.

## À vérifier à l'œil

1. Profil → Congés → deux dates → « Envoyer » : « En attente », visible au
   planning bureau en pastille creuse le même jour.
2. Fin avant début : message ambre, bouton inactif. Retirer une demande (×) :
   elle et sa pastille disparaissent.
3. Profil → Apparence → Mode nuit → Appliquer : toute l'app terrain passe en
   sombre, sans pavé blanc résiduel sur les onglets Véhicule / Inventaire.
