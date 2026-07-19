-- =============================================================================
-- 0038_corrections_securite.sql
-- Dashprod ERP — corrections des constats P0 et P1 de AUDIT_REAL.md
-- Généré le 19/07/2026 · PostgreSQL 17.6
--
-- NON APPLIQUÉE. Aucune écriture n'a été faite sur la base de production.
--
-- AVANT D'APPLIQUER :
--   1. pg_dump complet de la base.
--   2. Appliquer d'abord sur une branche Supabase (supabase branches create).
--   3. La section 2 (Storage) CASSE le code actuel : lire la note avant d'exécuter.
--   4. Rejouer le protocole de test de MULTI_TENANT.md §7 après application.
-- =============================================================================

begin;

-- =============================================================================
-- SECTION 1 — CRITICAL : fermer la fuite inter-tenant des vues
-- -----------------------------------------------------------------------------
-- Constat prouvé : une organisation fictive lit v_ca_signe (CA signé) et
-- v_charge_membre (effectif nominatif + heures) de Roovers.
-- security_invoker = on fait s'exécuter la vue avec les droits de l'appelant,
-- donc sous RLS. Aucune régression attendue : les policies sous-jacentes
-- filtrent déjà sur org_id = jwt_org().
-- =============================================================================

alter view public.v_ca_signe        set (security_invoker = on);
alter view public.v_charge_membre   set (security_invoker = on);
alter view public.v_factures_solde  set (security_invoker = on);

-- Vérification immédiate (doit renvoyer 0, 0, 0) :
--   begin;
--   select set_config('request.jwt.claims',
--     '{"role":"authenticated","org_id":"11111111-1111-1111-1111-111111111111"}', true);
--   set local role authenticated;
--   select (select count(*) from v_ca_signe),
--          (select count(*) from v_charge_membre),
--          (select count(*) from v_factures_solde);
--   rollback;


-- =============================================================================
-- SECTION 2 — CRITICAL : Storage privé et isolé par organisation
-- -----------------------------------------------------------------------------
-- ATTENTION — CETTE SECTION CASSE LE CODE ACTUEL.
-- adaptateur.js (urlConditionsCbd, televerserConditionsCbd) utilise
-- getPublicUrl(), qui cesse de fonctionner sur un bucket privé.
-- Déployer d'abord la version du frontend utilisant createSignedUrl(),
-- ou exécuter cette section juste après le déploiement frontend.
--
-- Le bucket contient 0 objet à ce jour : aucune migration de fichiers requise.
-- Convention de chemin imposée :  org/{org_id}/{categorie}/{fichier}
-- =============================================================================

update storage.buckets set public = false where id = 'documents';

drop policy if exists documents_lecture  on storage.objects;
drop policy if exists documents_ecriture on storage.objects;

create policy doc_lecture_org on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'org'
    and (storage.foldername(name))[2] = jwt_org()::text
  );

create policy doc_ecriture_org on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'org'
    and (storage.foldername(name))[2] = jwt_org()::text
  );

create policy doc_maj_org on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[2] = jwt_org()::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[2] = jwt_org()::text
  );

create policy doc_suppression_org on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[2] = jwt_org()::text
    and acteur_a_capacite('gerer_referentiels')
  );

-- Si les CGV doivent rester lisibles sans connexion (lien envoyé au client final),
-- créer un bucket public dédié plutôt que de rouvrir 'documents' :
--   insert into storage.buckets (id, name, public) values ('public-cgv','public-cgv',true);


-- =============================================================================
-- SECTION 3 — HIGH : tables avec RLS activée mais aucune policy
-- -----------------------------------------------------------------------------
-- Ces tables sont aujourd'hui totalement inaccessibles depuis l'application.
-- =============================================================================

-- Référentiels globaux, lecture seule pour tout utilisateur connecté.
create policy capacites_lecture on public.capacites
  for select to authenticated using (true);

create policy role_capacites_lecture on public.role_capacites
  for select to authenticated
  using (exists (select 1 from roles r
                  where r.id = role_capacites.role_id
                    and r.org_id = jwt_org()));

-- Compteurs de numérotation : lecture seule côté client.
-- L'écriture reste réservée aux fonctions SECURITY DEFINER (cmd_emettre_facture).
create policy sequences_lecture on public.sequences
  for select to authenticated using (org_id = jwt_org());

-- Registre RGPD des traitements : lecture par l'organisation,
-- écriture réservée au porteur de la capacité.
create policy registre_lecture on public.registre_traitements
  for select to authenticated using (org_id = jwt_org());

create policy registre_ecriture on public.registre_traitements
  for all to authenticated
  using (org_id = jwt_org() and acteur_a_capacite('gerer_referentiels'))
  with check (org_id = jwt_org() and acteur_a_capacite('gerer_referentiels'));

-- sous_traitants : registre RGPD des sous-traitants (art. 30), sans org_id.
-- ⚠ CHOIX À TRANCHER — voir MULTI_TENANT.md §6.
-- Option retenue ici : registre de l'ÉDITEUR, lisible par tous, écriture réservée.
-- Si le registre doit être propre à chaque entreprise cliente, NE PAS appliquer
-- ce bloc et ajouter d'abord une colonne org_id NOT NULL.
create policy sous_traitants_lecture on public.sous_traitants
  for select to authenticated using (true);


-- =============================================================================
-- SECTION 4 — MEDIUM : retirer les RPC métier au rôle anon
-- -----------------------------------------------------------------------------
-- ~30 fonctions SECURITY DEFINER sont appelables sans authentification via
-- /rest/v1/rpc/<nom>. Sans jeton, jwt_org() est NULL et les contrôles internes
-- échouent — mais la surface d'attaque est gratuite et expose la liste des
-- commandes métier. On la retire.
--
-- cmd_reclamer_invitation est CONSERVÉE pour authenticated : c'est la porte
-- d'entrée légitime d'un invité. Elle n'est pas nécessaire à anon.
-- =============================================================================

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
       and (p.proname like 'cmd\_%'
            or p.proname in ('acteur_a_capacite','mon_profil',
                             'provisionner_roles_standard','version_modele_active'))
  loop
    execute format('revoke execute on function %s from anon', f.sig);
  end loop;
end $$;

-- Les fonctions déclencheurs (triggers) n'ont pas à être appelables en RPC.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from anon, authenticated', f.sig);
  end loop;
end $$;


-- =============================================================================
-- SECTION 5 — MEDIUM : figer le search_path des fonctions restantes
-- -----------------------------------------------------------------------------
-- Aucune n'est SECURITY DEFINER, le risque réel est faible.
-- Durcissement sans effet de bord.
-- =============================================================================

alter function public.jwt_org()                  set search_path = public;
alter function public.touch_updated_at()         set search_path = public;
alter function public.refuser_mutation()         set search_path = public;
alter function public.emettre_evenement(uuid, text, text, uuid, uuid, jsonb)
                                                 set search_path = public;
alter function public.bloquer_update_etat()      set search_path = public;
alter function public.bloquer_facture_emise()    set search_path = public;
alter function public.bloquer_instance_gelee()   set search_path = public;

-- transition_permise et sequence_suivante : vérifier la signature exacte avant
-- d'exécuter, elles sont surchargées ou paramétrées.
--   select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and p.proname in ('transition_permise','sequence_suivante');


-- =============================================================================
-- SECTION 6 — Cloisonner les données RH sensibles
-- -----------------------------------------------------------------------------
-- donnees_paie est déjà correctement protégée par acteur_a_capacite('voir_paie').
-- conges et documents_rh ne le sont pas : tout salarié connecté voit les congés
-- et les documents RH de tous ses collègues.
--
-- ⚠ VÉRIFIER LE NOM EXACT DES POLICIES EXISTANTES AVANT DE LES REMPLACER :
--   select policyname, cmd, qual from pg_policies
--    where schemaname='public' and tablename in ('conges','documents_rh');
-- Le bloc ci-dessous est commenté volontairement — à adapter, pas à exécuter tel quel.
-- =============================================================================

-- drop policy if exists <nom_existant> on public.documents_rh;
-- create policy documents_rh_acces on public.documents_rh
--   for all to authenticated
--   using (org_id = jwt_org()
--          and (acteur_a_capacite('voir_paie')
--               or utilisateur_id = (select id from utilisateurs
--                                     where auth_id = auth.uid() and org_id = jwt_org())))
--   with check (org_id = jwt_org() and acteur_a_capacite('voir_paie'));


-- =============================================================================
-- SECTION 7 — Hygiène de schéma (à examiner, non appliqué)
-- -----------------------------------------------------------------------------
-- 1. organisations porte DEUX jeux de colonnes d'adresse :
--      adresse_lignes / adresse_cp / adresse_ville / adresse_subdiv / adresse_pays
--      adresse / cp / ville
--    Le code n'utilise que le second. Le premier est mort.
--    Ne pas supprimer sans vérifier qu'aucune migration ni fonction ne s'y réfère.
--
-- 2. Extension citext installée dans public :
--      alter extension citext set schema extensions;
--    ⚠ utilisateurs.email est de type citext — tester en branche d'abord.
--
-- 3. Expiration des invitations : ajouter utilisateurs.invite_le timestamptz
--    et refuser dans cmd_reclamer_invitation au-delà de 30 jours.
-- =============================================================================

commit;

-- =============================================================================
-- APRÈS APPLICATION — vérifications obligatoires
-- =============================================================================
-- 1. Le linter ne doit plus signaler ni security_definer_view,
--    ni rls_enabled_no_policy, ni public_bucket_allows_listing.
-- 2. Rejouer MULTI_TENANT.md §7 étapes 3 à 5 : tout doit renvoyer 0.
-- 3. Se connecter en tant qu'utilisateur Roovers réel et vérifier que
--    les 16 clients, 16 affaires et 8 véhicules sont toujours visibles.
--    Une régression ici signifie qu'une policy est trop stricte.
-- 4. Vérifier qu'aucun écran ne s'est vidé (Bareme, Textes, Archivage,
--    Ressources sont les plus exposés aux policies de la section 3).
-- =============================================================================
