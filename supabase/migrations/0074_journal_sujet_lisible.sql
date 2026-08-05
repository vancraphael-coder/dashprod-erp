-- =============================================================================
-- 0074_journal_sujet_lisible.sql   ✅ appliquée le 2026-08-05
--
-- DEUX DÉFAUTS DU JOURNAL, CORRIGÉS ENSEMBLE.
--
-- 1) On ne savait pas DE QUOI parlait une ligne. « Dossier modifié — heure »
--    sans dire quel dossier : illisible dès qu'il y a plus de trois clients.
--    On résout donc, pour chaque entrée, un SUJET lisible — le nom du client
--    du dossier concerné, la date d'une mission, le numéro d'une facture.
--
-- 2) Défaut plus sérieux, découvert en réglant le premier : le type d'entité
--    n'est pas homogène. Les commandes `cmd_*` écrivent 'affaire' (singulier),
--    le trigger de journalisation écrit 'affaires' (nom de la table). Or
--    l'historique d'un dossier filtrait sur 'affaires' : il ne montrait donc
--    QUE les modifications directes, et ratait toutes les transitions d'état,
--    les documents, les factures. La moitié de l'histoire manquait.
--
--    Correctif : on ne filtre plus sur le type d'entité mais sur le DOSSIER
--    RATTACHÉ, résolu quelle que soit la nature de l'événement. L'historique
--    d'un dossier montre alors tout ce qui le concerne — y compris ses
--    missions, ses documents et ses factures, qui ne portaient pas son id.
-- =============================================================================

/**
 * Dossier rattaché à un événement, quelle que soit l'entité citée.
 * Une mission, un document, une facture appartiennent à un dossier : c'est
 * ainsi qu'un utilisateur les cherche.
 */
create or replace function public.evenement_affaire(
  p_entite_type text, p_entite_id uuid)
returns uuid language sql stable security definer
set search_path to 'public' as $$
  select case
    when p_entite_type in ('affaire', 'affaires') then p_entite_id
    when p_entite_type = 'mission'
      then (select affaire_id from missions where id = p_entite_id)
    when p_entite_type = 'document'
      then (select affaire_id from documents_instances where id = p_entite_id)
    when p_entite_type = 'facture'
      then (select affaire_id from factures where id = p_entite_id)
    when p_entite_type = 'scenarios'
      then (select affaire_id from scenarios where id = p_entite_id)
    when p_entite_type = 'paiements'
      then (select f.affaire_id from paiements p
              join factures f on f.id = p.facture_id where p.id = p_entite_id)
    else null end;
$$;

revoke all on function public.evenement_affaire(text, uuid) from public, anon;

/**
 * Le sujet lisible d'un événement : ce qu'on lit pour savoir de quoi il parle.
 * On privilégie TOUJOURS le nom du client — c'est ainsi qu'un déménageur
 * désigne un dossier, jamais par un identifiant.
 */
create or replace function public.evenement_sujet(
  p_entite_type text, p_entite_id uuid)
returns text language plpgsql stable security definer
set search_path to 'public' as $$
declare v_aff uuid; v_nom text; v_extra text;
begin
  v_aff := evenement_affaire(p_entite_type, p_entite_id);

  if v_aff is not null then
    select c.nom into v_nom
      from affaires af left join clients c on c.id = af.client_id
     where af.id = v_aff;

    -- On précise ce qui, dans le dossier, a bougé — sans noyer le nom.
    v_extra := case
      when p_entite_type = 'mission' then
        (select to_char(date, 'DD/MM') from missions where id = p_entite_id)
      when p_entite_type = 'facture' then
        (select numero from factures where id = p_entite_id)
      else null end;

    return coalesce(v_nom, 'Dossier sans client')
        || coalesce(' · ' || v_extra, '');
  end if;

  -- Hors dossier : on nomme quand même l'objet plutôt que d'afficher un uuid.
  if p_entite_type = 'clients' then
    return (select nom from clients where id = p_entite_id);
  elsif p_entite_type = 'utilisateur' then
    return (select coalesce(nom, email) from utilisateurs where id = p_entite_id);
  elsif p_entite_type = 'vehicules' then
    return (select nom from vehicules where id = p_entite_id);
  elsif p_entite_type = 'conges' then
    return (select coalesce(u.nom, u.email) from conges cg
              join utilisateurs u on u.id = cg.utilisateur_id
             where cg.id = p_entite_id);
  elsif p_entite_type = 'organisation' then
    return (select nom from organisations where id = p_entite_id);
  end if;
  return null;
end $$;

revoke all on function public.evenement_sujet(text, uuid) from public, anon;

-- ── Le journal renvoie désormais le sujet, et filtre par DOSSIER ───────────
-- La signature change (p_entite_id devient p_affaire) : on retire l'ancienne
-- pour qu'aucun appel ne continue de filtrer sur un type d'entité.
drop function if exists public.cmd_journal(date, date, text, uuid, uuid, integer);

create or replace function public.cmd_journal(
  p_depuis date default null,
  p_jusqua date default null,
  p_affaire uuid default null,
  p_acteur uuid default null,
  p_limite integer default 200)
returns jsonb language plpgsql stable security definer
set search_path to 'public' as $$
declare v_org uuid := jwt_org();
begin
  if not acteur_a_capacite('gerer_referentiels')
     and not acteur_a_capacite('voir_prix') then
    raise exception 'Droits insuffisants pour consulter le journal'
      using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id,
      'quand', e.created_at,
      'type', e.type,
      'entite_type', e.entite_type,
      'entite_id', e.entite_id,
      -- Ce que l'utilisateur lit pour savoir de quoi on parle.
      'sujet', evenement_sujet(e.entite_type, e.entite_id),
      'affaire_id', evenement_affaire(e.entite_type, e.entite_id),
      'qui', coalesce(u.nom, u.email, 'système'),
      'details', e.payload) order by e.created_at desc, e.id desc)
    from (
      select * from evenements ev
       where ev.org_id = v_org
         and (p_depuis is null or ev.created_at >= p_depuis::timestamptz)
         and (p_jusqua is null or ev.created_at < (p_jusqua + 1)::timestamptz)
         -- Filtre par DOSSIER, pas par type d'entité : une mission ou une
         -- facture appartient au dossier, même si elle ne porte pas son id.
         and (p_affaire is null
              or evenement_affaire(ev.entite_type, ev.entite_id) = p_affaire)
         and (p_acteur is null or ev.acteur_id = p_acteur)
       order by ev.created_at desc, ev.id desc
       limit greatest(1, least(1000, coalesce(p_limite, 200)))
    ) e
    left join utilisateurs u on u.id = e.acteur_id), '[]'::jsonb);
end $$;

revoke all on function public.cmd_journal(date, date, uuid, uuid, integer)
  from public, anon;
grant execute on function public.cmd_journal(date, date, uuid, uuid, integer)
  to authenticated;

-- Vérification :
--   select type, entite_type, evenement_sujet(entite_type, entite_id)
--     from evenements order by id desc limit 10;
