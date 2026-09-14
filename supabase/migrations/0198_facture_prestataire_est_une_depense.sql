-- 0198 — Une facture REÇUE est une dépense, pas une facture.
--
-- CORRECTION D'UNE ERREUR DE CONCEPTION DE MA PART, dans 0193.
-- `engagement_rattachements.facture_id` pointait vers `factures` pour porter la
-- facture reçue d'un prestataire. C'est faux, et de deux façons :
--
--   1. `factures` est la table des pièces qu'on ÉMET. Elle porte `numero`,
--      `annee`, et sa numérotation vient de `sequences` — continue et
--      immuable, contrainte légale. Une facture reçue a DÉJÀ un numéro, donné
--      par le fournisseur. Lui en attribuer un des nôtres fabriquerait un
--      numéro pour un document qu'on n'a pas émis, et consommerait une
--      séquence légale pour rien.
--   2. Une facture reçue est une CHARGE. Elle se déduit, elle se rapproche
--      d'un paiement sortant, elle n'a pas de client. `depenses` existe
--      exactement pour ça.
--
-- Je l'ai construit faux parce que j'ai raisonné depuis le MOT « facture »
-- plutôt que depuis le sens comptable. Le nom d'une colonne n'est pas son
-- modèle.
--
-- CE QUI MANQUAIT POUR LE FAIRE JUSTE : `depenses` n'avait pas d'`affaire_id`.
-- Une dépense ne pouvait donc pas être imputée à un dossier — c'est pourtant
-- la condition pour qu'un coût de sous-traitance entre dans le coût d'un
-- chantier, ce qui était la demande. La colonne est ajoutée, nullable : une
-- dépense de structure (assurance, loyer) n'appartient à aucun dossier.
--
-- LA MÊME TABLE SERT LES DEUX CÔTÉS. `engagement_rattachements` porte
-- désormais `depense_id` ET `facture_id`, et chacun s'en sert pour ce qui le
-- concerne : le donneur d'ordre rattache la DÉPENSE qu'il subit, le
-- prestataire rattache la FACTURE qu'il émet. Deux colonnes, deux
-- organisations, une seule table cloisonnée par `org_id` — chacun ne voit que
-- sa ligne.
--
-- L'ancienne commande `cmd_rattacher_facture_engagement` est SUPPRIMÉE, pas
-- laissée en place : elle rattachait une facture émise comme si c'était une
-- facture reçue. Une commande fausse qu'on garde « au cas où » finit par être
-- appelée.

alter table public.depenses
  add column if not exists affaire_id uuid references public.affaires(id);

comment on column public.depenses.affaire_id is
  'Dossier auquel la dépense est imputée. NULL pour une dépense de structure (assurance, loyer) qui n''appartient à aucun chantier.';

create index if not exists idx_depenses_affaire
  on public.depenses (org_id, affaire_id) where affaire_id is not null;

alter table public.engagement_rattachements
  add column if not exists depense_id uuid references public.depenses(id);

comment on column public.engagement_rattachements.depense_id is
  'La dépense née de la facture reçue du prestataire. Côté donneur d''ordre.';
comment on column public.engagement_rattachements.facture_id is
  'La facture ÉMISE par le prestataire pour cette mission. Côté prestataire. Ne jamais y mettre une facture reçue : voir 0198.';

-- Le cloisonnement s'applique aussi à la nouvelle clé : elle doit désigner une
-- dépense de MA société.
drop trigger if exists trg_engagement_rattachement_cloison on public.engagement_rattachements;
create trigger trg_engagement_rattachement_cloison
  before insert or update on public.engagement_rattachements
  for each row execute function public.exiger_meme_org(
    'affaire_id', 'affaires', 'mission_id', 'missions',
    'facture_id', 'factures', 'depense_id', 'depenses');

-- Enregistrer la facture reçue : crée la dépense, l'impute au dossier, la
-- rattache à l'engagement, et passe l'engagement à « facturée ».
--
-- Le NUMÉRO DU FOURNISSEUR est conservé dans le libellé : c'est la référence
-- qu'on citera en cas de litige, et elle ne nous appartient pas.
create or replace function public.cmd_enregistrer_facture_prestataire(
  p_engagement uuid, p_montant_htva_centimes integer,
  p_numero_fournisseur text default null,
  p_date date default null, p_echeance date default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org(); v_e engagements%rowtype;
  v_affaire uuid; v_depense uuid; v_acteur uuid; v_nom text;
begin
  if v_org is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  select * into v_e from engagements where id = p_engagement;
  if not found then
    raise exception 'Engagement introuvable' using errcode = '42501';
  end if;
  -- `is distinct from` et non `<>` : avec un NULL la comparaison rendrait
  -- INCONNU et laisserait passer. Leçon de 0197.
  if v_e.org_donneur is distinct from v_org then
    raise exception 'Seul le donneur d''ordre enregistre une facture recue'
      using errcode = '42501';
  end if;
  if v_e.etat not in ('acceptee', 'realisee') then
    return jsonb_build_object('ok', false,
      'motif', format('etat %s : rien a facturer', v_e.etat));
  end if;
  if coalesce(p_montant_htva_centimes, 0) <= 0 then
    return jsonb_build_object('ok', false, 'motif', 'montant requis');
  end if;

  select affaire_id into v_affaire from engagement_rattachements
   where engagement_id = p_engagement and org_id = v_org;
  select nom into v_nom from organisations where id = v_e.org_prestataire;
  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  insert into depenses (org_id, affaire_id, libelle, montant_centimes,
                        categorie, regle, echeance, date_depense, origine,
                        note, cree_par)
  values (v_org, v_affaire,
          format('Sous-traitance %s%s', v_nom,
                 case when coalesce(btrim(p_numero_fournisseur), '') = '' then ''
                      else format(' — facture %s', btrim(p_numero_fournisseur)) end),
          p_montant_htva_centimes,
          'sous_traitance', false, p_echeance,
          coalesce(p_date, current_date), 'engagement',
          format('Engagement %s du %s', p_engagement, v_e.date_prestation),
          v_acteur)
  returning id into v_depense;

  update engagement_rattachements
     set depense_id = v_depense
   where engagement_id = p_engagement and org_id = v_org;
  if not found then
    insert into engagement_rattachements (org_id, engagement_id, depense_id)
    values (v_org, p_engagement, v_depense);
  end if;

  update engagements set etat = 'facturee' where id = p_engagement;
  perform engagement_inscrire(p_engagement, 'facturee', v_org,
    jsonb_build_object('montant_htva_centimes', p_montant_htva_centimes,
                       'numero_fournisseur', p_numero_fournisseur));

  return jsonb_build_object('ok', true, 'depense_id', v_depense,
                            'affaire_id', v_affaire);
end $function$;

revoke execute on function public.cmd_enregistrer_facture_prestataire(
  uuid, integer, text, date, date) from public, anon;
grant execute on function public.cmd_enregistrer_facture_prestataire(
  uuid, integer, text, date, date) to authenticated, service_role;

-- La lecture suit : le montant facturé vient de la DÉPENSE, plus de `factures`.
-- `drop` puis `create` : on change le type de retour, `create or replace` le
-- refuse.
drop function if exists public.cmd_engagements_de_l_affaire(uuid);

create function public.cmd_engagements_de_l_affaire(p_affaire uuid)
returns table (
  id uuid, contrepartie text, etat text, date_prestation date,
  nature text, unite text, prix_htva_centimes integer,
  facture_htva_centimes integer, depense_id uuid)
language sql stable security definer set search_path to 'public'
as $function$
  select e.id, o.nom, e.etat, e.date_prestation, e.nature, e.unite,
         e.prix_htva_centimes,
         (select d.montant_centimes from depenses d where d.id = r.depense_id),
         r.depense_id
    from engagement_rattachements r
    join engagements e on e.id = r.engagement_id
    join organisations o on o.id = e.org_prestataire
   where r.org_id = jwt_org()
     and r.affaire_id = p_affaire
     and e.org_donneur = jwt_org()
   order by e.date_prestation, e.cree_le;
$function$;

revoke execute on function public.cmd_engagements_de_l_affaire(uuid) from public, anon;
grant execute on function public.cmd_engagements_de_l_affaire(uuid)
  to authenticated, service_role;

drop function if exists public.cmd_rattacher_facture_engagement(uuid, uuid);
