# V2 — périmètre annoncé

> Notes de cadrage, pas un plan de développement. Rien ici n'est commencé.
> Écrit pour que la V1 ne prenne aucune décision qui fermerait ces portes.

## Ce que la V2 contient (annoncé le 06/08/2026)

1. **Toute la promesse Pro** — dont les centres logistiques et le rôle
   gestionnaire de dépôt, aujourd'hui verrouillés (`plan_souscriptible`).
2. **Déménagement international** — listing international, et les documents
   exigés par les douanes.
3. **Signature** — sur une branche séparée. À traiter comme un sous-système,
   pas comme une fonction de plus.
4. **Logistique et transport** — étroitement liés, de la très petite à la très
   grande échelle, en logique métier de bout en bout.
5. **Demande de documents légitimant l'exercice du métier** — approbation
   automatique via le guichet d'entreprise et les entités qui approuvent chaque
   document.
6. **Aide juridique et fiscale UE.**
7. **Le store** — une conséquence, pas le sujet.

## Décisions ouvertes

- **D-V2-01 — Guichet d'entreprise : s'affilier, ou passer par un réseau ?**
  Question posée par Raphaël : vaut-il mieux s'affilier à certains guichets
  d'entreprise agréés pour la fluidité, ou existe-t-il des réseaux plus
  puissants, moins coûteux ou plus souples juridiquement pour l'éditeur ?
  **Non tranchée — demande une recherche factuelle sur les guichets agréés
  belges, leurs interfaces éventuelles, et le régime de responsabilité de
  l'intermédiaire.** À faire avant toute ligne de code.

- **D-V2-02 — Responsabilité sur l'aide juridique et fiscale.**
  Un ERP qui « aide » sur le droit et la fiscalité engage son éditeur.
  À arbitrer : information générale citée et sourcée, ou service qualifié
  (donc assurance, et probablement partenariat avec un professionnel).

## Ce que la V1 doit préserver

- Le cloisonnement inter-sociétés (0079) : il devra tenir à plusieurs dépôts.
- La séparation des espaces client / entreprise (0082) : un transporteur
  partenaire sera un tiers de plus, pas une exception au cloisonnement.
- La clôture immuable (0080) : les documents douaniers s'y rattacheront.
