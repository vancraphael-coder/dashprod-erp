-- 0194 — Correction d'un commentaire faux dans 0193.
--
-- 0193 affirmait que `engagements.prix_htva_centimes` était « en euros
-- décimaux comme les offres » et faisait un `round(...)::integer` présenté
-- comme une conversion. Vérification : la colonne est un `integer` en
-- CENTIMES, conformément à son nom. Le `round` était un no-op et le
-- commentaire mentait sur ce que faisait la fonction.
--
-- Un commentaire faux est pire qu'absent : le suivant lui fait confiance et
-- construit dessus. Corrigé, et le no-op retiré.
--
-- La cause de l'erreur mérite d'être notée : deux tables voisines, deux
-- conventions. `offres.prix_base_htva_mensuel` est en EUROS décimaux,
-- `engagements.prix_htva_centimes` en CENTIMES. À vérifier avant d'écrire
-- toute conversion entre les deux.

create or replace function public.cmd_engagements_de_l_affaire(p_affaire uuid)
returns table (
  id uuid, contrepartie text, etat text, date_prestation date,
  nature text, unite text, prix_htva_centimes integer,
  facture_htva_centimes integer, facture_id uuid)
language sql stable security definer set search_path to 'public'
as $function$
  select e.id, o.nom, e.etat, e.date_prestation, e.nature, e.unite,
         e.prix_htva_centimes,
         (select f.htva_centimes from factures f where f.id = r.facture_id),
         r.facture_id
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
