# Module 22 — Brief équipe & itinéraire (P1 quick wins)

Ouvre la vague P1 par les deux gestes quotidiens à plus forte valeur
(alignement 09 §3 et 02 §3).

## Brief équipe (WhatsApp / copier)

- **Domaine** (`communication/brief.js`) : `briefMission(params)` — le format
  EXACT validé sur le terrain : en-tête, date longue + heure, camions, équipe
  (premier nom = chef), chargements/déchargements (numérotés si multiples,
  précisions étage/ascenseur/monte-meubles), meubles (6 max + « +N autres »,
  mention « (démontage) »), remarques, IBAN, merci + signature. Les blocs
  absents ne laissent AUCUNE ligne vide (testé). `urlWhatsApp(texte)`.
- **Adaptateur** : `composerBrief(affaireId, {date, heure, equipeNoms})` —
  rassemble contact, relevé, camions, organisation, délègue le formatage au
  domaine : UNE implémentation du format, testée, trois usages à terme
  (planning, dossier, terrain).
- **Planning** : chaque mission porte « 📋 Copier le brief » (presse-papier,
  avec repli `prompt` si l'API est refusée) et « 💬 WhatsApp » (wa.me).
  L'équipe du brief = les affectés de la mission, premier = chef.

## Itinéraire Google Maps multi-arrêts

- **Domaine** : `urlItineraire(charges, decharges)` — origin = 1er chargement,
  destination = dernier déchargement, waypoints = le reste DANS L'ORDRE,
  `null` sous deux adresses. Zéro API payante : Maps s'ouvre, on lit distance
  et durée.
- **Dossier** : bouton dégradé bleu « Ouvrir l'itinéraire » sous les adresses,
  visible dès que deux adresses existent.

## Tests

`brief.test.js` — 6 cas : format complet, adresses numérotées + troncature à
6 articles, absence de lignes vides, ordre des arrêts de l'URL, null sous deux
adresses, encodage WhatsApp. Total **161/161**.
