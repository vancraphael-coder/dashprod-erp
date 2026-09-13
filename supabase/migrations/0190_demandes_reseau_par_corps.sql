-- 0190 — Le réseau devient HORIZONTAL : un canal par corps de métier.
--
-- CE QUI EXISTAIT. Une seule file, `demandes_reseau`, lisible par toute
-- organisation ayant `visible_reseau = true`. Elle ne portait qu'un type de
-- besoin : un particulier qui cherche un déménageur. Un indépendant en
-- manutention y voyait donc soit rien, soit des demandes qui ne le concernent
-- pas — et c'est exactement ce qui a été signalé.
--
-- LA DIRECTION PRISE. Le réseau n'est pas une file, c'est une BOURSE à
-- plusieurs canaux — un par corps de métier. Un même secteur (le chantier)
-- réunit plusieurs corps qui se croisent sur le même travail : déménageur,
-- manutentionnaire, liftier, livreur, monteur. Une demande s'adresse à un
-- corps, pas au réseau en bloc.
--
-- POURQUOI C'EST HORIZONTAL et non hiérarchique. Aucun corps ne commande les
-- autres. Un déménageur peut être donneur d'ordre d'un manutentionnaire le
-- lundi et prestataire d'un liftier le mardi. Le canal dit « à qui ça
-- s'adresse », jamais « qui est au-dessus ».
--
-- CE QU'ON NE FAIT PAS : une table par corps. Une colonne `corps` et un
-- abonnement par organisation suffisent. Une table par corps aurait figé la
-- liste dans le schéma — or elle s'allongera.
--
-- LE CORPS EST UNE RÉFÉRENCE GLOBALE, comme `capacites` : même vocabulaire
-- pour tout le monde, sinon deux sociétés nommeraient le même métier
-- différemment et ne se trouveraient jamais.
--
-- L'HISTORIQUE N'EST PAS RÉÉCRIT. `corps` est nullable ; les demandes
-- antérieures sont lues comme « demenagement » par `coalesce`. Qualifier à la
-- lecture plutôt que remplir en masse : on ne prête pas une intention à des
-- lignes qui n'en avaient pas.

create table if not exists public.corps_metier (
  cle       text not null primary key,
  libelle   text not null,
  secteur   text not null,
  rang      integer not null,
  constraint corps_secteur_connu check (secteur in ('chantier', 'entreposage'))
);

insert into public.corps_metier (cle, libelle, secteur, rang) values
  ('demenagement',  'Déménagement',            'chantier',   1),
  ('manutention',   'Manutention',             'chantier',   2),
  ('levage',        'Levage, monte-meubles',   'chantier',   3),
  ('livraison',     'Livraison',               'chantier',   4),
  ('montage',       'Montage de mobilier',     'chantier',   5),
  ('entreposage',   'Garde-meubles',           'entreposage', 6),
  ('logistique',    'Logistique mobilier',     'entreposage', 7)
on conflict (cle) do nothing;

alter table public.corps_metier enable row level security;
drop policy if exists corps_metier_lecture on public.corps_metier;
create policy corps_metier_lecture on public.corps_metier for select using (true);

alter table public.demandes_reseau
  add column if not exists corps text references public.corps_metier(cle);

comment on column public.demandes_reseau.corps is
  'Le corps de métier auquel la demande s''adresse. NULL sur les demandes antérieures au 13/09/2026 : traitées comme « demenagement ».';

-- À quels canaux une organisation est abonnée. Un abonnement par ligne : on
-- s'abonne à plusieurs corps sans que la liste vive dans une colonne.
create table if not exists public.abonnements_corps (
  org_id     uuid not null default jwt_org() references public.organisations(id),
  corps      text not null references public.corps_metier(cle),
  abonne_le  timestamptz not null default now(),
  constraint abonnements_corps_pkey primary key (org_id, corps)
);

alter table public.abonnements_corps enable row level security;
drop policy if exists abonnements_corps_tenant on public.abonnements_corps;
create policy abonnements_corps_tenant on public.abonnements_corps
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());

-- Les demandes qui me concernent : mes canaux, et rien d'autre.
-- `security definer` assumé et borné : la fonction ne rend que des demandes
-- des corps auxquels MON organisation est abonnée. Elle ne peut pas servir à
-- lire les canaux d'un autre, puisqu'elle ne lit que `jwt_org()`.
create or replace function public.cmd_demandes_de_mes_corps()
returns setof public.demandes_reseau language sql stable security definer
set search_path to 'public'
as $function$
  select d.* from demandes_reseau d
   where coalesce((select o.visible_reseau from organisations o
                    where o.id = jwt_org()), false)
     and coalesce(d.corps, 'demenagement') in (
       select a.corps from abonnements_corps a where a.org_id = jwt_org())
   order by d.cree_le desc;
$function$;

revoke execute on function public.cmd_demandes_de_mes_corps() from public, anon;
grant execute on function public.cmd_demandes_de_mes_corps()
  to authenticated, service_role;

-- S'abonner, se désabonner. Geste explicite, comme l'entrée au réseau.
create or replace function public.cmd_abonner_corps(p_corps text, p_abonne boolean)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid := jwt_org();
begin
  if v_org is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Capacité « gerer_referentiels » requise' using errcode = '42501';
  end if;
  if not exists (select 1 from corps_metier c where c.cle = p_corps) then
    raise exception 'Corps de métier inconnu : %', p_corps using errcode = '22023';
  end if;

  if p_abonne then
    insert into abonnements_corps (org_id, corps) values (v_org, p_corps)
    on conflict do nothing;
  else
    delete from abonnements_corps where org_id = v_org and corps = p_corps;
  end if;

  return jsonb_build_object('ok', true, 'corps', p_corps, 'abonne', p_abonne);
end $function$;

revoke execute on function public.cmd_abonner_corps(text, boolean) from public, anon;
grant execute on function public.cmd_abonner_corps(text, boolean)
  to authenticated, service_role;
