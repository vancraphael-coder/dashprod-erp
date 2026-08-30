# Remarques de l'atelier — roadmap

**Rang 3.** Établie le 30/08/2026 en relevant les 12 remarques du petit « i »
déposées dans l'organisation **test** « Déménagements Roovers » (`5de63170…`) —
le pilote client démarré la semaine dernière (`55a47219…`) est **exclu**, comme
demandé.

Chaque remarque est reprise telle quelle, classée, et rattachée à un lot. Les
lots sont numérotés **R1 → R9** (R pour « remarque ») pour ne pas entrer en
collision avec les vagues de `70-ROADMAP.md` : ils s'y **insèrent**, ils ne les
remplacent pas. La colonne « rattachement » dit où chaque lot se pose dans les
vagues existantes.

---

## Ce qui est DÉJÀ traité (ne pas refaire)

| Remarque (page) | Traité par |
|---|---|
| « Ajoute un tri par centre (c'est pour la comptabilité) » — *parametres*, 22/08 | **Lot 53** — ventilation par centre en comptabilité |
| « Ajoute un tri par centre » — *parametres*, 22/08 (doublon) | idem |

Ces deux remarques sont **closes**. Elles restent listées pour mémoire, mais
n'engendrent aucun lot.

---

## Ce qui est PARTIELLEMENT traité (à compléter)

| Remarque (page) | Déjà là | Reste à faire |
|---|---|---|
| Création de dossier avec choix de centre — *liste*, 23/08 | Lot 52 rattache à l'espace courant | Le « + » doit **demander explicitement** le centre (maison mère / centre X), afficher le libellé du centre en maison mère, et **reprendre les ressources du bon centre** → lot **R1** |

---

# Les lots issus des remarques

## R1 — Le « + » demande le centre, et hérite de ses ressources

**Remarque** (*liste*, 23/08) :
> S'il y a plusieurs centres, le « + » doit impérativement demander un premier
> tri : maison mère, centre « X ». Le dossier apparaîtra dans la maison mère
> avec un libellé du centre affilié, et être transmis uniquement dans le bon
> centre — pour ne pas perturber le compte rendu et le tri en comptabilité.
> Toutes les ressources de ce nouveau dossier sont reprises du bon centre.

**Ce que ça donne.** Aujourd'hui (lot 52) le dossier se rattache à l'espace
courant, silencieusement. La remarque veut un **choix explicite à la création**
quand plusieurs centres existent, un **libellé de centre** visible en maison
mère, et l'**héritage des ressources** (équipes, véhicules) du centre choisi.

**Rattachement :** complète la vague **Option A** (centres). Mécanique.
**Dépend de :** rien (fondations posées).

---

## R2 — Les ressources sont cloisonnées par centre

**Remarque** (*equipe*, 30/08) :
> Les ressources ne sont pas utilisables d'un centre à l'autre.

**Ce que ça donne.** Une équipe / un véhicule d'un centre ne doit pas pouvoir
être affecté à une mission d'un autre centre. C'est la **barrière** que l'espace
de travail (Option A) implique côté ressources, pas seulement côté dossiers.

**Rattachement :** complète Option A. À faire **avec R1** (même sujet : les
centres comme vrais cloisonnements).
**Dépend de :** R1 (le dossier connaît son centre → on peut filtrer ses
ressources).

---

## R3 — Le matériel : son prix se répercute partout

**Remarque** (*devis*, 19/08) :
> Les prix à facturer dans « matériel » doivent se retranscrire ici dans
> « devis », dans « facture » et dans « calcul définitif ».

**Ce que ça donne.** Le prix client d'un matériel saisi une fois doit **traverser
les quatre écrans** sans ressaisie ni recalcul divergent. C'est un cas typique
de « paramétrage lu partout » — l'invariant n°4 de la carte des circuits.

**Rattachement :** **vague 2** (fournitures / prix client). C'est le même sujet
que le chantier VI (« le prix client des cartons n'est lu par personne »).
**Dépend de :** les fondations TVA des fournitures (vague 2, lot E).

---

## R4 — Chaque véhicule porte son matériel

**Remarque** (*equipe*, 30/08) :
> Chaque véhicule peut avoir du matériel à définir → ajoute un emplacement dans
> la carte véhicule, avec possibilité d'ajout.

**Ce que ça donne.** Une carte véhicule gagne une liste de matériel embarqué
(diable, sangles, couvertures…), avec ajout. Utile au terrain et à la
préparation. Donnée nouvelle, écran nouveau.

**Rattachement :** **délimitation** (vague 6) — c'est du paramétrage d'écran.
Peut se faire plus tôt s'il rend service au terrain. Autonome.
**Dépend de :** rien.

---

## R5 — Coûts internes : indépendants et frais pré-enregistrés

**Remarque** (*cout*, 30/08) :
> Dans Paramètres/Coûts internes/paie : ajouter un onglet pour un ou plusieurs
> indépendants en établissant les frais liés à ce dernier — je veux pouvoir en
> pré-enregistrer.

**Ce que ça donne.** Un onglet « indépendants » distinct des salariés, avec des
**frais pré-enregistrés** réutilisables. Alimente le coût interne réel.

**Rattachement :** **vague 3** (comptabilité / paie), avec le pont paie (lot H).
**Dépend de :** la décision engagement/trésorerie (vague 0.2) pour la partie
comptable ; la partie « saisie » peut précéder.

---

## R6 — Coûts internes : section « mensualités »

**Remarque** (*cout*, 30/08) :
> Dans Paramètres/Coûts internes : ajouter une section « mensualités » → avec
> multi-ajout, d'abord sous forme de check-list, puis à terme liée au
> rapprochement bancaire légal.

**Ce que ça donne.** Une liste des charges mensuelles récurrentes (loyer,
leasing, assurances…), d'abord comme simple check-list, **destinée à terme au
rapprochement bancaire**. Deux temps assumés dans la remarque elle-même.

**Rattachement :** **vague 1 lot C** pour le lien rapprochement (le sujet en
cours !) ; la check-list simple peut venir avant, en **vague 3**.
**Dépend de :** le rapprochement bancaire (lot C) pour le second temps.

---

## R7 — Coûts internes : pont API secrétariat social

**Remarque** (*cout*, 30/08) :
> À terme, les heures et informations de chaque membre salarié devront être
> transmises à Partena ou autre secrétariat social connecté en API ; mon
> catalogue API devra être complet pour ça aussi.

**Ce que ça donne.** Un connecteur sortant vers un secrétariat social (Partena…).
Gros sujet, explicitement « à terme ». Rejoint le catalogue de connecteurs.

**Rattachement :** **vague 7** (après le bridge comptable et le balisage MCP).
Lointain, assumé.
**Dépend de :** le pont paie (lot H) et le catalogue de connecteurs.

---

## R8 — Liste des dossiers : barre/roulette au choix

**Remarque** (*liste*, 19/08) :
> La roulette pourrait remplacer la barre menu — choix dans les apparences :
> barre / roulette.

**Ce que ça donne.** Un réglage d'apparence pour naviguer la liste : la barre
d'onglets classique **ou** une roulette. Confort d'usage.

**Rattachement :** **design** (vague 7). Autonome, esthétique.
**Dépend de :** rien.

---

## R9 — Liste : couleur distincte « Envoyé » vs « Confirmé »

**Remarque** (*liste*, 27/08) :
> « Envoyé » a le même code couleur que « Confirmé » alors que ce sont deux
> états distincts. « Confirmé » devrait avoir une autre couleur, et être en
> transparent tant que la confirmation n'a pas été prononcée par le code du
> client.

**Ce que ça donne.** Deux états qui se ressemblent visuellement alors qu'ils
sont distincts. « Confirmé » prend une couleur propre, **atténuée tant que le
client n'a pas validé** par son code. Lisibilité + vérité de l'état.

**Rattachement :** **délimitation** (vague 6), petite correction d'affichage.
Peut se faire tôt, c'est rapide et à valeur immédiate.
**Dépend de :** rien.

---

## Une remarque de forme, notée à part

**Remarque** (*conversations*, 20/08) :
> Alignement des cartes (décalé sur la droite pour le moment).

Bug d'alignement pur. Pas un lot : à corriger au premier passage sur l'écran
Conversations. **Consigné, non planifié.**

---

# Insertion dans les vagues existantes

| Lot | Sujet | Vague d'accueil | Autonome ? |
|---|---|---|---|
| **R9** | Couleur Envoyé/Confirmé | 6 (mais faisable tôt) | ✅ |
| **R1** | « + » demande le centre + ressources | Option A (complément) | ✅ |
| **R2** | Ressources cloisonnées par centre | Option A (complément) | dépend de R1 |
| **R4** | Matériel par véhicule | 6 (ou plus tôt) | ✅ |
| **R6** | Mensualités (check-list) | 1 lot C / 3 | partie 2 dépend de C |
| **R3** | Prix matériel répercuté | 2 | dépend de E |
| **R5** | Indépendants + frais | 3 | partie compta dépend de 0.2 |
| **R7** | API secrétariat social | 7 | lointain |
| **R8** | Barre/roulette | 7 | ✅ |

**Ordre conseillé, en cohérence avec la vague 1 en cours :**

1. **R9** d'abord — rapide, à valeur immédiate, aucune dépendance.
2. **R1 + R2** ensemble — ils achèvent Option A (le sujet des centres que tu
   viens de poser). R1 avant R2.
3. **R6 (check-list)** — se marie avec le lot C du rapprochement, en cours.
4. Le reste suit ses vagues : R3 en 2, R5 en 3, R4/R8 en 6-7, R7 en 7.

---

# Ce que ces remarques confirment sur la vision

Trois d'entre elles (R5, R6, R7) pointent toutes vers le **même horizon** : les
coûts internes ne sont pas qu'un chiffre de marge, ils doivent à terme se
**rapprocher de la banque** et se **transmettre au secrétariat social**. C'est
cohérent avec la vague 1 (la boucle de l'argent) et la vague 3 (comptabilité) —
la vision tient : *l'argent réel, tracé de bout en bout.*
