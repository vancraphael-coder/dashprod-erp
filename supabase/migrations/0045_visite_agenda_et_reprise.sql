-- =============================================================================
-- 1) La VISITE entre dans l'agenda.
--    affaires.date_visite existait déjà mais ne produisait aucune mission :
--    la visite n'apparaissait donc nulle part au planning. Elle devient une
--    mission de type 'visite', créée dès qu'une date est posée — sans attendre
--    la confirmation, puisqu'on visite AVANT de confirmer.
--
-- 2) ANNULER UNE ANNULATION.
--    cmd_annuler_affaire() existait sans réciproque : un désistement encodé
--    par erreur était définitif. cmd_reprendre_affaire() rétablit le dossier
--    et ses missions.
--
-- ⚠ La version de cmd_reprendre_affaire ci-dessous écrit directement
--   affaires.etat, ce qui viole la garde S4. Corrigé par 0045b — garder les
--   deux fichiers dans l'ordre.
-- =============================================================================

create or replace function public.sync_visite_vers_mission()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.date_visite is null then
    -- Date retirée : la visite disparaît de l'agenda.
    delete from missions
     where affaire_id = new.id and type = 'visite' and etat = 'planifiee';
    return new;
  end if;

  update missions
     set date = new.date_visite,
         heure = coalesce(new.heure_visite, '09:00'::time)
   where affaire_id = new.id and type = 'visite' and etat <> 'annulee';

  if not found then
    insert into missions (org_id, affaire_id, date, heure, type, etat)
    values (new.org_id, new.id, new.date_visite,
            coalesce(new.heure_visite, '09:00'::time), 'visite', 'planifiee');
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_visite on public.affaires;
create trigger trg_sync_visite
  after insert or update of date_visite, heure_visite on public.affaires
  for each row execute function sync_visite_vers_mission();

-- Reprise : les dossiers qui ont déjà une date de visite obtiennent la leur.
update public.affaires set date_visite = date_visite where date_visite is not null;

-- ── Annuler une annulation ─────────────────────────────────────────────────
create or replace function public.cmd_reprendre_affaire(
  p_affaire uuid, p_motif text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid; v_etat etat_affaire;
begin
  select org_id, etat into v_org, v_etat from affaires where id = p_affaire;
  if v_org is null or v_org <> jwt_org() then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;
  if not acteur_a_capacite('creer_affaire') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if v_etat <> 'annule' then
    raise exception 'Ce dossier n''est pas annulé (état : %)', v_etat
      using errcode = '22023';
  end if;

  -- Retour à 'confirme' : l'état d'où part la planification. On ne devine pas
  -- un état antérieur, on repart d'un point sûr et le bureau réajuste.
  update affaires set etat = 'confirme', archive_le = null where id = p_affaire;

  -- Les missions annulées par le désistement redeviennent planifiées, mais
  -- NON PARTAGÉES : le bureau revalide avant que le terrain se remobilise.
  update missions
     set etat = 'planifiee', partagee_le = null, partagee_par = null
   where affaire_id = p_affaire and etat = 'annulee';

  perform emettre_evenement(v_org, 'Affaire.Reprise', 'affaire', p_affaire,
                            null, jsonb_build_object('motif', p_motif));
  return jsonb_build_object('affaire_id', p_affaire, 'etat', 'confirme');
end $$;

revoke all on function public.cmd_reprendre_affaire(uuid, text) from public, anon;
grant execute on function public.cmd_reprendre_affaire(uuid, text) to authenticated;
