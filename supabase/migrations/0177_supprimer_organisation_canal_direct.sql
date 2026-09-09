-- 0177 — `cmd_supprimer_organisation` : le canal direct est un appelant légitime.
--
-- Défaut trouvé en éprouvant 0176 : la garde n'acceptait que `est_editeur()`
-- ou un jeton `service_role`. Une connexion directe à la base (psql, connecteur
-- d'administration) arrive sans jeton : `auth.jwt()` est nul, `jwt_org()` aussi,
-- donc la commande se refusait au seul canal qui a de toute façon tous les
-- droits. Une garde qui n'arrête que les gens honnêtes n'est pas une garde,
-- c'est une gêne.
--
-- Le rôle propriétaire est donc reconnu explicitement. Rien n'est affaibli côté
-- REST : `anon` reste sans droit d'exécution, et un utilisateur connecté doit
-- toujours porter le drapeau éditeur.

create or replace function public.cmd_supprimer_organisation(
  p_org uuid, p_confirmation text, p_motif text default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_role    text := coalesce(auth.jwt() ->> 'role', '');
  -- `service_role` = jeton de service ; `postgres`/`supabase_admin` = canal
  -- direct d'administration, qui possede deja les tables.
  v_service boolean := (v_role = 'service_role')
                        or (session_user in ('postgres', 'supabase_admin'));
  v_nom text; v_bce text; v_editeur boolean;
  v_acteur uuid; v_comptages jsonb := '{}'::jsonb;
  v_tables text[]; v_t text; v_n bigint; v_total bigint := 0;
  v_passe integer; v_efface bigint; v_reste text[];
  r record;
begin
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

  if v_editeur then
    raise exception 'Refuse : cette organisation porte le drapeau editeur. Deplacez-le avant.'
      using errcode = '42501';
  end if;

  if not v_service and p_org = jwt_org() then
    raise exception 'Refuse : on ne supprime pas l''organisation depuis laquelle on agit'
      using errcode = '42501';
  end if;

  if coalesce(btrim(p_confirmation), '') <> v_nom then
    raise exception 'Refuse : confirmation attendue = le nom exact de l''organisation (%)', v_nom
      using errcode = '22023';
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() limit 1;

  select array_agg(c.table_name::text order by c.table_name) into v_tables
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
   where c.table_schema = 'public' and c.column_name = 'org_id'
     and t.table_type = 'BASE TABLE';

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
