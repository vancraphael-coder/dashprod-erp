# A1 — Les cycles de vie par nature + conformité CMR

**01/09/2026.** **1278 tests verts**, build vert. Le lot qui débloque les cinq
métiers muets.

## Le correctif « Clos » d'abord

Tu avais raison : le compteur était juste, la liste vide. Le regroupement par
horizon recevait « actifs seulement » pour **toute** vue autre que « Tous » — il
écartait donc les dossiers clos juste après les avoir filtrés. Corrigé et
verrouillé par test.

## A1 — trois familles de cycles, plus un seul parcours pour six métiers

**CHANTIER** (déménagement, lift, sous-traitance) — on prépare, on exécute, on
clôt.
**CONTRAT** (boxe, zone) — brouillon → proposition → **actif** → [suspendu] →
terminé. **Ni « planifié », ni « effectué »** : un box ne s'exécute pas, il se
loue. C'est le modèle du self-storage que tu m'as indiqué (Shurgard, Go Box) :
un contrat, une unité attribuée, une facturation qui court, une sortie.
**VENTE** (comptoir) — aucun cycle, la facture est l'événement.

**Ce que ça débloque concrètement :**
- Un **boxe** peut enfin devenir actif (il était bloqué parce qu'on lui
  réclamait une équipe et un camion).
- Un **lift** se confirme sur un **accord tracé** — plus besoin de faire signer
  un devis pour une prestation de 150 €. C'est ce qui bloquait 20 lifts sur 21.
- Un lift se planifie **sans équipe constituée** : un véhicule et son opérateur.

**Ce qui ne change PAS : le déménagement.** J'ai fait attention à ça. La
vérification par nature **délègue réellement** à la machine existante pour le
déménagement — l'invariant « une offre signée pour confirmer » est préservé, et
un sabotage le prouve : si quelqu'un tente d'accepter un simple accord tracé pour
un déménagement, un test rougit.

Un contrat exige deux choses seulement, mais fermement : **un tarif** (sans quoi
la facturation récurrente n'a rien à réclamer) et **une date de début**.

## Conformité — CMR et lettre de voiture

**Un point juridique qui compte, et qui recoupe ta remarque sur la
sous-traitance** : ce n'est **pas le déménagement** qui appelle le CMR. Le
déménagement pour compte d'autrui relève d'un régime propre. C'est la
**prestation de transport pour un tiers** — précisément l'actuelle
« sous-traitance » — qui exige un document de transport.

Ce qui est posé :
- **Quel régime s'applique** : CMR si la frontière est franchie, lettre de
  voiture nationale en Belgique, rien pour les autres métiers. Un pays inconnu
  n'est jamais présumé international.
- **Les mentions obligatoires** (art. 6 de la Convention) et la détection d'un
  document incomplet **avant le départ** — un CMR incomplet se découvre au
  contrôle, c'est-à-dire trop tard.
- **On signale, on ne bloque pas** : le chauffeur peut avoir le document sous une
  autre forme. On l'avertit, on ne l'empêche pas de partir.

⚠️ **C'est un repérage de terrain, pas un avis juridique.** Les régimes, seuils
et exemptions doivent être confirmés par un conseil en droit belge du transport.
Le module dit ce qu'il faut préparer, pas ce qui est légalement suffisant.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| le déménagement accepte un accord tracé (invariant C-02 cassé) | 1 |
| le boxe retombe sur le cycle chantier | 4 |
| un contrat devient actif sans tarif | 1 |
| le déménagement exigerait un CMR (faux juridiquement) | 3 |
| un pays inconnu présumé international | 1 |

## À vérifier à l'œil

1. La vue **Clos** affiche enfin tes dossiers clôturés.
2. Le reste d'A1 est du **domaine pur** : il ne se voit pas encore à l'écran.

## Ce qui reste pour que ça se voie (A2, A3)

A1 pose les règles ; **elles ne sont pas encore branchées aux écrans ni à la
base**. Prochaines étapes, dans l'ordre :
- **A2** : les cartes manquantes (boxe, zone) — aujourd'hui `cartePrincipale`
  renvoie `null` pour eux.
- **A3** : le contrat récurrent — chiffrage par palier (boxe) / forfait (zone),
  échéancier mensuel, génération des factures. **C'est là qu'est l'argent non
  facturé.**
- Puis la commande de transition en base (`cmd_transition_affaire`) devra
  consulter le cycle de la nature.

Je suis un lot à la fois, comme le plan le prescrit : A1 est terminé au sens de
la définition (domaine pur, sabotage, vert sur arbre propre, consigné). J'attaque
A2 au prochain tour.
