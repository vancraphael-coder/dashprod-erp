# MULTI_TENANT & TENANT_BOOTSTRAP — Dashprod ERP
**Plusieurs entreprises de déménagement · base vierge par entreprise**
Date : 19 juillet 2026

---

## 1. Le modèle réel, aujourd'hui

```
organisations (tenant)
   ↑ org_id
utilisateurs ── auth_id ──→ auth.users
   ↑
utilisateur_roles → roles (org_id) → role_capacites → capacites (global)
```

L'organisation active est portée par le **claim `org_id` du JWT**, injecté au moment de la
connexion par `hook_ajouter_claims`, qui lit `utilisateurs.org_id` en base. Toutes les
policies s'appuient sur `jwt_org()`.

**Ce modèle est bon et il est prouvé fonctionnel** (test d'isolation, `AUDIT_REAL.md` §3.3).
Ne le refais pas. Il n'y a rien à réarchitecturer ici — il y a des trous à boucher autour.

---

## 2. La décision que tu dois prendre maintenant

`utilisateurs.org_id` est `NOT NULL` et unique par ligne : **un utilisateur appartient à
exactement une organisation.**

Ton document de mission (§7) prévoyait au contraire un utilisateur membre de plusieurs
organisations, avec une organisation active et un sélecteur. **Les deux ne peuvent pas
coexister sans réécrire le hook, `mon_profil()` et une partie des policies.**

| | 1 utilisateur = 1 organisation (état actuel) | Multi-appartenance |
|---|---|---|
| Sécurité | Le claim est déterministe, aucun changement de contexte possible | Il faut valider l'organisation active côté serveur à chaque bascule |
| Cache / fuite | Aucun risque de résidu au changement de tenant | Risque réel, à tester |
| Coût | **Zéro — c'est déjà fait** | Nouvelle table `organisation_membres`, refonte du hook, sélecteur d'organisation, invalidation de cache |
| Réalité métier | Un déménageur travaille pour une entreprise | Utile seulement pour toi (accès support) |

**Recommandation : garde 1 utilisateur = 1 organisation.** C'est plus simple, plus sûr, et
c'est déjà validé. Si tu as besoin d'accéder aux données d'un client pour du support, fais-le
avec un compte distinct dans son organisation, tracé par `evenements` — pas avec un
super-admin transversal, qui serait la faille la plus dangereuse que tu puisses créer.

Si tu retiens cette option : **supprime le §7 du document de mission**, il induira en erreur
toute personne qui reprendra le sujet.

Une même personne physique peut de toute façon avoir deux adresses e-mail, donc deux comptes.

---

## 3. Ce qui manque pour créer une entreprise

Il n'existe **aucune** procédure de création d'organisation. Aujourd'hui, ajouter une
entreprise se fait à la main dans l'éditeur SQL. C'est le blocage principal de ton objectif.

| Brique | État |
|---|---|
| `creer_organisation()` | **Absente** |
| `provisionner_roles_standard(p_org)` | **Présente** ✅ |
| Seed des capacités globales | Présent (`seed/0001_noyau_seed.sql`) ✅ |
| Seed des barèmes | Présent mais **identifiant d'organisation erroné** ❌ |
| Numérotation (`sequences`) | Table présente, **0 policy** ❌ |
| Écran d'onboarding | **Absent** |
| Migration de référence rejouable | **Absente** (`AUDIT_REAL.md` §3.9) ❌ |

---

## 4. Définition d'une base vierge

### Doit être créé automatiquement

| Élément | Source |
|---|---|
| Ligne `organisations` | Saisie de l'onboarding |
| Rôles standards + capacités associées | `provisionner_roles_standard(org_id)` |
| Premier utilisateur admin | E-mail du fondateur, `auth_id` à `NULL` jusqu'à la première connexion |
| Compteurs `sequences` | Une ligne par type de document, année courante, `prochain = 1` |
| Paramètres de facturation | Valeurs par défaut belges (TVA 21 %, échéance 30 j) |
| Textes de devis | `parametres_textes` — modèles neutres |
| Barème tarifaire | **Vide** — c'est au client de le saisir |

### Ne doit JAMAIS être créé

- Aucun client, devis, chantier, mission, facture, paiement
- Aucun véhicule, aucun article de stock
- **Aucune donnée Roovers, sous aucune forme, y compris en valeur de repli**
- Aucun document, aucun fichier dans le Storage
- Aucun utilisateur de test

État cible à la fin : **`PRÊT À CONFIGURER`** — la structure existe, les données métier
sont à zéro.

---

## 5. `creer_organisation()` — implémentation

À placer dans une migration `0039_creer_organisation.sql`. Colonnes vérifiées contre le
schéma réel du 19/07/2026.

```sql
create or replace function public.creer_organisation(
  p_nom            text,
  p_email_admin    text,
  p_nom_admin      text,
  p_bce            text default null,
  p_tva            text default null,
  p_adresse        text default null,
  p_cp             text default null,
  p_ville          text default null,
  p_tel            text default null,
  p_iban           text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org   uuid;
  v_admin uuid;
  v_annee int := extract(year from now())::int;
begin
  -- Réservé à l'éditeur : à appeler depuis une Edge Function en service_role,
  -- JAMAIS exposé au rôle authenticated (voir GRANT en fin de fichier).
  if p_nom is null or btrim(p_nom) = '' then
    raise exception 'Le nom de l''entreprise est obligatoire' using errcode='22023';
  end if;
  if p_email_admin is null or position('@' in p_email_admin) = 0 then
    raise exception 'E-mail administrateur invalide' using errcode='22023';
  end if;

  insert into organisations (nom, bce, tva, adresse, cp, ville, tel, iban,
                             pays, devise_defaut, actif)
  values (btrim(p_nom), p_bce, p_tva, p_adresse, p_cp, p_ville, p_tel, p_iban,
          'BE', 'EUR', true)
  returning id into v_org;

  -- Rôles et capacités standards (fonction déjà existante).
  perform provisionner_roles_standard(v_org);

  -- Administrateur : ligne d'invitation, auth_id NULL jusqu'à sa 1re connexion Google.
  insert into utilisateurs (org_id, email, nom, actif, metier)
  values (v_org, lower(btrim(p_email_admin)), btrim(p_nom_admin), true, 'bureau')
  returning id into v_admin;

  -- Rôle administrateur.
  insert into utilisateur_roles (utilisateur_id, role_id)
  select v_admin, r.id from roles r
   where r.org_id = v_org and r.cle = 'administrateur';

  -- Compteurs de numérotation, année courante.
  insert into sequences (org_id, type, annee, prochain)
  values (v_org,'devis',v_annee,1), (v_org,'facture',v_annee,1),
         (v_org,'avoir',v_annee,1), (v_org,'mission',v_annee,1)
  on conflict (org_id, type, annee) do nothing;

  perform emettre_evenement(v_org, 'Organisation.Creee', 'organisation',
                            v_org, v_admin,
                            jsonb_build_object('nom', p_nom, 'admin', p_email_admin));

  return jsonb_build_object(
    'org_id', v_org, 'admin_id', v_admin, 'statut', 'PRET_A_CONFIGURER');
end $$;

-- Surtout pas d'exposition publique : sinon n'importe qui crée des tenants.
revoke all on function public.creer_organisation(
  text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
```

**Points de vigilance avant application :**

1. Vérifie la clé `'administrateur'` réellement produite par `provisionner_roles_standard`
   (`select cle from roles where org_id = …`), et la valeur autorisée pour
   `utilisateurs.metier` (`NOT NULL`). Adapte si nécessaire.
2. Vérifie que `sequences` a bien une contrainte unique `(org_id, type, annee)` — sinon
   le `on conflict` échoue.
3. Vérifie les types réellement utilisés dans `sequence_suivante` avant de figer la liste.

Exécute d'abord dans une branche Supabase ou une transaction annulée, jamais directement
en production.

---

## 6. Le cas `sous_traitants`

Après lecture du schéma, cette table n'est **pas** un registre de sous-traitants déménageurs :
`nom`, `role`, `pays_traitement`, `garanties`, `contrat_reference`. C'est le **registre RGPD
des sous-traitants**, au sens de l'article 30.

Deux lectures possibles, et tu dois trancher :

- **Registre de l'éditeur** (Supabase, Vercel, Google) — alors pas de `org_id`, mais une
  policy en lecture seule pour tous les utilisateurs authentifiés :
  ```sql
  create policy st_lecture on sous_traitants for select to authenticated using (true);
  ```
- **Registre propre à chaque entreprise cliente** — alors `org_id NOT NULL` + policy
  standard, comme les autres tables.

Dans les deux cas, **l'état actuel — RLS activée, 0 policy — est intenable** : la table
est totalement inaccessible et l'obligation RGPD n'est pas outillée.

---

## 7. Protocole de validation — obligatoire avant le 2ᵉ client

Ce protocole n'a de valeur que s'il est exécuté **après** les corrections P0.

### Étape 1 — Créer ORG_B
```sql
select creer_organisation('Déménagements Test SPRL','test-admin@exemple.be','Admin Test');
```
Attendu : `statut = PRET_A_CONFIGURER`.

### Étape 2 — Vérifier la virginité
```sql
select 'clients' t, count(*) from clients where org_id = :org_b
union all select 'affaires', count(*) from affaires where org_id = :org_b
union all select 'factures', count(*) from factures where org_id = :org_b
union all select 'vehicules', count(*) from vehicules where org_id = :org_b
union all select 'missions', count(*) from missions where org_id = :org_b
union all select 'documents_instances', count(*) from documents_instances where org_id = :org_b;
```
**Attendu : 0 partout.** Une seule ligne non nulle = échec.

```sql
select nom, iban, email, tel from organisations where id = :org_b;
```
**Aucune valeur Roovers ne doit apparaître.**

### Étape 3 — Isolation en lecture
```sql
begin;
select set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"<auth_id_B>","org_id":"<org_b>"}', true);
set local role authenticated;

select 'tables' src, count(*) from clients
union all select 'v_ca_signe',      count(*) from v_ca_signe
union all select 'v_charge_membre', count(*) from v_charge_membre
union all select 'v_factures_solde',count(*) from v_factures_solde;
rollback;
```
**Attendu : 0 partout.** Aujourd'hui, `v_ca_signe` renvoie 1 et `v_charge_membre` renvoie 5.
Ce test doit être rejoué **après** `security_invoker = on`, et il doit passer.

### Étape 4 — Isolation en écriture
Connecté en tant qu'utilisateur B dans l'application réelle, tenter :
- `update clients set nom='X' where id = '<id_client_A>'` → **0 ligne affectée**
- `select * from affaires where id = '<id_affaire_A>'` → **0 ligne**
- appel `cmd_transition_affaire('<affaire_A>', …)` → **exception**

### Étape 5 — Storage
Connecté en B, tenter de lire `org/{org_a}/…` → **refusé**.
Tenter de lister le bucket → **refusé**.

### Étape 6 — Parcours complet dans ORG_B
Client → devis → PDF → **vérifier l'en-tête du PDF** → conversion en chantier →
planification → facture → **vérifier que le numéro part à 1** → paiement.

L'étape « vérifier l'en-tête du PDF » est celle qui attrape la contamination Roovers.
Ne la saute pas.

### Étape 7 — Automatiser
Ces tests doivent devenir un fichier `packages/domaine/tests/isolation.test.js` exécuté
en CI. Un test d'isolation qu'on ne rejoue pas à chaque déploiement finit toujours par
être faux.

---

## 8. Ordre d'exécution recommandé

| # | Action | Bloque quoi |
|---|---|---|
| 1 | `pg_dump` de sauvegarde | tout le reste |
| 2 | `security_invoker = on` sur les 3 vues | 2ᵉ client |
| 3 | Bucket privé + policies par chemin | 1er upload |
| 4 | Purge Roovers du code + dépôt en privé | 1er devis d'un autre tenant |
| 5 | Mode démo sous drapeau explicite | tout déploiement |
| 6 | `supabase db pull` → `0038_baseline.sql` | reproductibilité |
| 7 | `creer_organisation()` + policies manquantes | création de tenant |
| 8 | Edge Function `inviter-membre` | onboarding autonome |
| 9 | Écran d'onboarding | vente sans intervention manuelle |
| 10 | Protocole §7 rejoué en entier | **verrouillage** |

Les étapes 2 à 5 se font en une soirée. C'est le meilleur rapport effort/risque de tout
le projet.

---

## 9. Ce qui restera à décider plus tard

- **Facturation de tes clients** : Mollie est absent du code. Tant que tu factures à la main,
  ce n'est pas bloquant.
- **Peppol** : absent. Obligatoire en Belgique pour le B2B depuis 2026 — à traiter avant de
  vendre à des clients qui facturent des entreprises, pas avant le lancement.
- **Isolation par base de données** plutôt que par `org_id` : inutile à ton échelle. La RLS
  suffit largement, à condition qu'aucune vue ni fonction ne la contourne. C'est exactement
  la leçon de la fuite actuelle.
