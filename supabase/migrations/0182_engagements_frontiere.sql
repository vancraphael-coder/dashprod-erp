-- 0182 — L'engagement : le seul objet qui traverse la cloison.
--
-- LE PROBLÈME. Un donneur d'ordre (Pro) propose une date à un indépendant.
-- Ce sont DEUX organisations, et tout le RLS de Dashprod est construit pour
-- qu'aucune ne lise l'autre. Il faut donc un objet qui traverse — et un seul,
-- parce que chaque traversée est un trou potentiel.
--
-- LES QUATRE RÈGLES DE CONCEPTION, et le raisonnement derrière chacune.
--
-- 1. L'OBJET N'APPARTIENT À PERSONNE. Pas de colonne `org_id`, mais
--    `org_donneur` et `org_prestataire`. Une seule politique de lecture :
--    `jwt_org() in (org_donneur, org_prestataire)`. Un tiers ne voit rien,
--    pas même l'existence de la ligne.
--
--    Corollaire important : le trigger générique `exiger_meme_org()` NE DOIT
--    PAS être posé ici. Il impose que toute clé étrangère désigne une ligne de
--    la même organisation — c'est exactement ce que cette table doit pouvoir
--    enfreindre. Si quelqu'un l'ajoute « par cohérence », la fonctionnalité
--    meurt. C'est écrit ici pour que ce ne soit pas découvert par accident.
--
-- 2. AUCUNE CLÉ ÉTRANGÈRE VERS LES DONNÉES PRIVÉES. L'engagement ne porte ni
--    `affaire_id`, ni `client_id`, ni `facture_id`. Le rattachement au dossier
--    du donneur et à la facture du prestataire vit dans
--    `engagement_rattachements`, cloisonnée normalement par `org_id`. Chacun
--    voit SON rattachement, jamais celui de l'autre.
--
--    C'est ce qui rend l'objet réellement pur : le lire ne révèle rien
--    au-delà de ce qui a été négocié, et le supprimer ne casse rien chez
--    l'autre.
--
-- 3. L'ADRESSE N'EXISTE PAS AVANT L'ACCEPTATION. Pas masquée — ABSENTE. Une
--    contrainte l'interdit physiquement tant que l'état n'est pas accepté. Le
--    donneur prépare l'adresse dans SON rattachement privé, et la commande
--    d'acceptation la recopie dans l'engagement au moment où l'accord existe.
--
--    Masquer une colonne par une politique aurait laissé la donnée en base,
--    donc exposée au premier `security definer` mal gardé. Ici il n'y a rien à
--    exposer : avant l'accord, la ligne ne contient que ville et code postal.
--
-- 4. AUCUNE ÉCRITURE DIRECTE. La table n'a QU'UNE politique de lecture. Aucune
--    politique d'insertion, de modification ou de suppression : le RLS les
--    refuse donc toutes. Tout passe par des commandes nommées, qui inscrivent
--    chacune un événement dans une chaîne d'empreintes. Les deux parties
--    lisent le même objet et ne peuvent le faire évoluer que par des gestes
--    prévus.
--
-- ANTI-SABOTAGE INTERNE. Même dispositif que le registre probant des messages
-- de dossier : chaîne d'empreintes (`rang`, `empreinte`, `empreinte_prec`),
-- table d'événements append-only, termes figés dès l'acceptation. Un salarié
-- mal intentionné, d'un côté comme de l'autre, ne peut ni réécrire une date,
-- ni changer un prix convenu, ni effacer un refus. Il peut créer un nouvel
-- événement — qui portera son nom et son horodatage.
--
-- CE QUE L'ÉDITEUR DE LA PLATEFORME NE PEUT PAS FAIRE. `est_editeur()`
-- n'apparaît nulle part dans les politiques de cette table. L'exploitant de
-- Dashprod n'a pas à lire les conditions commerciales que ses clients se
-- consentent entre eux. C'est un choix, et il est aussi un argument de vente.

-- =============================================================================
-- 1. L'engagement
-- =============================================================================

create table if not exists public.engagements (
  id                 uuid        not null default gen_random_uuid() primary key,
  org_donneur        uuid        not null references public.organisations(id),
  org_prestataire    uuid        not null references public.organisations(id),
  cree_le            timestamptz not null default now(),
  cree_par           uuid        references public.utilisateurs(id),

  -- Ce qui est négocié, et rien d'autre.
  date_prestation    date        not null,
  heure_debut        time,
  duree_prevue_min   integer,
  nature             text        not null,
  ville              text        not null,
  code_postal        text        not null,

  -- Le prix est une COPIE du tarif publié au moment de la proposition.
  -- `tarif_publie_id` sert à expliquer d'où vient le montant, pas à le
  -- recalculer : le prestataire peut retirer son tarif demain sans que
  -- l'accord change.
  tarif_publie_id    uuid        references public.tarifs_publies(id),
  unite              text        not null,
  prix_htva_centimes integer     not null,

  etat               text        not null default 'proposee',
  repondu_le         timestamptz,
  repondu_par        uuid        references public.utilisateurs(id),
  motif_refus        text,

  -- Libérées à l'acceptation seulement. Voir règle 3.
  adresse_complete   text,
  contact_sur_place  text,

  constraint engagements_deux_parties check (org_donneur <> org_prestataire),
  constraint engagements_etat_connu check (etat in
    ('proposee', 'acceptee', 'refusee', 'annulee', 'realisee', 'facturee')),
  constraint engagements_prix_positif check (prix_htva_centimes > 0),
  -- L'adresse ne peut PAS exister avant l'accord. Contrainte, pas convention.
  constraint engagements_adresse_apres_accord check (
    (adresse_complete is null and contact_sur_place is null)
    or etat in ('acceptee', 'realisee', 'facturee')),
  constraint engagements_refus_motive check (
    etat <> 'refusee' or motif_refus is not null)
);

create index if not exists idx_engagements_prestataire
  on public.engagements (org_prestataire, etat, date_prestation);
create index if not exists idx_engagements_donneur
  on public.engagements (org_donneur, etat, date_prestation);

alter table public.engagements enable row level security;

-- UNE SEULE politique, en lecture. Aucune écriture directe : voir règle 4.
drop policy if exists engagements_deux_parties_lecture on public.engagements;
create policy engagements_deux_parties_lecture on public.engagements for select
  using (jwt_org() in (org_donneur, org_prestataire));

-- Les termes sont figés dès l'acceptation. Ce qui reste modifiable ensuite :
-- l'état, la libération d'adresse, l'horodatage de réponse.
create or replace function public.engagement_termes_figes()
returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' then
    raise exception 'Un engagement ne se supprime pas : il s''annule'
      using errcode = '42501';
  end if;
  if old.etat = 'proposee' then
    return new;                       -- tant que rien n'est convenu
  end if;
  if new.date_prestation <> old.date_prestation
     or new.prix_htva_centimes <> old.prix_htva_centimes
     or new.unite <> old.unite
     or new.nature <> old.nature
     or new.org_donneur <> old.org_donneur
     or new.org_prestataire <> old.org_prestataire then
    raise exception
      'Les termes d''un engagement accepté sont figés : annulez et reproposez'
      using errcode = '42501';
  end if;
  return new;
end $function$;

drop trigger if exists trg_engagement_termes_figes on public.engagements;
create trigger trg_engagement_termes_figes
  before update or delete on public.engagements
  for each row execute function public.engagement_termes_figes();

-- =============================================================================
-- 2. Le rattachement privé — ce qui NE traverse pas
-- =============================================================================

create table if not exists public.engagement_rattachements (
  id             uuid not null default gen_random_uuid() primary key,
  -- Le propriétaire du lien. Chaque partie a le sien, invisible de l'autre.
  org_id         uuid not null default jwt_org() references public.organisations(id),
  engagement_id  uuid not null references public.engagements(id) on delete cascade,
  affaire_id     uuid references public.affaires(id),
  mission_id     uuid references public.missions(id),
  facture_id     uuid references public.factures(id),
  -- L'adresse préparée par le donneur AVANT l'accord. Elle ne franchit la
  -- cloison qu'à l'acceptation, recopiée par la commande.
  adresse_reservee  text,
  contact_reserve   text,
  note           text,
  cree_le        timestamptz not null default now(),
  constraint engagement_rattachement_unique unique (org_id, engagement_id)
);

alter table public.engagement_rattachements enable row level security;

drop policy if exists engagement_rattachements_tenant on public.engagement_rattachements;
create policy engagement_rattachements_tenant on public.engagement_rattachements
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());

-- Ici le cloisonnement classique s'applique pleinement : les clés étrangères
-- doivent désigner des lignes de MA société.
drop trigger if exists trg_engagement_rattachement_cloison on public.engagement_rattachements;
create trigger trg_engagement_rattachement_cloison
  before insert or update on public.engagement_rattachements
  for each row execute function public.exiger_meme_org(
    'affaire_id', 'affaires', 'mission_id', 'missions', 'facture_id', 'factures');

-- =============================================================================
-- 3. La chaîne probante
-- =============================================================================

create table if not exists public.engagement_evenements (
  id             uuid        not null default gen_random_uuid() primary key,
  engagement_id  uuid        not null references public.engagements(id) on delete cascade,
  rang           bigint      not null,
  type           text        not null,
  par_org        uuid        not null references public.organisations(id),
  par_utilisateur uuid       references public.utilisateurs(id),
  au             timestamptz not null default now(),
  charge         jsonb       not null default '{}'::jsonb,
  empreinte      text        not null,
  empreinte_prec text,
  constraint engagement_evenements_rang unique (engagement_id, rang),
  constraint engagement_evenements_type check (type in
    ('proposee', 'acceptee', 'refusee', 'annulee', 'adresse_liberee',
     'realisee', 'facturee'))
);

create index if not exists idx_engagement_evenements
  on public.engagement_evenements (engagement_id, rang);

alter table public.engagement_evenements enable row level security;

-- Visible des deux parties, par l'engagement parent. Une sous-requête plutôt
-- qu'une colonne dupliquée : deux sources pour la même vérité divergeraient.
drop policy if exists engagement_evenements_lecture on public.engagement_evenements;
create policy engagement_evenements_lecture on public.engagement_evenements
  for select using (exists (
    select 1 from engagements e
     where e.id = engagement_evenements.engagement_id
       and jwt_org() in (e.org_donneur, e.org_prestataire)));

create or replace function public.engagement_evenement_append_only()
returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' then
    raise exception 'Un événement d''engagement ne se supprime pas (registre probant)'
      using errcode = '42501';
  end if;
  raise exception 'Un événement d''engagement est immuable (registre probant)'
    using errcode = '42501';
end $function$;

drop trigger if exists trg_engagement_evenement_append_only on public.engagement_evenements;
create trigger trg_engagement_evenement_append_only
  before update or delete on public.engagement_evenements
  for each row execute function public.engagement_evenement_append_only();

/**
 * Inscrit un événement et referme la chaîne.
 *
 * L'empreinte couvre le rang, le type, l'auteur, l'horodatage, la charge ET
 * l'empreinte précédente. Réécrire un maillon casse tous les suivants :
 * l'altération devient détectable sans qu'il faille conserver une copie
 * ailleurs. Même mécanique que `messages_dossier`, volontairement — un second
 * mécanisme pour le même besoin finirait par divercer du premier.
 */
create or replace function public.engagement_inscrire(
  p_engagement uuid, p_type text, p_par_org uuid, p_charge jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_rang bigint; v_prec text; v_acteur uuid; v_au timestamptz := now();
  v_empreinte text; v_id uuid;
begin
  select coalesce(max(rang), 0) + 1 into v_rang
    from engagement_evenements where engagement_id = p_engagement;
  select empreinte into v_prec
    from engagement_evenements
   where engagement_id = p_engagement and rang = v_rang - 1;

  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = p_par_org;

  v_empreinte := encode(digest(
    coalesce(v_prec, '') || '|' || p_engagement::text || '|' || v_rang::text
    || '|' || p_type || '|' || p_par_org::text || '|' || v_au::text
    || '|' || coalesce(p_charge::text, '{}'), 'sha256'), 'hex');

  insert into engagement_evenements (
    engagement_id, rang, type, par_org, par_utilisateur, au, charge,
    empreinte, empreinte_prec)
  values (p_engagement, v_rang, p_type, p_par_org, v_acteur, v_au, p_charge,
          v_empreinte, v_prec)
  returning id into v_id;
  return v_id;
end $function$;

revoke execute on function public.engagement_inscrire(uuid, text, uuid, jsonb)
  from public, anon, authenticated;

/** Vérifie la chaîne d'un engagement. Rend le rang du premier maillon rompu. */
create or replace function public.cmd_verifier_chaine_engagement(p_engagement uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare r record; v_prec text := null; v_attendue text;
begin
  if not exists (select 1 from engagements e where e.id = p_engagement
                  and jwt_org() in (e.org_donneur, e.org_prestataire)) then
    raise exception 'Engagement introuvable' using errcode = '42501';
  end if;
  for r in select * from engagement_evenements
            where engagement_id = p_engagement order by rang loop
    v_attendue := encode(digest(
      coalesce(v_prec, '') || '|' || r.engagement_id::text || '|' || r.rang::text
      || '|' || r.type || '|' || r.par_org::text || '|' || r.au::text
      || '|' || coalesce(r.charge::text, '{}'), 'sha256'), 'hex');
    if r.empreinte <> v_attendue or coalesce(r.empreinte_prec,'') <> coalesce(v_prec,'') then
      return jsonb_build_object('ok', false, 'rang_rompu', r.rang);
    end if;
    v_prec := r.empreinte;
  end loop;
  return jsonb_build_object('ok', true, 'maillons', coalesce(
    (select count(*) from engagement_evenements where engagement_id = p_engagement), 0));
end $function$;

revoke execute on function public.cmd_verifier_chaine_engagement(uuid) from public, anon;
grant execute on function public.cmd_verifier_chaine_engagement(uuid)
  to authenticated, service_role;
