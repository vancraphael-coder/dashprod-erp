# Roadmap — ordonnée, justifiée, par vagues

**Rang 3.** Établie le 29/08/2026, à partir du recensement `60-CIRCUITS-QUATRE-
COUCHES.md`. Chaque vague dit **pourquoi maintenant**, **ce qu'elle débloque**,
et **ce qui la bloquerait**.

---

## Les trois principes qui ordonnent tout

1. **L'argent réel d'abord.** Roovers facture *déjà*. Tout ce qui empêche
   d'encaisser ou de suivre un encaissement passe avant tout le reste.
2. **Un tier qui marche vaut mieux que trois bancals.** Une vague se termine
   avant la suivante. Pas de front ouvert en parallèle, sauf le juridique (qui
   n'est pas du code).
3. **Mécanique → délimitation → design.** Inchangé. Le design ne commence pas
   avant que 1 et 2 soient stables.

---

# VAGUE 0 — À lancer aujourd'hui, hors code

## 0.1 — RGPD : contrat de sous-traitance *(non négociable, non codable)*

**Pourquoi maintenant.** Roovers saisit des données réelles, dont potentiellement
de la paie. L'exploitant est **déjà** sous-traitant au sens de l'article 28. Les
obligations sont nées ; le calendrier ne les attend pas.

**Livrables attendus d'un professionnel :** contrat de sous-traitance avec chaque
société cliente, registre des traitements, bases légales, durées de conservation,
procédure de notification de violation.

**Qui.** Avocat ou DPO. → *Raphaël*

**Coût du report.** Une responsabilité personnelle, pas un bug.

## 0.2 — Deux questions à poser au comptable *(une heure, débloque la vague 3)*

- **Engagement ou trésorerie ?** Commande la date d'écriture et toute
  l'architecture comptable.
- **La vente de fournitures consomme-t-elle la même séquence légale** que les
  déménagements ?

Ces deux réponses conditionnent les vagues 2 et 3. Les poser tôt coûte une heure ;
les découvrir tard coûte une refonte.

---

# VAGUE 1 — Fermer la boucle de l'argent ⭐ *la plus rentable*

**Le constat qui la déclenche.** 16 factures émises : **16 sans échéance, 16 sans
communication en base**. 23 paiements enregistrés qu'on ne peut rapprocher de
rien. Trois réglages saisis par Roovers n'agissent pas.

**Ce que ça débloque.** Le suivi des retards, les relances, le rapprochement
bancaire, et la conformité Peppol de la communication.

### Lot A — L'échéance de paiement *(mécanique, aucune décision)*

- `cmd_emettre_facture` pose `echeance = date_emission + echeance_jours` lu sur
  `parametres_facturation`.
- L'échéance **se fige à l'émission**, comme le numéro. Vérifier que les triggers
  d'immuabilité la couvrent ; sinon les étendre.
- Le PDF l'affiche.
- Ne pas inventer une seconde convention : `factures_fournisseur.echeance` existe.
- Réutiliser `commun/echeances.js` (`qualifierEcheance`, `echeanceARegler`) pour
  l'affichage « en retard ».

**Point à trancher, un seul :** les 16 factures déjà émises sans échéance —
**ne rien réécrire** (l'immuabilité prime), appliquer aux suivantes. *Mon avis, à
confirmer d'un mot.*

### Lot B — La communication structurée en base *(le mensonge à corriger)*

**Le défaut exact.** `genererOGM` est appelé **dans `FactureDoc.jsx`**, à
l'affichage. Le client reçoit un PDF portant une communication ; la base n'en
garde aucune trace. Rapprochement impossible par construction.

- Poser `factures.communication` **à l'émission**, figée avec le numéro.
- Le PDF **lit** la valeur stockée au lieu de la recalculer.
- Brancher le réglage `communication_structuree` (aujourd'hui à `false` chez
  Roovers, sans effet) — et lui donner son champ (chantier VIII, même lot).
- Vérifier la cohérence avec l'UBL/Peppol (`PaymentID`).

### Lot C — Le rapprochement des paiements

23 paiements existent. Une fois A et B posés : rapprocher paiement ↔ facture par
communication, et afficher l'état réel (`facturation/facture.js:etatPaiement`
sait déjà le calculer).

### Lot D — Relances et mention légale *(chantiers III et IV)*

- Mention légale imprimée sur le document (vide chez Roovers → à saisir, mais le
  canal doit exister) : sans elle, pas de recouvrement des intérêts de retard.
- Préfixe de numérotation (`GG` saisi, sans effet) : le brancher **sans toucher
  aux numéros déjà émis**.
- Relance : une liste « en retard » à partir de l'échéance, pas un automatisme.
  *On signale, on n'interdit pas — et on n'envoie rien tout seul.*

---

# VAGUE 2 — Encaisser les fournitures

**Pourquoi ensuite.** Tables vides aujourd'hui (`stock_articles` 0,
`stock_mouvements` 0) : reporter ne détruit rien. Mais chaque carton livré non
facturé est une perte sèche, et le circuit est court.

### Lot E — Les fondations manquantes du modèle

- **TVA sur `stock_articles`** : un prix sans taux ne peut pas être facturé
  (le moteur refuse, à raison).
- **`stock_mouvements.mission_id` nullable** : une vente au comptoir n'a pas de
  chantier.

### Lot F — Le document de vente

- Vente de fournitures → une pièce. **Même séquence légale que les déménagements
  ou non** → réponse du comptable (vague 0.2).
- Prix client des cartons enfin lu (chantier VI, dépend de E).

---

# VAGUE 3 — La comptabilité complète

**Bloquée par la vague 0.2** (engagement vs trésorerie). Ne pas commencer avant.

### Lot G — Plan comptable paramétrable

`COMPTES_DEFAUT` et `COMPTES_ACHAT_DEFAUT` sont **en dur**. Chaque cabinet a ses
comptes. Les rendre paramétrables par société, avec les valeurs actuelles comme
défaut.

### Lot H — Le pont paie → comptabilité

`donnees_paie` et `paie_periodes` existent ; **rien ne descend au journal**.
Salaires et charges sont absents des exports — une comptabilité incomplète.

### Lot I — Le premier connecteur du bridge comptable

**Mon avis, à confirmer :** un **export propre pour un comptable humain** avant
toute API. Un fichier qu'un cabinet accepte vaut mieux qu'une intégration que
personne ne relit. L'écran de transparence existe déjà ; il suffit de le finir.

---

# VAGUE 4 — Le garde-meubles comme vrai métier

**Débloquée.** Les fondations que `26-GARDE-MEUBLES-ROADMAP.md` attendait sont
posées : création de centre ✅, rattachement membre↔centre ✅, permissions ✅,
rôle maison mère ✅.

### Lot J — boxe-1 *(reliquat, à vérifier avant de faire)*

- Retirer « Enlèvement » du plan d'adresses `boxe`.
- Statut « boxe libre » exposé là où le boxe se règle et se vend.
- Boxes libres visibles depuis **tout** centre (lecture seule cross-centre).

### Lot K — boxe-2 *(le vrai sujet : la facturation récurrente)*

- Établissement du contrat **réservé au bon centre ou à la maison mère** — enfin
  une vraie barrière, plus un garde-fou d'affichage.
- « Entrée en boxe » réservable, distincte du contrat, archivée au planning.
- **La facturation périodique** : `stock_echeances` existe, aucune facture n'en
  sort. C'est le trou du circuit 6 — un garde-meubles qui ne facture pas ses mois
  n'est pas un garde-meubles.

### Lot L — La zone (logistique) au même niveau

Même modèle récurrent que le boxe. À faire juste après, en réutilisant K.

---

# VAGUE 5 — Le modèle d'affaires de l'éditeur

### Lot M — Trancher la grille non monotone

30 personnes en Basique = **544 €** contre **720 €** en Pro. Trois issues :
**assumer** (les offres se vendent sur les modules — ma recommandation, un seul
axe de différenciation, durable), **plafonner** (`membres_limite` non nul, déjà
possible), ou **proposer la bascule** au franchissement d'un seuil.

Maintenant que les prix sont connus (180/360/720), la question est enfin
tranchable. → *Raphaël*

### Lot N — L'ordonnanceur des relevés d'abonnement

Aujourd'hui à la demande, volontairement. Le jour où l'on vend à plus d'un
client, il faut un cycle. Pas avant.

### Lot O — Fermer les modules sans garde

`peppol`, `international`, `gestionnaire_depot` : le mécanisme de garde existe,
ils n'y sont pas branchés. À quel tier appartiennent-ils vraiment ? → *Raphaël*

---

# VAGUE 6 — Phase 2 « Délimitation » (le cadrage initial)

Ne commence qu'une fois les vagues 1 à 4 stables.

- Cartes visibles par abonnement (le verrou RLS existe ; l'affichage doit suivre).
- **Paramétrage complet et cohérent de chaque page** — c'est là que se règlent
  les derniers « saisi mais non lu ».
- **PDF alimentés** : tous les documents reprennent réellement les textes et
  réglages saisis.
- Rangement des fonctionnalités secondaires dans des volets légers.
- **Balisage des zones exploitables par un connecteur MCP** (le connecteur
  lui-même vient après — vague 7).

---

# VAGUE 7 — Phase 3 « Design », puis le reste

- Design figé et réglementé en interne (le système d'apparence existe déjà :
  sombre/clair, accents, matière, moteur 3D des cartes).
- Connecteur MCP de pilotage.
- PWA et distribution multi-store — **plan détaillé ci-dessous.**

---

# DÉPLOIEMENT PWA — le plan (à exécuter APRÈS les travaux prévus)

**Pourquoi après, pas avant.** Une PWA met en cache la « coquille » de l'app.
Mettre en cache une coquille dont la forme change encore (délimitation, design)
= des maux de tête d'invalidation permanents. Donc la PWA vient **une fois l'app
stable** : après la délimitation (vague 6), avec ou juste après le design.

**Ce qui est déjà là** (vérifié le 01/09) : HTTPS (Vercel), interface mobile
responsive, `theme-color` et `viewport-fit=cover`, `apple-touch-icon`. **Ce qui
manque pour être installable** : un manifest, des icônes multi-tailles, un
service worker.

## Étape P1 — La PWA installable (1 lot)

- **Manifest** (`manifest.webmanifest`) : name, short_name « Dashprod »,
  `display: standalone`, start_url, theme_color, background_color, orientation,
  et surtout des **icônes** 192, 512 + une **maskable** (générées depuis le logo).
- **Service worker** via **vite-plugin-pwa (Workbox)** — cohérent avec le build
  Vite actuel, et compatible avec le dépôt drag-drop → Vercel (assets hachés +
  mise à jour du SW gérées par le plugin).
- **Stratégie de cache, prudente et NON négociable :**
  - Précache de la coquille (JS/CSS/polices).
  - **Réseau d'abord, jamais de cache, pour Supabase** (`/rest`, `/auth`) : les
    données doivent être fraîches ET l'isolation par organisation ne doit JAMAIS
    servir la donnée d'un autre via un cache. C'est un point de sécurité.
- **Installation** : écouter `beforeinstallprompt`, offrir un bouton « Installer
  Dashprod » (utile surtout pour le terrain).
- **Mise à jour** : quand un nouveau SW est prêt, proposer « Nouvelle version —
  recharger ».

## Étape P2 — Le hors-ligne, par degrés (1 à 2 lots)

Le terrain travaille en cave, en ascenseur, sans signal. Mais le hors-ligne total
est un gros chantier — on y va par degrés, sans surpromettre :

- **Lecture hors ligne d'abord** : mettre en cache les derniers dossiers/planning
  consultés, pour qu'ils restent lisibles sans réseau. Bandeau « hors ligne »
  clair.
- **Écriture différée, ciblée** : une file locale (« outbox ») pour les gestes
  terrain critiques — **pointage, constats, photos** — rejouée au retour du
  réseau. Pas plus, au début.
- **Interdit hors ligne** : l'**émission de facture** reste en ligne (elle a
  besoin de la séquence légale du serveur — l'immuabilité et la numérotation
  continue ne se bricolent pas côté client). Le SW ne doit jamais laisser croire
  qu'une facture est émise hors ligne.

## Étape P3 — La distribution multi-store (décision + 1 lot)

Trois voies, à choisir selon l'ambition (→ *Raphaël*) :

- **A — PWA web seule** : « ajouter à l'écran d'accueil ». Zéro friction store,
  mises à jour instantanées. **Recommandé pour commencer.**
- **B — Google Play via TWA** (Trusted Web Activity / Bubblewrap) : envelopper la
  PWA dans une coquille Android, publier sur le Play Store. Effort modéré,
  présence en boutique.
- **C — App Store iOS** : Apple n'autorise pas les TWA. La PWA marche sur iOS via
  Safari (« ajouter à l'écran »), avec des limites (notifications push seulement
  iOS 16.4+, quotas de stockage). Une vraie présence App Store demanderait un
  emballage natif (Capacitor) — le plus lourd.

**Ma recommandation :** A d'abord (la PWA installable couvre déjà iOS et Android
correctement), puis B (Play via TWA) si une présence en boutique est voulue. C
(App Store natif) seulement si un vrai besoin business apparaît — le « ajouter à
l'écran » iOS suffit largement au départ.

## Risques à garder en tête

- **Cache et isolation des organisations** : ne jamais mettre en cache une
  réponse Supabase authentifiée. Réseau d'abord sur l'API, point.
- **Invalidation** : versionner le SW ; le plugin Vite gère le hachage des
  assets, mais tester la bascule de version après un dépôt.
- **Rien de légal hors ligne** : émission de facture, numérotation, avoirs
  restent serveur.

## Ordre d'exécution

P1 (installable) → P2 (hors-ligne par degrés) → P3 (stores, si voulu). P1 seule
apporte déjà l'essentiel : l'app s'installe, s'ouvre en plein écran, se lance
vite. Le reste est du confort terrain et de la présence commerciale.
- Paiement en ligne depuis l'espace client.

---

# Questions ouvertes qui traversent les vagues

| Question | Vague | Qui décide | Mon avis |
|---|---|---|---|
| Engagement ou trésorerie ? | 0.2 → 3 | comptable + Raphaël | — |
| Le devis accepté est-il un fait économique ? | 3 | Raphaël | **Non** : engagement commercial sans conséquence comptable tant qu'il n'y a ni prestation ni facture |
| Le stock est-il valorisé ? | 2 | Raphaël | Pas au départ. Valoriser un stock de cartons coûte plus qu'il ne rapporte |
| Rattraper les 16 factures sans échéance ? | 1 | Raphaël | **Non** — l'immuabilité prime, appliquer aux suivantes |
| Premier connecteur comptable ? | 3 | Raphaël | **Export humain** avant API |
| Grille non monotone | 5 | Raphaël | **Assumer** : vendre sur les modules, un seul axe |
| CMR : générer ou attacher ? | 6 | Raphaël | Attacher d'abord (moins de responsabilité), générer plus tard |
| Mode prix exact boxes/lifts | 4 | Raphaël | Ajouter un mode, ne pas remplacer |
| `comptabilite` reste en Regular ? | 3 | Raphaël | Oui, si le pont paie reste en Pro |

---

# Ce qu'il ne faut PAS faire

- **Ne pas commencer la vague 3** avant la réponse engagement/trésorerie : on
  refondrait tout.
- **Ne pas réécrire les 16 factures émises.** L'immuabilité est un acquis légal,
  pas une contrainte technique.
- **Ne pas automatiser les relances.** On signale, on n'interdit pas — et on
  n'envoie rien au client sans décision humaine.
- **Ne pas construire boxe-2 avant J** : la barrière d'établissement doit être
  réelle, pas un affichage contournable.
- **Ne pas ouvrir le design** avant que le paramétrage soit lu partout. Un écran
  beau mais faux ne passe pas.

---

# Lots issus des remarques de l'atelier (le petit « i »)

Douze remarques déposées dans l'organisation test ont été relevées et classées
dans `80-REMARQUES-ATELIER.md`. Elles produisent neuf lots **R1 → R9** qui
s'insèrent dans les vagues ci-dessus (ils ne les remplacent pas) :

| Lot | Sujet | S'insère en |
|---|---|---|
| R1 | Le « + » demande le centre + hérite des ressources | Option A (complément) |
| R2 | Ressources cloisonnées par centre | Option A (complément) |
| R3 | Prix matériel répercuté en devis/facture/définitif | Vague 2 |
| R4 | Matériel embarqué par véhicule | Vague 6 (ou plus tôt) |
| R5 | Coûts internes : indépendants + frais pré-enregistrés | Vague 3 |
| R6 | Coûts internes : mensualités (check-list → rapprochement) | Vague 1 lot C / 3 |
| R7 | Pont API secrétariat social (Partena…) | Vague 7 |
| R8 | Liste : barre / roulette au choix | Vague 7 |
| R9 | Liste : couleur distincte Envoyé / Confirmé | Vague 6 (faisable tôt) |

| R10 | Cycle de vie facture + confirmation d'émission | Vague 1 (complément) |
| R11 | Estimation en temps par adresse (fini les km) | Vague 6 (ou dédié) |
| R12 | Facture matériel jointe ou séparée | Vague 2 |
| R13 | Onglets de la liste des dossiers | Vague 6 |
| R14 | Audit de la boucle brouillon→clos | Vague 6 (avec R13) |
| R15 | Centres dans l'équipe + déplacer un membre | Option A (complément) |
| R16 | Bulles conversation mode sombre (correctif) | correctif, tôt |

Deux relevés des remarques d'atelier (30/08 et 31/08) sont classés dans
`80-REMARQUES-ATELIER.md`. Deux remarques « tri par centre en comptabilité » étaient **déjà traitées** par
le lot 53. Ordre conseillé : R9 (rapide), puis R1+R2 (achèvent Option A), puis
R6 avec le lot C en cours.

# L'ordre, en une ligne

**0 (juridique, aujourd'hui) → 1 (l'argent) → 2 (les cartons) → 3 (les comptes)
→ 4 (le garde-meubles) → 5 (l'offre) → 6 (délimitation) → 7 (design).**

La vague 1 est celle qui rapporte le plus vite : elle transforme 16 factures
muettes en 16 créances suivies.
