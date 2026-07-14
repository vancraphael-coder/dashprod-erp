-- =============================================================================
-- Migration 0023 — Métier terrain (P1, synthèse §4)
-- Source : alignement page 10 §3. Le MÉTIER (chef d'équipe / chauffeur /
-- déménageur) est un attribut d'affichage et d'affectation terrain — il est
-- DISTINCT des rôles S3, qui restent la seule vérité des PERMISSIONS. Un
-- chauffeur peut avoir le rôle d'accès « commercial » s'il chiffre : deux
-- axes, deux colonnes.
-- =============================================================================

alter table utilisateurs add column if not exists metier text not null default 'demenageur';
comment on column utilisateurs.metier is
  'Métier terrain (chef_equipe|chauffeur|demenageur) — affichage/affectation. Les permissions restent les rôles S3.';

-- La RLS d'utilisateurs est SELECT-only (0003) — c'est voulu : personne ne
-- modifie directement la table. Le métier passe donc par une commande gardée,
-- comme toute écriture d'identité.
create or replace function cmd_definir_metier(p_utilisateur uuid, p_metier text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Refusé : capacité gerer_referentiels requise' using errcode = '42501';
  end if;
  if p_metier not in ('chef_equipe', 'chauffeur', 'demenageur') then
    raise exception 'Métier inconnu : %', p_metier using errcode = '22023';
  end if;

  update utilisateurs set metier = p_metier
   where id = p_utilisateur and org_id = v_org;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Utilisateur.MetierDefini',
    'utilisateur', p_utilisateur, v_acteur, jsonb_build_object('metier', p_metier));
end; $$;
comment on function cmd_definir_metier is
  'Définit le métier terrain d''un membre (gerer_referentiels). Les rôles S3 restent les permissions.';
