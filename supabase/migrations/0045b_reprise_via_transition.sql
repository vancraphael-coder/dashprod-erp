-- Correctif de 0045 : le trigger bloquer_update_etat() interdit tout UPDATE
-- direct sur affaires.etat hors du canal officiel. C'est voulu (garde S4) et
-- il ne faut PAS le contourner : on passe par transition_interne(), le même
-- chemin que cmd_transition_affaire.
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

  -- Canal officiel : la garde S4 reste en place, on ne la contourne pas.
  perform transition_interne(p_affaire, 'confirme'::etat_affaire);

  update affaires set archive_le = null where id = p_affaire;

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
