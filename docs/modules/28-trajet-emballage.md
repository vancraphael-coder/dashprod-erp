# Module 28 — Coût de trajet & horaire d'emballage (P1)

Alignement page 02 §3 (trajet) et §4 (emballage). Deux petits manques du
dossier, fermés ensemble.

## Coût de trajet

- **SQL** (`0025`) : `trajet_km`, `trajet_duree` (texte, « 45 min » lu dans
  Maps), `trajet_prix_km`. C'est le versant COÛT réel — distinct du km FACTURÉ
  au barème (1 €/km/camion, ADR-008). Il nourrit la marge réelle sans toucher
  au prix client.
- **Dossier** : sous le bouton itinéraire (contexte naturel — on ouvre Maps, on
  lit distance et durée, on reporte), trois champs Km / Durée / Prix-km + calcul
  live « Coût trajet (X km × Y €) = Z € ». Les péages restent au Devis.

## Horaire d'emballage

- Les colonnes `date_emballage`/`heure_emballage` existaient déjà (0021, où
  elles déclenchent la 2e mission à la confirmation). 0025 les sécurise
  (IF NOT EXISTS). Il ne manquait que la SAISIE.
- **Dossier** : bloc « Emballage (jour séparé, optionnel) » sous la date
  souhaitée. Renseigné, il génère automatiquement la mission d'emballage à la
  confirmation — la boucle avec le trigger 0021 est bouclée.

## Tests

Pas de logique de domaine nouvelle. 169/169, build vert.
