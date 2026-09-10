# 10 — AUDIT DES ÉCRANS

Établi le 10/09/2026 sur l'arbre réel : 57 écrans dans
`apps/web/src/ecrans/`, 15 rôles et 16 capacités en base, 8 offres publiées.

Les états suivent le vocabulaire de `00-SYSTEME.md` : **livré**, **esquisse**,
**manquant**.

---

## 1. Les niveaux réels dans une entreprise

Les 15 rôles en base se ramènent à sept **postures** — c'est la posture qui
détermine l'écran d'arrivée, pas l'intitulé du contrat.

| posture | rôles en base | ce qu'elle veut voir en ouvrant l'app |
|---|---|---|
| **Direction** | `fondateur`, `direction`, `gerant` | l'argent : ce qui rentre, ce qui sort, ce qui bloque |
| **Coordination** | `coordination`, `secretaire` | la semaine : ce qui n'est pas couvert, ce qui n'est pas facturé |
| **Commerce** | `commercial` | mes affaires en attente de réponse |
| **Dépôt** | `responsable_depot` | mon centre aujourd'hui : équipes, camions, stock |
| **Chef d'équipe** | `chef_equipe` | ma journée, mon équipe, mon pointage |
| **Exécution** | `demenageur`, `chauffeur`, `livreur`, `monteur`, `liftier`, `interimaire` | où je vais, avec qui, à quelle heure |
| **Accès ponctuel** | `visite_terrain` | le seul relevé pour lequel on m'a ouvert la porte |

Plus une huitième, hors salariat, qui est la priorité :

| **Indépendant** | offre `independant_manutention` | suis-je booké, ai-je pointé, ai-je été payé |

**Le constat qui structure tout l'audit.** Dashprod a un écran d'arrivée
unique. Les sept postures atterrissent au même endroit et doivent naviguer
pour trouver ce qui les concerne. Pour la direction et la coordination, ça
passe. Pour l'exécution — celui qui ouvre l'app dans un camion, à 6 h, avec
des gants — c'est disqualifiant. Un déménageur ne « navigue » pas.

---

## 2. État par posture

### Direction — **esquisse**
Existants : `Cout`, `Comptabilite`, `Depenses`, `RapportCentres`, `Journal`,
`Abonnement`.
Manquant : **aucun écran d'arrivée**. La direction ouvre sur la liste des
affaires, comme tout le monde. Il n'existe nulle part la seule vue qu'elle
demande : ce qui a été facturé ce mois, ce qui reste dû, ce qui n'est pas
encore facturé alors que le chantier est clos.

### Coordination — **livré, mal ordonné**
Existants : `ListeAffaires`, `Planning`, `Carnet`, `Conversations`, `Mail`.
Manquant : **la vue des trous**. Le planning montre ce qui est prévu ; il ne
montre pas ce qui n'est pas couvert. C'est pourtant l'unique question du
lundi matin.

### Commerce — **livré**
`Carnet`, `Releve`, `Devis`, `Offre`, `SignatureOffre`, `CertificatSignature`.
Le parcours tient. Manquant : rien de bloquant.

### Dépôt — **esquisse**
`Centres`, `RapportCentres`, `Stockage`, `Materiel`, `Ressources`.
Manquant : l'écran du responsable de dépôt **le matin** — ses équipes du jour,
ses véhicules disponibles, ce qui sort et ce qui rentre. Les données existent,
la vue n'existe pas.

### Chef d'équipe — **esquisse**
`Terrain`, `RapportChantier`, `Heures`, `PlanningJour`.
Manquants : la **composition d'équipe du jour** vue depuis le chef (elle se
règle depuis le planning, par la coordination), et le **signalement de
matériel** — la capacité `signaler_materiel` existe en base et n'a aucun
écran dédié.

### Exécution — **manquant, et c'est le trou le plus large**
`Terrain` et `TerrainProfil` existent, mais s'atteignent par la navigation
générale.
Manquants :
- **Ma journée** — l'écran d'arrivée d'un exécutant : mon chantier, l'adresse,
  l'accès, l'heure, avec qui, le matériel prévu. Sans passer par une liste.
- **Pointage hors chantier** — trajet, dépôt, attente. Les heures existent,
  les heures qui ne sont pas sur un chantier n'ont pas d'entrée.
- **Signaler un problème** en un geste, avec photo, depuis le terrain.

### Accès ponctuel — **manquant**
Le rôle `visite_terrain` existe en base. Aucun parcours ne lui correspond :
pas d'écran restreint au seul relevé, pas d'échéance d'accès visible.

### Indépendant — **manquant** (priorité 1)
Voir section 4.

---

## 3. Côté client

Existants : `PorteClient` (accès sans compte), `EspaceClient` (8 onglets :
dossier, inventaire, caisses, offres, factures, messages, réseau, profil),
`SignatureOffre`, `theme-client`.

**État : livré sur la structure, esquisse sur le contenu.** Huit onglets, c'est
la vue d'un développeur qui range ses données. Un client qui déménage dans
douze jours a **trois** questions, dans cet ordre :

1. C'est confirmé pour quand, et qui vient ?
2. Qu'est-ce que je dois faire d'ici là ?
3. Combien, et quand est-ce que je paie ?

Manquants :
- **Le compte à rebours** — « votre déménagement dans 12 jours », avec ce qui
  est fait et ce qui reste. Aujourd'hui l'information est répartie sur trois
  onglets.
- **Ma liste à faire** — ce que le client doit préparer, daté. C'est
  l'information qui évite le plus d'appels, et elle n'existe nulle part.
- **L'état de paiement** en clair : payé, reste dû, échéance.

Manquant structurel : rien ne dit, dans les paramètres, **ce que le client a
le droit de voir**. Les huit onglets s'affichent ou non selon le code, pas
selon un réglage. Voir section 5.

---

## 4. L'indépendant, et sa relation avec Pro — PRIORITÉ 1

L'offre porte désormais ses modules (`crm`, `planning`, `terrain`,
`facturation`, `signature_client`, `rapport_chantier`, publication 0180) et
reste `bientot`. Quatre des six écrans de son parcours réutilisent des modules
livrés. Deux manquent — et surtout, **le côté Pro de la relation n'existe pas
du tout.**

### Côté indépendant

| écran | état | ce qu'il fait |
|---|---|---|
| Ma disponibilité | **manquant** | poser ses créneaux et ses tarifs, une fois |
| Mes missions | **manquant** | recevoir, accepter, refuser — en un geste |
| Terrain | livré | pointer ; c'est ce compteur qui se facture |
| Rapport d'intervention | livré | photos, réserves, signature sur place |
| Ma facturation | livré | les heures validées deviennent la facture |
| Mes encours | **esquisse** | qui doit encore, depuis quand |

### Côté Pro — le miroir, entièrement manquant

C'est le vrai sujet, et il était invisible parce qu'on regardait l'offre depuis
l'indépendant seulement.

| écran | état | ce qu'il fait |
|---|---|---|
| Mes prestataires | **manquant** | le carnet des indépendants, avec leur BCE vérifié |
| Confier une mission | **manquant** | envoyer un chantier à un externe, avec son périmètre |
| Suivi des missions confiées | **manquant** | qui a accepté, qui est arrivé, où ça en est |
| Réception de la preuve | **manquant** | la signature et les photos de l'externe entrent dans MON dossier |
| Facture entrante | **manquant** | la facture de l'indépendant arrive rattachée à la mission |

**Le point dur, à trancher avant de coder.** Un indépendant et un Pro sont
**deux organisations distinctes**. Le cloisonnement RLS interdit — et doit
interdire — qu'une organisation lise les données d'une autre. Une mission
confiée traverse donc une frontière que toute l'architecture est faite pour
fermer.

Trois voies, à instruire dans le lot 3 :

1. **Objet-frontière** — une table de missions inter-organisations, avec sa
   propre RLS : lisible par le donneur d'ordre ET par le prestataire, et par
   personne d'autre. Le reste du dossier reste cloisonné.
2. **Invitation d'un externe dans l'organisation du donneur d'ordre** — simple,
   mais faux : l'indépendant travaille pour plusieurs donneurs d'ordre et ne
   peut pas être membre de chacun.
3. **Réseau** — les tables `demandes_reseau` / `visible_reseau` existent déjà.
   À vérifier AVANT de construire : trois fois sur trois, l'infrastructure
   était déjà là.

La voie 3 se vérifie en une heure et rend peut-être les deux autres inutiles.
C'est par là qu'on commence.

---

## 5. LE TROISIÈME ANGLE — les manques dans les paramètres

Taxonomie actuelle (`packages/domaine/src/organisation/reglages.js`) : six
familles — Mon entreprise, Vendre et facturer, Coûts et grilles négociées,
Mes listes, Mon dépôt, Consulter, plus Dashprod. Dix-neuf entrées.

**Ce qui manque, et ce que chaque manque fait s'effondrer.**

| manque | ce qui en dépend et qui n'a donc pas de source de vérité |
|---|---|
| **Rôles et capacités** | La pyramide dit `RÔLES → MODULES → LIMITES`. `Equipe.jsx` gère les rôles mais vit dans `Ressources`, pas dans les paramètres. Qui peut quoi n'est pas un réglage d'équipe : c'est la définition de l'entreprise. **Manque le plus structurant du lot.** |
| **Séquences de numérotation** | Contrainte légale : numérotation continue et immuable. La table `sequences` existe, aucun écran ne la montre. Une entreprise ne peut pas voir sa propre numérotation. |
| **Peppol / point d'accès** | Le module existe, la table `transmissions` existe. Rien ne permet de déclarer par quel point d'accès on émet, ni de voir son identifiant Peppol — que le moteur d'identité sait pourtant calculer. |
| **Espace client** | Huit onglets s'affichent au client sans qu'aucun réglage ne dise ce qui est partagé. Une entreprise ne choisit pas ce que ses clients voient. |
| **Mail sortant et notifications** | Qui reçoit quoi, depuis quelle adresse, avec quelle signature. Rien. |
| **Identité vérifiée** | `identite` existe, mais ne porte ni le statut de vérification BCE, ni la date, ni la source. Le moteur (`bce.js`) produit un `statutConfiance` que rien n'affiche. |
| **Assurance et couverture** | Un déménageur vend une responsabilité. Aucun réglage. Apparaît pourtant dans les conditions imprimées. |
| **Conservation et purge** | `confidentialite` existe. Les durées légales de conservation ne s'y règlent pas. Bloquant pour P6. |
| **Prestataires externes** | Voir section 4 : commissions, périmètre confié, tarifs négociés. Aucun réglage. |
| **Disponibilités et tarifs** (indépendant) | Le premier écran de son parcours est un réglage. Il n'a pas d'entrée. |

**Conséquence, dite franchement :** construire « Ma disponibilité » ou « Mes
prestataires » avant que ces entrées existent, c'est se garantir de refaire les
écrans. L'ordre des lots en découle.

---

## 6. Les PDF

Existants : `ReleveDoc`, `FactureDoc`, `Contrat` (offre signée),
`CertificatSignature`, `FacturePeppol`.

**État : esquisse.** Ils sont écrits depuis la donnée disponible, pas depuis le
lecteur. Or un PDF est lu par quelqu'un qui n'a pas Dashprod : un client, un
comptable, un contrôleur, un assureur.

Manques constatés :

- **Les mentions obligatoires ne viennent pas d'un réglage.** Elles sont
  réparties entre le code et les textes de dossier. C'est le même mécanisme
  que le prix « 360 € » codé en dur dans l'écran d'inscription.
- **Rapport de chantier** — pas de PDF. C'est pourtant la pièce qui règle un
  litige, et celle que le client réclame.
- **Relevé d'heures** — pas de PDF. Nécessaire à l'indépendant pour justifier
  sa facture, et au chef d'équipe pour la paie.
- **Attestation de fin de chantier** — n'existe pas. Réclamée par les
  syndics et les régies.
- **Facture d'indépendant** — le gabarit actuel présume une société avec TVA
  et compte bancaire d'entreprise ; à éprouver sur une personne physique
  assujettie.

---

## 7. Le tableau de synthèse

| domaine | livré | esquisse | manquant |
|---|---|---|---|
| Direction | 6 écrans | vue d'arrivée | — |
| Coordination | 5 écrans | ordre des priorités | vue des trous |
| Commerce | 6 écrans | — | — |
| Dépôt | 5 écrans | vue du matin | — |
| Chef d'équipe | 4 écrans | composition d'équipe | signalement matériel |
| Exécution | 2 écrans | — | ma journée, pointage hors chantier, signaler |
| Accès ponctuel | — | — | tout |
| Client | 4 écrans | contenu des 8 onglets | compte à rebours, liste à faire, état de paiement |
| Indépendant | 4 modules réutilisés | mes encours | disponibilité, missions |
| Pro ↔ indépendant | — | — | les 5 écrans du miroir |
| Paramètres | 19 entrées | — | 10 entrées |
| PDF | 5 documents | les 5 | 4 documents |

Un seul écran est réellement orphelin dans le dépôt : `Societes.jsx`, importé
nulle part. Tous les autres sont atteignables.
