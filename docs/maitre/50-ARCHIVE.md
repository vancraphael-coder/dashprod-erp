# Archive — R&D, idées, matière de réflexion

Ce fichier **n'est pas normatif**. Rang 6 : matière à instruire, jamais vérité.
Il existe pour qu'une idée ne se reperde pas, et pour qu'on n'ait pas à la
réinventer.

Règle : une idée d'ici ne se construit **que** lorsqu'elle rapproche un client,
un usage, un paiement ou une information décisive.

---

## Le manifeste de Raphaël (août 2026)

> « Je ne confonds plus complexité et progrès, ni préparation et avancée. Je
> cherche d'abord ce que le marché, les clients et la réalité me disent, puis je
> construis. Chaque nouvelle idée peut attendre si elle ne rapproche pas
> concrètement un client, un usage, un paiement ou une information décisive.
> La preuve avant l'extension. Le marché avant l'architecture. L'exécution avant
> la perfection. »

**C'est le filtre de ce fichier.** Toute idée ci-dessous s'y confronte.

## Idées gardées, non construites

**Moteur de conformité métier.** Une entreprise déclare ses activités, ses
sites, ses véhicules, ses équipements et ses marchandises ; Dashprod en déduit
les licences, agréments, permis, formations et contrôles applicables, avec leurs
échéances. Transport pour compte de tiers, ADR, transport exceptionnel, déchets
(enregistrement vs agrément), permis d'environnement, levage, travail en
hauteur. Le principe correct est un **moteur de déclencheurs** (`SI activité X
ET territoire Y ALORS exigence Z`), pas une table `certifications`.
*Pourquoi pas maintenant : plusieurs mois de travail, aucun client payant ne
l'attend. Rouvrir quand Roovers facture et qu'un prospect le demande.*

**Socle comptable complet.** Ledger d'événements économiques → qualification →
moteur fiscal → moteur comptable → bridge. Document d'architecture complet
produit (21 sections, architectures comparées, modèle canonique, roadmap 0→6).
*Pourquoi pas maintenant : les phases 1–2 seules sont justifiées, et seulement
une fois des faits économiques réels en circulation.*

**Cartographie des métiers connexes.** Déménagement résidentiel/professionnel/
industriel/international, manutention, transport spécialisé, stockage,
logistique, emballage, montage, nettoyage, débarras, réemploi, déchets, œuvres
d'art, événementiel, archives. Utile pour penser la verticalisation.
*Pourquoi pas maintenant : Dashprod sert un métier, pas trente.*

**Pilotage automatique par IA.** Une IA interne qui reçoit les appels et
orchestre le planning comme le ferait un humain. Le lot « dispatch » (centre de
contrôle d'une journée) en est la première brique conceptuelle.
*Note de prudence : aucune garantie de confidentialité entre conversations. Ce
qui touche à un avantage concurrentiel réel ne devrait pas dépendre de la
discrétion d'un canal de discussion.*

## Enseignements durables

**Les autres IA travaillent à l'aveugle.** Deux livraisons externes ont produit
du `.mjs` au lieu de `.js`, des dossiers inventés, du TypeScript dans un dépôt
qui l'interdit, Next.js au lieu de Vite, Mollie au lieu de Digiteal. Sans accès
au dépôt réel, toute livraison de fichiers est une **supposition
d'arborescence**. D'où `30-REGLES-IA-EXTERNE.md`.

**Un document de rang 6 pris pour du rang 1 coûte cher.** Le CADRAGE affirmait
que les prix de base manquaient — c'était vrai en août, faux après le lot 28. La
base fait foi.

**« Rien n'a changé » veut souvent dire « pas encore déployé ».** Vérifier le
rendu réel avant de conclure à un bug : deux fois, le code était correct.
