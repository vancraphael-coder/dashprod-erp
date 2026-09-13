-- 0184 — La chaîne d'empreintes utilise le sha256 intégré, pas pgcrypto.
--
-- INCIDENT, survenu au premier appel réel. `engagement_inscrire` appelait
-- `digest(..., 'sha256')` de pgcrypto. Or les fonctions de la chaîne portent
-- `set search_path to 'public'` — un durcissement voulu contre le
-- détournement de résolution de noms — et pgcrypto est installé dans le
-- schéma `extensions`. Résultat : « function digest(text, unknown) does not
-- exist », et aucun événement inscriptible.
--
-- Deux issues : qualifier en `extensions.digest`, ou utiliser `sha256(bytea)`,
-- intégré à PostgreSQL depuis la version 11 et donc résolu par `pg_catalog`,
-- toujours implicitement dans le search_path.
--
-- La seconde est retenue : elle supprime la dépendance à une extension et au
-- schéma où l'hébergeur a choisi de l'installer. Une chaîne probante ne doit
-- pas pouvoir se rompre parce qu'une extension a déménagé.
--
-- Leçon retenue : `search_path` durci et extension ne vont pas ensemble. Tout
-- appel à pgcrypto depuis une fonction à search_path fixe doit être qualifié
-- ou remplacé par un équivalent du catalogue.

create or replace function public.engagement_inscrire(
  p_engagement uuid, p_type text, p_par_org uuid, p_charge jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_rang bigint; v_prec text; v_acteur uuid; v_au timestamptz := now();
  v_empreinte text; v_id uuid;
begin
  select coalesce(max(rang), 0) + 1 into v_rang
    from engagement_evenements where engagement_id = p_engagement;
  select empreinte into v_prec
    from engagement_evenements
   where engagement_id = p_engagement and rang = v_rang - 1;

  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = p_par_org;

  v_empreinte := encode(sha256(convert_to(
    coalesce(v_prec, '') || '|' || p_engagement::text || '|' || v_rang::text
    || '|' || p_type || '|' || p_par_org::text || '|' || v_au::text
    || '|' || coalesce(p_charge::text, '{}'), 'UTF8')), 'hex');

  insert into engagement_evenements (
    engagement_id, rang, type, par_org, par_utilisateur, au, charge,
    empreinte, empreinte_prec)
  values (p_engagement, v_rang, p_type, p_par_org, v_acteur, v_au, p_charge,
          v_empreinte, v_prec)
  returning id into v_id;
  return v_id;
end $function$;

create or replace function public.cmd_verifier_chaine_engagement(p_engagement uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare r record; v_prec text := null; v_attendue text;
begin
  if not exists (select 1 from engagements e where e.id = p_engagement
                  and jwt_org() in (e.org_donneur, e.org_prestataire)) then
    raise exception 'Engagement introuvable' using errcode = '42501';
  end if;
  for r in select * from engagement_evenements
            where engagement_id = p_engagement order by rang loop
    v_attendue := encode(sha256(convert_to(
      coalesce(v_prec, '') || '|' || r.engagement_id::text || '|' || r.rang::text
      || '|' || r.type || '|' || r.par_org::text || '|' || r.au::text
      || '|' || coalesce(r.charge::text, '{}'), 'UTF8')), 'hex');
    if r.empreinte <> v_attendue or coalesce(r.empreinte_prec,'') <> coalesce(v_prec,'') then
      return jsonb_build_object('ok', false, 'rang_rompu', r.rang);
    end if;
    v_prec := r.empreinte;
  end loop;
  return jsonb_build_object('ok', true, 'maillons', coalesce(
    (select count(*) from engagement_evenements where engagement_id = p_engagement), 0));
end $function$;

revoke execute on function public.engagement_inscrire(uuid, text, uuid, jsonb)
  from public, anon, authenticated;
revoke execute on function public.cmd_verifier_chaine_engagement(uuid) from public, anon;
grant execute on function public.cmd_verifier_chaine_engagement(uuid)
  to authenticated, service_role;
