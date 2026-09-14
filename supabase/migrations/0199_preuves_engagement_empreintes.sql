-- 0199 — La preuve traverse la cloison sous forme d'EMPREINTE, pas de fichier.
--
-- LE PROBLÈME. La preuve d'une mission — signature du client, photos de l'état
-- des biens, réserves — est produite par le PRESTATAIRE, dans son
-- organisation, derrière la cloison. Le donneur d'ordre en a besoin : c'est
-- avec ça qu'il règle un litige avec son propre client.
--
-- LA SOLUTION RETENUE : les EMPREINTES traversent, les FICHIERS restent.
--
-- Chaque pièce est enregistrée ici avec son empreinte SHA-256, son horodatage
-- et son auteur. Le fichier reste dans le stockage de son producteur. Le
-- donneur d'ordre peut donc VÉRIFIER qu'une photo qu'on lui montre est bien
-- celle enregistrée sur place ce jour-là — sans que Dashprod ait jamais à
-- faire traverser un fichier d'une organisation à une autre.
--
-- POURQUOI C'EST MIEUX QU'UN PARTAGE DE FICHIERS. Une photo de l'intérieur
-- d'un logement est une donnée personnelle du client FINAL, qui n'est le
-- client d'aucune des deux organisations en même temps. La faire traverser
-- créerait un transfert entre responsables de traitement, avec tout ce que ça
-- suppose. Une empreinte de 64 caractères hexadécimaux ne dit rien du contenu
-- et ne transfère aucune donnée personnelle.
--
-- TROIS SORTIES, ET C'EST LE CŒUR DU DISPOSITIF.
--
-- Une même série d'événements produit trois documents :
--
--   1. la vue du PRESTATAIRE — ce qu'il a produit, sa preuve d'avoir exécuté,
--      avec ses fichiers ;
--   2. la vue du DONNEUR D'ORDRE — ce qu'il a reçu, sa preuve envers son
--      PROPRE client, qui n'a jamais entendu parler du sous-traitant ;
--   3. l'ATTESTATION COMMUNE — ce que Dashprod constate, et seulement ça :
--      que telle donnée a été enregistrée à tel instant par tel acteur, et
--      qu'elle n'a pas bougé depuis. Elle ne dit PAS que le travail a été bien
--      fait, ni que les photos représentent ce qu'on prétend, ni qui a raison.
--
-- La troisième limite la responsabilité de l'exploitant : Dashprod est un
-- TIERS TECHNIQUE, pas un témoin. Il atteste d'un enregistrement, pas d'un
-- fait. Et cette limite doit figurer SUR le document — un document qui ne dit
-- pas ce qu'il ne certifie pas sera lu comme certifiant tout. Le texte vit
-- dans packages/domaine/src/conformite/attestation-tripartite.js, et un test
-- vérifie qu'il y figure toujours.
--
-- La base NE distingue PAS les trois vues : elle sert une seule série de
-- faits, le domaine les compose. Trois découpages du même fait finiraient par
-- se contredire, et une contradiction entre nos propres documents est
-- indéfendable.
--
-- (Ce cadrage réduit l'exposition évidente. Ce n'est pas un avis juridique et
-- il ne remplace pas un conseil qualifié en droit belge — voir P6/P7.)

create table if not exists public.engagement_preuves (
  id             uuid        not null default gen_random_uuid() primary key,
  engagement_id  uuid        not null references public.engagements(id) on delete cascade,
  rang           bigint      not null,
  type           text        not null,
  libelle        text,
  -- SHA-256 du fichier, calculée chez le producteur AVANT tout envoi. Le
  -- fichier ne traverse pas ; seule cette empreinte le fait.
  empreinte      text        not null,
  octets         integer,
  par_org        uuid        not null references public.organisations(id),
  par_utilisateur uuid       references public.utilisateurs(id),
  au             timestamptz not null default now(),
  constraint engagement_preuves_rang unique (engagement_id, rang),
  constraint engagement_preuves_type check (type in
    ('signature', 'photo_avant', 'photo_apres', 'reserve', 'document')),
  -- 64 caractères hexadécimaux, ni plus ni moins. Une empreinte tronquée ne
  -- vérifie rien et donnerait une fausse assurance.
  constraint engagement_preuves_empreinte check (empreinte ~ '^[0-9a-f]{64}$')
);

create index if not exists idx_engagement_preuves
  on public.engagement_preuves (engagement_id, rang);

alter table public.engagement_preuves enable row level security;

drop policy if exists engagement_preuves_lecture on public.engagement_preuves;
create policy engagement_preuves_lecture on public.engagement_preuves
  for select using (exists (
    select 1 from engagements e
     where e.id = engagement_preuves.engagement_id
       and jwt_org() in (e.org_donneur, e.org_prestataire)));

-- Append-only. Une preuve qui se modifie n'est pas une preuve.
create or replace function public.engagement_preuve_append_only()
returns trigger language plpgsql set search_path to 'public'
as $function$
begin
  raise exception 'Une preuve est immuable (registre probant)'
    using errcode = '42501';
end $function$;

drop trigger if exists trg_engagement_preuve_append_only on public.engagement_preuves;
create trigger trg_engagement_preuve_append_only
  before update or delete on public.engagement_preuves
  for each row execute function public.engagement_preuve_append_only();

-- Déposer une preuve. Les DEUX parties peuvent : le prestataire dépose ce
-- qu'il a constaté sur place, le donneur d'ordre peut déposer une réserve
-- après coup. Chaque dépôt porte son auteur — c'est ce qui permet aux trois
-- vues de se construire depuis une seule série d'événements.
create or replace function public.cmd_deposer_preuve(
  p_engagement uuid, p_type text, p_empreinte text,
  p_libelle text default null, p_octets integer default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_org uuid := jwt_org(); v_e engagements%rowtype;
  v_rang bigint; v_acteur uuid; v_id uuid;
begin
  if v_org is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  select * into v_e from engagements where id = p_engagement;
  if not found then
    raise exception 'Engagement introuvable' using errcode = '42501';
  end if;
  if v_org is distinct from v_e.org_donneur
     and v_org is distinct from v_e.org_prestataire then
    raise exception 'Engagement introuvable' using errcode = '42501';
  end if;
  if v_e.etat not in ('acceptee', 'realisee', 'facturee') then
    return jsonb_build_object('ok', false,
      'motif', format('etat %s : rien a prouver', v_e.etat));
  end if;
  if p_empreinte is null or p_empreinte !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false,
      'motif', 'empreinte SHA-256 requise (64 caracteres hexadecimaux)');
  end if;

  select coalesce(max(rang), 0) + 1 into v_rang
    from engagement_preuves where engagement_id = p_engagement;
  select id into v_acteur from utilisateurs
   where auth_id = auth.uid() and org_id = v_org;

  insert into engagement_preuves (engagement_id, rang, type, libelle,
                                  empreinte, octets, par_org, par_utilisateur)
  values (p_engagement, v_rang, p_type, nullif(btrim(coalesce(p_libelle,'')),''),
          p_empreinte, p_octets, v_org, v_acteur)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'preuve_id', v_id, 'rang', v_rang);
end $function$;

revoke execute on function public.cmd_deposer_preuve(uuid, text, text, text, integer)
  from public, anon;
grant execute on function public.cmd_deposer_preuve(uuid, text, text, text, integer)
  to authenticated, service_role;

create or replace function public.cmd_preuves_engagement(p_engagement uuid)
returns table (rang bigint, type text, libelle text, empreinte text,
               octets integer, par_org uuid, est_moi boolean, au timestamptz)
language sql stable security definer set search_path to 'public'
as $function$
  select p.rang, p.type, p.libelle, p.empreinte, p.octets, p.par_org,
         p.par_org = jwt_org(), p.au
    from engagement_preuves p
    join engagements e on e.id = p.engagement_id
   where p.engagement_id = p_engagement
     and jwt_org() in (e.org_donneur, e.org_prestataire)
   order by p.rang;
$function$;

revoke execute on function public.cmd_preuves_engagement(uuid) from public, anon;
grant execute on function public.cmd_preuves_engagement(uuid)
  to authenticated, service_role;
