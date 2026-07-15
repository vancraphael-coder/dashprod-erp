# Page 02 — Dossier · section Contact

Référence modèle : `contactSec()` (l. ~511-630).
Écran Dashprod actuel : `Dossier.jsx` (hub + contact inline).

## Élément par élément

### 1. Identité client
- **Design** : champs Nom, Téléphone (icône, mono), Email (icône, mono),
  **N° TVA** (mono), **Société**, **Adresse de facturation**.
- **Logique** : TVA + société + adresse fact alimentent la FACTURE (page 08)
  et l'offre. Séparées de l'adresse de chargement (un client peut être facturé
  à son siège et déménagé ailleurs).
- **Pourquoi** : dès qu'un client est une société, ces trois champs deviennent
  obligatoires pour une facture conforme.
- **Dashprod** : 🟡 nom/tel/email à la création. TVA (❌), société (❌),
  adresse de facturation (❌) → colonnes sur `clients` + champs dans le
  Dossier. **P1** (P0 dès qu'un client pro se présente).

### 2. Adresses multiples chargement / déchargement
- **Design** : deux blocs séparés, compteur d'adresses, chaque adresse =
  champ libre + Type (maison/appart/bureau/garde-meuble) + Étage (« RDC/2e »)
  + interrupteurs Ascenseur et Monte-meubles + bouton retirer. « Ajouter un
  chargement/déchargement ».
- **Logique** : ordre conservé (1, 2, 3…) — il devient l'ordre des arrêts de
  l'itinéraire et la numérotation sur l'offre.
- **Pourquoi** : les déménagements réels ont souvent 2 chargements (maison +
  garde-meuble). L'étage/ascenseur/monte-meubles pilotent le prix et l'équipe.
- **Dashprod** : ✅ complet depuis Module 17 (table `affaire_adresses` du
  Module 3). RAS.

### 3. Trajet + itinéraire Google Maps
- **Design** : gros bouton dégradé bleu « Ouvrir l'itinéraire (Google Maps) »,
  puis 3 champs : Km, Durée (texte libre « 45 min »), Prix/km (€). Encadré
  « Coût trajet (X km × Y €) = Z € ». Note : « Maps s'ouvre pour lire distance
  et durée — reporte-les ici. Les péages se saisissent dans le Devis. »
- **Logique** : URL Maps multi-arrêts :
  `https://www.google.com/maps/dir/?api=1&origin=…&destination=…&waypoints=a|b&travelmode=driving`
  avec origin = 1er chargement, destination = dernier déchargement, waypoints =
  tout le reste dans l'ordre. Le coût km×prix/km entre dans les COÛTS réels du
  devis (pas dans le prix client, qui a son propre poste km au barème).
- **Pourquoi** : zéro API payante, zéro backend — le chauffeur/bureau lit la
  distance dans Maps et la reporte. Le coût trajet nourrit la marge réelle.
- **Dashprod** : ❌ tout le bloc. Le barème côté PRIX a déjà km (1 €/km/camion,
  ADR-008) ; ce qui manque est le versant COÛT (km, durée, prix/km) + le
  bouton Maps. → champs `km`, `duree_trajet`, `prix_km` (jsonb couts ou
  colonnes) + bouton URL. **P1** (le bouton Maps seul est un quick win P1 haut).

### 4. Planning du dossier (dates + équipe prévue + camions)
- **Design** : Date déménagement + Heure d'arrivée ; **Date emballage + Heure
  départ emballage** ; sélecteur « Déménageurs prévus » (2-6) ; **chips
  Camions** issus de la flotte (un camion à l'état mécanique « urgent »
  s'affiche bordure rouge + ⚠, sélectionnable quand même) ; ChronoMini.
- **Logique** : `nbDem` prévu sert de référence au badge « X/Y affectés » ;
  la sélection de camions alimente la jauge de capacité du Relevé, le brief
  équipe, et l'agenda. Le chrono vit sur le dossier (voir page 11).
- **Pourquoi** : l'emballage est souvent une JOURNÉE SÉPARÉE facturée — sans
  sa date, le planning ment. Les camions se réservent comme les hommes.
- **Dashprod** : 🟡 date+heure souhaitées ✅ (0019). Manquent : date/heure
  **emballage** (❌, colonnes à ajouter — et à terme une 2e mission de type
  `emballage`, le type existe déjà dans `missions`). **P1**. `nb_demenageurs`
  prévu sur l'affaire (❌ — aujourd'hui seulement dans les faits du devis ;
  le remonter). **P1**. **Camions** (❌ écran, table `vehicules` ✅ en base +
  `mission_vehicules` ✅) → dépend de la page 10. **P0/P1** (voir synthèse).
  ChronoMini : page 11.

### 5. Équipe affectée depuis le dossier
- **Design** : chips des membres actifs ; sélectionné = bleu plein ; en congé
  ce jour-là ou déjà pris sur un autre dossier = fond rouge + petit label
  « congé »/« pris » (sélectionnable quand même) ; badge « X/Y » vert si
  complet, ambre sinon ; alertes : « Renseigne la date pour détecter les
  indispos », « Il manque N personne(s) », « Un membre affecté est en congé ».
- **Logique** : congé = date ∈ [from,to] d'un congé du membre ; conflit =
  existe un AUTRE dossier non archivé même date où le membre est affecté. Le
  système SIGNALE, l'humain décide (jamais de blocage).
- **Pourquoi** : c'est ici, en créant le dossier, qu'on compose l'équipe — pas
  dans un écran séparé après coup.
- **Dashprod** : 🟡 l'affectation existe mais au PLANNING via les missions
  (architecture différente et plus juste : la mission porte l'exécution).
  Décision d'alignement : **exposer l'affectation aussi depuis le Dossier**
  (même mécanique `basculerAffectation`, la mission étant créée à la
  confirmation — page 09). Congés dans le conflit : domaine prêt
  (`conflitsAffectation` accepte `conges`), données RH manquantes (page 10).
  **P1** (après P0 de la page 09).

### 6. Remarques
- **Dashprod** : ✅ (notes_commerciales).

## Récap priorités page 02
| Élément | Priorité |
|---|---|
| Bouton itinéraire Google Maps multi-arrêts | **P1 (quick win)** |
| TVA / société / adresse de facturation client | P1 |
| Km / durée / prix-km (coût trajet) | P1 |
| Date + heure emballage | P1 |
| nb déménageurs prévu sur le dossier | P1 |
| Sélection camions sur le dossier | P0/P1 (dépend page 10) |
| Affectation équipe depuis le dossier + congés | P1 (après page 09) |
| ChronoMini sur le dossier | P1 (page 11) |
