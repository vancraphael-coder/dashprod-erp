-- =============================================================================
-- 0057_retention_rgpd.sql
--
-- ⚠️  À APPLIQUER — colle ce fichier ENTIER dans l'éditeur SQL Supabase,
--     lignes « -- » comprises, puis range-le dans supabase/migrations/.
--
-- =============================================================================
-- RÉTENTION RGPD — purge des données opérationnelles, conservation du fiscal.
--
-- Obligation : limitation de conservation (RGPD art. 5.1.e). L'inventaire du
-- mobilier d'un particulier et les adresses de son déménagement n'ont plus de
-- finalité une fois le dossier clos. On les purge ; on garde la facture le
-- délai légal (7 ans en Belgique).
--
-- PRINCIPES DE SÉCURITÉ de cette purge — une suppression de données est
-- dangereuse, donc :
--   - elle est CONSERVATRICE : ne touche que des dossiers ARCHIVÉS depuis plus
--     que la fenêtre de rétention ; jamais un dossier actif ;
--   - elle ne touche JAMAIS les factures ni l'identité de facturation ;
--   - elle est JOURNALISÉE : chaque purge laisse une trace dans evenements
--     (la preuve de notre conformité) ;
--   - elle est DRY-RUN par défaut : on voit ce qui serait purgé avant de le
--     faire ;
--   - elle est IDEMPOTENTE : rejouée, elle ne re-purge pas ce qui l'est déjà.
-- =============================================================================

-- Fenêtre de rétention opérationnelle, réglable par organisation (défaut 12 mois).
alter table public.organisations
  add column if not exists retention_operationnelle_mois integer not null default 12;

comment on column public.organisations.retention_operationnelle_mois is
  'Mois de conservation des données opérationnelles (inventaire, adresses) '
  'après archivage d''un dossier. La facture, elle, suit le délai fiscal (7 ans).';

-- Marqueur : le dossier a-t-il déjà été purgé ? Évite de retraiter et donne une
-- trace lisible.
alter table public.affaires
  add column if not exists purge_operationnelle_le timestamptz;

comment on column public.affaires.purge_operationnelle_le is
  'Horodatage de la purge RGPD des données opérationnelles de ce dossier. '
  'La facture liée reste conservée pour le délai légal.';

-- ── Purge opérationnelle ───────────────────────────────────────────────────
-- p_dry_run = true (défaut) : ne supprime rien, renvoie ce qui serait purgé.
-- p_dry_run = false          : purge réellement, dans une transaction.
create or replace function public.cmd_purger_donnees_expirees(p_dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_org uuid := jwt_org();
  v_mois integer;
  v_seuil timestamptz;
  v_cible uuid[];
  v_n integer;
begin
  -- Seuls les administrateurs de l'organisation lancent une purge.
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Droits insuffisants pour la purge RGPD' using errcode = '42501';
  end if;

  select coalesce(retention_operationnelle_mois, 12) into v_mois
    from organisations where id = v_org;
  v_seuil := now() - make_interval(months => v_mois);

  -- Cibles : dossiers de MON organisation, archivés avant le seuil, pas encore
  -- purgés, et qui portent encore des données opérationnelles.
  select array_agg(af.id) into v_cible
    from affaires af
   where af.org_id = v_org
     and af.archive_le is not null
     and af.archive_le < v_seuil
     and af.purge_operationnelle_le is null
     and (af.releve is not null
          or exists (select 1 from affaire_adresses ad where ad.affaire_id = af.id));

  v_n := coalesce(array_length(v_cible, 1), 0);

  if p_dry_run or v_n = 0 then
    return jsonb_build_object(
      'dry_run', p_dry_run,
      'fenetre_mois', v_mois,
      'seuil', v_seuil,
      'dossiers_concernes', v_n,
      'message', case when v_n = 0 then 'Rien à purger.'
                      else format('%s dossier(s) seraient purgés.', v_n) end);
  end if;

  -- Purge réelle. L'inventaire et les adresses de chantier disparaissent ;
  -- la facture n'est pas touchée (elle n'est pas dans ce périmètre).
  update affaires
     set releve = null,
         purge_operationnelle_le = now()
   where id = any(v_cible);

  delete from affaire_adresses where affaire_id = any(v_cible);

  -- Trace de conformité : on journalise l'acte, sans re-consigner les données
  -- supprimées (ce serait les conserver par une autre porte).
  perform emettre_evenement(v_org, 'RGPD.PurgeOperationnelle', 'organisation',
    v_org, (select id from utilisateurs where auth_id = auth.uid() limit 1),
    jsonb_build_object('dossiers', v_n, 'fenetre_mois', v_mois));

  return jsonb_build_object(
    'dry_run', false,
    'fenetre_mois', v_mois,
    'dossiers_purges', v_n,
    'message', format('%s dossier(s) purgés. Factures conservées.', v_n));
end $$;

revoke all on function public.cmd_purger_donnees_expirees(boolean) from public, anon;
grant execute on function public.cmd_purger_donnees_expirees(boolean) to authenticated;

-- ── Tableau de bord : ce qui est purgeable, sans rien supprimer ─────────────
create or replace function public.cmd_apercu_retention()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid := jwt_org(); v_mois integer; v_seuil timestamptz;
begin
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  select coalesce(retention_operationnelle_mois, 12) into v_mois
    from organisations where id = v_org;
  v_seuil := now() - make_interval(months => v_mois);

  return jsonb_build_object(
    'fenetre_mois', v_mois,
    'dossiers_archives', (select count(*) from affaires
       where org_id = v_org and archive_le is not null),
    'purgeables_maintenant', (select count(*) from affaires af
       where af.org_id = v_org and af.archive_le is not null
         and af.archive_le < v_seuil and af.purge_operationnelle_le is null
         and (af.releve is not null or exists (
           select 1 from affaire_adresses ad where ad.affaire_id = af.id))),
    'deja_purges', (select count(*) from affaires
       where org_id = v_org and purge_operationnelle_le is not null));
end $$;

revoke all on function public.cmd_apercu_retention() from public, anon;
grant execute on function public.cmd_apercu_retention() to authenticated;

-- NOTE — automatisation. Cette purge peut être planifiée avec pg_cron (extension
-- disponible sur Supabase). Exemple, purge réelle le 1er de chaque mois à 3 h :
--   select cron.schedule('purge-rgpd', '0 3 1 * *', $$
--     -- à exécuter par organisation ; ici illustratif, à adapter au contexte
--     select cmd_purger_donnees_expirees(false);
--   $$);
-- Tant qu'aucun planning n'est posé, la purge se déclenche depuis l'écran
-- Paramètres → Confidentialité. Le dry-run permet de vérifier avant.

-- Vérification :
--   select cmd_apercu_retention();
--   select cmd_purger_donnees_expirees(true);   -- dry-run, ne supprime rien
