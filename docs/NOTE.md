# Lot 27 — comptabilité assumée, et réversibilité tenue

`npm test` : **996/996 ✓** — build `apps/web` ✓ — 7 fichiers.
**Migration `0139` appliquée ET éprouvée** (voir plus bas).

## D'abord, la dette du lot 26 est réglée

Supabase étant revenu, j'ai appliqué `0139` et l'ai exercée en rollback comme
l'exige la règle du projet. Les quatre garde-fous sont **prouvés** :
comptabiliser sans approbation → refusé ; approuver sans décideur nommé →
refusé ; le chemin nominal `A_VERIFIER → APPROUVE → COMPTABILISE` passe ; le
doublon est rejeté.

## « Une retranscription claire et assumée »

L'écran Comptabilité s'ouvre désormais sur ce que Dashprod fait — **et sur ce
qu'il ne fait pas**. En tête, pas en petits caractères : un utilisateur qui
croit que Dashprod « tient sa comptabilité » découvrirait le malentendu au pire
moment, devant son contrôle.

- **Il prépare** — factures, encaissements, achats approuvés, tiers, transformés
  en écritures équilibrées au plan comptable belge.
- **Il vous rend vos données** — tout, à tout moment, dans des formats que le
  comptable importe dans *son* logiciel.
- **Il ne tient pas votre comptabilité** — pas de logiciel agréé, pas de bilan,
  pas de déclaration. Le comptable tient les livres, contrôle et dépose.
- **Il ne décide pas à votre place** — un taux qu'il ne sait pas qualifier est
  refusé plutôt que deviné, et signalé pour que vous en parliez.

## « Exporter toutes leurs ressources »

Trois exports manquaient pour que « toutes » soit vrai. Ajoutés :

- **Journal des achats** — débit achats et TVA déductible, crédit fournisseurs.
  Il n'inclut **que les documents approuvés** : la règle « recevoir n'est pas
  accepter » tient jusqu'à l'export. Équilibre vérifié, avoirs inversés.
- **Paiements** — la pièce du lettrage. Sans elle, le comptable voit des
  créances qu'il ne peut pas solder.
- **Clients et fournisseurs** — le cabinet crée ses comptes auxiliaires à partir
  de ce fichier au lieu de ressaisir chaque nom.

Avec les deux existants (relevé, journal des ventes), les cinq familles de
ressources sont couvertes.

## Le choix de format, assumé lui aussi

**CSV point-virgule + BOM UTF-8.** C'est le dénominateur commun que tous les
logiciels comptables savent importer, et c'est délibérément ce que je n'ai
**pas** fait : un connecteur propriétaire vers un éditeur précis. Un connecteur
lie Dashprod à cet éditeur ; un CSV documenté ne lie personne — ni toi, ni ton
client, ni son comptable.

Un détail qui compte : les noms de société contenant un `;` sont échappés. Sans
ça, les colonnes se décalent à l'import et personne ne s'en aperçoit avant que
le comptable ouvre le fichier.

Chaque ressource se charge indépendamment : si l'une échoue, l'export reste
partiellement possible plutôt que bloqué en entier.

## À vérifier à l'œil

1. Paramètres → Comptabilité : le bandeau s'affiche en tête, les quatre points
   sont lisibles.
2. Choisir un trimestre avec des factures : cinq exports proposés.
3. Ouvrir `tiers.csv` dans Excel : accents corrects, colonnes alignées.
