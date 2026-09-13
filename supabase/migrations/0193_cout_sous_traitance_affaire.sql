-- 0193 — Les engagements d'un dossier, avec leur facture s'il y en a une.
--
-- LA DEMANDE. Un engagement confié à un indépendant est rattaché à un
-- dossier. Il doit entrer dans les coûts de ce dossier, au même titre qu'un
-- membre de l'équipe mais avec son propre calcul : pas des heures × un coût
-- horaire, mais un montant convenu puis un montant facturé.
--
-- OÙ LE RATTACHEMENT VIT. Dans `engagement_rattachements`, table cloisonnée
-- par `org_id` — PAS dans l'engagement lui-même, qui traverse la cloison. Le
-- prestataire ne doit pas savoir à quel dossier de son donneur d'ordre sa
-- mission est rattachée, ni quel client est derrière. C'est la règle 2 de la
-- migration 0182, et cette fonction en dépend.
--
-- CE QU'ELLE REND, ET POUR QUI. Le donneur d'ordre voit les engagements
-- rattachés à SON dossier avec le montant qui le grève. L'indépendant, lui,
-- lit le même engagement par `cmd_mes_engagements` — il voit son prix, pas le
-- dossier d'en face. Une seule table, deux lectures, aucune fuite.
--
-- LA FACTURE. `engagement_rattachements.facture_id` porte le lien vers la
-- facture reçue. Tant qu'il est nul, le montant retenu est le prix convenu ;
-- dès qu'une facture est rattachée, c'est elle qui prime — c'est elle qu'on
-- paie. Le domaine (pilotage/cout-sous-traitance.js) applique exactement cette
-- règle, et l'éprouve sans base.
--
-- ATTENTION CONVENTION D'UNITÉ : `engagements.prix_htva_centimes` est un
-- integer en CENTIMES, alors que `offres.prix_base_htva_mensuel` est en euros
-- décimaux. Deux tables voisines, deux conventions — j'ai écrit un faux
-- commentaire là-dessus dans la première version de cette migration, corrigé
-- par 0194. À vérifier avant d'écrire toute conversion.

create or replace function public.cmd_engagements_de_l_affaire(p_affaire uuid)
returns table (
  id uuid, contrepartie text, etat text, date_prestation date,
  nature text, unite text, prix_htva_centimes integer,
  facture_htva_centimes integer, facture_id uuid)
language sql stable security definer set search_path to 'public'
as $function$
  select e.id,
         o.nom,
         e.etat,
         e.date_prestation,
         e.nature,
         e.unite,
         e.prix_htva_centimes,
         (select f.htva_centimes from factures f where f.id = r.facture_id),
         r.facture_id
    from engagement_rattachements r
    join engagements e on e.id = r.engagement_id
    join organisations o on o.id = e.org_prestataire
   where r.org_id = jwt_org()
     and r.affaire_id = p_affaire
     -- On ne rend que les engagements où MON organisation est le donneur
     -- d'ordre : un rattachement côté prestataire ne concerne pas le coût du
     -- dossier d'en face.
     and e.org_donneur = jwt_org()
   order by e.date_prestation, e.cree_le;
$function$;

revoke execute on function public.cmd_engagements_de_l_affaire(uuid) from public, anon;
grant execute on function public.cmd_engagements_de_l_affaire(uuid)
  to authenticated, service_role;

-- Rattacher une facture reçue à un engagement. Côté donneur d'ordre
-- uniquement : c'est lui qui reçoit la facture.
create or replace function public.cmd_rattacher_facture_engagement(
  p_engagement uuid, p_facture uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid := jwt_org(); v_donneur uuid;
begin
  if v_org is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  select org_donneur into v_donneur from engagements where id = p_engagement;
  if v_donneur is null then
    return jsonb_build_object('ok', false, 'motif', 'engagement introuvable');
  end if;
  if v_donneur <> v_org then
    raise exception 'Seul le donneur d''ordre rattache une facture recue'
      using errcode = '42501';
  end if;

  update engagement_rattachements
     set facture_id = p_facture
   where engagement_id = p_engagement and org_id = v_org;
  if not found then
    insert into engagement_rattachements (org_id, engagement_id, facture_id)
    values (v_org, p_engagement, p_facture);
  end if;

  perform engagement_inscrire(p_engagement, 'facturee', v_org,
    jsonb_build_object('facture_id', p_facture));
  update engagements set etat = 'facturee'
   where id = p_engagement and etat in ('acceptee', 'realisee');

  return jsonb_build_object('ok', true, 'engagement', p_engagement);
end $function$;

revoke execute on function public.cmd_rattacher_facture_engagement(uuid, uuid)
  from public, anon;
grant execute on function public.cmd_rattacher_facture_engagement(uuid, uuid)
  to authenticated, service_role;
