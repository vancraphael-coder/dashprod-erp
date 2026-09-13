-- 0195 — Les disponibilités d'un prestataire : rythme, exceptions, publication.
--
-- LE PRINCIPE, repris de 0181 et appliqué ici : on publie une DISPONIBILITÉ,
-- jamais une OCCUPATION. Un créneau est soit déclaré libre, soit absent — et
-- l'absence ne dit pas pourquoi. Publier un agenda d'occupation dirait à un
-- donneur d'ordre quand l'indépendant travaille pour un autre, et pour qui
-- probablement. C'est une information commerciale, elle ne traverse pas.
--
-- Conséquence assumée : un indépendant très occupé et un indépendant en
-- vacances présentent la même chose — rien. Personne ne peut distinguer les
-- deux, et c'est vérifié par un test du domaine.
--
-- TROIS SOURCES, UNE SEULE SAISIE.
--   · `disponibilites_regles`     le rythme habituel, par jour de semaine
--   · `disponibilites_exceptions` une date fermée (congé) ou ouverte (samedi)
--   · les ENGAGEMENTS acceptés    occupent le créneau AUTOMATIQUEMENT
--
-- Le troisième point est ce qui évite l'agenda qui ment. Sans lui, il faudrait
-- retirer sa disponibilité à la main après chaque acceptation — et on
-- l'oublierait, donc on recevrait des propositions pour des jours déjà pris.
--
-- UNE PROPOSITION N'OCCUPE RIEN. Elle peut être refusée. Bloquer la journée
-- dès la proposition permettrait à n'importe qui de geler l'agenda d'un
-- indépendant en le sollicitant.
--
-- LE MOTIF D'UNE EXCEPTION NE SE PUBLIE PAS. La colonne existe, elle est
-- lisible par son propriétaire seul, et la fonction publique ne la renvoie
-- jamais. Ce n'est pas un masquage par politique :
-- `cmd_dates_libres_prestataire` rend un `setof date` — un type de retour qui
-- ne peut pas fuiter ce qu'il ne contient pas.
--
-- CONVENTION DE JOUR : ISO, lundi = 1, dimanche = 7, fixée par une contrainte.
-- Pour qu'on n'ait plus jamais à se demander si dimanche vaut 0 ou 7.

create table if not exists public.disponibilites_regles (
  org_id  uuid    not null default jwt_org() references public.organisations(id),
  jour    integer not null,
  publie  boolean not null default true,
  maj_le  timestamptz not null default now(),
  constraint disponibilites_regles_pkey primary key (org_id, jour),
  constraint disponibilites_jour_iso check (jour between 1 and 7)
);

create table if not exists public.disponibilites_exceptions (
  org_id      uuid    not null default jwt_org() references public.organisations(id),
  date        date    not null,
  disponible  boolean not null,
  -- Privé. Ne sort d'aucune fonction publiable.
  motif       text,
  maj_le      timestamptz not null default now(),
  constraint disponibilites_exceptions_pkey primary key (org_id, date)
);

alter table public.disponibilites_regles enable row level security;
alter table public.disponibilites_exceptions enable row level security;

-- Écriture ET lecture réservées au propriétaire. La publication ne se fait pas
-- en ouvrant ces tables : elle se fait par une fonction qui ne rend que des
-- dates. C'est la différence entre « protéger par une politique » et « ne pas
-- exposer la donnée ».
drop policy if exists disponibilites_regles_tenant on public.disponibilites_regles;
create policy disponibilites_regles_tenant on public.disponibilites_regles
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());

drop policy if exists disponibilites_exceptions_tenant on public.disponibilites_exceptions;
create policy disponibilites_exceptions_tenant on public.disponibilites_exceptions
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());

-- Les dates libres d'un prestataire. C'est TOUT ce qui sort : ni état, ni
-- motif, ni nom de donneur d'ordre. `security definer` assumé — la fonction
-- lit les tables d'une AUTRE organisation, ce que le RLS interdit. C'est
-- précisément pourquoi son type de retour est `setof date` : le périmètre de
-- ce qu'elle peut divulguer EST sa signature.
create or replace function public.cmd_dates_libres_prestataire(
  p_org uuid, p_du date, p_au date)
returns setof date language sql stable security definer
set search_path to 'public'
as $function$
  with bornes as (
    -- Plage bornée à 120 jours : une requête sur dix ans ne doit pas devenir
    -- un moyen de sonder l'agenda d'un prestataire indéfiniment.
    select p_du as du, least(p_au, p_du + 120) as au
  ),
  jours as (
    select d::date as jour from bornes, generate_series(bornes.du, bornes.au, '1 day') d
  )
  select j.jour
    from jours j
    left join disponibilites_exceptions x
      on x.org_id = p_org and x.date = j.jour
   where
     -- Un engagement accepté occupe la journée, automatiquement. Une
     -- PROPOSITION n'occupe rien : elle peut être refusée, et bloquer dès la
     -- proposition permettrait de geler un agenda en sollicitant.
     not exists (select 1 from engagements e
                  where e.org_prestataire = p_org
                    and e.date_prestation = j.jour
                    and e.etat in ('acceptee', 'realisee', 'facturee'))
     and (
       x.disponible is true
       or (x.date is null and exists (
             select 1 from disponibilites_regles r
              where r.org_id = p_org and r.publie
                and r.jour = extract(isodow from j.jour)))
     )
   order by j.jour;
$function$;

revoke execute on function public.cmd_dates_libres_prestataire(uuid, date, date)
  from public, anon;
grant execute on function public.cmd_dates_libres_prestataire(uuid, date, date)
  to authenticated, service_role;

-- Mon propre calendrier : là, tout est visible, motifs compris. C'est mon
-- agenda, et le distinguer de ce qui se publie est tout l'objet de 0195.
create or replace function public.cmd_mon_calendrier(p_du date, p_au date)
returns table (jour date, etat text, pour text, motif text)
language sql stable security definer set search_path to 'public'
as $function$
  with jours as (
    select d::date as jour
      from generate_series(p_du, least(p_au, p_du + 120), '1 day') d
  )
  select j.jour,
         case
           when e.id is not null then 'pris'
           when x.disponible is false then 'ferme'
           when x.disponible is true then 'libre'
           when r.jour is not null then 'libre'
           else 'hors_regle'
         end,
         o.nom,
         case when x.disponible is false then x.motif else null end
    from jours j
    left join engagements e
      on e.org_prestataire = jwt_org() and e.date_prestation = j.jour
     and e.etat in ('acceptee', 'realisee', 'facturee')
    left join organisations o on o.id = e.org_donneur
    left join disponibilites_exceptions x
      on x.org_id = jwt_org() and x.date = j.jour
    left join disponibilites_regles r
      on r.org_id = jwt_org() and r.jour = extract(isodow from j.jour)
   order by j.jour;
$function$;

revoke execute on function public.cmd_mon_calendrier(date, date) from public, anon;
grant execute on function public.cmd_mon_calendrier(date, date)
  to authenticated, service_role;

create or replace function public.cmd_definir_rythme(p_jours integer[])
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid := jwt_org();
begin
  if v_org is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if exists (select 1 from unnest(coalesce(p_jours, '{}'::integer[])) j
              where j < 1 or j > 7) then
    return jsonb_build_object('ok', false, 'motif', 'jour hors 1..7');
  end if;

  delete from disponibilites_regles where org_id = v_org;
  insert into disponibilites_regles (org_id, jour)
  select v_org, j from unnest(coalesce(p_jours, '{}'::integer[])) j
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'jours', coalesce(p_jours, '{}'::integer[]));
end $function$;

create or replace function public.cmd_definir_exception(
  p_date date, p_disponible boolean, p_motif text default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid := jwt_org();
begin
  if v_org is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  -- `null` RETIRE l'exception et rend la main au rythme habituel — plutôt que
  -- de poser une exception « disponible », qui survivrait à un changement de
  -- rythme et finirait par surprendre.
  if p_disponible is null then
    delete from disponibilites_exceptions where org_id = v_org and date = p_date;
    return jsonb_build_object('ok', true, 'retiree', true);
  end if;
  insert into disponibilites_exceptions (org_id, date, disponible, motif)
  values (v_org, p_date, p_disponible, nullif(btrim(coalesce(p_motif, '')), ''))
  on conflict (org_id, date) do update
     set disponible = excluded.disponible, motif = excluded.motif,
         maj_le = now();
  return jsonb_build_object('ok', true, 'date', p_date, 'disponible', p_disponible);
end $function$;

revoke execute on function public.cmd_definir_rythme(integer[]) from public, anon;
grant execute on function public.cmd_definir_rythme(integer[])
  to authenticated, service_role;
revoke execute on function public.cmd_definir_exception(date, boolean, text)
  from public, anon;
grant execute on function public.cmd_definir_exception(date, boolean, text)
  to authenticated, service_role;
