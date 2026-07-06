# Dashprod ERP

Plateforme ERP verticale pour le secteur du déménagement.
Premier déploiement : Déménagements Roovers (Jodoigne, Belgique).

Ce dépôt est la source unique du projet. Il est construit à partir de deux
références documentaires, dont il est la traduction fidèle :

- **Référence 2** — Documentation fonctionnelle (ce que fait le système).
- **Référence 3** — Architecture technique (comment il fonctionne).

Aucune logique n'est écrite ici sans exister d'abord dans ces références.
Les écarts éventuels sont tracés en ADR (`docs/adr/`).

## Stack (décidée en Réf. 3 · T1)

| Domaine | Choix |
|---|---|
| Frontend | React 18 + Vite (SPA), TypeScript progressif |
| Données | PostgreSQL (Supabase), RLS comme frontière de sécurité |
| Accès données | supabase-js + SQL versionné (jamais Prisma — cf. ADR-002) |
| Identité | Supabase Auth (email + mot de passe), rôle déterminé serveur |
| Serveur | Supabase Edge Functions |
| Hébergement / CI | Vercel + GitHub Actions |

## Organisation du dépôt

```
packages/domaine/   Logique métier pure et testable (formules, règles).
                    Une seule implémentation, consommée par le front ET le serveur.
supabase/           Migrations SQL numérotées, politiques RLS, seeds.
docs/               Références, ADRs, documentation par module.
scripts/            Automatisation (build, vérifications).
.github/workflows/  CI (tests + build à chaque push).
```

## Développement

Voir `CONTRIBUTING.md` pour la méthode (un module à la fois), les conventions
de commit et la discipline Git.

## Démarrer

```bash
npm install
npm test          # tests du paquet domaine
```

L'application frontend et la configuration Supabase sont introduites module par
module (voir `docs/modules/` et le journal `docs/JOURNAL.md`).
