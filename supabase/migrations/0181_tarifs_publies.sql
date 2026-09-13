-- 0181 — Tarifs publiés : ce qu'un prestataire choisit de rendre visible.
--
-- LE PROBLÈME. Un donneur d'ordre doit connaître le prix d'un indépendant pour
-- lui proposer une date. Le prix vit dans les paramètres de l'indépendant —
-- c'est-à-dire dans une autre organisation, derrière une cloison faite pour
-- interdire la lecture. Donner au donneur d'ordre le droit de lire les
-- réglages du prestataire percerait la cloison pour toujours, au bénéfice
-- d'un seul champ.
--
-- LE PRINCIPE RETENU, et c'est le cœur du dispositif :
--
--   On ne protège pas une donnée sensible par une politique.
--   On met la donnée publiable dans une AUTRE TABLE.
--
-- Une politique peut être mal écrite, élargie par inadvertance, contournée par
-- une fonction `security definer` mal gardée. Une table qui ne CONTIENT rien de
-- sensible ne peut rien divulguer de sensible, quelle que soit la politique.
-- Le pire défaut imaginable ici expose un tarif que son propriétaire avait
-- explicitement décidé de publier.
--
-- Ce n'est donc pas une vue sur les réglages — une vue hérite des colonnes de
-- sa source, donc du risque. C'est une table distincte, que le prestataire
-- remplit par un geste explicite. Publier est une décision, pas un effet de
-- bord.
--
-- PUBLICATION, PAS RÉFÉRENCE. Le tarif publié est une photo. Un engagement
-- conclu recopie le prix au moment de l'accord et n'y fait plus référence :
-- changer ses tarifs demain ne réécrit aucun accord d'hier. Même discipline
-- que le référentiel `offres`, pour la même raison.

create table if not exists public.tarifs_publies (
  id            uuid        not null default gen_random_uuid() primary key,
  -- Le prestataire. Pas de `exiger_meme_org` ici : la table n'a aucune clé
  -- étrangère vers des données d'organisation, donc rien à cloisonner.
  -- `default jwt_org()` : invariant du dépôt (test `ecriture-org`), sans quoi
  -- une écriture depuis l'application échoue sans dire pourquoi. Posé en base
  -- par 0185.
  org_id        uuid        not null default jwt_org() references public.organisations(id),
  libelle       text        not null,
  unite         text        not null,
  prix_htva_centimes integer not null,
  tva_pct       numeric     not null default 21,
  -- Zone couverte, en clair et volontairement grossier : « Brabant wallon,
  -- Bruxelles ». Pas d'adresse, pas de rayon calculé depuis un domicile.
  zone          text,
  delai_prevenance_heures integer not null default 48,
  note          text,
  publie_le     timestamptz,
  retire_le     timestamptz,
  cree_le       timestamptz not null default now(),
  constraint tarifs_unite_connue
    check (unite in ('heure', 'demi_journee', 'journee', 'forfait')),
  constraint tarifs_prix_positif check (prix_htva_centimes > 0),
  constraint tarifs_retire_apres_publie
    check (retire_le is null or publie_le is not null)
);

create index if not exists idx_tarifs_publies_actifs
  on public.tarifs_publies (org_id)
  where publie_le is not null and retire_le is null;

alter table public.tarifs_publies enable row level security;

-- LECTURE : tout compte authentifié voit les tarifs PUBLIÉS et non retirés.
-- C'est voulu et c'est sans danger : un tarif publié est l'équivalent d'une
-- grille affichée en vitrine. Un tarif non publié reste invisible de tous
-- sauf de son propriétaire.
drop policy if exists tarifs_publies_lecture on public.tarifs_publies;
create policy tarifs_publies_lecture on public.tarifs_publies for select
  using (
    (publie_le is not null and retire_le is null)
    or org_id = jwt_org()
  );

-- ÉCRITURE : son propriétaire, et personne d'autre. Même l'éditeur de la
-- plateforme n'a pas à fixer les prix de ses clients.
drop policy if exists tarifs_publies_ecriture on public.tarifs_publies;
create policy tarifs_publies_ecriture on public.tarifs_publies for all
  using (org_id = jwt_org())
  with check (org_id = jwt_org());

-- Un tarif publié ne se réécrit pas : on le retire et on en publie un autre.
-- Sinon un prestataire pourrait modifier après coup le prix sur lequel un
-- donneur d'ordre s'est engagé — et l'engagement, lui, en garde une copie.
create or replace function public.tarif_publie_immuable()
returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  if old.publie_le is null then
    return new;                       -- brouillon : libre
  end if;
  if new.prix_htva_centimes <> old.prix_htva_centimes
     or new.unite <> old.unite
     or new.libelle <> old.libelle
     or new.tva_pct <> old.tva_pct
     or new.publie_le <> old.publie_le then
    raise exception
      'Un tarif publié ne se modifie pas : retirez-le et publiez-en un autre'
      using errcode = '42501';
  end if;
  if old.retire_le is not null and new.retire_le is distinct from old.retire_le then
    raise exception 'Un retrait est définitif' using errcode = '42501';
  end if;
  return new;
end $function$;

drop trigger if exists trg_tarif_publie_immuable on public.tarifs_publies;
create trigger trg_tarif_publie_immuable
  before update on public.tarifs_publies
  for each row execute function public.tarif_publie_immuable();

-- Suppression interdite : un tarif ayant servi de base à un engagement doit
-- rester consultable pour expliquer le prix convenu.
create or replace function public.tarif_publie_non_supprimable()
returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  if old.publie_le is not null then
    raise exception 'Un tarif publié ne se supprime pas : retirez-le'
      using errcode = '42501';
  end if;
  return old;
end $function$;

drop trigger if exists trg_tarif_publie_non_supprimable on public.tarifs_publies;
create trigger trg_tarif_publie_non_supprimable
  before delete on public.tarifs_publies
  for each row execute function public.tarif_publie_non_supprimable();

-- Lecture du catalogue d'un prestataire : ses tarifs en vigueur seulement.
create or replace function public.cmd_tarifs_du_prestataire(p_org uuid)
returns setof public.tarifs_publies language sql stable
set search_path to 'public'
as $function$
  select t.* from tarifs_publies t
   where t.org_id = p_org
     and t.publie_le is not null
     and t.retire_le is null
   order by t.unite, t.prix_htva_centimes;
$function$;

-- `stable` et NON `security definer` : la fonction s'exécute avec les droits
-- de l'appelant, donc sous RLS. Un `security definer` ici aurait contourné la
-- politique de lecture et rendu visibles les brouillons — le genre de trou
-- qu'on ne voit qu'une fois exploité.
revoke execute on function public.cmd_tarifs_du_prestataire(uuid) from public, anon;
grant execute on function public.cmd_tarifs_du_prestataire(uuid) to authenticated, service_role;
