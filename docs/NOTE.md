# Lot 30 — fournitures facturées + domaine des équipes

`npm test` : **1029/1029 ✓** — build `apps/web` ✓ — 5 fichiers.
**Aucune migration.**

Ta demande contenait cinq chantiers. J'ai traité les deux qui touchent l'argent
et ta priorité déclarée. Les trois autres sont listés en fin de note — je ne
les ai pas bâclés en fin de lot.

## Les fournitures : un bug qui coûtait de l'argent

`lignesFacturePour` ne produisait **qu'une seule ligne** — « Déménagement —
<client> » — avec le TVAC recomposé. Les fournitures étaient chiffrées mais
**n'atteignaient jamais la facture**. Cartons fournis, jamais facturés.

Le plus frappant : `valoriserEmballage` existe depuis longtemps et son propre
commentaire dit *« c'est ce qui doit être retranscrit sur l'offre / la
facture »*. La fonction était là, correcte, jamais appelée. Encore un cas où
l'infrastructure existait et le défaut était ailleurs qu'annoncé.

**Ta remarque légale était la bonne.** Vendre un carton n'est pas prester une
manutention : ce sont deux catégories d'opération distinctes (celles du lot 25),
qui n'ont pas le même traitement comptable — et le client a le droit de voir ce
qu'il achète, dénommé et quantifié, plutôt qu'un total opaque. Les fournitures
sortent donc en lignes propres, marquées `vente_biens`, la prestation restant
`vente_services`.

**Le test d'architecture m'a attrapé** sur le premier jet : j'importais
`stocks/emballage` depuis l'adaptateur, qui est horizontal et n'a pas ce droit.
Corrigé en passant par l'aiguillage de composition — le même patron que les
rubriques d'offre.

## Les équipes de journée

`planning/equipes.js`, pur et testable. Tes trois règles, dont **une seule
bloque** :

- **Une personne au minimum** → bloque. C'est le seul vrai blocage.
- **L'effectif hors barème** → avertit seulement, comme tu l'as demandé. Le
  bureau connaît son terrain mieux que la règle : un chantier peut légitimement
  demander six personnes là où le barème en suggère quatre.
- **Une personne dans deux équipes le même jour** → autorisé si les missions ne
  se chevauchent pas. Le cas réel : déménagement le matin, lift l'après-midi.

**Le chevauchement est le cœur, et j'ai soigné trois cas limites :**

Deux missions qui se touchent bout à bout (12h00 / 12h00) **ne** se chevauchent
pas — sinon on interdirait des journées parfaitement valides.

Une mission **sans horaire occupe la journée entière**. Prudence assumée : sans
heures, impossible de prouver qu'elle laisse de la place, donc on ne le suppose
pas. Et le message dit quoi faire — « posez des heures pour la placer deux
fois » — au lieu de refuser sèchement.

Un **chantier de nuit** (22h → 02h) est géré : sans garde, la fin « avant » le
début inverserait la plage et tout chevauchement passerait inaperçu.

**Le modèle d'équipe ne retient que les personnes** — ni date, ni missions. Les
mêmes trois personnes travaillent souvent ensemble, mais jamais sur le même
chantier deux jours de suite ; garder la date ferait rejouer un passé.

## Ce que je n'ai pas fait, et pourquoi

Trois chantiers de ta demande restent entiers. Chacun mérite son lot :

1. **La note rapide au planning** — petite, mais elle doit se poser au bon
   endroit dans l'écran ; je la ferai avec le branchement des équipes.
2. **Le branchement des équipes à l'écran Planning** — le domaine est prêt et
   prouvé, l'interface reste à construire.
3. **Compte + Paramètres : organisation et CSS** — un vrai chantier d'UI, pas
   un ajout de fin de lot.
4. **Le dossier maître de documentation** — c'est le plus structurant pour toi
   (portabilité entre sessions et entre LLM sans dérive). Il mérite d'être
   pensé, pas expédié.

## À vérifier à l'œil

1. Un dossier avec de l'emballage consommé : la facture montre maintenant les
   fournitures en lignes séparées, avec quantité et prix unitaire.
2. Le total de la facture augmente d'autant — c'est le montant qui n'était pas
   facturé.
