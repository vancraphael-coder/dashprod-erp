-- =============================================================================
-- 0059_fix_gen_random_bytes_schema.sql   ✅ appliquée le 2026-07-28
--
-- BUG — « function gen_random_bytes(integer) does not exist » au moment de
-- générer un code de signature.
--
-- Cause : sur Supabase, pgcrypto est installée dans le schéma `extensions`,
-- pas dans `public`. Or nos fonctions portent `set search_path to 'public'`
-- (bonne pratique : on fige le chemin pour qu'une fonction security definer
-- ne puisse pas être détournée). gen_random_bytes est donc introuvable DEPUIS
-- la fonction, alors qu'elle marche dans l'éditeur SQL — dont le search_path
-- inclut `extensions`. D'où une erreur qui n'apparaît qu'à l'usage réel.
--
-- 0055 avait bien fait `create extension if not exists pgcrypto` : l'extension
-- EST là, c'est le chemin qui ne l'atteint pas. Le test « l'extension est-elle
-- installée ? » ne prouve donc rien sur l'accessibilité depuis une fonction.
--
-- Correctif : qualifier explicitement le schéma. On ne relâche PAS le
-- search_path (ce serait affaiblir la garde) — on nomme la fonction en entier.
--
-- Note : sha256() et gen_random_uuid() sont des fonctions du cœur PostgreSQL
-- (pg_catalog, toujours dans le chemin) : elles ne sont pas concernées.
-- =============================================================================

create or replace function public.cmd_creer_acces_client(
  p_affaire uuid, p_code text, p_jours integer default 90)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid; v_sel text; v_id uuid; v_propre text;
begin
  select org_id into v_org from affaires where id = p_affaire;
  if v_org is null or v_org <> jwt_org() then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;
  if not acteur_a_capacite('creer_affaire') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;

  v_propre := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_propre) < 12 then
    raise exception 'Code trop court : 12 caractères minimum' using errcode = '22023';
  end if;

  update acces_client set revoque_le = now()
   where affaire_id = p_affaire and revoque_le is null;

  -- Schéma qualifié : pgcrypto vit dans `extensions` sur Supabase.
  v_sel := encode(extensions.gen_random_bytes(16), 'hex');

  insert into acces_client (org_id, affaire_id, empreinte, sel, indice,
                            expire_le, cree_par, usage)
  values (v_org, p_affaire, empreinte_code(v_propre, v_sel), v_sel,
          right(v_propre, 4),
          now() + make_interval(days => greatest(1, coalesce(p_jours, 90))),
          (select id from utilisateurs where auth_id = auth.uid() limit 1),
          'signature')
  returning id into v_id;

  perform emettre_evenement(v_org, 'AccesClient.Cree', 'affaire', p_affaire,
                            null, jsonb_build_object('indice', right(v_propre, 4)));
  return jsonb_build_object('acces_id', v_id, 'indice', right(v_propre, 4));
end $$;

revoke all on function public.cmd_creer_acces_client(uuid, text, integer) from public, anon;
grant execute on function public.cmd_creer_acces_client(uuid, text, integer) to authenticated;
