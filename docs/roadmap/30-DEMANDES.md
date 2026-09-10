# 30 — DEMANDES (boîte d'entrée)

Toute directive arrive ici **telle qu'elle a été dite**, datée, avant d'être
classée. Une demande sort par une seule porte : elle devient une ligne de
`20-LOTS.md`, ou elle est écartée avec son motif écrit.

Pourquoi la reprise littérale : une directive reformulée à chaud devient la
compréhension qu'en a eue celui qui l'a notée. Trois semaines plus tard,
personne ne peut plus vérifier ce qui avait été demandé — et c'est là que le
produit se met à dériver de son propriétaire.

**Format d'une entrée :** date, la demande, puis son classement.

---

## 10/09/2026

### D-01 — Trouver chaque écran manquant, par offre et par niveau

> « Trouve chaque écran manquant de chaque offre et pour chaque niveau
> différent dans une entreprise et chez le client. »

**Classé :** `10-AUDIT-ECRANS.md`, sections 1 à 4. Sept postures dégagées des
15 rôles en base, plus l'indépendant. Côté client traité en section 3.
**Fait.**

### D-02 — Les écrans existants ne sont pas au point

> « Tous les écrans actuels ne sont pas encore au point, surtout la partie
> terrain, clients et les pdf qui ne collent pas encore avec la réalité, comme
> ce qu'attend un vrai utilisateur qui arrive sur Dashprod et pas comme un dev
> qui veut forcément la perfection de son point de vue. »

**Classé :** devient la règle de conception de `00-SYSTEME.md` (« on conçoit
depuis ce qu'un utilisateur voit en arrivant ») avec ses quatre corollaires.
Terrain → lot 7. Client → lot 8. PDF → lot 6.

### D-03 — Certains écrans existent pour ne pas perdre l'idée

> « Certains écrans ont été créés pour ne pas oublier l'idée mais tout n'est
> pas encore bien pensé. »

**Classé :** devient l'état **esquisse** dans le vocabulaire du système, et
un champ du registre au lot 1. C'est l'état le plus dangereux des trois : il
donne l'illusion que le sujet est traité.

### D-04 — Les paramètres doivent être un point de vérité

> « Il faut surtout que le 3ème angle de la pyramide soit un point de vérité
> (les paramètres) → s'il y a un manque ici c'est toute la cohérence qui
> s'effondre. »

**Classé :** règle de cohérence de `00-SYSTEME.md`, dix manques recensés en
`10-AUDIT-ECRANS.md` §5, et **lot 2 placé avant tout écran**. L'invariant
devient exécutable au lot 1 : un écran qui consomme une configuration
inexistante casse l'arbre.

C'est la demande qui a le plus changé l'ordre des lots. Sans elle, on
construisait « Ma disponibilité » avant son réglage, donc deux fois.

### D-05 — Priorité : l'indépendant et sa relation avec Pro

> « Toujours avec ma priorité de tester l'indépendant et la relation entre
> cette offre et celle de pro. »

**Classé :** lots 3, 4, 5. La relation a fait apparaître un manque qu'aucun
audit côté indépendant n'aurait montré : **les cinq écrans du miroir côté
Pro n'existent pas**. Une offre gratuite pour l'indépendant sans donneur
d'ordre en face ne vaut rien.

Point dur identifié : deux organisations distinctes, un cloisonnement RLS fait
pour les séparer, et une mission qui doit traverser. Trois voies, à instruire
au lot 3 — en commençant par vérifier `demandes_reseau` / `visible_reseau`, qui
existent déjà.

### D-06 — Un système de documentation et un dossier d'outils

> « Si c'est plus simple pour toi, crée un nouveau système dans doc. → crée
> aussi dans la doc un dossier outils pour toi format prompt ou autre, que tu
> utiliseras pour lancer tes propres sous-agents internes. »

**Classé :** ce dossier `docs/roadmap/` (quatre fichiers) et `docs/outils/`.
**Fait.**

### D-07 — Coûts réductibles dès maintenant

> « Contenu texte sur la gestion des coûts que l'on peut réduire dès
> maintenant, comme la résolution d'image et les méta-données. »

**Classé :** `docs/maitre/17-COUTS-STOCKAGE.md`. Le levier résolution +
métadonnées est **fait** (seuil de 4 Mo → 400 Ko, 2000 → 1600 px, EXIF
supprimé au ré-encodage). Les vignettes deviennent le lot 9.

### D-08 — Ne pas supprimer l'organisation pro

> « Ne supprime pas le "pro", je le garde pour les différents tests futurs. »

**Classé :** aucune action. `cmd_supprimer_organisation` reste disponible et
refuse de toute façon cette organisation tant qu'elle porte le drapeau
éditeur. Le drapeau reste où il est.

### D-09 — L'offre indépendant n'ouvre pas au public

> « Tant que maintenant je suis sur les écrans de "Indépendant manutention"
> c'est ok et n'ouvre pas encore au grand public, laisse pour bientôt. »

**Classé :** `statut = bientot`, `souscriptible = false`. Tenu par la
contrainte `offres_souscriptible_si_disponible` en base. Ne passera
`disponible` qu'à la fin du lot 5.

---

## Écartées

*(vide)*
