# Mise en production — lancement fermé (pilote Roovers)

> Objectif : ouvrir Dashprod à quelques entreprises par **code d'invitation**,
> sans paiement, sans nouvelle fonctionnalité. Pilote avec Roovers avant toute
> commercialisation.
>
> Légende : ✅ fait · 🟡 à faire par toi (console, hors code) · ⏳ avant
> commercialisation, pas avant le pilote.

---

## 1 — Déploiement de production

- ✅ **Build vérifié** : `npm run build` passe, 605 tests verts.
- 🟡 **Vercel — projet de production** : connecter le repo, brancher `main`.
- 🟡 **Variables d'environnement** dans Vercel (Production) :
  - `VITE_SUPABASE_URL` = URL du projet Supabase
  - `VITE_SUPABASE_ANON_KEY` = clé publishable (`sb_publishable_…`, recommandée
    plutôt que l'ancienne clé anon JWT)
  - toute autre `VITE_*` déjà présente en préproduction.
- 🟡 **Base de production** : c'est le projet Supabase `usldgiordguqchclvdms`, où
  toutes les migrations 0079→0085 sont **déjà appliquées et testées**. Si tu
  crées une base neuve pour la prod, il faut y rejouer `supabase/migrations/`
  dans l'ordre.

## 2 — Accès verrouillé  ✅ (le cœur du travail de ce tour)

- ✅ **Inscriptions fermées** : `reglages_plateforme.inscription_ouverte = false`.
- ✅ **Création de société sur code uniquement** : `cmd_creer_ma_societe` exige
  et consomme un code (usage unique, tracé). Vérifié : sans code → refus,
  code bidon → refus, code réutilisé → refus.
- ✅ **Un code prêt pour Roovers** : `DP-ROOVERS1`.
- ✅ **Rôles et permissions** : système capacités/rôles en place ; les rôles
  standard incluent désormais `pointer_chantier`, `cloturer_chantier`,
  `cloturer_dossier` (trou comblé en 0080).
- ✅ **Surface d'API réduite** : les 70 commandes `cmd_*` exigent une connexion ;
  seules `cmd_offre_apercu` et `cmd_offre_signer` restent publiques (signature
  d'offre par lien, sans compte).

**Pour ouvrir plus tard** (sans redéploiement) :
```sql
-- générer des codes (depuis un compte éditeur ayant gerer_referentiels)
select cmd_generer_codes(5, 'Vague 2');
-- ou ouvrir en grand le jour de la commercialisation :
update reglages_plateforme set valeur = 'true' where cle = 'inscription_ouverte';
```

## 3 — Domaine, HTTPS, DNS, e-mails  🟡 (console, je ne peux pas le faire)

- 🟡 **Domaine** : ajouter `dashprod.com` (et `www`) dans Vercel → Domains.
- 🟡 **HTTPS** : automatique chez Vercel une fois le domaine validé.
- 🟡 **DNS** : chez ton registrar, les enregistrements que Vercel indique
  (A / CNAME).
- 🟡 **E-mails (SPF, DKIM, DMARC)** : ne concerne Dashprod que si tu envoies des
  e-mails depuis un domaine à toi. Aujourd'hui l'authentification passe par
  Google OAuth (pas d'e-mail sortant applicatif). Les factures partent via les
  outils du déménageur. **À traiter seulement quand un envoi d'e-mail Dashprod
  sera ajouté** — donc pas bloquant pour le pilote.
- 🟡 **Supabase Auth → URL de redirection** : ajouter le domaine de prod dans
  Authentication → URL Configuration, sinon la connexion Google échoue en prod.

## 4 — Parcours critiques  ✅ testés en base, 🟡 à re-cliquer en prod

Chaîne prouvée en base ce tour (transactions annulées, rien laissé) :
connexion → création société (avec code) → client → devis → planning →
chantier → facture → **clôture immuable** → déconnexion.

🟡 **À refaire une fois, à la main, sur l'URL de production**, avec un vrai
compte Google et le code `DP-ROOVERS1`, pour confirmer que l'OAuth et les
variables d'environnement sont bons. C'est le seul test que le code ne peut pas
faire à ma place.

## 5 — Sauvegarde et supervision  🟡 (console Supabase / Vercel)

- 🟡 **Sauvegardes automatiques** : Supabase → Database → Backups. Les backups
  quotidiens dépendent du plan ; **vérifier qu'ils sont actifs**, et pour de la
  vraie sécurité activer le Point-in-Time Recovery (plan payant) avant d'avoir
  de vraies données clients.
- 🟡 **Journalisation des erreurs** : Vercel logge déjà les erreurs runtime ;
  Supabase logge Postgres/Auth/API. Suffisant pour un pilote. Un outil dédié
  (Sentry) peut venir plus tard.
- ✅ **Supervision applicative métier** : `cmd_audit_cloison()` et
  `cmd_audit_espaces()` sont des sondes internes — à lancer après chaque
  migration. Verdict actuel : **CLOISON INTACTE**, **ESPACES SÉPARÉS**.

## 6 — Mentions légales  ✅ pages en place · ⏳ contenu à valider

- ✅ **Trois pages publiques créées et liées** dans le pied de page :
  Conditions d'utilisation, Confidentialité, Mentions légales
  (`?page=cgu` / `confidentialite` / `mentions`).
- ✅ **RGPD minimal** : moteur de rétention et de purge déjà en place ;
  cloisonnement par société ; séparation client/entreprise.
- ⏳ **À compléter avant la commercialisation** (pas avant le pilote, où tu
  connais chaque société en personne) :
  - identité de l'éditeur (raison sociale, BCE, siège, contacts) — balisée
    `{{À COMPLÉTER}}` et surlignée dans les pages, impossible à oublier ;
  - relecture des CGU/DPA par un **avocat belge** (déjà noté dans `docs/TODO`) ;
  - assurance RC Pro / cyber de l'éditeur SaaS.

---

## Ce qui reste strictement de ton ressort (hors code)

1. Brancher Vercel sur la prod + variables d'environnement.
2. Domaine + DNS + URL de redirection Supabase Auth.
3. Vérifier les sauvegardes Supabase (et PITR avant vraies données).
4. Un passage manuel du parcours complet en prod avec `DP-ROOVERS1`.
5. Compléter l'identité éditeur et faire relire le juridique **avant** d'ouvrir
   les inscriptions et les paiements.

Une fois 1→4 faits, tu peux lancer le pilote Roovers. Le point 5 conditionne
seulement le passage à la commercialisation.
