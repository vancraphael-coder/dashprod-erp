-- =============================================================================
-- 0202 — DÉCOMPTE DE FIN DE CHANTIER : chef d'équipe → bureau → client.
--
-- Sur un déménagement à l'heure, le montant se calcule avant la fin réelle :
-- avant le déchargement, ou avant le retour au dépôt. Le chef d'équipe fait le
-- calcul sur place et VALIDE les heures ; le bureau relit, ajuste si besoin et
-- donne la VALIDATION FINALE ; le montant est annoncé au client par téléphone,
-- et le bureau le note.
--
-- Une ligne par mission. Deux jeux de valeurs qui ne s'écrasent pas : ce que
-- le chef a proposé, ce que le bureau a arrêté. L'écart entre les deux reste
-- lisible — c'est lui qui dit si le terrain calcule juste.
--
-- LE CALCUL N'EST PAS ICI. Le montant vient du moteur du devis (domaine,
-- operations/decompte-chantier.js), le même pour le terrain et le bureau. La
-- base garde ce qui a été vu et validé, par qui et quand, et fait respecter
-- l'ordre des étapes et les droits.
--
-- ACCÈS : aucune politique de lecture directe. Tout passe par les commandes
-- ci-dessous, qui vérifient la capacité — un montant client ne se lit pas
-- depuis n'importe quel compte de la société.
--
-- Strictement additive : aucune table, aucune fonction existante n'est
-- modifiée.
-- =============================================================================

create table if not exists public.decomptes_chantier (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null default jwt_org() references public.organisations(id),
  mission_id           uuid not null unique references public.missions(id) on delete cascade,
  affaire_id           uuid not null references public.affaires(id),
  statut               text not null default 'valide_chef',
  moment               text,
  -- Ce que le chef a vu et validé sur le terrain.
  calcule_le           timestamptz,
  lignes               jsonb not null default '{}'::jsonb,
  heures_chef          numeric(6,2),
  htva_chef_centimes   bigint,
  tvac_chef_centimes   bigint,
  valide_chef_par      uuid references public.utilisateurs(id),
  valide_chef_le       timestamptz,
  -- Ce que le bureau a arrêté.
  heures_final         numeric(6,2),
  htva_final_centimes  bigint,
  tvac_final_centimes  bigint,
  note_bureau          text,
  valide_bureau_par    uuid references public.utilisateurs(id),
  valide_bureau_le     timestamptz,
  -- L'annonce au client, par téléphone.
  communique_par       uuid references public.utilisateurs(id),
  communique_le        timestamptz,
  updated_at           timestamptz not null default now(),
  constraint decomptes_statut_valide
    check (statut in ('valide_chef', 'valide_bureau', 'communique')),
  constraint decomptes_moment_valide
    check (moment is null or moment in ('avant_dechargement', 'avant_retour_depot')),
  constraint decomptes_heures_positives
    check (coalesce(heures_chef, 0) >= 0 and coalesce(heures_final, 0) >= 0)
);

alter table public.decomptes_chantier enable row level security;
-- Pas de politique : lecture et écriture uniquement par les commandes.

create index if not exists idx_decomptes_affaire on public.decomptes_chantier(affaire_id);

comment on table public.decomptes_chantier is
  'Décompte horaire de fin de chantier : heures validées par le chef, validation '
  'finale du bureau, annonce au client. Montant calculé par le moteur du devis.';

-- -----------------------------------------------------------------------------
-- Qui peut lire / proposer : le bureau, ou le chef d'équipe affecté.
-- -----------------------------------------------------------------------------
create or replace function public.decompte_acces_chef(p_mission uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from missions where id = p_mission and org_id = jwt_org())
     and (acteur_a_capacite('gerer_planning')
          or (acteur_a_capacite('cloturer_chantier') and est_affecte_mission(p_mission)));
$$;

create or replace function public.decompte_acces_bureau()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select acteur_a_capacite('gerer_planning') or acteur_a_capacite('emettre_facture');
$$;

-- -----------------------------------------------------------------------------
-- Contexte d'une mission : tout ce qu'il faut pour calculer, en un appel.
-- Le chef n'a pas forcément accès au devis ni aux paramètres de prix : cette
-- commande lui transmet exactement ce qu'il faut, pour CETTE mission.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_decompte_contexte(p_mission uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_aff uuid; v_res jsonb;
begin
  if not decompte_acces_chef(p_mission) then
    raise exception 'Réservé au chef d''équipe du chantier ou au bureau' using errcode = '42501';
  end if;
  select affaire_id into v_aff from missions where id = p_mission and org_id = v_org;

  select jsonb_build_object(
    'mission', (select jsonb_build_object('id', m.id, 'date', m.date, 'type', m.type,
                  'etat', m.etat, 'affaire_id', m.affaire_id)
                  from missions m where m.id = p_mission),
    'client', (select c.nom from affaires a left join clients c on c.id = a.client_id
                where a.id = v_aff),
    'depart', (select min(cs.debut) from chrono_sessions cs
                where cs.mission_id = p_mission and cs.org_id = v_org
                  and coalesce(cs.type, 'travail') = 'travail'),
    'pauses', coalesce((select jsonb_agg(jsonb_build_object('debut', cs.debut, 'fin', cs.fin))
                from (select distinct on (cs2.debut, cs2.fin) cs2.debut, cs2.fin
                        from chrono_sessions cs2
                       where cs2.mission_id = p_mission and cs2.org_id = v_org
                         and cs2.type = 'pause' and cs2.fin is not null) cs), '[]'::jsonb),
    'entrees', (select s.entrees from scenarios s
                 where s.affaire_id = v_aff and s.retenu limit 1),
    'parametres_prix', (select jsonb_build_object(
                  'bareme_horaire', o.parametres_prix -> 'bareme_horaire',
                  'tarifs', o.parametres_prix -> 'tarifs')
                  from organisations o where o.id = v_org),
    'decompte', (select to_jsonb(d) from decomptes_chantier d
                  where d.mission_id = p_mission and d.org_id = v_org)
  ) into v_res;
  return v_res;
end $$;

-- -----------------------------------------------------------------------------
-- Les décomptes d'un dossier, pour le bureau (Calcul définitif).
-- -----------------------------------------------------------------------------
create or replace function public.cmd_decomptes_affaire(p_affaire uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org();
begin
  if not decompte_acces_bureau() then
    raise exception 'Réservé au bureau' using errcode = '42501';
  end if;
  if not exists (select 1 from affaires where id = p_affaire and org_id = v_org) then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'mission_id', m.id, 'date', m.date, 'type', m.type, 'etat', m.etat,
      'depart', (select min(cs.debut) from chrono_sessions cs
                  where cs.mission_id = m.id and coalesce(cs.type,'travail') = 'travail'),
      'decompte', (select to_jsonb(d) - 'org_id' from decomptes_chantier d where d.mission_id = m.id),
      'chef', (select u.nom from decomptes_chantier d join utilisateurs u on u.id = d.valide_chef_par
                where d.mission_id = m.id),
      'bureau', (select u.nom from decomptes_chantier d join utilisateurs u on u.id = d.valide_bureau_par
                where d.mission_id = m.id))
      order by m.date, m.heure nulls last)
    from missions m
    where m.affaire_id = p_affaire and m.org_id = v_org and m.etat <> 'annulee'), '[]'::jsonb);
end $$;

-- -----------------------------------------------------------------------------
-- 1 · Le chef d'équipe valide les heures.
-- Refusé une fois la validation finale donnée : le bureau doit rouvrir.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_decompte_valider_chef(
  p_mission uuid, p_moment text, p_calcule_le timestamptz, p_lignes jsonb,
  p_heures numeric, p_htva_centimes bigint, p_tvac_centimes bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_acteur uuid; v_aff uuid; v_statut text;
begin
  if not decompte_acces_chef(p_mission) then
    raise exception 'Réservé au chef d''équipe du chantier' using errcode = '42501';
  end if;
  if p_heures is null or p_heures < 0 or p_tvac_centimes is null or p_tvac_centimes < 0 then
    return jsonb_build_object('ok', false, 'message', 'Décompte incomplet.');
  end if;
  select statut into v_statut from decomptes_chantier where mission_id = p_mission;
  if v_statut in ('valide_bureau', 'communique') then
    return jsonb_build_object('ok', false,
      'message', 'Le bureau a déjà validé ce décompte. Appelez le bureau pour le rouvrir.');
  end if;

  select affaire_id into v_aff from missions where id = p_mission and org_id = v_org;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;

  insert into decomptes_chantier (org_id, mission_id, affaire_id, statut, moment,
      calcule_le, lignes, heures_chef, htva_chef_centimes, tvac_chef_centimes,
      valide_chef_par, valide_chef_le, updated_at)
  values (v_org, p_mission, v_aff, 'valide_chef', p_moment,
      coalesce(p_calcule_le, now()), coalesce(p_lignes, '{}'::jsonb), p_heures,
      p_htva_centimes, p_tvac_centimes, v_acteur, now(), now())
  on conflict (mission_id) do update set
      statut = 'valide_chef', moment = excluded.moment,
      calcule_le = excluded.calcule_le, lignes = excluded.lignes,
      heures_chef = excluded.heures_chef, htva_chef_centimes = excluded.htva_chef_centimes,
      tvac_chef_centimes = excluded.tvac_chef_centimes,
      valide_chef_par = excluded.valide_chef_par, valide_chef_le = now(),
      updated_at = now();

  perform emettre_evenement(v_org, 'Decompte.ValideChef', 'mission', p_mission, v_acteur,
    jsonb_build_object('heures', p_heures, 'tvac_centimes', p_tvac_centimes, 'moment', p_moment));
  return jsonb_build_object('ok', true);
end $$;

-- -----------------------------------------------------------------------------
-- 2 · Validation finale du bureau (heures et montant arrêtés).
-- Possible aussi sans proposition du chef : si le téléphone du chantier est à
-- plat, le bureau doit pouvoir conclure seul.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_decompte_valider_bureau(
  p_mission uuid, p_heures numeric, p_htva_centimes bigint, p_tvac_centimes bigint,
  p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_acteur uuid; v_aff uuid; v_statut text;
begin
  if not decompte_acces_bureau() then
    raise exception 'La validation finale revient au bureau' using errcode = '42501';
  end if;
  select affaire_id into v_aff from missions where id = p_mission and org_id = v_org;
  if v_aff is null then raise exception 'Mission introuvable' using errcode = '42501'; end if;
  if p_heures is null or p_heures < 0 or p_tvac_centimes is null or p_tvac_centimes < 0 then
    return jsonb_build_object('ok', false, 'message', 'Heures et montant requis.');
  end if;
  select statut into v_statut from decomptes_chantier where mission_id = p_mission;
  if v_statut = 'communique' then
    return jsonb_build_object('ok', false,
      'message', 'Montant déjà annoncé au client. Rouvrez le décompte pour le changer.');
  end if;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;

  insert into decomptes_chantier (org_id, mission_id, affaire_id, statut,
      heures_final, htva_final_centimes, tvac_final_centimes, note_bureau,
      valide_bureau_par, valide_bureau_le, updated_at)
  values (v_org, p_mission, v_aff, 'valide_bureau', p_heures, p_htva_centimes,
      p_tvac_centimes, nullif(btrim(coalesce(p_note, '')), ''), v_acteur, now(), now())
  on conflict (mission_id) do update set
      statut = 'valide_bureau', heures_final = excluded.heures_final,
      htva_final_centimes = excluded.htva_final_centimes,
      tvac_final_centimes = excluded.tvac_final_centimes,
      note_bureau = excluded.note_bureau,
      valide_bureau_par = excluded.valide_bureau_par, valide_bureau_le = now(),
      updated_at = now();

  perform emettre_evenement(v_org, 'Decompte.ValideBureau', 'mission', p_mission, v_acteur,
    jsonb_build_object('heures', p_heures, 'tvac_centimes', p_tvac_centimes));
  return jsonb_build_object('ok', true);
end $$;

-- -----------------------------------------------------------------------------
-- 3 · Le montant a été annoncé au client (par téléphone).
-- -----------------------------------------------------------------------------
create or replace function public.cmd_decompte_communique(p_mission uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_acteur uuid; v_statut text;
begin
  if not decompte_acces_bureau() then
    raise exception 'Réservé au bureau' using errcode = '42501';
  end if;
  select statut into v_statut from decomptes_chantier
   where mission_id = p_mission and org_id = v_org;
  if v_statut is distinct from 'valide_bureau' then
    return jsonb_build_object('ok', false,
      'message', 'Donnez d''abord la validation finale.');
  end if;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  update decomptes_chantier set statut = 'communique', communique_par = v_acteur,
         communique_le = now(), updated_at = now()
   where mission_id = p_mission and org_id = v_org;
  perform emettre_evenement(v_org, 'Decompte.Communique', 'mission', p_mission, v_acteur, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

-- -----------------------------------------------------------------------------
-- Rouvrir : le bureau rend la main au chef (erreur de saisie, client qui
-- conteste). Les valeurs du chef sont gardées ; celles du bureau effacées.
-- -----------------------------------------------------------------------------
create or replace function public.cmd_decompte_rouvrir(p_mission uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_acteur uuid;
begin
  if not decompte_acces_bureau() then
    raise exception 'Réservé au bureau' using errcode = '42501';
  end if;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  update decomptes_chantier set statut = 'valide_chef',
         heures_final = null, htva_final_centimes = null, tvac_final_centimes = null,
         valide_bureau_par = null, valide_bureau_le = null,
         communique_par = null, communique_le = null, updated_at = now()
   where mission_id = p_mission and org_id = v_org;
  perform emettre_evenement(v_org, 'Decompte.Rouvert', 'mission', p_mission, v_acteur, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.decompte_acces_chef(uuid) from public, anon;
revoke all on function public.decompte_acces_bureau() from public, anon;
revoke all on function public.cmd_decompte_contexte(uuid) from public, anon;
revoke all on function public.cmd_decomptes_affaire(uuid) from public, anon;
revoke all on function public.cmd_decompte_valider_chef(uuid, text, timestamptz, jsonb, numeric, bigint, bigint) from public, anon;
revoke all on function public.cmd_decompte_valider_bureau(uuid, numeric, bigint, bigint, text) from public, anon;
revoke all on function public.cmd_decompte_communique(uuid) from public, anon;
revoke all on function public.cmd_decompte_rouvrir(uuid) from public, anon;

grant execute on function public.cmd_decompte_contexte(uuid) to authenticated;
grant execute on function public.cmd_decomptes_affaire(uuid) to authenticated;
grant execute on function public.cmd_decompte_valider_chef(uuid, text, timestamptz, jsonb, numeric, bigint, bigint) to authenticated;
grant execute on function public.cmd_decompte_valider_bureau(uuid, numeric, bigint, bigint, text) to authenticated;
grant execute on function public.cmd_decompte_communique(uuid) to authenticated;
grant execute on function public.cmd_decompte_rouvrir(uuid) to authenticated;
