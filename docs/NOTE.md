# Lot 29 — le point d'accès : envoi ET réception

`npm test` : **1014/1014 ✓** — build `apps/web` ✓ — 8 fichiers.
**Migration `0141` appliquée et éprouvée.**

## Avant tout : ne colle PAS tes identifiants dans les paramètres

Ce soir, le geste naturel serait de mettre ton `clientId` / `clientSecret`
Digiteal dans les paramètres de facturation de l'organisation. **Ne le fais
pas.**

`parametres_facturation` est une colonne jsonb **lue par le navigateur** :
`adaptateur.js` est du code front, bundlé par Vite. Ton secret partirait dans le
navigateur de chaque utilisateur, lisible en deux clics dans les outils de
développement.

Bonne nouvelle : j'ai vérifié, **aucune colonne `digiteal_*` n'existe en base**
aujourd'hui — rien n'est exposé. Le code lisait `pf.digiteal_secret` qui valait
toujours `null`, et le client Digiteal refuse de transmettre sans clé. Il n'y a
donc rien à réparer, seulement un piège à éviter.

## Le vrai obstacle : Dashprod n'a pas de serveur

C'est ce que les guides que tu m'as passés supposent (Next.js, Server Actions)
et que Dashprod n'a pas : c'est un **SPA Vite**. Deux conséquences :

1. un webhook exige une URL publique — impossible sans fonction serveur ;
2. le secret doit vivre quelque part où le navigateur ne va pas.

**La réponse** : des fonctions Vercel dans `/api`. Elles marchent avec n'importe
quel framework, y compris Vite.

À configurer dans Vercel → Settings → Environment Variables :

```
DIGITEAL_WEBHOOK_SECRET      secret partagé, vérifié à chaque appel
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY    contourne la RLS — SERVEUR UNIQUEMENT
```

⚠ **Aucune variable `VITE_*`** pour ces valeurs : ce préfixe les publie dans le
bundle navigateur. C'est exactement le piège à éviter.

## Un piège Vercel que j'ai trouvé en chemin

Ton `vercel.json` réécrivait `"/(.*)" → /index.html`. Cette règle **avale les
routes `/api`** : le webhook aurait reçu la page d'accueil, avec un code 200.
Le point d'accès aurait conclu à un succès et **n'aurait jamais réessayé** —
tes factures fournisseur seraient parties dans le vide, sans erreur nulle part.

Corrigé en `"/((?!api/).*)"`, vérifié par simulation sur quatre URLs.

## Trois dangers de webhook, trois verrous

Toute la décision est dans le domaine (`facturation/webhook.js`), testée sans
réseau. La fonction serveur ne fait que brancher.

- **N'importe qui peut appeler une URL publique.** Secret partagé, comparaison à
  temps constant (une comparaison naïve fuit le secret par le temps de réponse).
  Et le cas piégeux : **un serveur non configuré REFUSE** au lieu de tout
  accepter. Mieux vaut un webhook qui ne marche pas qu'une porte ouverte.
- **Le même événement arrive plusieurs fois.** Clé d'idempotence + contrainte
  `UNIQUE` en base — c'est la contrainte qui garantit, elle tient même si deux
  livraisons arrivent en même temps. On répond 200 pour stopper les réessais,
  sans rien refaire.
- **Un type inconnu.** Journalisé, aucune action. Une version future du point
  d'accès enverra des types qu'on ignore : ils ne doivent jamais déclencher
  quelque chose de deviné.

## Envoi ou réception : une décision, plus un défaut

`enregistrerParticipant` avait `envoiSeul = true` par défaut. Je l'ai retiré :
sans booléen explicite, elle refuse — **et ne fait aucun appel réseau**.

Parce qu'aucun défaut n'est honnête ici. Un seul point d'accès peut recevoir
pour un participant : à `true`, tu condamnes l'organisation à ne jamais recevoir
(l'obligation légale) ; à `false`, tu lui prends la réception que son comptable
assure peut-être déjà. Ta décision — envoi **et** réception — est maintenant
explicite dans le code.

## Ce qu'il te reste à faire

1. Créer le webhook côté Digiteal, pointant vers
   `https://<ton-domaine>/api/peppol/webhook`.
2. Poser les trois variables d'environnement dans Vercel.
3. **Confirmer auprès de Digiteal le nom exact de l'événement entrant.** J'ai
   accepté quatre variantes plausibles mais je ne l'ai pas inventé : un type non
   listé tombe en « inconnu » et ne déclenche rien. Dis-le-moi et j'ajuste en
   une ligne.
