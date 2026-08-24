-- 0144 — APPLIQUÉE ET VÉRIFIÉE le 23/08/2026.
-- UN VÉHICULE DANS UNE ÉQUIPE DU JOUR.
--
-- Une équipe de journée avait des personnes et des missions, jamais de
-- véhicule. Or on ne compose pas une équipe sans savoir avec quoi elle part :
-- deux équipes du même jour pouvaient se voir attribuer le même camion, et on
-- ne s'en apercevait qu'au dépôt, le matin, quand il n'y en avait qu'un.
--
-- MÊME PATRON QUE 0142, délibérément : table de liaison SANS org_id, qui hérite
-- du cloisonnement par jointure sur equipes_jour. Ajouter un org_id ici créerait
-- une seconde vérité de tenant, qu'on finirait par oublier de tenir d'accord
-- avec la première. (Le piège du `default jwt_org()` manquant ne s'applique pas :
-- il n'y a pas de colonne org_id à défaut.)
--
-- AUCUNE CONTRAINTE D'UNICITÉ SUR (jour, vehicule) : la base accepte le même
-- camion dans deux équipes du même jour. C'est le domaine qui juge le
-- chevauchement horaire — un camion peut servir le matin puis l'après-midi.
-- Une contrainte aveugle interdirait ce cas légitime. On signale, on n'interdit
-- pas : `verdictEquipe` met le conflit en AVERTISSEMENT, jamais en blocage.
--
-- Vérifiée après application : RLS active, 1 politique, 2 index, colonnes
-- conformes.

create table if not exists public.equipe_vehicules (
  equipe_id   uuid not null references public.equipes_jour(id) on delete cascade,
  vehicule_id uuid not null references public.vehicules(id)    on delete cascade,
  primary key (equipe_id, vehicule_id)
);

alter table public.equipe_vehicules enable row level security;

drop policy if exists eq_vehicules_tenant on public.equipe_vehicules;
create policy eq_vehicules_tenant on public.equipe_vehicules
  for all
  using (exists (select 1 from public.equipes_jour e
                  where e.id = equipe_vehicules.equipe_id
                    and e.org_id = jwt_org()))
  with check (exists (select 1 from public.equipes_jour e
                       where e.id = equipe_vehicules.equipe_id
                         and e.org_id = jwt_org()));

grant select, insert, update, delete on public.equipe_vehicules to authenticated;

-- Le sens de lecture le plus fréquent : « quelles équipes utilisent ce
-- véhicule ». La clé primaire couvre (equipe_id, …), pas l'inverse.
create index if not exists equipe_vehicules_vehicule_idx
  on public.equipe_vehicules (vehicule_id);
