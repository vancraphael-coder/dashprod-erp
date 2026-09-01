# Interconnexion des fournitures — Matériel → Facture

**31/08/2026.** **1245 tests verts**, build vert. La donnée saisie une fois
remonte toute seule jusqu'à la facture.

## Le modèle (pensée design)

Une fourniture est un même objet vu sous des lentilles de certitude croissante :

- **Catalogue** → le modèle (coût, prix client, TVA).
- **Matériel** → l'instance : combien CE chantier a consommé.
- **Estimation** → la prévision.
- **Calcul définitif** → la vérité (réel × prix client).
- **Facture** → la vérité en lignes.

Le principe : **tu saisis la consommation une fois, dans Matériel, pendant le
chantier. Elle remonte seule jusqu'à la facture**, valorisée au prix client du
catalogue. Tu confirmes, tu ne ressaisis jamais.

## Ce que ça donne (construit dans ce lot)

- **Sur la Facture**, une section **« Fournitures consommées sur le chantier »** :
  elle liste les fournitures réellement utilisées (reprises de Matériel), au prix
  client, avec leur total. Un bouton **« Ajouter ces fournitures à la facture »**
  les injecte d'un geste — sans les retaper.
- Elles cohabitent proprement avec l'ajout manuel (R12) : deux sources
  distinctes, aucune ne s'écrase.
- **Dans Matériel**, un repère **« ↪ proposées à la facturation »** : on voit le
  chemin vers l'avant.

## Éprouvé par sabotage

| Sabotage | Rouges |
|---|---|
| les fournitures consommées facturées au coût (pas au prix client) | 1 |

## À vérifier à l'œil

1. Sur un dossier avec des fournitures consommées (écran Matériel), ouvre la
   Facture avant émission.
2. La section « Fournitures consommées sur le chantier » liste les articles au
   prix client. Clique « Ajouter » → ils rejoignent les lignes, le total monte.
3. Émets : la facture porte prestation + fournitures, sans ressaisie.

## Les deux marches qui restent (documentées en 90)

La connexion qui rapporte — conso → facture — est posée. Pour boucler la
visibilité de bout en bout :
- **Estimation** : porter la prévision de fournitures (quantité estimée × prix
  client) à côté des heures/volume.
- **Calcul définitif** : afficher le montant fournitures réel dans la vue
  Prévu/Réel/Facturé.

Je te les propose ensuite — ce sont des lentilles de visibilité, la mécanique de
fond (le prix client qui circule) est déjà là.

## Réserve d'honnêteté

La proposition lit `affaire.emballage` (la conso E/U/R) et le catalogue au
chargement de la Facture. Si tu modifies le Matériel puis reviens à la Facture,
rouvre-la pour rafraîchir la proposition. Et l'ajout reste un GESTE volontaire
(pas une injection silencieuse) : c'est un choix de design — tu gardes le
contrôle de ce qui part au client.
