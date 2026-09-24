-- =============================================================================
-- CALE SUPABASE — ce que Supabase fournit et qu'un Postgres nu n'a pas.
--
-- POURQUOI. Les 204 migrations du dépôt s'appuient sur des objets que Supabase
-- crée AVANT toute migration : le schéma `auth` et sa fonction `auth.uid()`
-- (117 usages, c'est le pivot de tout le RLS), `auth.jwt()`, le schéma
-- `storage` et ses tables, les rôles `anon` / `authenticated` / `service_role`,
-- et le schéma `extensions`. Sans eux, rejouer les migrations sur un Postgres
-- vide échoue à la première politique RLS — ce qui rendrait la vérification
-- impossible, alors que c'est justement là que se cachent les incidents les
-- plus coûteux.
--
-- CE QUE CETTE CALE EST, ET N'EST PAS. Elle reproduit la SURFACE des objets :
-- mêmes noms, mêmes signatures, mêmes types de retour. Elle ne reproduit pas
-- le comportement d'authentification réel — `auth.uid()` lit ici un réglage de
-- session au lieu d'un JWT vérifié. C'est suffisant pour ce qu'on teste : que
-- les 204 migrations s'appliquent dans l'ordre, sur une base vierge, sans
-- erreur. Ce n'est PAS un test du RLS lui-même, et ce fichier ne doit jamais
-- être joué sur une vraie base.
--
-- COMMENT S'EN SERVIR EN TEST. `select set_config('cale.uid', '<uuid>', true)`
-- fait renvoyer cet identifiant à `auth.uid()` pour la transaction en cours.
-- =============================================================================

-- ── Les rôles, tels que Supabase les nomme ──────────────────────────────────
-- `nologin` : ce sont des rôles de permission, jamais des comptes de connexion.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon')
    then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated')
    then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')
    then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator')
    then create role authenticator noinherit login; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_admin')
    then create role supabase_admin nologin noinherit bypassrls; end if;
  -- Rôles de service Supabase : une migration leur accorde des droits
  -- (0014 sur le schéma auth). Sans eux, le rejeu s'arrête à la 14ᵉ.
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin')
    then create role supabase_auth_admin nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_storage_admin')
    then create role supabase_storage_admin nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'dashboard_user')
    then create role dashboard_user nologin noinherit; end if;
end $$;

grant anon, authenticated, service_role to authenticator;

-- ── Les schémas ─────────────────────────────────────────────────────────────
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

grant usage on schema auth, storage, extensions to anon, authenticated, service_role;

-- ── Les extensions, là où Supabase les installe ─────────────────────────────
-- `extensions.digest` et `extensions.gen_random_bytes` sont appelés en toutes
-- lettres par une migration : pgcrypto DOIT vivre dans ce schéma-là.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
-- citext vit dans PUBLIC en production (vérifié le 2026-09-19) : ses colonnes
-- s'y réfèrent sans préfixe. Le déplacer ici casserait le socle.
create extension if not exists citext;

-- La publication temps réel de Supabase : certaines extractions de schéma y
-- rattachent des tables. Vide ici, elle suffit à ce que la référence tienne.
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    then create publication supabase_realtime; end if;
end $$;

-- ── auth.users : la table à laquelle les clés étrangères se rattachent ──────
-- Colonnes réduites à ce que les migrations référencent réellement. Supabase
-- en expose davantage ; en ajouter ici donnerait l'illusion de les tester.
create table if not exists auth.users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

-- ── auth.uid() / auth.jwt() / auth.email() ──────────────────────────────────
-- En production, ces fonctions lisent les revendications d'un JWT vérifié.
-- Ici, elles lisent un réglage de session : même signature, même type de
-- retour, comportement volontairement inerte.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('cale.uid', true), '')::uuid
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('cale.jwt', true), ''), '{}')::jsonb
$$;

create or replace function auth.email() returns text
language sql stable as $$
  select nullif(current_setting('cale.email', true), '')
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('cale.role', true), ''), 'authenticated')
$$;

-- ── storage : buckets, objets, et le découpage de chemin ────────────────────
create table if not exists storage.buckets (
  id          text primary key,
  name        text not null,
  public      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists storage.objects (
  id          uuid primary key default gen_random_uuid(),
  bucket_id   text references storage.buckets(id),
  name        text,
  owner       uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- Découpe « dossier/sous-dossier/fichier.pdf » en tableau de segments, en
-- écartant le nom de fichier — c'est ce que fait la fonction de Supabase, et
-- les politiques RLS de stockage en dépendent (`storage.foldername(name)[1]`).
create or replace function storage.foldername(name text) returns text[]
language plpgsql immutable as $$
declare parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1:array_length(parts, 1) - 1];
end $$;

create or replace function storage.filename(name text) returns text
language sql immutable as $$
  select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)]
$$;

create or replace function storage.extension(name text) returns text
language sql immutable as $$
  select nullif(split_part(storage.filename(name), '.', 2), '')
$$;

-- ── Les droits par défaut, comme sur un projet Supabase neuf ────────────────
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
