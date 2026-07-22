-- =============================================================================
-- 0045 + 0045b — APPLIQUÉES en production le 21/07/2026
-- (ne pas rejouer : ranger dans le dépôt)
--
-- 1) La VISITE entre dans l'agenda. affaires.date_visite existait déjà mais ne
--    produisait aucune mission. Elle devient une mission de type 'visite',
--    créée dès qu'une date est posée — sans attendre la confirmation, puisqu'on
--    visite AVANT de confirmer.
-- 2) ANNULER UNE ANNULATION. cmd_annuler_affaire() n'avait pas de réciproque.
-- =============================================================================

create or replace function public.sync_visite_vers_mission()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.date_visite is null then
    delete from missions
     where affaire_id = new.id and type = 'visite' and etat = 'planifiee';
    return new;
  end if;
  update missions
     set date = new.date_visite, heure = coalesce(new.heure_visite, '09:00'::time)
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

update public.affaires set date_visite = date_visite where date_visite is not null;

-- Le trigger bloquer_update_etat() interdit tout UPDATE direct sur
-- affaires.etat (garde S4). On ne le contourne pas : on passe par
-- transition_interne(), le même canal que cmd_transition_affaire.
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
  perform transition_interne(p_affaire, 'confirme'::etat_affaire);
  update affaires set archive_le = null where id = p_affaire;
  update missions
     set etat = 'planifiee', partagee_le = null, partagee_par = null
   where affaire_id = p_affaire and etat = 'annulee';
  perform emettre_evenement(v_org, 'Affaire.Reprise', 'affaire', p_affaire,
                            null, jsonb_build_object('motif', p_motif));
  return jsonb_build_object('affaire_id', p_affaire, 'etat', 'confirme');
end $$;

revoke all on function public.cmd_reprendre_affaire(uuid, text) from public, anon;
grant execute on function public.cmd_reprendre_affaire(uuid, text) to authenticated;
