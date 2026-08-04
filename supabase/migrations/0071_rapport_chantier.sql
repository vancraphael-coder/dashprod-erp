-- =============================================================================
-- 0071_rapport_chantier.sql   ✅ appliquée le 2026-07-29 — LOT 8, EX-10
--
-- LA BOUCLE D'ÉCART : ce que le terrain constate remonte au bureau.
--
--   PLANIFIÉ → EXÉCUTÉ → RÉALITÉ OBSERVÉE → ÉCART → VALIDATION → AJUSTEMENT
--   (bureau)   (terrain)     (terrain)      (terrain)  (bureau)    (bureau)
--
-- Aujourd'hui, le piano dont personne n'avait parlé se règle par un coup de
-- téléphone, et se perd. Puis on facture le forfait prévu, ou on discute.
--
-- Le principe qui structure tout (verrou n° 11 du PRODUCT_TRUTH) : le Terrain
-- crée des CONSTATS opérationnels, jamais des objets commerciaux. Il déclare
-- « piano non prévu, 45 min de plus » ; il ne crée pas de ligne de facture.
-- C'est le Bureau qui décide si l'écart devient un supplément, un geste
-- commercial, ou rien.
--
-- Conséquence en base : un constat porte `minutes` et `volume_m3` — des
-- ESTIMATIONS — et AUCUN montant. Le prix se calcule au bureau, avec le
-- barème. Une colonne de montant ici serait une invitation à court-circuiter
-- le barème depuis un téléphone.
-- =============================================================================

create table if not exists public.rapports_chantier (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations(id),
  mission_id  uuid not null references public.missions(id) on delete cascade,
  affaire_id  uuid references public.affaires(id),
  deroule     text,
  redige_par  uuid references public.utilisateurs(id),
  redige_le   timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (mission_id)
);

comment on table public.rapports_chantier is
  'Ce que le chef d''équipe remonte du chantier. Un rapport par mission.';

create table if not exists public.constats_chantier (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations(id),
  rapport_id  uuid not null references public.rapports_chantier(id) on delete cascade,
  nature      text not null,
  description text not null,
  minutes     integer not null default 0,
  volume_m3   numeric(8,2) not null default 0,
  etat        text not null default 'declare',
  declare_par uuid references public.utilisateurs(id),
  declare_le  timestamptz not null default now(),
  tranche_par uuid references public.utilisateurs(id),
  tranche_le  timestamptz,
  motif       text,
  updated_at  timestamptz not null default now(),
  constraint constat_nature_valide check (nature in (
    'objet_non_prevu','acces_difficile','temps_supplementaire',
    'dommage','reserve','incident')),
  constraint constat_etat_valide check (etat in (
    'declare','valide','refuse','ajuste'))
);

comment on column public.constats_chantier.minutes is
  'Estimation du temps supplémentaire, par le terrain. JAMAIS un montant : '
  'le prix se calcule au bureau avec le barème.';

create index if not exists idx_constats_rapport
  on public.constats_chantier (rapport_id);
create index if not exists idx_constats_a_traiter
  on public.constats_chantier (org_id, etat) where etat = 'declare';

alter table public.rapports_chantier enable row level security;
alter table public.constats_chantier enable row level security;

-- Lecture : tout membre de l'organisation. Un rapport de chantier n'est pas
-- une donnée sensible — c'est justement fait pour circuler.
drop policy if exists rapports_lecture on public.rapports_chantier;
create policy rapports_lecture on public.rapports_chantier
  for select to authenticated using (org_id = jwt_org());

drop policy if exists constats_lecture on public.constats_chantier;
create policy constats_lecture on public.constats_chantier
  for select to authenticated using (org_id = jwt_org());

-- Écriture : uniquement par les commandes ci-dessous, qui contrôlent qui fait
-- quoi. Aucune policy d'écriture directe.

drop trigger if exists trg_touch_rapports on public.rapports_chantier;
create trigger trg_touch_rapports before update on public.rapports_chantier
  for each row execute function touch_updated_at();
drop trigger if exists trg_touch_constats on public.constats_chantier;
create trigger trg_touch_constats before update on public.constats_chantier
  for each row execute function touch_updated_at();

-- ── TERRAIN : rédiger le déroulé ───────────────────────────────────────────
create or replace function public.cmd_rapport_deroule(
  p_mission uuid, p_deroule text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_moi uuid; v_aff uuid; v_id uuid;
begin
  select affaire_id into v_aff from missions
   where id = p_mission and org_id = v_org;
  if v_aff is null and not exists (
      select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;

  -- Le rapport est le geste du chef d'équipe — comme la clôture, il engage
  -- l'équipe entière. Le bureau garde la main.
  if not acteur_a_capacite('gerer_planning')
     and not acteur_a_capacite('cloturer_chantier') then
    raise exception 'Seul le chef d''équipe rédige le rapport de chantier'
      using errcode = '42501';
  end if;

  select id into v_moi from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  insert into rapports_chantier (org_id, mission_id, affaire_id, deroule, redige_par)
  values (v_org, p_mission, v_aff, nullif(btrim(p_deroule), ''), v_moi)
  on conflict (mission_id) do update
    set deroule = nullif(btrim(p_deroule), ''), redige_par = v_moi
  returning id into v_id;

  return jsonb_build_object('ok', true, 'rapport_id', v_id);
end $$;

revoke all on function public.cmd_rapport_deroule(uuid, text) from public, anon;
grant execute on function public.cmd_rapport_deroule(uuid, text) to authenticated;

-- ── TERRAIN : déclarer un écart ────────────────────────────────────────────
create or replace function public.cmd_constat_declarer(
  p_mission uuid, p_nature text, p_description text,
  p_minutes integer default 0, p_volume numeric default 0)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_moi uuid; v_aff uuid; v_rapport uuid; v_id uuid;
begin
  select affaire_id into v_aff from missions where id = p_mission and org_id = v_org;
  if not exists (select 1 from missions where id = p_mission and org_id = v_org) then
    raise exception 'Mission introuvable' using errcode = '42501';
  end if;

  -- Constater est un acte de terrain : il suffit d'être affecté au chantier.
  -- Un déménageur qui voit un dommage doit pouvoir le signaler tout de suite,
  -- sans attendre son chef.
  if not acteur_a_capacite('gerer_planning')
     and not (acteur_a_capacite('pointer_chantier') and est_affecte_mission(p_mission)) then
    raise exception 'Vous n''êtes pas sur ce chantier' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_description, ''))) < 5 then
    return jsonb_build_object('ok', false,
      'message', 'Décrivez ce que vous avez constaté.');
  end if;

  select id into v_moi from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  -- Le rapport naît au premier constat s'il n'existe pas encore.
  insert into rapports_chantier (org_id, mission_id, affaire_id, redige_par)
  values (v_org, p_mission, v_aff, v_moi)
  on conflict (mission_id) do update set mission_id = excluded.mission_id
  returning id into v_rapport;

  insert into constats_chantier (org_id, rapport_id, nature, description,
                                 minutes, volume_m3, declare_par)
  values (v_org, v_rapport, p_nature, btrim(p_description),
          greatest(0, coalesce(p_minutes, 0)),
          greatest(0, coalesce(p_volume, 0)), v_moi)
  returning id into v_id;

  perform emettre_evenement(v_org, 'Constat.Declare', 'mission', p_mission, v_moi,
    jsonb_build_object('nature', p_nature, 'minutes', p_minutes));

  return jsonb_build_object('ok', true, 'constat_id', v_id);
end $$;

revoke all on function public.cmd_constat_declarer(uuid, text, text, integer, numeric)
  from public, anon;
grant execute on function public.cmd_constat_declarer(uuid, text, text, integer, numeric)
  to authenticated;

-- ── BUREAU : trancher un écart ─────────────────────────────────────────────
create or replace function public.cmd_constat_trancher(
  p_constat uuid, p_decision text, p_motif text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_moi uuid; v_mission uuid;
begin
  if p_decision not in ('valide', 'refuse', 'ajuste') then
    raise exception 'Décision inconnue : %', p_decision using errcode = '22023';
  end if;
  -- Trancher un écart, c'est décider si le client paiera plus : geste de
  -- bureau, jamais de terrain.
  if not acteur_a_capacite('creer_affaire') then
    raise exception 'Seul le bureau tranche un écart' using errcode = '42501';
  end if;

  select r.mission_id into v_mission
    from constats_chantier c join rapports_chantier r on r.id = c.rapport_id
   where c.id = p_constat and c.org_id = v_org;
  if v_mission is null then
    raise exception 'Constat introuvable' using errcode = '42501';
  end if;

  select id into v_moi from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  update constats_chantier
     set etat = p_decision, tranche_par = v_moi, tranche_le = now(),
         motif = nullif(btrim(p_motif), '')
   where id = p_constat and org_id = v_org;

  perform emettre_evenement(v_org, 'Constat.Tranche', 'mission', v_mission, v_moi,
    jsonb_build_object('constat', p_constat, 'decision', p_decision));

  return jsonb_build_object('ok', true, 'etat', p_decision);
end $$;

revoke all on function public.cmd_constat_trancher(uuid, text, text) from public, anon;
grant execute on function public.cmd_constat_trancher(uuid, text, text) to authenticated;

-- ── Lire le rapport d'une mission ou d'un dossier ──────────────────────────
create or replace function public.cmd_rapport(
  p_mission uuid default null, p_affaire uuid default null)
returns jsonb language plpgsql stable security definer
set search_path to 'public' as $$
declare v_org uuid := jwt_org();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'rapport_id', r.id,
      'mission_id', r.mission_id,
      'affaire_id', r.affaire_id,
      'date', m.date,
      'deroule', r.deroule,
      'redige_par', coalesce(u.nom, u.email),
      'redige_le', r.redige_le,
      'constats', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', c.id, 'nature', c.nature, 'description', c.description,
          'minutes', c.minutes, 'volume_m3', c.volume_m3, 'etat', c.etat,
          'motif', c.motif,
          'declare_par', (select nom from utilisateurs where id = c.declare_par),
          'declare_le', c.declare_le) order by c.declare_le)
          from constats_chantier c where c.rapport_id = r.id), '[]'::jsonb))
      order by m.date desc)
    from rapports_chantier r
    join missions m on m.id = r.mission_id
    left join utilisateurs u on u.id = r.redige_par
   where r.org_id = v_org
     and (p_mission is null or r.mission_id = p_mission)
     and (p_affaire is null or r.affaire_id = p_affaire)), '[]'::jsonb);
end $$;

revoke all on function public.cmd_rapport(uuid, uuid) from public, anon;
grant execute on function public.cmd_rapport(uuid, uuid) to authenticated;
