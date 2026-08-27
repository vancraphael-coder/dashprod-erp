-- 0154 — APPLIQUÉE ET VÉRIFIÉE le 27/08/2026.
-- LES PAGES MODIFIABLES D'UN ACCÈS « VISITE TERRAIN ».
--
-- visite_terrain donne un accès en LECTURE ; on ouvre l'écriture sur une
-- sélection de pages. Stockée sur l'utilisateur ; seules les pages connues sont
-- conservées (jamais paie/paramètres…).

alter table public.utilisateurs
  add column if not exists pages_modifiables text[] not null default '{}';

create or replace function cmd_definir_pages_visite(p_utilisateur uuid, p_pages text[])
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_org uuid := jwt_org();
  pages_connues text[] := array['dossiers','planning','releve','materiel',
    'stockage','carnet','conversations'];
begin
  if not acteur_a_capacite('confier_les_acces') then
    raise exception 'Refusé : vous ne pouvez pas confier les accès' using errcode = '42501';
  end if;
  if not exists (select 1 from utilisateurs where id = p_utilisateur and org_id = v_org) then
    raise exception 'Utilisateur hors organisation' using errcode = '42501';
  end if;
  update utilisateurs
     set pages_modifiables = (
       select coalesce(array_agg(distinct p), '{}')
       from unnest(coalesce(p_pages, '{}')) p where p = any(pages_connues))
   where id = p_utilisateur and org_id = v_org;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function cmd_definir_pages_visite(uuid, text[]) to authenticated;
