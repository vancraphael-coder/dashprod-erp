# Lot 34 — Compte & Paramètres, cohérence des réglages, fournitures

**23/08/2026.** Tests **1063 verts** (1049 avant), build **vert**.
**Aucune migration** — rien dans ce lot n'en demandait.

---

## Ce qui a changé pour vos clients

Trois choses se voient tout de suite :

1. **Les Paramètres se cherchent** au lieu de se parcourir. Trois lettres
   suffisent à atteindre « TVA » ou « congés » sans savoir dans quelle famille
   ils sont rangés.
2. **Les lignes réagissent au doigt et à la souris.** Elles ne le faisaient pas.
3. **Un réglage qui ne s'applique pas encore le dit.** Six d'entre eux étaient
   dans ce cas, en silence.

---

## 1. Les fournitures ne s'ajoutent ni au devis ni à la facture

C'était demandé deux fois. Vérification faite : `lignesFacturePour`
(`adaptateur.js`) poussait bien `lignesFournitures` dans les lignes de facture.
C'est retiré, l'import mort avec.

**Ce que la vérification a fait remonter, et qui compte davantage.**
`valoriserEmballage` valorise au **coût d'achat** (`cout_centimes` du
catalogue). Les prix client des cartons existent pourtant — écran Barème,
section « Matériel facturé » : `carton_standard`, `carton_penderie`,
`carton_livres`, `papier_bulle`, `ruban`. Vérifié clé par clé : **aucun n'est
lu par qui que ce soit.**

Tant que les fournitures étaient sur la facture, elles partaient donc **à leur
prix d'achat**. Deux vérités pour un même carton, et c'était la mauvaise qui
gagnait.

`lignesFournitures` est **conservée**, pas supprimée : elle porte la
qualification correcte (`vente_biens`) et la dénomination ligne à ligne — c'est
la brique du futur document de vente. Elle porte en tête un avertissement : ne
pas la rebrancher avant d'avoir réglé le prix client.

Un test verrouille le retrait. **Éprouvé** : rebranchement volontaire → rouge ;
retiré → vert. Un test qui ne rougit jamais ne prouve rien.

Le résumé du catalogue disait « facturables au client ». C'était devenu faux :
corrigé.

**À trancher, et je ne le fais pas :** sur quel document sort la vente, sous
quelle séquence légale (C-03 impose une numérotation continue — deux flux dans
une séquence n'est pas un choix de confort), à quel taux, et à quel prix.
→ chantier V de `docs/maitre/25-PARAMETRES-ROADMAP.md`.

---

## 2. Cohérence des réglages — interrogée en base, pas déduite du code

```sql
select count(*) filter (where emise)                           as emises,
       count(*) filter (where emise and echeance is null)      as sans_echeance,
       count(*) filter (where emise and communication is null) as sans_ogm
  from factures;
```

→ **16 / 16 / 16.**

| Réglage | Saisi | Effet réel |
|---|---|---|
| `echeance_jours` | **10** | aucune facture ne porte d'échéance |
| `communication` (OGM) | — | NULL en base sur les 16 |
| `prefixe_numero` | **« GG »** | numérotation `AAAA-NNNNNN`, sans préfixe |
| `mention_legale` | — | jamais imprimé au pied du PDF |
| `communication_structuree` | — | aucun champ de saisie |
| `forfait_base` | — | écrit par le Barème, lu par personne |

**Le cas le plus sérieux est l'OGM.** `FactureDoc.jsx` le **recalcule à
l'affichage** à partir du numéro. Le PDF montre donc une communication
structurée que la base ignore, et le modèle canonique transmet
`communication: null` — **la facture Peppol part sans communication** alors que
le papier en affiche une. Deux vérités sur un document de paiement : le client
vire avec une référence qu'aucune requête ne retrouve.

**Ce qui a été fait ici.** Les champs restent saisissables et portent une
mention « Pas encore appliqué » disant précisément ce qui ne se produit pas.
C'est « signaler, ne pas interdire » : on ne retire pas le champ, on retire
l'illusion. Un champ qui accepte une valeur sans effet est pire qu'un champ
absent — il fait croire que la facture porte une échéance.

**Ces mentions doivent disparaître** à mesure que les chantiers se ferment. Une
mention qui survit à sa cause redevient un mensonge.

**Nouveau document :** `docs/maitre/25-PARAMETRES-ROADMAP.md` — 8 chantiers,
chacun avec ses dépendances **complètes** et **qui décide** (Raphaël /
expert-comptable / conseiller TVA). Requêtes de contrôle rejouables incluses.
Deux tests le gardent.

---

## 3. Rangement — deux erreurs corrigées

**« Ce que ça vous coûte »** mêlait les **coûts internes** (votre métier : taux
horaire, carburant) et **votre abonnement** (ce que vous payez à Dashprod).
Deux sujets sans rapport. Les coûts rejoignent les grilles négociées — c'est là
qu'on calcule une marge ; l'abonnement rejoint « Dashprod », avec l'apparence
et vos droits sur vos données.

**Consulter n'est pas régler.** Comptabilité, Journal, Contrats et Archivage ne
se règlent pas : ils s'ouvrent pour regarder. Mélangés aux réglages, ils
allongeaient la page sans qu'on comprenne pourquoi elle était longue. Une page
de réglages qui contient des rapports, c'est deux pages.

Sept familles : Mon entreprise · Vendre et facturer · Coûts et grilles
négociées · Mes listes · Mon dépôt · Consulter · Dashprod.

**Recherche.** Une page de réglages honnête est longue : on ne peut pas la
raccourcir en retirant des réglages. On peut cesser d'obliger à la parcourir.

**Portes fermées.** Centres logistiques, Comptabilité, Journal et Stockage
s'affichaient à **tout le monde**, y compris en offre Basique où la base refuse
l'accès. La règle était appliquée dans la barre de navigation et dans le
Compte, mais pas ici. Corrigé : `main.jsx` transmet les modules souscrits.

---

## 4. Le rangement a quitté l'écran

Il vit maintenant dans `packages/domaine/src/organisation/reglages.js` —
fonction **pure**.

**Pourquoi.** Trois tests « vérifiaient » le rangement en comptant des motifs
dans le texte de `Parametres.jsx`. Compter des `titre: "` dans un fichier
prouve une mise en page, pas un comportement. Et un écran ne se monte pas hors
navigateur : j'ai essayé, ses effets ne s'exécutent pas.

**Ce que ça a immédiatement rapporté.** Le nouveau test a attrapé un défaut
qu'aucune relecture n'aurait vu : **en offre Basique**, la famille « Consulter »
se réduisait à Archivage seul — un titre de section pour un item unique. On ne
le voit jamais en développant, parce qu'on développe toujours tous modules
ouverts.

Une famille réduite à une entrée se **dissout** désormais, et son entrée
rejoint une famille de repli. **Aucun réglage n'est jamais perdu** : un test
vérifie que les onze réglages du socle survivent à tous les abonnements.

---

## 5. Compte — quatre formes ramenées à une

Le Compte portait **quatre** variantes de « une ligne qui ouvre un écran » : un
bloc cousu, deux cartes copiées caractère pour caractère, une quatrième pour
l'avis. Un commentaire du fichier avertissait déjà qu'« une copie finit
toujours par diverger » — elle avait divergé : bordure et ombre propres d'un
côté, pas de l'autre.

`composants/ListeReglages.jsx` : `Groupe`, `Entree`, `OngletsSegmentes`,
`Bandeau`. Compte et Paramètres consomment, aucun ne redéfinit. Les trois
formes mortes sont supprimées.

---

## 6. CSS — le défaut qui rendait les états invisibles

La règle globale de survol est un **filtre de luminosité**. Sur un fond
**transparent**, un filtre de luminosité n'éclaire rien — et les lignes de
réglage sont transparentes par construction, puisqu'elles vivent dans leur
groupe. **Les deux écrans les plus denses de l'app n'avaient aucun retour au
geste.** On croyait avoir des états ; il n'y en avait pas.

Corrigé par de vraies surfaces (`--dp-survol`, `--dp-enfonce`) qui suivent la
**couleur d'accent réglable** — un survol écrit en dur trahirait le choix dès
qu'il n'est plus bleu. Le chevron avance de 3 px : le mouvement dit « ceci
ouvre un écran » là où la couleur ne dit que « cliquable ». L'enfoncement se
fait en couleur et non en position — déplacer la ligne ferait bâiller le filet
du dessous. Le focus clavier est un anneau **intérieur** : le groupe masque son
débordement, un anneau extérieur y serait rogné.

**Mode nuit.** 64 fonds clairs en dur, puis 122 encres et filets, passés à huit
familles de jetons. **Les valeurs claires sont identiques aux hex précédents :
le mode jour ne bouge pas d'un pixel.**

⚠ **Piège rencontré, à retenir :** corriger les seuls FONDS a été une
régression. Le fond virait au sombre, l'encre restait foncée, le texte devenait
illisible. Un bandeau est un **triplet** (fond, filet, encre) ; en surveiller un
seul terme garantit de casser les autres. Le garde couvre les trois.

Garde durci et **éprouvé par sabotage**. Exception propre pour les feuilles
d'impression : un document imprimé est blanc dans les deux modes.

---

## 7. Le test rouge du dépôt

Le dépôt arrivait avec **1 test rouge** : `EspaceClient.jsx` avait perdu son
`SelecteurRotatif`. Réparé — les deux commandes lisent la même liste d'onglets,
pas deux vérités de navigation.

---

## Ce qui n'a PAS été fait

- **Rien branché** parmi les six réglages inertes. Ils sont signalés et
  documentés ; les brancher engage des décisions qui ne m'appartiennent pas
  (rétroactivité, séquence légale, taux).
- **Aucune migration.** L'échéance et l'OGM demandent de modifier
  `cmd_emettre_facture` — donc de trancher d'abord la rétroactivité.
- **Le module boutique** reste différé (P2). Le chantier V le rejoint.
- **La section morte du Barème** (prix client des cartons) est laissée en place
  et documentée. La supprimer avant d'avoir décidé où vit le prix client
  effacerait une saisie sans remplacement.

## À vérifier à l'œil après déploiement

1. **Paramètres en offre Basique** — le cas le plus intéressant : « Mon dépôt »
   doit avoir disparu, « Consulter » aussi, et **Archivage** doit apparaître
   dans « Mon entreprise ».
2. **Mode nuit sur un écran chargé** (Dossier, Journal) — les bandeaux d'alerte
   doivent être sombres et **leur texte lisible**.
3. **Survol d'une ligne de réglage** — surface teintée + chevron qui avance.
4. **Identité → Facturation** — trois mentions « Pas encore appliqué ».
5. **Une facture** — plus aucune ligne de fourniture.

---

## Décisions attendues

1. Les **16 factures déjà émises** reçoivent-elles échéance et OGM
   **rétroactivement** ? *Avis : non — c'est écrire dans une pièce close.
   Appliquer aux suivantes, et prévenir le comptable.*
2. Le **prix client des fournitures** vit-il dans le barème ou dans le
   catalogue ? *Avis : le catalogue, à côté du coût — la marge se lit alors
   d'un coup d'œil, et le barème garde les prestations.*
3. Sur quel **document** sort la vente de fournitures, sous quelle séquence ?
   → **expert-comptable** (séquence) + **conseiller TVA** (taux). Ce sont eux
   le chemin critique : les solliciter maintenant.
