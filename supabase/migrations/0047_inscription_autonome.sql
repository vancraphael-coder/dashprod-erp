-- =============================================================================
-- 0047_inscription_autonome.sql — APPLIQUÉE en production le 21/07/2026
-- (ranger dans le dépôt, ne pas rejouer)
--
-- INSCRIPTION AUTONOME — un déménageur crée sa société depuis la landing.
--
-- Erreur corrigée : la création d'entreprise avait été placée dans les
-- paramètres d'une société cliente, ce qui donnait à un client un droit sur
-- la plateforme entière. Retirée (drop des cmd_ d'éditeur en fin de fichier).
--
-- Le bon garde-fou n'est pas un privilège d'éditeur, c'est l'ABSENCE
-- d'organisation : on ne peut créer une société que si l'on n'en a aucune.
--   - authentifié (Google) → identité réelle, jamais d'anonyme
--   - n'appartenant à aucune organisation → une seule par identité
--   - e-mail pas déjà invité ailleurs
-- Un même compte ne peut donc pas créer de sociétés en série.
-- =============================================================================

create or replace function public.cmd_creer_ma_societe(
  p_nom text, p_bce text default null, p_tva text default null,
  p_tel text default null, p_email text default null, p_nom_admin text default null
) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_uid   uuid := auth.uid();
  v_res   jsonb; v_org uuid; v_admin uuid;
begin
  if v_uid is null or v_email = '' then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if exists (select 1 from utilisateurs where auth_id = v_uid) then
    raise exception 'Ce compte appartient déjà à une société' using errcode = '23505';
  end if;
  if exists (select 1 from utilisateurs where email = v_email) then
    raise exception 'Cet e-mail est déjà invité dans une société — connectez-vous, votre accès vous attend.'
      using errcode = '23505';
  end if;
  if p_nom is null or btrim(p_nom) = '' then
    raise exception 'Le nom de la société est obligatoire' using errcode = '22023';
  end if;

  v_res := creer_organisation(btrim(p_nom), v_email,
                              coalesce(nullif(btrim(p_nom_admin), ''), v_email),
                              p_bce, p_tva, null, null, null, p_tel,
                              nullif(btrim(coalesce(p_email, '')), ''), null);
  v_org := (v_res->>'org_id')::uuid; v_admin := (v_res->>'admin_id')::uuid;

  -- Rattachement immédiat : la personne vient de s'authentifier, il n'y a
  -- aucune invitation à réclamer.
  update utilisateurs set auth_id = v_uid where id = v_admin;

  perform emettre_evenement(v_org, 'Organisation.Inscription', 'organisation',
                            v_org, v_admin,
                            jsonb_build_object('nom', btrim(p_nom), 'email', v_email));
  return jsonb_build_object('org_id', v_org, 'admin_id', v_admin,
                            'statut', 'PRET_A_CONFIGURER');
end $$;

revoke all on function public.cmd_creer_ma_societe(text,text,text,text,text,text)
  from public, anon;
grant execute on function public.cmd_creer_ma_societe(text,text,text,text,text,text)
  to authenticated;

-- Retrait de l'administration de plateforme depuis l'application cliente.
drop function if exists public.cmd_creer_organisation(text,text,text,text,text,text,text);
drop function if exists public.cmd_lister_organisations();
drop function if exists public.cmd_desactiver_organisation(uuid, boolean);
revoke all on function public.est_editeur() from authenticated;
