-- =============================================================================
-- 0069_journal_enregistrements.sql   ✅ appliquée le 2026-07-29 — LOT 7, D4
--
-- JOURNAL D'ENREGISTREMENTS : tous les mouvements, pas un bloc-notes.
--
-- La table `evenements` capte déjà des centaines de mouvements en insertion
-- seule : affectations, transitions de dossier, documents, factures,
-- capacités. Mais elle ne voyait QUE ce qui passe par une commande `cmd_*`.
--
-- Or l'application écrit aussi en direct : modifier un dossier, un client, un
-- scénario de devis, encaisser un paiement, ajouter un congé ou un véhicule
-- passent par un simple UPDATE/INSERT sous RLS. Ces mouvements — précisément
-- « les modifs dans les dossiers » demandées — ne laissaient AUCUNE trace.
--
-- On journalise donc par TRIGGER plutôt qu'en ajoutant un appel dans chaque
-- fonction : un trigger ne s'oublie pas, et il couvre aussi les écritures
-- futures qu'on n'a pas encore écrites.
--
-- ⚠ La version de journaliser_mouvement() ci-dessous contient un bug corrigé
--   par 0070 (comparaison sur les clés au lieu des paires clé/valeur).
--   Garder les deux fichiers dans l'ordre.
-- =============================================================================

create or replace function public.journaliser_mouvement()
returns trigger language plpgsql security definer
set search_path to 'public' as $$
declare
  v_org uuid; v_acteur uuid; v_id uuid; v_type text;
  v_details jsonb := '{}'::jsonb; v_champs text[];
begin
  v_org := coalesce(
    case when tg_op = 'DELETE' then old.org_id else new.org_id end, jwt_org());
  v_id := case when tg_op = 'DELETE' then old.id else new.id end;
  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  v_type := case tg_table_name
    when 'affaires'  then 'Dossier'   when 'clients'   then 'Client'
    when 'scenarios' then 'Devis'     when 'paiements' then 'Paiement'
    when 'vehicules' then 'Véhicule'  when 'conges'    then 'Congé'
    else initcap(tg_table_name) end
    || '.' || case tg_op when 'INSERT' then 'Cree'
                         when 'UPDATE' then 'Modifie' else 'Supprime' end;

  if tg_op = 'UPDATE' then
    select array_agg(cle) into v_champs
      from (select key as cle from jsonb_each(to_jsonb(new))
            except select key from jsonb_each(to_jsonb(old))) x;
    if v_champs is null or array_length(v_champs, 1) is null then return null; end if;
    v_details := jsonb_build_object('champs', to_jsonb(v_champs));
  end if;

  insert into evenements (org_id, type, entite_type, entite_id, acteur_id, payload)
  values (v_org, v_type, tg_table_name, v_id, v_acteur, v_details);
  return null;
end $$;

-- Après coup : un défaut de journalisation ne doit jamais empêcher le travail.
drop trigger if exists trg_journal_affaires on public.affaires;
create trigger trg_journal_affaires after insert or update or delete on public.affaires
  for each row execute function journaliser_mouvement();
drop trigger if exists trg_journal_clients on public.clients;
create trigger trg_journal_clients after insert or update or delete on public.clients
  for each row execute function journaliser_mouvement();
drop trigger if exists trg_journal_scenarios on public.scenarios;
create trigger trg_journal_scenarios after insert or update or delete on public.scenarios
  for each row execute function journaliser_mouvement();
drop trigger if exists trg_journal_paiements on public.paiements;
create trigger trg_journal_paiements after insert or update or delete on public.paiements
  for each row execute function journaliser_mouvement();
drop trigger if exists trg_journal_vehicules on public.vehicules;
create trigger trg_journal_vehicules after insert or update or delete on public.vehicules
  for each row execute function journaliser_mouvement();
drop trigger if exists trg_journal_conges on public.conges;
create trigger trg_journal_conges after insert or update or delete on public.conges
  for each row execute function journaliser_mouvement();

-- ── La note manuelle : la décision qu'aucune donnée ne révèle ──────────────
create or replace function public.cmd_noter_decision(
  p_texte text, p_entite_type text default null,
  p_entite_id uuid default null, p_remplace bigint default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_acteur uuid; v_id bigint;
begin
  if not acteur_a_capacite('creer_affaire') then
    raise exception 'Droits insuffisants pour écrire au journal' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_texte, ''))) < 3 then
    raise exception 'La note est vide' using errcode = '22023';
  end if;
  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  -- `p_remplace` cite la décision antérieure : on ne réécrit jamais le passé,
  -- on empile. Entre associés, c'est ce qui permet de reconstituer une
  -- position sans discuter de qui a modifié quoi.
  insert into evenements (org_id, type, entite_type, entite_id, acteur_id, payload)
  values (v_org, 'Decision.Notee', coalesce(p_entite_type, 'organisation'),
          coalesce(p_entite_id, v_org), v_acteur,
          jsonb_build_object('texte', btrim(p_texte), 'remplace', p_remplace))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

revoke all on function public.cmd_noter_decision(text, text, uuid, bigint) from public, anon;
grant execute on function public.cmd_noter_decision(text, text, uuid, bigint) to authenticated;

-- ── Lecture du journal, filtrée ────────────────────────────────────────────
create or replace function public.cmd_journal(
  p_depuis date default null, p_jusqua date default null,
  p_entite_type text default null, p_entite_id uuid default null,
  p_acteur uuid default null, p_limite integer default 200)
returns jsonb language plpgsql stable security definer
set search_path to 'public' as $$
declare v_org uuid := jwt_org();
begin
  -- Le journal expose montants, salaires et droits : il n'a pas à être ouvert
  -- à toute l'organisation.
  if not acteur_a_capacite('gerer_referentiels')
     and not acteur_a_capacite('voir_prix') then
    raise exception 'Droits insuffisants pour consulter le journal' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id, 'quand', e.created_at, 'type', e.type,
      'entite_type', e.entite_type, 'entite_id', e.entite_id,
      'qui', coalesce(u.nom, u.email, 'système'),
      'details', e.payload) order by e.created_at desc, e.id desc)
    from (
      select * from evenements ev
       where ev.org_id = v_org
         and (p_depuis is null or ev.created_at >= p_depuis::timestamptz)
         and (p_jusqua is null or ev.created_at < (p_jusqua + 1)::timestamptz)
         and (p_entite_type is null or ev.entite_type = p_entite_type)
         and (p_entite_id is null or ev.entite_id = p_entite_id)
         and (p_acteur is null or ev.acteur_id = p_acteur)
       order by ev.created_at desc, ev.id desc
       limit greatest(1, least(1000, coalesce(p_limite, 200)))
    ) e
    left join utilisateurs u on u.id = e.acteur_id), '[]'::jsonb);
end $$;

revoke all on function public.cmd_journal(date, date, text, uuid, uuid, integer)
  from public, anon;
grant execute on function public.cmd_journal(date, date, text, uuid, uuid, integer)
  to authenticated;

-- ── Refermer la lecture directe de la table ────────────────────────────────
drop policy if exists evenements_tenant on public.evenements;
create policy evenements_lecture on public.evenements
  for select to authenticated
  using (org_id = jwt_org()
         and (acteur_a_capacite('gerer_referentiels')
              or acteur_a_capacite('voir_prix')));
