-- 0189 — Le plan d'une organisation se valide CONTRE le référentiel.
--
-- CE QUI A ÉTÉ TROUVÉ, en cherchant pourquoi l'écran d'arrivée de
-- l'indépendant ne s'affichait pas. `organisations_plan_valide` était un CHECK
-- figé : `plan in ('starter','regular','pro')`. Le référentiel `offres` porte
-- désormais huit offres publiées, dont cinq sectorielles. Aucune organisation
-- ne pouvait donc être placée sur une offre sectorielle — le catalogue disait
-- qu'elle existait, la table disait non.
--
-- C'est la TROISIÈME forme prise par la même dette : une liste d'offres écrite
-- ailleurs que dans le référentiel. Les deux précédentes étaient `plans.js` et
-- un test figé à la migration 0075. Une liste recopiée finit toujours par
-- diverger, et la vigilance n'y change rien — il faut supprimer la recopie.
--
-- LA CORRECTION. Un CHECK ne peut pas interroger une autre table ; on passe
-- donc par un trigger, qui vérifie l'EXISTENCE du code dans `offres`. Une
-- offre publiée devient assignable sans qu'on touche à cette contrainte —
-- c'est-à-dire sans seconde saisie.
--
-- Le trigger ne juge PAS si l'offre est souscriptible : se placer soi-même sur
-- une offre est une question de commande, pas de structure. L'éditeur doit
-- pouvoir placer un pilote sur une offre `bientot` — c'est même le seul moyen
-- d'éprouver un parcours avant de l'ouvrir.

alter table public.organisations drop constraint if exists organisations_plan_valide;

create or replace function public.exiger_offre_connue()
returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  if new.plan is null then
    return new;                       -- le défaut s'applique ailleurs
  end if;
  if not exists (select 1 from offres o where o.code = new.plan) then
    raise exception 'Offre inconnue au référentiel : %', new.plan
      using errcode = '23514';
  end if;
  return new;
end $function$;

drop trigger if exists trg_organisations_offre_connue on public.organisations;
create trigger trg_organisations_offre_connue
  before insert or update of plan on public.organisations
  for each row execute function public.exiger_offre_connue();

-- ── Placement pilote ────────────────────────────────────────────────────────
-- `cmd_creer_ma_societe` crée toujours en `starter` (lot 03 : « une valeur par
-- défaut ne doit jamais accorder plus que le minimum ») et l'offre indépendant
-- n'est pas souscriptible. Les deux règles sont bonnes ; leur rencontre laisse
-- un trou : aucun chemin n'existe pour qu'une société ARRIVE sur cette offre.
-- Le chemin manquant relève du lot 5. En attendant, placement nommé d'une
-- seule société, pour éprouver le parcours.
--
-- Vérifié avant d'appliquer : un seul membre actif (plafond dur de l'offre :
-- 1) et aucun essai en cours qui ferait rendre `regular` à `plan_effectif()`.
--
-- Ce que le changement RETIRE, et c'est voulu : `releve`, `devis`, `offre`,
-- `flotte`, `espace_client` se ferment. Un indépendant ne relève pas un volume
-- et n'établit pas de devis de déménagement — il répond à des demandes.

update public.organisations o
   set plan = 'independant_manutention'
 where o.nom = 'Van Cutsem Raphaël'
   and o.plan = 'starter'
   and o.essai_fin is null
   and (select count(*) from public.utilisateurs u
         where u.org_id = o.id and coalesce(u.actif, true) and u.retire_le is null) <= 1;
