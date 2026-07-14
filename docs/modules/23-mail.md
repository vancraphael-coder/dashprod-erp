# Module 23 — Mail (envoi de l'offre) — P1

Alignement page 07. Dix mails par semaine, identiques à 90 % : le template
supprime l'oubli (validité, dates, acompte) et uniformise le ton.

## Architecture

- **Domaine** (`communication/brief.js`, étendu) : `emailOffre(params)` —
  salutation par NOM DE FAMILLE (dernier mot du nom, comme le modèle), segment
  « revêtue de votre bon pour accord signé » conditionnel, adresses jointes
  par « | », montant horaire (« pour 6 h avec 3 déménageurs ») ou forfaitaire,
  kilométrage offert + validité 10 jours, date longue + arrivée, emballage,
  remarques, signature depuis les PARAMÈTRES ORGANISATION (jamais en dur).
  `urlMailto` (destinataire/objet/corps encodés). Testés (3 cas).
- **Écran** (`Mail.jsx`) : carte pièce jointe avec état (Signée / Non signée /
  Pas encore émise) et lien vers l'offre pour l'imprimer en PDF ; en-tête
  À/Objet (alerte rouge si le client n'a pas d'email) ; corps scrollable ;
  Copier (presse-papier + repli prompt) et Ouvrir dans Mail (mailto:).
- **Parcours** : chip « ✉️ Mail » sur le Dossier, active dès que l'affaire est
  chiffrée. Retour → Dossier.

## Flux v1 assumé

Générer le PDF de l'offre (impression) → « Ouvrir dans Mail » → joindre le
PDF → envoyer. L'attachement automatique (SMTP serveur) viendra comme
adaptateur au bord (D-1), sans changer le template.

## Tests

3 cas ajoutés à `brief.test.js` (salutation famille, horaire/validité/date,
segment signé conditionnel + forfait, encodage mailto). Total **164/164**.
