-- =============================================================================
-- 0050_cout_employeur.sql
--
-- ⚠️  À APPLIQUER — contrairement aux précédentes, celle-ci n'a PAS été
--     exécutée : le connecteur Supabase n'était plus disponible.
--     Colle-la dans l'éditeur SQL de Supabase, puis range-la dans
--     supabase/migrations/.
--     ⚠️ Colle le fichier ENTIER, y compris les lignes commençant par « -- ».
-- =============================================================================
--
-- Coût employeur — SCP 140.05 (déménagement).
--
-- La paie quitte le « barème client » pour rejoindre les « coûts internes » :
-- un salaire est un coût, pas un prix. Et c'est le COÛT EMPLOYEUR RÉEL, pas le
-- brut, qui doit guider le prix horaire facturé.
--
-- Règles sectorielles en vigueur au 21/07/2026 (à réindexer chaque 1er janvier) :
--   - indexation du 01/01/2026 : +2,23 %
--   - chèques-repas : 3,09 €/jour presté (2 € employeur, 1,09 € travailleur),
--     après un délai d'attente de 6 mois pour un nouveau travailleur
--   - pension complémentaire sectorielle : 1,09 % en 2026, 1,3 % en 2027
--   - durée hebdomadaire moyenne : 38 h
--
-- Le taux d'ONSS PATRONALE n'est pas stocké en dur : il dépend des réductions
-- structurelles et du profil du travailleur. Il est saisi par membre, et sans
-- lui le coût total n'est PAS calculé — jamais deviné.
-- =============================================================================

alter table public.donnees_paie
  add column if not exists onss_patronale_pct numeric(5,2),
  add column if not exists anciennete_mois    integer,
  add column if not exists secteur_cle        text default '140.05';

comment on column public.donnees_paie.onss_patronale_pct is
  'Taux réel de cotisation patronale, communiqué par le secrétariat social. '
  'NULL = inconnu : le coût employeur n''est alors pas calculé.';
comment on column public.donnees_paie.anciennete_mois is
  'Ancienneté en mois. Sous 6 mois, pas de chèque-repas dans la SCP 140.05 : '
  'une indemnité de repas est versée à la place.';

-- Un nouveau membre hérite d'une ligne de paie vide dès sa création : son
-- onglet apparaît immédiatement, à compléter. Sans ce déclencheur, il faudrait
-- penser à créer la ligne à la main et un membre passerait à la trappe.
create or replace function public.creer_donnees_paie_membre()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into donnees_paie (org_id, utilisateur_id, secteur_cle)
  values (new.org_id, new.id, '140.05')
  on conflict (utilisateur_id) do nothing;
  return new;
end $$;

drop trigger if exists trg_donnees_paie_membre on public.utilisateurs;
create trigger trg_donnees_paie_membre after insert on public.utilisateurs
  for each row execute function creer_donnees_paie_membre();

-- Reprise : les membres existants qui n'ont pas encore de ligne en obtiennent une.
insert into public.donnees_paie (org_id, utilisateur_id, secteur_cle)
select u.org_id, u.id, '140.05' from public.utilisateurs u
 where not exists (select 1 from public.donnees_paie d where d.utilisateur_id = u.id)
on conflict (utilisateur_id) do nothing;

-- Vérification après application :
--   select u.nom, u.actif, (d.utilisateur_id is not null) as a_ligne_paie
--     from utilisateurs u left join donnees_paie d on d.utilisateur_id = u.id
--    order by u.actif desc, u.nom;
