# Dashprod — démarrer ici

**Vous ouvrez une nouvelle session, une nouvelle conversation, ou un autre
LLM ? Lisez ce fichier en entier. Il fait moins de cinq minutes et vous évite
de rouvrir des questions déjà tranchées.**

---

## Ce qu'est Dashprod, en cinq lignes

ERP vertical pour les PME belges du déménagement. Client pilote : Roovers.
Monorepo JavaScript **pur** (jamais TypeScript), React + **Vite**, Supabase
(PostgreSQL, RLS, fonctions `security definer`), déployé sur Vercel.
Fondateur solo : Raphaël. Il décide, l'assistant construit.

## La hiérarchie des sources — À LIRE AVANT TOUT

Plusieurs documents circulent. Quand ils se contredisent, **cet ordre
tranche**, du plus fort au plus faible :

| Rang | Source | Fait autorité sur |
|---|---|---|
| 1 | **La base de données** (Supabase) | L'ÉTAT réel. Une table, une policy, un trigger : ce qui est en base est vrai, quoi qu'en dise un document. |
| 2 | **Le dépôt** (`github.com/vancraphael-coder/dashprod-erp`) | Le CODE réel : arborescence, conventions, ce qui existe déjà. |
| 3 | **`PASSATION.md`** (racine du dépôt) | Les décisions TECHNIQUES, les pièges vécus, l'état des lots. |
| 4 | **`10-DECISIONS-PRODUIT.md`** | Les décisions COMMERCIALES et produit. |
| 5 | **`20-OUVERT.md`** | Ce qui n'est PAS tranché. Ne rien y décider seul. |
| 6 | Tout le reste (documents de réflexion, propositions externes) | **Matière à instruire, jamais vérité.** |

**Conséquence pratique** : un document qui affirme quelque chose sur l'état du
produit se vérifie contre la base ou le dépôt avant d'être cru. Plusieurs
livraisons ont été gâchées parce qu'une source de rang 6 a été prise pour du
rang 1.

## Les cinq règles qui ne se négocient pas

1. **Vérifier avant de construire.** L'infrastructure existait déjà, trois fois
   sur trois, et le défaut était ailleurs qu'annoncé.
2. **Éprouver avant de livrer.** Une migration qui s'applique sans erreur n'est
   pas une migration qui fonctionne. Tests verts ET build vert, toujours.
3. **Ne jamais deviner une donnée.** Un taux de TVA absent est une erreur, pas
   21 %. Une quantité absente n'est pas zéro. Une valeur manquante se dit.
4. **Signaler, ne pas interdire** — sauf quand la donnée serait fausse. Le
   bureau connaît son terrain mieux que la règle.
5. **Ne jamais trancher seul** un prix, un périmètre d'offre, une règle
   commerciale ou le contenu d'un document réglementaire. Poser la question.

## Ce qu'il ne faut PAS rouvrir

Ces points sont tranchés. Les rediscuter fait perdre du temps et dérive :

- JavaScript pur, jamais TypeScript.
- Vite, pas Next.js.
- Français partout : noms de fonctions, variables, commentaires, tests.
- Le socle ne dépend jamais d'un métier (test d'architecture).
- Livraison par zip des seuls fichiers modifiés + `NOTE.md`.
- Les offres se différencient par les modules, pas par le nombre de sièges.

## L'ordre de lecture

1. Ce fichier.
2. `60-CIRCUITS-QUATRE-COUCHES.md` — **la carte du territoire.** Les dix circuits
   du produit, chacun lu en quatre couches (métier réel, paramétrage,
   facturation, comptabilité), avec ce qui tient et ce qui casse. À lire avant
   de décider quoi que ce soit : c'est le seul document qui montre l'ensemble.
3. `70-ROADMAP.md` — **l'ordre de marche.** Les vagues, pourquoi celle-ci avant
   celle-là, et ce qu'il ne faut pas faire.
4. `10-DECISIONS-PRODUIT.md` — ce qui est arrêté.
5. `20-OUVERT.md` — ce qui attend une décision.
6. `25-PARAMETRES-ROADMAP.md` — le détail des réglages qui se saisissent SANS
   EFFET. À lire avant de toucher à la facturation : trois champs sont inertes
   en production.
7. `26-GARDE-MEUBLES-ROADMAP.md` — le modèle boxe (ses fondations sont désormais
   posées ; voir vague 4 de la roadmap).
8. `80-REMARQUES-ATELIER.md` — les remarques du petit « i » de l'app test,
   classées en lots insérés dans la roadmap.
9. `90-PARAMETRES-CARTOGRAPHIE.md` — l'audit des paramètres et le cap
   (registre unique avant map/connecteur). À lire avant tout chantier de
   paramétrage.
9. `PASSATION.md` (racine) — l'état technique détaillé et les pièges.
10. `30-REGLES-IA-EXTERNE.md` — si vous confiez un travail à un autre outil.

Le reste de `docs/` est de la matière de réflexion : utile, jamais normatif.
