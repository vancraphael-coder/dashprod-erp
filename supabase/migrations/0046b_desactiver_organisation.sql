-- Une organisation ne peut PAS être supprimée : le journal d'audit
-- (evenements, en insertion seule) référence ses utilisateurs. C'est voulu —
-- une trace comptable ne s'efface pas. La désactivation est donc la seule
-- sortie possible, et l'écran de création doit le dire clairement.
--
-- ⚠ HISTORIQUE : droppée par 0047 avec le reste du parcours éditeur.
create or replace function public.cmd_desactiver_organisation(
  p_org uuid, p_actif boolean default false)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not est_editeur() then
    raise exception 'Réservé à l''éditeur' using errcode = '42501';
  end if;
  if p_org = jwt_org() then
    raise exception 'Impossible de désactiver sa propre organisation'
      using errcode = '22023';
  end if;
  update organisations set actif = p_actif where id = p_org;
  update utilisateurs   set actif = p_actif where org_id = p_org;
  perform emettre_evenement(jwt_org(),
    case when p_actif then 'Organisation.Reactivee' else 'Organisation.Desactivee' end,
    'organisation', p_org, null, '{}'::jsonb);
  return jsonb_build_object('org_id', p_org, 'actif', p_actif);
end $$;

revoke all on function public.cmd_desactiver_organisation(uuid, boolean) from public, anon;
grant execute on function public.cmd_desactiver_organisation(uuid, boolean) to authenticated;
