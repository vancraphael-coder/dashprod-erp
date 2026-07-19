# Analyse des circuits — audit complet et finition

Audit de la version en production : tous les accords entre pages, dans les deux
sens, du premier contact client jusqu'à la clôture du dossier. Chaque circuit a
été vérifié **dans la base réelle**, pas seulement lu dans le code.

---

## 1. Le constat principal

Le produit avait une **colonne vertébrale interrompue en trois endroits**. Un
dossier pouvait être créé, chiffré, signé, planifié et exécuté — mais il ne
pouvait ni être facturé, ni être abandonné, ni aller jusqu'à sa clôture.

| Maillon | État avant | Cause |
|---|---|---|
| Chantier → « effectué » | ❌ rompu | bouton « Terminer » absent du dépôt (livré, jamais poussé) |
| Effectué → facturé | ❌ rompu | 4 bugs cumulés (voir §4) — **0 facture en base depuis l'origine** |
| Désistement client | ❌ inexistant | commandes SQL présentes, aucun bouton |
| Report → reprise | ❌ rompu | missions annulées, jamais réactivées |
| Payé → clos | ❌ inexistant | aucun bouton de clôture |

Le reste des circuits (signature, planning, chrono, archivage) fonctionnait.

---

## 2. Circuits vérifiés — sens aller ET retour

### 2.1 Dossier ↔ Planning — ✅ complet
- **Dossier → Planning** : modifier l'équipe ou les camions met à jour les
  missions ouvertes.
- **Planning → Dossier** : affecter/retirer au planning se reflète dans le
  dossier (mission de déménagement uniquement — l'emballage ne redéfinit pas
  l'équipe du dossier).
- **Dossier → Planning (dates)** : changer la date/heure déplace la mission ;
  la date d'emballage pilote la mission d'emballage séparément.
- Garde anti-boucle : `pg_trigger_depth`.

### 2.2 Dossier ↔ Terrain — ✅ complet (maillon rétabli)
- **Dossier → Terrain** : adresses, inventaire, relevé, équipe visibles au
  chantier.
- **Terrain → Dossier** : premier « Démarrer » → dossier « en cours » ;
  « Terminer le chantier » → dossier « effectué ».

### 2.3 Devis → Offre → Mail → Signature → Planning — ✅ complet
Chaîne : chiffrage → offre gelée → email → signature → confirmation →
planification automatique (si date + équipe + camion).

### 2.4 Effectué → Facturé → Payé → Clos — ✅ **reconstruit** (§4)

### 2.5 Désistement — ✅ **construit** (§3)

### 2.6 Archivage ↔ Restauration — ✅ complet
Dossiers, camions, membres : archivage réversible, restauration depuis
Compte → Archivage.

### 2.7 Compte → réglages — ✅ complet
Barème (prix client), Coûts (prix internes), Archivage, **Textes** (nouveau).

---

## 3. Désistement client — circuit construit

Deux issues distinctes, volontairement séparées :

**Reporter** — le chantier se fera plus tard.
- *Avec une nouvelle date* → replanifié immédiatement, même équipe, mêmes camions.
- *Sans date* → le dossier passe « reporté », le planning se libère. Dès qu'une
  date est saisie dans le dossier, **il repart tout seul** en « planifié ».

**Annuler** — le chantier ne se fera pas. Définitif, avec motif tracé dans
l'historique. Le dossier reste consultable et archivable : rien n'est supprimé.

Dans les deux cas, les missions ouvertes sont annulées côté serveur et les
chronos restés ouverts sont fermés : **équipe et camions se libèrent au planning
sans intervention manuelle**.

Les boutons n'apparaissent que si l'état l'autorise : on ne peut pas annuler un
dossier déjà effectué ou facturé.

---

## 4. Facturation — quatre bugs, un circuit mort

L'audit a révélé que **le circuit n'avait jamais fonctionné** : aucune facture
n'existait en base.

1. **`numero` NOT NULL sans défaut** — le processus légal exige un brouillon
   sans numéro, puis l'attribution d'un numéro de séquence à l'émission.
   L'insertion du brouillon échouait donc toujours.
   *Correction* : colonne rendue nullable, invariant préservé par contrainte
   (« une facture émise a forcément un numéro »).
2. **`annee` NOT NULL sans défaut** — même blocage.
3. **L'émission n'avançait pas le dossier** — il restait « effectué », donc ne
   pouvait jamais devenir « payé ».
4. **Les totaux de l'en-tête n'étaient jamais calculés** — le front n'insère que
   les lignes. Conséquences : facture à 0 €, et surtout le déclencheur de
   paiement comparait `0 >= 0` → le dossier passait « payé » **au premier acompte
   venu**. *Correction* : les totaux sont désormais **dérivés des lignes** par
   la base ; ils ne peuvent plus diverger.

Circuit final, testé : brouillon → lignes → totaux dérivés → émission (numéro
légal + dossier « facturé ») → acompte (reste « facturé ») → solde (« payé ») →
clôture (« clos »).

---

## 5. Textes de l'offre — nouvelle page Compte

L'email d'offre était **entièrement figé dans le code**, y compris le nom du
signataire. Nouvelle page **Compte → Textes** : objet, salutation, introduction,
mention kilométrage, durée de validité, formule de politesse, signataire, pied
de page.

- Un champ laissé vide **garde le texte par défaut** : un réglage partiel est valide.
- **Aperçu en direct** calculé par la même fonction que l'envoi réel : ce qui est
  affiché est exactement ce que le client recevra.
- Variables : `{famille}` `{client}` `{organisation}` `{validite}`.

---

## 6. Pièces jointes — offre + conditions C.B.D.

**Le PDF de l'offre** est généré depuis la même source que l'offre à l'écran et
que l'instance gelée : un seul chiffrage, trois rendus. En-tête entreprise,
client, prestation, montants, mention des conditions C.B.D.

**Les conditions C.B.D.** se déposent une fois depuis Compte → Textes et sont
jointes à toutes les offres.

> **Limite assumée** : le lien « ouvrir dans Mail » utilise le protocole
> `mailto:`, qui **ne peut pas transporter de pièce jointe** — c'est une limite
> du standard, pas un raccourci d'implémentation. Le flux est donc : télécharger
> les deux pièces (un tap chacune), ouvrir le mail, les joindre. L'envoi serveur
> avec pièces jointes automatiques est la prochaine étape (voir §8).

---

## 7. Autres corrections d'audit

- **Filtres de la liste** : le cycle entier est filtrable (facturé, payé, clos,
  reporté, annulé étaient invisibles).
- **Bouton « Terminer le chantier »** rétabli au terrain.

---

## 8. Ce qui reste ouvert (non fait, assumé)

1. **Envoi serveur avec pièces jointes** — nécessite le déploiement de la
   fonction `inviter-membre` et une clé Resend, puis une fonction `envoyer-offre`.
   Aujourd'hui le flux manuel fonctionne de bout en bout.
2. **Nouvelle version d'offre** — renvoyer une offre corrigée non signée n'a pas
   de circuit dédié (l'instance est gelée à l'envoi).
3. **Note de crédit / avoir** — une facture émise est immuable, la correction
   passe par un avoir : la table le prévoit, l'écran non.
4. **`cmd_transition_affaire` ne vérifie aucune capacité** — contrairement aux
   commandes de désistement. À durcir.

---

## 9. Vérifications

- **10/10** tests de cycle en base (transaction annulée) : report avec/sans date,
  reprise, synchronisation des dates, chantier terminé, facture émise, acompte,
  solde, clôture.
- **181** tests du domaine.
- Build, détecteur de hooks conditionnels, audit des imports : verts.
