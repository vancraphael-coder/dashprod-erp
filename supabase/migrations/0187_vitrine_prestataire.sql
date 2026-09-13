-- 0187 — La vitrine d'un prestataire : son identité PUBLIABLE.
--
-- LE PROBLÈME. Pour proposer une date à un indépendant, le donneur d'ordre
-- doit pouvoir le trouver — donc lire son nom. Or `organisations` contient
-- l'IBAN, le BCE, l'adresse, les paramètres de facturation. Une fonction
-- `security definer` qui n'en renverrait que deux colonnes marcherait, mais
-- elle protégerait une table sensible par du code : exactement ce que le
-- principe posé en 0181 refuse.
--
--   On ne protège pas une donnée sensible par une politique ni par une
--   fonction. On met la donnée publiable dans une AUTRE table.
--
-- D'où cette table. L'annuaire ne joint donc que deux tables publiables —
-- `vitrine_prestataire` et `tarifs_publies` — et ne touche JAMAIS
-- `organisations`. Le pire défaut imaginable expose un nom commercial et une
-- zone d'intervention que leur propriétaire a explicitement publiés.
--
-- PAS DE RECOPIE DU NOM LÉGAL. `nom_public` est saisi par le prestataire, il
-- n'est pas dérivé de `organisations.nom`. Une recopie serait une seconde
-- saisie, et un indépendant peut vouloir se présenter autrement que sous sa
-- dénomination légale.
--
-- ON N'APPARAÎT QUE SI ON A QUELQUE CHOSE À VENDRE. L'annuaire exige au moins
-- un tarif publié : un profil sans tarif ne sert à personne et encombre.

create table if not exists public.vitrine_prestataire (
  org_id        uuid        not null default jwt_org() primary key
                            references public.organisations(id),
  nom_public    text        not null,
  metier        text        not null,
  zone          text,
  presentation  text,
  tel_public    text,
  email_public  text,
  publie_le     timestamptz,
  retire_le     timestamptz,
  maj_le        timestamptz not null default now(),
  constraint vitrine_nom_non_vide check (btrim(nom_public) <> ''),
  constraint vitrine_retire_apres_publie
    check (retire_le is null or publie_le is not null)
);

alter table public.vitrine_prestataire enable row level security;

drop policy if exists vitrine_lecture on public.vitrine_prestataire;
create policy vitrine_lecture on public.vitrine_prestataire for select
  using ((publie_le is not null and retire_le is null) or org_id = jwt_org());

drop policy if exists vitrine_ecriture on public.vitrine_prestataire;
create policy vitrine_ecriture on public.vitrine_prestataire for all
  using (org_id = jwt_org()) with check (org_id = jwt_org());

-- L'annuaire. Deux tables publiables, aucune jointure sur `organisations`.
-- `stable` et NON `security definer` : la fonction s'exécute sous les droits
-- de l'appelant, donc sous RLS. Un `security definer` ici aurait rendu
-- visibles les vitrines non publiées.
create or replace function public.cmd_annuaire_prestataires(
  p_zone text default null, p_metier text default null)
returns table (
  org_id uuid, nom_public text, metier text, zone text, presentation text,
  tel_public text, email_public text,
  prix_min_htva_centimes integer, nb_tarifs integer)
language sql stable set search_path to 'public'
as $function$
  select v.org_id, v.nom_public, v.metier, v.zone, v.presentation,
         v.tel_public, v.email_public,
         min(t.prix_htva_centimes)::integer,
         count(t.id)::integer
    from vitrine_prestataire v
    join tarifs_publies t
      on t.org_id = v.org_id
     and t.publie_le is not null and t.retire_le is null
   where v.publie_le is not null and v.retire_le is null
     and v.org_id <> jwt_org()
     and (p_zone is null or v.zone ilike '%' || p_zone || '%')
     and (p_metier is null or v.metier = p_metier)
   group by v.org_id, v.nom_public, v.metier, v.zone, v.presentation,
            v.tel_public, v.email_public
   order by v.nom_public;
$function$;

revoke execute on function public.cmd_annuaire_prestataires(text, text) from public, anon;
grant execute on function public.cmd_annuaire_prestataires(text, text)
  to authenticated, service_role;
