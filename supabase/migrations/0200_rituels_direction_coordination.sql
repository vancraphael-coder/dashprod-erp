-- 0200 — Les deux rituels d'arrivée : direction et coordination.
--
-- Un rituel ne rend QUE des chiffres sur lesquels on peut décider. Le chiffre
-- d'affaires du mois n'appelle aucune décision : il n'est pas ici. « Trois
-- chantiers clos non facturés » en appelle une : il y est.
--
-- UNE SEULE REQUÊTE PAR RITUEL. `etat_facturation` est par affaire ; l'appeler
-- en boucle sur un écran d'arrivée le rendrait lent le jour où il y a du
-- volume — c'est-à-dire le jour où il sert.
--
-- DEUX POSTURES, DEUX RITUELS. La coordination ne voit pas les impayés : ce
-- n'est pas son travail, et lui montrer une somme qu'elle ne peut pas
-- encaisser ne l'aide pas à couvrir jeudi. C'est précisément pourquoi un
-- tableau de bord unique ne fonctionne pour personne.
--
-- PIÈGE : `etat_mission` est un ENUM et sa valeur est 'annulee', pas 'annule'.
-- Écrit ici pour que personne ne reperde le quart d'heure.

create or replace function public.cmd_rituel_direction()
returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  with emis as (
    select f.affaire_id,
           sum(case when f.type = 'avoir' then -f.tvac_centimes
                    else f.tvac_centimes end) as du,
           min(f.date_emission) as premiere
      from factures f
     where f.org_id = jwt_org() and f.emise
     group by f.affaire_id
  ),
  paye as (
    select f.affaire_id, sum(p.montant_centimes) as paye
      from paiements p
      join factures f on f.id = p.facture_id
     where f.org_id = jwt_org() and f.emise
     group by f.affaire_id
  ),
  -- BLOC 1 — le travail fait qui n'a pas été facturé. De l'argent qui dort,
  -- et le seul poste qu'on peut encaisser aujourd'hui sans rien vendre.
  a_facturer as (
    select a.id, c.nom as client, a.cloture_le
      from affaires a
      left join clients c on c.id = a.client_id
      left join emis e on e.affaire_id = a.id
     where a.org_id = jwt_org()
       and a.etat in ('effectue', 'clos')
       and a.archive_le is null
       and e.affaire_id is null
     order by a.cloture_le nulls last
     limit 20
  ),
  -- BLOC 2 — ce qui reste dû, avec l'ANCIENNETÉ. 500 € vieux de 90 jours n'est
  -- pas le même problème que 5 000 € émis hier ; le montant sans l'âge ne dit
  -- pas quoi faire.
  impayes as (
    select e.affaire_id, c.nom as client,
           (e.du - coalesce(p.paye, 0)) as solde,
           (current_date - e.premiere) as jours
      from emis e
      left join paye p on p.affaire_id = e.affaire_id
      left join affaires a on a.id = e.affaire_id
      left join clients c on c.id = a.client_id
     where e.du - coalesce(p.paye, 0) > 0
     order by e.premiere
     limit 20
  ),
  -- BLOC 3 — les chantiers non couverts. Le seul des trois qui se règle le
  -- jour même, et le seul qui devient impossible à régler trop tard.
  non_couverts as (
    select m.id, m.date, m.type, c.nom as client
      from missions m
      left join affaires a on a.id = m.affaire_id
      left join clients c on c.id = a.client_id
     where m.org_id = jwt_org()
       and m.date between current_date and current_date + 14
       and m.etat is distinct from 'annulee'::etat_mission
       and not exists (select 1 from mission_affectations x
                        where x.mission_id = m.id)
     order by m.date
     limit 20
  )
  select jsonb_build_object(
    'a_facturer', jsonb_build_object(
      'nb', (select count(*) from a_facturer),
      'lignes', coalesce((select jsonb_agg(to_jsonb(t)) from a_facturer t), '[]'::jsonb)),
    'impayes', jsonb_build_object(
      'nb', (select count(*) from impayes),
      'total_centimes', coalesce((select sum(solde) from impayes), 0),
      'jours_max', coalesce((select max(jours) from impayes), 0),
      'lignes', coalesce((select jsonb_agg(to_jsonb(t)) from impayes t), '[]'::jsonb)),
    'non_couverts', jsonb_build_object(
      'nb', (select count(*) from non_couverts),
      'lignes', coalesce((select jsonb_agg(to_jsonb(t)) from non_couverts t), '[]'::jsonb)));
$function$;

revoke execute on function public.cmd_rituel_direction() from public, anon;
grant execute on function public.cmd_rituel_direction() to authenticated, service_role;

create or replace function public.cmd_rituel_coordination()
returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  with couverture as (
    select m.id, m.date, m.heure, m.type, c.nom as client,
           (select count(*) from mission_affectations x
             where x.mission_id = m.id) as affectes
      from missions m
      left join affaires a on a.id = m.affaire_id
      left join clients c on c.id = a.client_id
     where m.org_id = jwt_org()
       and m.date between current_date and current_date + 14
       and m.etat is distinct from 'annulee'::etat_mission
  ),
  -- Un dossier confirmé sans mission planifiée : le client attend une date et
  -- personne ne l'a posée. Plus grave qu'une mission sans équipe, et
  -- INVISIBLE sur tout planning — justement parce que rien n'y a été inscrit.
  sans_mission as (
    select a.id, c.nom as client, a.date_souhaitee
      from affaires a
      left join clients c on c.id = a.client_id
     where a.org_id = jwt_org()
       and a.etat = 'confirme'
       and a.archive_le is null
       and not exists (select 1 from missions m where m.affaire_id = a.id)
     order by a.date_souhaitee nulls last
     limit 20
  ),
  trous as (
    select * from couverture where affectes = 0
     order by date, heure nulls last limit 20
  )
  select jsonb_build_object(
    'trous', jsonb_build_object(
      'nb', (select count(*) from couverture where affectes = 0),
      'lignes', coalesce((select jsonb_agg(to_jsonb(t)) from trous t), '[]'::jsonb)),
    'sans_mission', jsonb_build_object(
      'nb', (select count(*) from sans_mission),
      'lignes', coalesce((select jsonb_agg(to_jsonb(t)) from sans_mission t), '[]'::jsonb)),
    'couverts', (select count(*) from couverture where affectes > 0));
$function$;

revoke execute on function public.cmd_rituel_coordination() from public, anon;
grant execute on function public.cmd_rituel_coordination() to authenticated, service_role;
