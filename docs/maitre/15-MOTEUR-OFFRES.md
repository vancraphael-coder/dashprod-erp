---
statut: EN TRAVAUX — doctrine arrêtée, mécanique à construire
---

# Le moteur d'offres — l'écosystème Dashprod

**Rang 1.** Établi le 01/09/2026. Le moteur d'offres n'est pas un tarif : c'est
**la base de la rétention** et la colonne vertébrale de l'écosystème.

---

## 1. Le changement d'optique

Jusqu'ici : trois paliers d'un **même métier** (déménageur belge) — Basique,
Regular, Pro. La différence se joue sur les modules.

Désormais : des offres qui visent **d'autres métiers**, reliés au même réseau.
Dashprod cesse d'être un logiciel de déménagement à trois tailles pour devenir
**la place où un donneur d'ordre et un exécutant se trouvent, se planifient et se
tracent.**

### La thèse, en une phrase

> Un géant de la cuisine ou du mobilier doit pouvoir envoyer une mission à une
> flotte de lifts ou à une équipe de manutention **en quelques secondes**, avec
> une traçabilité qui tient devant un litige — et l'exécutant doit la recevoir
> dans un planning qu'il n'a pas à retaper.

C'est le **pipeline** : il conduit tout type de transport et de service. Les
offres sont les **portes d'entrée** de ce pipeline, chacune taillée pour un
acteur.

### Pourquoi c'est un moteur de rétention

Un logiciel seul se remplace. **Un réseau où vos donneurs d'ordre vous
atteignent, non.** Chaque acteur qui rejoint le pipeline augmente la valeur pour
tous les autres — et rend le départ coûteux. C'est la différence entre vendre un
outil et tenir une position.

---

## 2. Règle absolue — la promesse de la landing EST le produit

> *« Si l'expérience Dashprod n'est pas celle vendue par ma landing, ma
> crédibilité baisse. »*

**Cette phrase devient une règle d'ingénierie, pas un souhait :**

1. **Aucune offre n'est publiée (`souscriptible = true`) tant que son parcours
   n'existe pas de bout en bout dans le produit.** Une offre annoncée et vide
   coûte plus cher qu'une offre absente.
2. **Chaque produit annoncé sur la landing doit correspondre à un écran réel.**
   « Demi-journée », « taux horaire », « intervention ponctuelle » ne sont pas des
   arguments de vente : ce sont des objets à créer, chiffrer et facturer.
3. **Une offre en préparation se montre comme telle** — « bientôt », liste
   d'attente — jamais comme disponible.
4. Un test devra vérifier que toute offre `souscriptible` a ses modules réellement
   servis par l'application.

---

## 3. Les trois offres décidées

### 3.1 — Indépendant manutention + services · **60 €/mois HTVA**

*(−5 % en annuel, comme toutes les offres)*

**La cible.** L'homme seul ou le tout petit acteur qui vend ses bras et son
savoir-faire. C'est l'offre d'entrée de l'écosystème : **elle peuple le réseau
côté exécutants.**

**L'accroche retenue :** *« Des bras professionnels, quand vous en avez besoin. »*

**Les produits à construire** (chacun est un objet du produit, pas un argument) :

| Produit | Ce que ça implique dans Dashprod |
|---|---|
| 1 manutentionnaire | l'unité vendable minimale : un homme, une durée |
| Équipe joignable | un statut de disponibilité, visible du donneur d'ordre |
| Demi-journée | un forfait de durée (bornes à paramétrer) |
| Journée | idem, seuil supérieur |
| Taux horaire | facturation au temps réel pointé — **le pointage existe déjà** |
| Intervention ponctuelle | une mission sans dossier au long cours |

**Contrôle BCE rapide.** À l'inscription, vérification du numéro d'entreprise
belge : l'acteur est-il réel, actif, et son activité correspond-elle ? C'est le
**filtre de qualité du réseau** — un donneur d'ordre ne confiera pas une mission
à un inconnu non vérifié. *Voir §6 pour la réserve.*

**Pourquoi c'est juste :** très simple à vendre, prix d'entrée faible, et chaque
indépendant inscrit **augmente la valeur du réseau pour les donneurs d'ordre.**

### 3.2 — Groupe liftier · **600 €/mois HTVA** — pack 20 personnes

*(−5 % en annuel. Chaque homme au-delà de 20 se facture au même barème
progressif. **Jamais de membres illimités** — décision ferme.)*

**La cible.** L'entreprise qui exploite une flotte de monte-meubles et vend du
levage à d'autres professionnels.

**Ce que ça change dans le produit :** le lift n'est plus une prestation
annexe du déménageur, c'est **le métier principal** — planning de flotte,
couronnes tarifaires par centre (le chiffrage existe déjà), réception de
missions depuis le réseau.

**Le plafond de membres est un invariant :** il protège la valeur (pas de
société de 200 personnes sur un pack 20) et rend le revenu prévisible.

### 3.3 — Groupe logistique mobilier à débit industriel

*(Prix à arrêter — voir §6.)*

**La cible.** Le grand acteur du mobilier ou de la cuisine, en flux tendu.

**Le périmètre annoncé :** arrivage, zone de stockage, zones de chargement,
**plusieurs quais sur un même dépôt**, livraison du mobilier.

**Ce que ça exige, et qui n'existe pas encore :**
- **Les quais** — objet neuf : un dépôt a N quais, chacun avec un créneau
  d'occupation. Rien n'existe aujourd'hui.
- **L'arrivage** — la réception de marchandise attendue, distincte d'un chantier.
- **Les zones de chargement** — le cycle CONTRAT « zone » (A1) en est le socle.
- **Le débit** — la capacité pensée en flux (rotations/jour), pas en dossiers.

C'est la plus lourde des trois : elle mérite son propre chantier, après les
deux autres.

---

## 4. Les offres à haut potentiel que je propose

Toutes doivent tenir la même règle : **cohérentes avec ce que Dashprod sait déjà
faire**, sinon elles abîment la promesse.

### 4.1 — Donneur d'ordre (le côté qui manque) ⭐ *ma priorité*

**Le constat :** les trois offres décidées équipent des **exécutants**. Personne
n'équipe le **donneur d'ordre** — or c'est lui qui apporte le volume, et sans lui
le réseau tourne à vide.

**L'offre :** le géant de la cuisine/du mobilier accède au pipeline pour
**envoyer** des missions, suivre leur exécution et récupérer une preuve. Pas de
planning à tenir, pas de camions : juste **envoyer, suivre, prouver**.

**Modèle économique — le point qui change tout :** un abonnement modeste, ou
même **gratuit**, et la valeur se prend sur le **volume de missions** qui
transite. Le donneur d'ordre ne paie pas un logiciel, il paie un flux. C'est ce
qui fait décoller un réseau : on subventionne le côté qui apporte la demande.

*Cette offre est la clé de voûte : sans elle, les trois autres se vendent à des
exécutants qui n'ont rien à recevoir.*

### 4.2 — Garde-meubles / self-storage

**Cohérence :** le cycle CONTRAT est posé (A1), les tables existent, A3 apportera
la facturation récurrente. **Une fois A3 fait, cette offre est presque gratuite à
produire** — c'est le meilleur rapport valeur/effort du catalogue.

**Cible :** l'exploitant de boxes qui veut contrats, attribution d'unités,
facturation mensuelle, portail client. Revenu récurrent chez le client → il
comprend la valeur d'un abonnement.

### 4.3 — Multi-dépôts / réseau (l'offre de tête)

**Cohérence :** les centres comme espaces de travail sont **déjà construits**
(Option A complète). Pour une enseigne à plusieurs implantations : cloisonnement,
maison mère consolidée, comptabilité ventilée. Il ne manque presque rien.

### 4.4 — Sous-traitance entre déménageurs

**Cohérence :** c'est le manque que tu as identifié. Confier ou recevoir un
déménagement entre confrères, avec reprise du volume et du dossier. **Le réseau
sert d'abord ceux qui sont déjà là** — les déménageurs Dashprod se sous-traitent
entre eux.

**Modèle :** une commission sur les dossiers échangés plutôt qu'un abonnement.

---

## 5. Ce que le moteur d'offres doit gagner

L'existant est bon : offres versionnées, modules, membres/centres inclus +
suppléments, remise annuelle. Ce qui manque pour ces nouvelles offres :

1. **Le paramétrage des écrans PAR SECTEUR.** *(le lot qui démarre)* Aujourd'hui
   les modules ouvrent/ferment des pages, mais chaque page reste conçue pour le
   déménageur. Un liftier ne doit pas voir un écran de relevé volumétrique. **Les
   frontières d'écran doivent devenir un paramètre du secteur, pas une constante.**
2. **Le pack progressif** (Groupe liftier) : 20 inclus, palier au-delà, plafond
   dur. Le modèle `membres_limite` existe — il n'a jamais été utilisé.
3. **Le réseau lui-même** : envoyer/recevoir une mission entre organisations.
   Aucune brique n'existe. C'est le vrai chantier de l'écosystème.
4. **Le contrôle BCE** à l'inscription.
5. **La facturation à l'usage** (commission, volume) : le moteur ne sait
   facturer que des abonnements.

---

## 6. Ce qui doit être décidé ou vérifié

| # | Point | Qui |
|---|---|---|
| O1 | Prix du Groupe logistique mobilier | Raphaël |
| O2 | Le palier progressif du Groupe liftier : quel prix par homme au-delà de 20 ? | Raphaël |
| O3 | Donneur d'ordre : gratuit + commission, ou abonnement ? | Raphaël (mon avis : **gratuit ou quasi**, la valeur est le flux) |
| O4 | **Contrôle BCE** : quelle source, quelles conditions d'usage, quelles données conservées ? La consultation d'un registre d'entreprises et la conservation de ces données ont un cadre. | à vérifier — **juridique** |
| O5 | Mise en relation entre acteurs : Dashprod est-il intermédiaire, et avec quelles obligations (responsabilité, litiges, assurance) ? | **juridique, avant d'ouvrir le réseau** |
| O6 | Commission sur missions : régime TVA de l'intermédiation | **comptable** |

**O5 est le plus sérieux.** Mettre en relation deux professionnels, c'est
endosser un rôle d'intermédiaire — avec des questions de responsabilité en cas de
dommage, de litige ou de défaillance. **À traiter avant d'ouvrir le réseau, pas
après.** Le repérage est ici, l'avis doit venir d'un conseil.

---

## 7. L'ordre que je recommande

**Ce lot ne se construit pas avant la phase A** (les métiers doivent d'abord
fonctionner : on ne vend pas un liftier tant que le lift est bloqué en brouillon).

1. **Frontières d'écran par secteur** *(démarré, en travaux)* — le socle : sans
   lui, chaque nouvelle offre livre l'écran d'un déménageur.
2. **Garde-meubles** — presque gratuit après A3, valide le moteur sur un
   deuxième métier.
3. **Indépendant manutention** — simple à vendre, peuple le réseau.
4. **Donneur d'ordre** — la clé de voûte, mais elle exige O5 (juridique).
5. **Groupe liftier** — après que le lift soit un métier de plein exercice.
6. **Groupe logistique mobilier** — le plus lourd (quais, arrivages, débit).

---

## 8. La règle qui protège la crédibilité

**Rien ne se vend avant d'exister.** Une offre reste `souscriptible = false`
jusqu'à ce que son parcours soit démontrable de bout en bout. La landing peut
annoncer « bientôt » ; elle ne peut pas annoncer « disponible ».

C'est la seule façon de tenir la promesse : *l'expérience Dashprod doit être
exactement celle que vend la landing.*
