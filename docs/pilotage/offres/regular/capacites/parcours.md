<!-- FICHIER GÉNÉRÉ — ne pas éditer à la main.
     Régénéré par : node outils/pilotage.mjs
     Source de vérité : packages/domaine/src/commercial/parcours-offres.js
     Toute correction se fait dans la source, jamais ici. -->

# Regular — le parcours réel

État : généré
Dernière revue : 2026-09-17

> Le circuit complet, du premier appel jusqu'à l'argent encaissé.

## Les étapes, dans l'ordre

1. **Tout ce que fait Basique** — Le carnet, le relevé, le devis, la signature, le planning, la facture. Rien ne disparaît en montant.
   · Écran : Le socle · Module : crm
2. **Vous facturez des entreprises** — La facture part au format structuré vers le service comptable du client, sans PDF perdu dans une boîte mail.
   · Écran : Facture Peppol · Module : peppol
3. **Votre comptable ne ressaisit plus** — Les pièces sortent dans son format. Fini l'enveloppe de tickets à la fin du trimestre.
   · Écran : Comptabilité · Module : comptabilite
4. **Les heures se comptent toutes seules** — L'équipe pointe sur le chantier. Les heures nourrissent la paie sans passer par un tableur.
   · Écran : Heures et Paie · Module : paie
5. **Chaque chantier laisse une preuve** — Photos avant/après, réserves, signature du client sur place. Le litige se règle avec un document, pas avec une discussion.
   · Écran : Rapport de chantier · Module : rapport_chantier
6. **Vous retrouvez qui a fait quoi** — Chaque action est tracée et consultable. Utile en cas de contrôle, utile en cas de doute.
   · Écran : Journal · Module : journal

## Ce que cette offre ne fait PAS

- Plusieurs centres logistiques, chacun son gestionnaire — c'est Pro.
- Le plan 3D des boxes de stockage — c'est Pro.
