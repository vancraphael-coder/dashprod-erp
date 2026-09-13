-- 0183 — Les commandes de l'engagement.
--
-- POURQUOI DES COMMANDES ET PAS DES POLITIQUES D'ÉCRITURE. La table
-- `engagements` n'a qu'une politique, en lecture (voir 0182, règle 4). Le RLS
-- refuse donc toute insertion, modification et suppression directes. Chaque
-- évolution passe par une fonction nommée qui : vérifie QUI agit, refuse ce
-- qui n'a pas de sens, et inscrit un événement dans la chaîne d'empreintes.
--
-- Une politique d'écriture aurait laissé chaque partie modifier n'importe
-- quelle colonne de la ligne partagée. Un donneur d'ordre aurait pu passer
-- l'état à « acceptée » sans que le prestataire accepte quoi que ce soit.
--
-- TROIS GARDES QUI MÉRITENT D'ÊTRE DITES.
--
-- 1. Le tarif doit être PUBLIÉ et appartenir au prestataire désigné. Sans ce
--    contrôle, un donneur d'ordre pourrait référencer le tarif d'un tiers, ou
--    un brouillon, et imposer ainsi un prix que le prestataire n'a jamais
--    affiché.
-- 2. Seul le prestataire répond. C'est vérifié sur `org_prestataire`, pas sur
--    une capacité : une capacité se distribue, l'identité de l'organisation
--    non.
-- 3. Un refus se motive. La contrainte l'impose déjà en base ; la commande le
--    dit avec un message utile plutôt qu'une erreur de contrainte.
--
-- LA LIBÉRATION DE L'ADRESSE. Le donneur prépare l'adresse dans SON
-- rattachement privé au moment de la proposition. Elle ne franchit la cloison
-- qu'à l'acceptation, recopiée par `cmd_repondre_engagement`. Le prestataire
-- n'attend donc rien après avoir accepté, et l'adresse n'a jamais existé dans
-- l'objet partagé avant l'accord.


-- Proposer : le donneur d'ordre. Le prix est RECOPIÉ du tarif publié.
create or replace function public.cmd_proposer_engagement(
  p_prestataire uuid, p_tarif uuid, p_date date, p_nature text,
  p_ville text, p_code_postal text,
  p_heure time default null, p_duree_min integer default null,
  p_adresse text default null, p_contact text default null,
  p_affaire uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_moi uuid := jwt_org(); v_t tarifs_publies%rowtype; v_id uuid; v_acteur uuid;
begin
  if v_moi is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if p_prestataire = v_moi then
    raise exception 'On ne se confie pas une mission à soi-même' using errcode = '22023';
  end if;
  if not acteur_a_capacite('gerer_planning') then
    raise exception 'Capacité « gerer_planning » requise' using errcode = '42501';
  end if;

  -- Le tarif doit être PUBLIÉ et appartenir au prestataire désigné. Accepter
  -- un tarif d'une autre organisation permettrait d'imposer un prix.
  select * into v_t from tarifs_publies
   where id = p_tarif and org_id = p_prestataire
     and publie_le is not null and retire_le is null;
  if not found then
    return jsonb_build_object('ok', false,
      'motif', 'tarif introuvable ou retire chez ce prestataire');
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_moi;

  insert into engagements (org_donneur, org_prestataire, cree_par,
    date_prestation, heure_debut, duree_prevue_min, nature, ville, code_postal,
    tarif_publie_id, unite, prix_htva_centimes)
  values (v_moi, p_prestataire, v_acteur, p_date, p_heure, p_duree_min,
    p_nature, p_ville, p_code_postal, v_t.id, v_t.unite, v_t.prix_htva_centimes)
  returning id into v_id;

  -- L'adresse reste DE MON CÔTÉ jusqu'à l'acceptation.
  insert into engagement_rattachements (org_id, engagement_id, affaire_id,
    adresse_reservee, contact_reserve)
  values (v_moi, v_id, p_affaire, p_adresse, p_contact);

  perform engagement_inscrire(v_id, 'proposee', v_moi, jsonb_build_object(
    'date', p_date, 'unite', v_t.unite, 'prix_htva_centimes', v_t.prix_htva_centimes,
    'nature', p_nature, 'ville', p_ville));

  return jsonb_build_object('ok', true, 'engagement_id', v_id,
    'prix_htva_centimes', v_t.prix_htva_centimes, 'unite', v_t.unite);
end $function$;

-- Répondre : le prestataire, et lui seul. L'acceptation libère l'adresse.
create or replace function public.cmd_repondre_engagement(
  p_engagement uuid, p_accepte boolean, p_motif text default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_moi uuid := jwt_org(); v_e engagements%rowtype; v_acteur uuid;
  v_adr text; v_contact text;
begin
  select * into v_e from engagements where id = p_engagement;
  if not found then
    raise exception 'Engagement introuvable' using errcode = '42501';
  end if;
  if v_e.org_prestataire is distinct from v_moi then
    raise exception 'Seul le prestataire repond a une proposition'
      using errcode = '42501';
  end if;
  if v_e.etat <> 'proposee' then
    return jsonb_build_object('ok', false, 'motif', format('deja %s', v_e.etat));
  end if;
  if not p_accepte and coalesce(btrim(p_motif), '') = '' then
    return jsonb_build_object('ok', false, 'motif', 'un refus se motive');
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_moi;

  if p_accepte then
    -- L'adresse franchit la cloison MAINTENANT, pas avant : elle est recopiee
    -- depuis le rattachement prive du donneur.
    select adresse_reservee, contact_reserve into v_adr, v_contact
      from engagement_rattachements
     where engagement_id = p_engagement and org_id = v_e.org_donneur;

    update engagements
       set etat = 'acceptee', repondu_le = now(), repondu_par = v_acteur,
           adresse_complete = v_adr, contact_sur_place = v_contact
     where id = p_engagement;

    perform engagement_inscrire(p_engagement, 'acceptee', v_moi, '{}'::jsonb);
    if v_adr is not null then
      perform engagement_inscrire(p_engagement, 'adresse_liberee', v_moi, '{}'::jsonb);
    end if;
  else
    update engagements
       set etat = 'refusee', repondu_le = now(), repondu_par = v_acteur,
           motif_refus = btrim(p_motif)
     where id = p_engagement;
    perform engagement_inscrire(p_engagement, 'refusee', v_moi,
      jsonb_build_object('motif', btrim(p_motif)));
  end if;

  return jsonb_build_object('ok', true, 'etat',
    (select etat from engagements where id = p_engagement));
end $function$;

-- Le tableau de bord : mes engagements, dans les deux sens.
create or replace function public.cmd_mes_engagements(p_etat text default null)
returns table (
  id uuid, sens text, contrepartie text, date_prestation date, heure_debut time,
  nature text, ville text, code_postal text, unite text,
  prix_htva_centimes integer, etat text, adresse_complete text,
  contact_sur_place text, repondu_le timestamptz, motif_refus text)
language sql stable set search_path to 'public'
as $function$
  select e.id,
         case when e.org_donneur = jwt_org() then 'confiee' else 'recue' end,
         o.nom,
         e.date_prestation, e.heure_debut, e.nature, e.ville, e.code_postal,
         e.unite, e.prix_htva_centimes, e.etat, e.adresse_complete,
         e.contact_sur_place, e.repondu_le, e.motif_refus
    from engagements e
    join organisations o
      on o.id = case when e.org_donneur = jwt_org()
                     then e.org_prestataire else e.org_donneur end
   where (p_etat is null or e.etat = p_etat)
   order by e.date_prestation, e.cree_le;
$function$;

revoke execute on function public.cmd_proposer_engagement(uuid,uuid,date,text,text,text,time,integer,text,text,uuid) from public, anon;
grant  execute on function public.cmd_proposer_engagement(uuid,uuid,date,text,text,text,time,integer,text,text,uuid) to authenticated, service_role;
revoke execute on function public.cmd_repondre_engagement(uuid,boolean,text) from public, anon;
grant  execute on function public.cmd_repondre_engagement(uuid,boolean,text) to authenticated, service_role;
revoke execute on function public.cmd_mes_engagements(text) from public, anon;
grant  execute on function public.cmd_mes_engagements(text) to authenticated, service_role;
