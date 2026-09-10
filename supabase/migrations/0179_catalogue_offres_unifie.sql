-- 0179 — Un seul catalogue d'offres.
--
-- CE QUI A DIVERGÉ. Deux catalogues portaient les mêmes chiffres sans se
-- parler : la table `offres` — celle que lisent `modules_du_plan`,
-- `org_a_module`, le RLS et la facturation — et les constantes de
-- `packages/domaine/src/commercial/plans.js`, que lisent la vitrine et les
-- écrans. Quatre écarts mesurés, tous coûteux :
--
--   · `signature_client` et `espace_client` sont ouverts à TOUTES les offres
--     (décision du lot 02). La base l'applique, le domaine les réservait
--     encore à Regular : un client Basique payait deux modules que ses écrans
--     lui cachaient.
--   · La base ne plafonne plus les membres et facture le supplémentaire 13 € ;
--     le domaine refusait le 3ᵉ utilisateur en Basique. Une vente refusée par
--     l'écran que la facturation savait encaisser.
--   · Pro comprend 30 membres en base, « illimité » dans le domaine — son coût
--     par utilisateur était donc incalculable, et l'argument de montée en
--     gamme reposait sur du vide.
--   · Un plan inconnu repliait sur `regular` dans le domaine, sur `starter` en
--     base. Un repli ne doit jamais accorder plus que le minimum.
--
-- CE QUE FAIT CETTE MIGRATION. La table devient capable de porter TOUTES les
-- offres, sectorielles comprises, avec leur statut. Le référentiel du domaine
-- devient la saisie unique, et le bloc `insert` ci-dessous est DÉRIVÉ de lui
-- par `packages/domaine/outils/publier-offres.mjs`. Un test régénère ce bloc
-- et vérifie qu'il figure mot pour mot ici : le SQL ne se retouche pas à la
-- main.
--
-- « RIEN NE SE VEND AVANT D'EXISTER » DEVIENT UNE CONTRAINTE. Jusqu'ici la
-- règle vivait dans un commentaire et une fonction du domaine. Elle est
-- désormais posée en base : une offre ne peut être souscriptible que si elle a
-- des modules ET un prix, et que si son statut est `disponible`.
--
-- Les deux contraintes sont `not valid` : les versions publiées les 20 et
-- 22 août portent `souscriptible = true` avec un prix nul, et une donnée
-- versionnée ne se réécrit jamais. Elles s'appliquent donc à toute publication
-- FUTURE, ce qui est exactement le but — l'historique reste l'historique.

alter table public.offres
  add column if not exists statut  text not null default 'disponible',
  add column if not exists secteur text,
  add column if not exists unite   text;

comment on column public.offres.statut is
  'disponible | bientot | etude. `etude` ne s''affiche pas sur la vitrine.';
comment on column public.offres.secteur is
  'Secteur d''activité pour une offre sectorielle ; NULL pour les trois paliers déménageur, qui forment une échelle.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'offres_statut_connu') then
    alter table public.offres add constraint offres_statut_connu
      check (statut in ('disponible', 'bientot', 'etude'));
  end if;

  -- `coalesce` volontaire : `array_length('{}', 1)` rend NULL, et une
  -- contrainte qui rend NULL passe. Sans lui, une offre souscriptible sans
  -- aucun module aurait franchi le garde-fou.
  if not exists (select 1 from pg_constraint where conname = 'offres_vente_apres_existence') then
    alter table public.offres add constraint offres_vente_apres_existence
      check (not souscriptible
             or (coalesce(array_length(modules, 1), 0) > 0
                 and prix_base_htva_mensuel is not null)) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'offres_souscriptible_si_disponible') then
    alter table public.offres add constraint offres_souscriptible_si_disponible
      check (not souscriptible or statut = 'disponible') not valid;
  end if;
end $$;

-- ── Publication du 10/09/2026 ────────────────────────────────────────────────
-- Bloc DÉRIVÉ. Ne pas éditer : régénérer par
--   node packages/domaine/outils/publier-offres.mjs 2026-09-10T00:00:00+00:00

insert into public.offres (
  code, publie_le, libelle, rang,
  souscriptible, statut, secteur, unite,
  prix_base_htva_mensuel,
  prix_base_htva_annuel,
  membres_limite, membres_inclus, prix_membre_supp_htva,
  centres_limite, centres_inclus, prix_centre_supp_htva,
  modules,
  prix_membre_supp_htva_annuel,
  prix_centre_supp_htva_annuel,
  remise_annuelle_pct)
values
  ('starter', '2026-09-10T00:00:00+00:00', 'Basique', 1,
   true, 'disponible', null, 'par mois',
   180,
   2052,
   null, 2, 13,
   0, 0, null,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client'],
   148.2,
   null,
   5),
  ('regular', '2026-09-10T00:00:00+00:00', 'Regular', 2,
   true, 'disponible', null, 'par mois',
   360,
   4104,
   null, 5, 13,
   0, 0, null,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client','peppol','comptabilite','rapport_chantier','paie','journal','international'],
   148.2,
   null,
   5),
  ('pro', '2026-09-10T00:00:00+00:00', 'Pro', 3,
   true, 'disponible', null, 'par mois',
   720,
   8208,
   null, 30, 13,
   null, 1, 50,
   array['crm','releve','devis','offre','planning','terrain','flotte','facturation','signature_client','espace_client','peppol','comptabilite','rapport_chantier','paie','journal','international','multi_depots','gestionnaire_depot','stockage_3d'],
   148.2,
   570,
   5),
  ('donneur_ordre', '2026-09-10T00:00:00+00:00', 'Donneur d''ordre', 10,
   false, 'bientot', 'Cuisiniste, mobilier, industrie', 'gratuit',
   0,
   null,
   0, 0, null,
   0, 0, null,
   '{}'::text[],
   null,
   null,
   null),
  ('independant_manutention', '2026-09-10T00:00:00+00:00', 'Indépendant manutention', 11,
   false, 'bientot', 'Manutention et services', 'par mois',
   60,
   null,
   1, 1, null,
   0, 0, null,
   '{}'::text[],
   null,
   null,
   null),
  ('garde_meubles', '2026-09-10T00:00:00+00:00', 'Garde-meubles', 12,
   false, 'bientot', 'Self-storage', 'par mois',
   240,
   null,
   5, 5, null,
   1, 1, null,
   '{}'::text[],
   null,
   null,
   null),
  ('groupe_liftier', '2026-09-10T00:00:00+00:00', 'Groupe liftier', 13,
   false, 'bientot', 'Levage et monte-meubles', 'par mois, 5 accès bureau',
   450,
   null,
   15, 5, 30,
   0, 0, null,
   '{}'::text[],
   null,
   null,
   null),
  ('logistique_mobilier', '2026-09-10T00:00:00+00:00', 'Logistique mobilier', 14,
   false, 'etude', 'Débit industriel', 'par mois, 1 dépôt',
   900,
   null,
   5, 5, null,
   1, 1, null,
   '{}'::text[],
   null,
   null,
   null)
on conflict (code, publie_le) do nothing;

-- ── Lecture publique du catalogue ────────────────────────────────────────────
-- Pour que la vitrine et l'écran Abonnement puissent lire LA base plutôt
-- qu'une copie. Rend la version en vigueur de chaque offre, statut compris.
create or replace function public.cmd_catalogue_offres()
returns setof public.offres language sql stable security definer
set search_path to 'public'
as $function$
  select distinct on (o.code) o.*
    from offres o
   where o.publie_le <= now()
   order by o.code, o.publie_le desc;
$function$;

grant execute on function public.cmd_catalogue_offres() to anon, authenticated, service_role;
