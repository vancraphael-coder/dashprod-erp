# DATA_SECURITY — Dashprod ERP
**Protection des données de tes clients, et des tiennes**
Date : 19 juillet 2026 · Base : `usldgiordguqchclvdms`

---

## 0. Le principe qui commande tout le reste

Dashprod est une **SPA sans backend**. Le navigateur parle directement à Supabase avec la
clé `anon`, qui est publique par nature et lisible dans le bundle JavaScript par n'importe qui.

Il n'existe donc **aucun endroit intermédiaire** où filtrer, masquer ou valider quoi que ce soit.

> **Tout ce qui n'est pas protégé par une policy PostgreSQL est public.**
> Pas « moins sûr » : public. Un `curl` bien formé sur `/rest/v1/` suffit.

Corollaire opérationnel : ne jamais raisonner en « l'écran ne l'affiche pas, donc c'est
protégé ». La seule question valable est : *quelle policy empêche cette lecture ?*

---

## 1. Inventaire des données détenues

### 1.1 Données de tes clients finaux (particuliers qui déménagent)

| Donnée | Table | Sensibilité RGPD |
|---|---|---|
| Nom, téléphone, e-mail | `clients` | Données personnelles |
| Adresses de départ et d'arrivée | `affaire_adresses` | **Élevée** — révèle un domicile et une date d'absence |
| Inventaire du mobilier | `affaires` (`faits`) | Révèle le patrimoine d'un foyer |
| Montants, marges | `affaires`, `factures`, `paiements` | Commercial |
| Signatures manuscrites | `signatures` | **Biométrie comportementale** |
| Documents contractuels | `documents_instances` + bucket | Contractuel |
| Consentements | `consentements` | Preuve RGPD |

Le couple **« adresse + date de déménagement + inventaire »** est la donnée la plus
dangereuse de tout le système. C'est un plan de cambriolage prêt à l'emploi. Elle mérite
un traitement plus strict que les données financières.

### 1.2 Données de tes salariés

| Donnée | Table | Sensibilité |
|---|---|---|
| Identité, e-mail | `utilisateurs` | Personnelle |
| Heures prestées | `chrono_sessions`, `missions` | **Donnée sociale** |
| Rémunération | `donnees_paie` | **Très élevée** |
| Congés | `conges` | Peut révéler un état de santé |
| Documents RH | `documents_rh` | Très élevée |
| Équipements, carte carburant | `equipements_rh` | Interne |

`donnees_paie` est correctement cloisonnée : policy `org_id = jwt_org() AND
acteur_a_capacite('voir_paie')`. C'est le bon niveau. **Cette rigueur doit être étendue à
`documents_rh` et `conges`**, qui n'ont aujourd'hui qu'un filtre d'organisation — tout
salarié connecté voit les congés de tous ses collègues.

### 1.3 Tes données à toi

| Donnée | Où | État |
|---|---|---|
| IBAN `BE73 3101 6268 5860` | `adaptateur.js:753` | **EXPOSÉ — dépôt public** |
| E-mail personnel | `adaptateur.js:753` | **EXPOSÉ** |
| Téléphone | `adaptateur.js:753` | **EXPOSÉ** |
| BCE / TVA | `adaptateur.js:750` | Exposé (public par nature) |
| Chiffre d'affaires signé | `v_ca_signe` | **FUITE inter-tenant prouvée** |
| Effectif + heures | `v_charge_membre` | **FUITE inter-tenant prouvée** |
| Barèmes tarifaires, marges | `referentiels`, `affaires` | Protégé par RLS |

Tes marges et tes barèmes sont ton actif concurrentiel. Le jour où un confrère devient
client de Dashprod, la fuite du §3.4 de l'audit lui livre ton chiffre d'affaires.

---

## 2. Corrections par ordre d'urgence

### P0 — À faire avant d'ouvrir à un deuxième client

**1. Fermer la fuite des vues** — 3 lignes de SQL, aucune régression possible.
```sql
ALTER VIEW public.v_ca_signe        SET (security_invoker = on);
ALTER VIEW public.v_charge_membre   SET (security_invoker = on);
ALTER VIEW public.v_factures_solde  SET (security_invoker = on);
```

**2. Fermer le Storage** — bucket privé + isolation par chemin. Voir §3 ci-dessous.
À faire **maintenant**, tant que le bucket est vide : le coût est nul aujourd'hui,
il devient une migration de fichiers demain.

**3. Purger l'identité Roovers du code** — voir §4.

**4. Neutraliser le mode démo en production** — voir §5.

### P1 — Avant le premier client payant

5. `sous_traitants` : ajouter `org_id NOT NULL` + policy.
6. Policies manquantes sur `capacites`, `role_capacites`, `sequences`, `registre_traitements`.
7. `REVOKE EXECUTE` sur les RPC exposées à `anon`.
8. Activer la protection contre les mots de passe compromis (Auth → Passwords → HaveIBeenPwned).
9. Figer le `search_path` des 9 fonctions concernées.
10. Restreindre `conges` et `documents_rh` par capacité, comme `donnees_paie`.

### P2 — Durcissement

11. Expiration des invitations (30 jours) + vérification du claim `email_verified`.
12. Déplacer `citext` hors du schéma `public`.
13. MFA sur ton compte Supabase, ton compte Vercel et ton compte GitHub.
14. Passer le dépôt en **privé**.

---

## 3. Storage — cible

État actuel : bucket `documents` **public**, policy SELECT = `bucket_id = 'documents'`,
aucun filtre d'organisation, listable par `anon`. 0 objet.

### Convention de chemin obligatoire

```
org/{org_id}/contrats/{instance_id}.pdf
org/{org_id}/chantiers/{mission_id}/{photo}.jpg
org/{org_id}/rh/{utilisateur_id}/{document}.pdf
public/cgv/{version}.pdf          ← seul contenu réellement public
```

Le premier segment porte l'isolation : `(storage.foldername(name))[2]` vaut `org_id`
et se compare à `jwt_org()`.

### Policies cibles

```sql
UPDATE storage.buckets SET public = false WHERE id = 'documents';

DROP POLICY IF EXISTS documents_lecture  ON storage.objects;
DROP POLICY IF EXISTS documents_ecriture ON storage.objects;

CREATE POLICY doc_lecture_org ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'org'
  AND (storage.foldername(name))[2] = jwt_org()::text
);

CREATE POLICY doc_ecriture_org ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'org'
  AND (storage.foldername(name))[2] = jwt_org()::text
);

CREATE POLICY doc_suppression_org ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] = jwt_org()::text
  AND acteur_a_capacite('gerer_referentiels')
);
```

### Changement de code obligatoire

Passer le bucket en privé **casse** `getPublicUrl`. Il faut remplacer, dans
`adaptateur.js` (`urlConditionsCbd`, `televerserConditionsCbd`) :

```js
// AVANT
supabase.storage.from("documents").getPublicUrl(FICHIER_CBD).data.publicUrl

// APRÈS
const { data } = await supabase.storage.from("documents")
  .createSignedUrl(chemin, 300);   // 5 minutes
return data?.signedUrl ?? null;
```

Si les CGV doivent rester accessibles sans connexion (lien dans un devis envoyé au client
final), crée un **second bucket public `public-cgv`** dédié, et garde `documents` privé.
Ne mélange jamais les deux.

**Ne jamais appeler `getPublicUrl` sur un contrat, une photo de chantier ou un document RH.**
Une URL publique Supabase n'expire pas et ne se révoque pas.

---

## 4. Purger l'identité Roovers

### 4.1 Dans le code

| Fichier | Ligne | Correction |
|---|---|---|
| `adaptateur.js` | 749–754 | Supprimer `ORG_DEMO`. Le mode démo doit utiliser une identité neutre (`"Entreprise de démonstration"`, IBAN `BE00 0000 0000 0000`). |
| `adaptateur.js` | 288 | `organisation: org.nom` — jamais une constante. |
| `pdfOffre.js` | 56 | Supprimer le fallback. Si `org.nom` est vide, **lever une erreur** : mieux vaut un devis qui refuse de se générer qu'un devis au nom d'une autre société. |
| `adaptateur.js` | 757 | `.limit(1)` → `.eq("id", orgIdDuJeton).single()` — ne pas dépendre uniquement de la RLS. |
| `seed/0002_bareme.sql` | en-tête | Corriger l'identifiant documenté (`5de63170-6a61-4e94-a84c-fd6bce4c2f9c`), ou mieux : paramétrer sans citer d'organisation en dur. |

### 4.2 Dans l'historique Git — le point difficile

Supprimer les lignes ne suffit pas : ton IBAN reste dans l'historique, et GitHub conserve
des copies des commits atteignables. Trois actions, dans cet ordre :

1. **Passe le dépôt en privé immédiatement.** C'est l'action qui a le plus d'effet pour le
   moins d'effort. Il n'y a aucune raison qu'un ERP commercial soit public.
2. Réécris l'historique (`git filter-repo`) si tu veux effacer réellement la trace, en
   sachant que cela invalide tous les clones existants.
3. **Considère l'IBAN comme divulgué.** Un IBAN seul ne permet pas de retirer de l'argent,
   mais il permet des domiciliations frauduleuses. Vérifie auprès de ta banque que les
   domiciliations sur ce compte exigent un mandat signé, et surveille les prélèvements.

Même raisonnement pour les identifiants d'organisation et d'utilisateurs qui apparaissent
dans les seeds et commentaires : ce ne sont pas des secrets, mais ils n'ont rien à faire
dans un dépôt public.

---

## 5. Interdire le faux succès

Le mode démo bascule sur la seule absence d'une variable d'environnement. Cible :

```js
// supabase.js
const url  = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const demoAutorisee = import.meta.env.VITE_MODE_DEMO === "1";

if (!url || !anon) {
  if (!demoAutorisee) {
    throw new Error(
      "Configuration Supabase absente. Le mode démo doit être demandé " +
      "explicitement via VITE_MODE_DEMO=1. Build interrompu."
    );
  }
}
```

Et un garde-fou dans le build :
```json
"build": "node scripts/verifier-env.js && vite build"
```

Règle générale à appliquer partout dans l'adaptateur : **une opération qui échoue côté base
ne doit jamais retourner un succès à l'interface.** Le `try/catch` silencieux de l'invitation
(ligne 286–291) en est l'exemple type — il faut afficher clairement « l'invitation est
enregistrée mais l'e-mail n'a pas pu être envoyé », pas laisser croire que c'est parti.

---

## 6. Conformité RGPD — état

Le schéma est mieux préparé que la moyenne : `demandes_rgpd`, `consentements`,
`registre_traitements`, `incidents_securite`, `cmd_anonymiser_client`,
`cmd_creer_demande_rgpd`, `cmd_traiter_demande_rgpd` existent déjà.

Mais :

| Obligation | État |
|---|---|
| Registre des traitements | Table présente, **0 policy → inaccessible** |
| Droit d'accès / effacement | RPC présentes, **aucun écran** |
| Registre des incidents | Table présente, aucun écran |
| Consentements | Table présente, câblage à vérifier |
| Politique de conservation | **Aucune** — rien ne purge |
| Sous-traitance (Supabase, Vercel, Google) | À documenter |
| Chiffrement au repos | Assuré par Supabase |
| Notification sous 72 h | Aucune procédure écrite |

En tant qu'éditeur hébergeant les données de plusieurs entreprises, tu deviens
**sous-traitant** au sens du RGPD pour tes clients. Il te faudra un contrat de
sous-traitance (DPA) avec chaque entreprise cliente. À préparer avant la première signature
commerciale, pas après.

Décide aussi une durée de conservation : le droit comptable belge impose 7 ans pour les
factures, mais rien n'oblige à garder l'inventaire du mobilier d'un particulier au-delà de
la garantie. Un `cmd_purger_donnees_expirees()` programmé vaut mieux qu'une base qui grossit
indéfiniment.

---

## 7. Sauvegardes et réversibilité

Non vérifiable depuis ici, à contrôler dans ton dashboard :

- Plan Supabase actuel et **fenêtre de rétention des sauvegardes** (le plan gratuit n'offre
  aucune restauration ponctuelle fiable — pour des données de clients payants, ce n'est pas
  tenable).
- **Fais un `pg_dump` manuel maintenant**, avant toute correction. Les 16 clients et
  16 affaires de Roovers sont de vraies données de production.
- Teste une restauration au moins une fois. Une sauvegarde jamais restaurée n'est pas une
  sauvegarde.
- Prévois un export par organisation : un client qui part doit pouvoir récupérer ses données.
  C'est un droit RGPD **et** un argument commercial.

---

## 8. Les cinq règles à ne jamais enfreindre

1. **Aucun secret ne porte le préfixe `VITE_`.** Tout ce qui commence par `VITE_` est publié
   en clair dans le bundle.
2. **La clé `service_role` ne touche jamais le navigateur.** Elle ignore toute RLS. Si un
   jour tu as besoin d'une opération privilégiée, elle se fait dans une Edge Function.
3. **Aucune table métier sans `org_id NOT NULL` + policy.** Une table sans les deux est
   publique.
4. **Aucune vue ni fonction `SECURITY DEFINER` sans contrôle explicite de `jwt_org()`.**
   C'est par là que la fuite actuelle est entrée.
5. **Aucun succès affiché sans confirmation de la base.** Un utilisateur qui croit avoir
   enregistré et qui a perdu son travail ne revient pas.
