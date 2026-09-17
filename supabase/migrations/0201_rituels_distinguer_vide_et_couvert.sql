-- 0201 — Un rituel vide doit dire POURQUOI il est vide.
--
-- LE DÉFAUT. Les deux rituels affichaient « tout est facturé, tout est
-- encaissé, tout est couvert » dès que leurs trois blocs étaient à zéro. Or
-- zéro a deux causes opposées :
--
--   · tout est réglé — la bonne nouvelle ;
--   · il n'y a RIEN — une société qui démarre, ou une semaine sans chantier.
--
-- Afficher le message de succès dans le second cas est un mensonge, et il se
-- lit comme un bug : un patron qui sait qu'il a trois chantiers la semaine
-- prochaine et lit « tout est couvert » cesse de faire confiance à l'écran.
--
-- LA CORRECTION : les rituels rendent aussi le VOLUME sur lequel ils
-- raisonnent — dossiers actifs, factures émises, missions à quatorze jours.
-- Un écran ne peut pas distinguer « rien à faire » de « rien du tout » s'il
-- ne sait pas combien de choses existent.
--
-- Reprend 0200 à l'identique en y ajoutant le bloc `volume`.

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
      'lignes', coalesce((select jsonb_agg(to_jsonb(t)) from non_couverts t), '[]'::jsonb)),
    -- Le VOLUME : ce qui permet de distinguer « rien à faire » de « rien du
    -- tout ». Sans lui, l'écran affiche un succès sur une société vide.
    'volume', jsonb_build_object(
      'dossiers_actifs', (select count(*) from affaires a
                           where a.org_id = jwt_org() and a.archive_le is null
                             and a.etat not in ('annule', 'clos')),
      'factures_emises', (select count(*) from factures f
                           where f.org_id = jwt_org() and f.emise),
      'missions_14j', (select count(*) from missions m
                        where m.org_id = jwt_org()
                          and m.date between current_date and current_date + 14
                          and m.etat is distinct from 'annulee'::etat_mission)));
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
    'couverts', (select count(*) from couverture where affectes > 0),
    'volume', jsonb_build_object(
      'missions_14j', (select count(*) from couverture),
      'dossiers_actifs', (select count(*) from affaires a
                           where a.org_id = jwt_org() and a.archive_le is null
                             and a.etat not in ('annule', 'clos'))));
$function$;

revoke execute on function public.cmd_rituel_coordination() from public, anon;
grant execute on function public.cmd_rituel_coordination() to authenticated, service_role;
