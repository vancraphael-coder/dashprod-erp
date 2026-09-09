-- 0176 — Supprimer une organisation : commande gardée, tracée, auto-entretenue.
--
-- Pourquoi une commande plutôt qu'un `delete` à la main : supprimer une
-- organisation est un besoin permanent (fin de contrat client, effacement
-- RGPD, nettoyage d'un bac à sable). Fait à la main une fois, c'est une dette
-- qui se repaie à chaque fois. Fait ici, c'est un geste unique, gardé et tracé.
--
-- Trois propriétés voulues :
--
--   * Auto-entretenue. L'ordre de purge n'est pas écrit en dur : il est
--     découvert dans le catalogue à l'exécution. Une table ajoutée demain avec
--     `org_id` est purgée sans que personne y pense. C'est le seul moyen
--     d'éviter la fuite silencieuse qu'une liste figée finit toujours par
--     produire.
--   * Vérifiée. Après la purge, la fonction relit chaque table. S'il reste une
--     ligne, elle lève — la transaction entière est annulée. Une purge
--     partielle est pire qu'une purge refusée.
--   * Tracée. Ce qui a disparu est compté AVANT et consigné dans
--     `suppressions_organisation`, qui survit à la purge (sa colonne s'appelle
--     `organisation_id`, pas `org_id` : elle est donc hors du périmètre de
--     purge par construction, et non par exception).
--
-- Ce que la commande ne fait pas : elle ne touche pas à `auth.users`. Un compte
-- de connexion appartient à la personne, pas à l'organisation qui l'employait.

-- =============================================================================
-- 1. Le registre des suppressions — append-only.
-- =============================================================================

create table if not exists public.suppressions_organisation (
  id               uuid        not null default gen_random_uuid() primary key,
  organisation_id  uuid        not null,
  nom              text        not null,
  bce              text,
  supprime_le      timestamptz not null default now(),
  supprime_par     uuid,
  motif            text,
  comptages        jsonb       not null
);

alter table public.suppressions_organisation enable row level security;

drop policy if exists suppressions_lecture_editeur on public.suppressions_organisation;
create policy suppressions_lecture_editeur on public.suppressions_organisation
  for select using (est_editeur());

create or replace function public.suppression_organisation_immuable()
returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  raise exception 'Le registre des suppressions ne se modifie pas' using errcode = '42501';
end $function$;

drop trigger if exists trg_suppression_organisation_immuable on public.suppressions_organisation;
create trigger trg_suppression_organisation_immuable
  before update or delete on public.suppressions_organisation
  for each row execute function public.suppression_organisation_immuable();

-- =============================================================================
-- 2. La commande.
-- =============================================================================

create or replace function public.cmd_supprimer_organisation(
  p_org uuid, p_confirmation text, p_motif text default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_role    text := coalesce(auth.jwt() ->> 'role', '');
  v_service boolean := (v_role = 'service_role');
  v_nom text; v_bce text; v_editeur boolean;
  v_acteur uuid; v_comptages jsonb := '{}'::jsonb;
  v_tables text[]; v_t text; v_n bigint; v_total bigint := 0;
  v_passe integer; v_efface bigint; v_reste text[];
  r record;
begin
  -- ---------------------------------------------------------------------
  -- Gardes. Aucune n'est contournable par argument.
  -- ---------------------------------------------------------------------
  if not v_service and not est_editeur() then
    raise exception 'Refuse : seul l''editeur de la plateforme supprime une organisation'
      using errcode = '42501';
  end if;
  if p_org is null then
    raise exception 'Organisation a supprimer non fournie' using errcode = '22023';
  end if;

  select o.nom, o.bce, coalesce(o.est_editeur, false)
    into v_nom, v_bce, v_editeur
    from organisations o where o.id = p_org;
  if not found then
    raise exception 'Organisation introuvable' using errcode = '22023';
  end if;

  -- L'organisation editeur porte l'identite de la plateforme : la supprimer
  -- rendrait `est_editeur()` faux partout, donc cette commande inutilisable.
  if v_editeur then
    raise exception 'Refuse : cette organisation porte le drapeau editeur. Deplacez-le avant.'
      using errcode = '42501';
  end if;

  -- On ne scie pas la branche sur laquelle on est assis.
  if not v_service and p_org = jwt_org() then
    raise exception 'Refuse : on ne supprime pas l''organisation depuis laquelle on agit'
      using errcode = '42501';
  end if;

  -- Garde-fou anti-erreur de main : le nom exact, recopie.
  if coalesce(btrim(p_confirmation), '') <> v_nom then
    raise exception 'Refuse : confirmation attendue = le nom exact de l''organisation (%)', v_nom
      using errcode = '22023';
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() limit 1;

  -- ---------------------------------------------------------------------
  -- Perimetre, decouvert dans le catalogue.
  -- ---------------------------------------------------------------------
  select array_agg(c.table_name::text order by c.table_name) into v_tables
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
   where c.table_schema = 'public' and c.column_name = 'org_id'
     and t.table_type = 'BASE TABLE';

  -- ---------------------------------------------------------------------
  -- Comptage AVANT purge — la trace de ce qui a disparu.
  -- ---------------------------------------------------------------------
  foreach v_t in array v_tables loop
    execute format('select count(*) from public.%I where org_id = $1', v_t)
      into v_n using p_org;
    if v_n > 0 then
      v_comptages := v_comptages || jsonb_build_object(v_t, v_n);
      v_total := v_total + v_n;
    end if;
  end loop;

  insert into suppressions_organisation (organisation_id, nom, bce, supprime_par, motif, comptages)
  values (p_org, v_nom, v_bce, v_acteur, nullif(btrim(coalesce(p_motif, '')), ''), v_comptages);

  -- ---------------------------------------------------------------------
  -- Les garde-fous d'immuabilite (append-only, dossier clos) bloquent le
  -- DELETE : ils protegent la donnee vivante, pas la fin de vie d'une
  -- organisation. Suspendus le temps de la purge, remis avant de rendre la
  -- main, y compris en cas d'echec.
  -- ---------------------------------------------------------------------
  foreach v_t in array v_tables loop
    execute format('alter table public.%I disable trigger user', v_t);
  end loop;
  for r in
    select distinct c.conrelid::regclass::text as t
      from pg_constraint c
     where c.contype = 'f'
       and c.confrelid::regclass::text = any(v_tables)
       and not (c.conrelid::regclass::text = any(v_tables))
  loop
    execute format('alter table public.%I disable trigger user', r.t);
  end loop;

  begin
    -- Satellites : tables sans `org_id` rattachees a une table qui en a.
    for r in
      select c.conrelid::regclass::text as enfant,
             (select a.attname from pg_attribute a
               where a.attrelid = c.conrelid and a.attnum = c.conkey[1]) as col_enfant,
             c.confrelid::regclass::text as parent,
             (select a.attname from pg_attribute a
               where a.attrelid = c.confrelid and a.attnum = c.confkey[1]) as col_parent
        from pg_constraint c
       where c.contype = 'f'
         and c.confrelid::regclass::text = any(v_tables)
         and not (c.conrelid::regclass::text = any(v_tables))
    loop
      execute format(
        'delete from public.%I where %I in (select %I from public.%I where org_id = $1)',
        r.enfant, r.col_enfant, r.col_parent, r.parent) using p_org;
    end loop;

    -- Purge principale. L'ordre des dependances n'est pas calcule : on passe
    -- et repasse, en laissant les violations de cle etrangere reporter la
    -- table au tour suivant. Converge en quelques passes ; la verification
    -- ci-dessous refuse tout residu.
    for v_passe in 1..12 loop
      v_efface := 0;
      foreach v_t in array v_tables loop
        begin
          execute format('delete from public.%I where org_id = $1', v_t) using p_org;
          get diagnostics v_n = row_count;
          v_efface := v_efface + v_n;
        exception when foreign_key_violation then
          null;
        end;
      end loop;
      exit when v_efface = 0;
    end loop;

    -- Verification. Une purge partielle est pire qu'une purge refusee.
    v_reste := array[]::text[];
    foreach v_t in array v_tables loop
      execute format('select count(*) from public.%I where org_id = $1', v_t)
        into v_n using p_org;
      if v_n > 0 then
        v_reste := v_reste || format('%s (%s)', v_t, v_n);
      end if;
    end loop;
    if array_length(v_reste, 1) > 0 then
      raise exception 'Purge incomplete, rien n''est supprime : %', array_to_string(v_reste, ', ')
        using errcode = '55000';
    end if;

    delete from organisations where id = p_org;

  exception when others then
    foreach v_t in array v_tables loop
      execute format('alter table public.%I enable trigger user', v_t);
    end loop;
    raise;
  end;

  foreach v_t in array v_tables loop
    execute format('alter table public.%I enable trigger user', v_t);
  end loop;
  for r in
    select distinct c.conrelid::regclass::text as t
      from pg_constraint c
     where c.contype = 'f'
       and c.confrelid::regclass::text = any(v_tables)
       and not (c.conrelid::regclass::text = any(v_tables))
  loop
    execute format('alter table public.%I enable trigger user', r.t);
  end loop;

  return jsonb_build_object('ok', true, 'organisation', v_nom, 'bce', v_bce,
                            'lignes_supprimees', v_total, 'detail', v_comptages);
end $function$;

revoke execute on function public.cmd_supprimer_organisation(uuid, text, text) from public, anon;
grant  execute on function public.cmd_supprimer_organisation(uuid, text, text) to authenticated, service_role;
