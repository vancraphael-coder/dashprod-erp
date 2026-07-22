-- =============================================================================
-- 0046 + 0046b — APPLIQUÉES en production le 21/07/2026 (ranger, ne pas rejouer)
--
-- Création de nouvelles sociétés depuis l'application.
-- creer_organisation() ne doit PAS être ouverte à tous les authentifiés, sinon
-- n'importe quel client crée des tenants. Solution : un drapeau d'ÉDITEUR.
-- Le contrôle reste dans PostgreSQL — la seule couche de sécurité de cette app.
-- =============================================================================

alter table public.organisations
  add column if not exists est_editeur boolean not null default false;

comment on column public.organisations.est_editeur is
  'true = organisation de l''éditeur Dashprod, autorisée à créer d''autres '
  'organisations. Ne jamais activer pour une entreprise cliente.';

update public.organisations set est_editeur = true
 where id = '5de63170-6a61-4e94-a84c-fd6bce4c2f9c';

create or replace function public.est_editeur()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce((select est_editeur from organisations where id = jwt_org()), false);
$$;
revoke all on function public.est_editeur() from public, anon;
grant execute on function public.est_editeur() to authenticated;

create or replace function public.cmd_creer_organisation(
  p_nom text, p_email_admin text, p_nom_admin text default null,
  p_bce text default null, p_tva text default null,
  p_tel text default null, p_email text default null
) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_res jsonb;
begin
  if not est_editeur() then
    raise exception 'Seul l''éditeur peut créer une organisation' using errcode = '42501';
  end if;
  if exists (select 1 from utilisateurs where email = lower(btrim(p_email_admin))) then
    raise exception 'Cet e-mail est déjà rattaché à une organisation' using errcode = '23505';
  end if;
  v_res := creer_organisation(p_nom, p_email_admin, coalesce(p_nom_admin, p_email_admin),
                              p_bce, p_tva, null, null, null, p_tel, p_email, null);
  perform emettre_evenement(jwt_org(), 'Organisation.CreeeParEditeur', 'organisation',
                            (v_res->>'org_id')::uuid, null,
                            jsonb_build_object('nom', p_nom));
  return v_res;
end $$;
revoke all on function public.cmd_creer_organisation(text,text,text,text,text,text,text)
  from public, anon;
grant execute on function public.cmd_creer_organisation(text,text,text,text,text,text,text)
  to authenticated;

create or replace function public.cmd_lister_organisations()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not est_editeur() then
    raise exception 'Réservé à l''éditeur' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'nom', o.nom, 'est_editeur', o.est_editeur, 'actif', o.actif,
      'creee_le', o.created_at,
      'membres',  (select count(*) from utilisateurs u where u.org_id = o.id),
      'clients',  (select count(*) from clients c   where c.org_id = o.id),
      'affaires', (select count(*) from affaires a  where a.org_id = o.id),
      'prete',    (o.bce is not null and o.tva is not null and o.iban is not null)
    ) order by o.created_at) from organisations o), '[]'::jsonb);
end $$;
revoke all on function public.cmd_lister_organisations() from public, anon;
grant execute on function public.cmd_lister_organisations() to authenticated;

-- Une organisation ne peut PAS être supprimée : le journal d'audit
-- (evenements, en insertion seule) référence ses utilisateurs. C'est voulu.
-- La désactivation est la seule sortie.
create or replace function public.cmd_desactiver_organisation(
  p_org uuid, p_actif boolean default false)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not est_editeur() then
    raise exception 'Réservé à l''éditeur' using errcode = '42501';
  end if;
  if p_org = jwt_org() then
    raise exception 'Impossible de désactiver sa propre organisation' using errcode = '22023';
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
