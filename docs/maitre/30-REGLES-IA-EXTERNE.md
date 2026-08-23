# Dashprod — règles pour une IA externe

Fiche à coller en tête de mission. Dense volontairement : elle existe pour
éviter qu'une IA redécouvre le contexte, ou pire, l'invente.

**Si tu ne respectes pas ces règles, ta sortie est inutilisable** et devra être
réécrite. Ce n'est pas une préférence de style : c'est ce qui casse le build,
les tests ou l'architecture.

---

## 1. La pile réelle — vérifiée dans le dépôt

| | Réel | Erreurs déjà commises par d'autres IA |
|---|---|---|
| Build | **Vite 5.4** | ~~Next.js~~ |
| Langage | **JavaScript pur** | ~~TypeScript~~ — zéro `.ts`, règle dure |
| Base | Supabase / PostgreSQL | — |
| Hébergement | Vercel | — |
| Paiement/Peppol | **Digiteal** | ~~Mollie~~ — 0 occurrence |
| Tests | runner natif Node (`node --test`) | ~~Jest, Vitest~~ |

Ne propose **jamais** d'interface TypeScript, de type générique, ni de fichier
`.ts`/`.tsx`. Un test d'architecture les refuse.

## 2. L'arborescence réelle

```
apps/web/src/          ecrans/  composants/  lib/  main.jsx
packages/domaine/src/  <18 domaines métier>       ← alias @domaine
packages/domaine/tests/  *.test.js
supabase/migrations/     NNNN_nom_en_snake_case.sql   (4 chiffres, séquentiel)
```

N'invente aucun dossier. Pas de `app/`, `services/`, `components/`,
`domain-*/`, `application-*/`, `infrastructure-*/`. Ils n'existent pas.

## 3. Langue et nommage

Tout est en **français** : noms de fonctions, variables, commentaires, tests,
messages d'erreur. `versXmlUBL`, `factureCanonique`, `permisConduite`.
Pas de `sendInvoice`, `getUser`, `handleSubmit`.

## 4. Règles d'architecture non négociables

- **Le socle horizontal ne dépend jamais d'un métier.** Le déménagement utilise
  l'horizontal, jamais l'inverse. Vérifié par `architecture.test.js`.
- Deux familles d'**aiguillage** seules autorisées à connaître plusieurs
  métiers : *chiffrage* (interne au domaine) et *composition* (appelable par la
  plomberie web).
- **Zéro dérogation** actuellement. N'en réintroduis pas.
- Toute logique métier vit dans `packages/domaine` : **pure, testable sans base
  de données**. Les écrans n'additionnent rien.

## 5. Conventions de code

- Une fonction de décision rend **`{ ok, motif }`**, jamais un booléen nu.
- Les montants sont des **entiers de centimes**. Jamais de flottant.
- Les commentaires expliquent le **pourquoi**, et citent le bug évité.
- Chaque règle métier importante est **verrouillée par un test** dont le
  commentaire dit ce qui casse sans lui.

## 6. Pièges vécus — à ne pas reproduire

1. **`Number(null) === 0`** — a mis la TVA à 0 % en production, puis a gonflé
   des devis via `quantite || 1`. Utiliser `ouDefaut()` / `estFourni()` de
   `noyau/nombres.js`. **Une valeur absente n'est pas un zéro.**
2. **Const fléchée appelée avant sa déclaration** = TDZ = écran blanc au rendu,
   invisible au build et aux tests unitaires.
3. **Import manquant** = écran blanc. Un test statique le détecte.
4. **PL/pgSQL référençant une table inexistante** : la migration passe, l'erreur
   ne sort qu'à l'exécution. Toute fonction doit être exercée avant livraison.
5. **Fond clair en dur** (`background: "#fff"`) : ignore le mode nuit. Utiliser
   les jetons `C.blanc` / `C.bleuClair`. (Le texte blanc sur aplat coloré reste
   légitime.)
6. **Styles en ligne** : ils ne portent pas `:hover`/`:focus`/`::placeholder`.
   Ces états vivent dans une feuille CSS unique.

## 7. Ce qui est déjà construit — ne pas reconstruire

Vérifie **toujours** avant de proposer. Trois fois sur trois, l'infrastructure
existait déjà et le défaut était ailleurs qu'annoncé.

Déjà présents : chiffrage multi-natures, relevé volumétrique, planning +
détection de conflits, terrain/pointage, signature client opposable (code
consommé, empreinte du document scellée), facturation + numérotation légale +
immuabilité par triggers, **émission Peppol/UBL complète**, client Digiteal,
espace client, journal d'événements append-only, système de capacités,
mode nuit, sélecteur rotatif dans les 3 espaces.

## 8. Livraison attendue

- **Zip contenant uniquement les fichiers réellement modifiés**, arborescence
  identique au dépôt, plus un `NOTE.md`.
- Migrations : `NNNN_nom.sql`, numéro suivant la dernière (`0138` au moment
  d'écrire).
- Tests verts (`npm test`) **et** build vert (`apps/web`) avant toute livraison.
- Ne jamais livrer un fichier inchangé.

## 9. Décisions qui ne t'appartiennent pas

Ne tranche jamais seul : prix, périmètre d'une offre, règle commerciale,
contenu d'un document réglementaire. Signale l'hypothèse et demande.

Ne déclare **jamais** Dashprod « conforme ». Distingue toujours :
**obligation légale · obligation contractuelle · bonne pratique ·
recommandation**. Et indique quel professionnel doit valider (avocat,
expert-comptable, DPO, courtier).

## 10. Format de sortie utile

Pour une recherche : la source officielle, le lien, la date de vérification, le
territoire, et **la conséquence concrète pour Dashprod**. Pas de liste de liens.

Pour du code : le fichier réel concerné (chemin exact du dépôt), le diff, le
test associé, et ce qui casse si la règle saute.
