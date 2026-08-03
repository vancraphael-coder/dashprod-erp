-- =============================================================================
-- 0065_reprise_annulation_reelle.sql   ✅ appliquée le 2026-07-29 — LOT 1, INC-18
--
-- « Annuler une annulation » ne faisait RIEN : cmd_reprendre_affaire visait
-- l'état `confirme` depuis `annule`, or aucune transition ne partait de
-- `annule`. transition_interne renvoyait false, personne ne lisait, et la
-- fonction annonçait un succès. 0064 a rouvert les sorties d'`annule` ; il
-- reste à savoir VERS QUOI revenir.
--
-- On ne devine pas : on mémorise. À l'annulation, l'état courant est conservé
-- dans `etat_avant_annulation` ; à la reprise, on y retourne. Un dossier
-- planifié annulé par erreur redevient planifié, pas « confirmé » — sinon le
-- bureau devrait refaire son planning à chaque fausse manœuvre.
--
-- La signature void de cmd_annuler_affaire est conservée : l'application
-- l'appelle déjà ainsi, et changer un type de retour casserait l'appel.
-- =============================================================================

alter table public.affaires
  add column if not exists etat_avant_annulation etat_affaire;

comment on column public.affaires.etat_avant_annulation is
  'État du dossier juste avant son annulation, pour pouvoir y revenir. '
  'NULL si le dossier n''a jamais été annulé.';

-- ── Annuler : on note d'où l'on vient ──────────────────────────────────────
create or replace function public.cmd_annuler_affaire(
  p_affaire uuid, p_motif text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid; v_etat etat_affaire;
begin
  select org_id, etat into v_org, v_etat from affaires where id = p_affaire;
  if v_org is null or v_org <> jwt_org() then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;
  if not acteur_a_capacite('creer_affaire') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if v_etat = 'annule' then return; end if;

  -- Mémoriser AVANT la transition : après, l'information est perdue.
  update affaires set etat_avant_annulation = v_etat where id = p_affaire;

  perform transition_exigee(p_affaire, 'annule'::etat_affaire, 'annulation');

  update missions set etat = 'annulee'
   where affaire_id = p_affaire and etat in ('planifiee', 'en_cours');

  perform emettre_evenement(v_org, 'Affaire.Annulee', 'affaire', p_affaire,
    (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org),
    jsonb_build_object('motif', p_motif, 'etat_avant', v_etat));
end $$;

revoke all on function public.cmd_annuler_affaire(uuid, text) from public, anon;
grant execute on function public.cmd_annuler_affaire(uuid, text) to authenticated;

-- ── Reprendre : on retourne d'où l'on venait ───────────────────────────────
create or replace function public.cmd_reprendre_affaire(
  p_affaire uuid, p_motif text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_org uuid; v_etat etat_affaire; v_cible etat_affaire;
begin
  select org_id, etat, etat_avant_annulation
    into v_org, v_etat, v_cible
    from affaires where id = p_affaire;
  if v_org is null or v_org <> jwt_org() then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;
  if not acteur_a_capacite('creer_affaire') then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if v_etat <> 'annule' then
    raise exception 'Ce dossier n''est pas annulé (état : %)', v_etat
      using errcode = '22023';
  end if;

  -- Sans mémoire (annulation antérieure à cette migration), on repart de
  -- `devis` : l'état le plus en amont d'où tout reste possible. Mieux vaut
  -- refaire un pas en avant que réveiller un dossier dans un état qu'il
  -- n'avait peut-être pas.
  v_cible := coalesce(v_cible, 'devis'::etat_affaire);

  -- transition_exigee : si la reprise n'aboutit pas, l'appelant le SAIT.
  perform transition_exigee(p_affaire, v_cible, 'reprise après annulation');

  update affaires set archive_le = null, etat_avant_annulation = null
   where id = p_affaire;

  -- Les missions annulées redeviennent planifiées mais NON PARTAGÉES : le
  -- bureau revalide avant que le terrain se remobilise.
  update missions
     set etat = 'planifiee', partagee_le = null, partagee_par = null
   where affaire_id = p_affaire and etat = 'annulee';

  perform emettre_evenement(v_org, 'Affaire.Reprise', 'affaire', p_affaire,
    (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org),
    jsonb_build_object('motif', p_motif, 'etat_retabli', v_cible));
  return jsonb_build_object('affaire_id', p_affaire, 'etat', v_cible);
end $$;

revoke all on function public.cmd_reprendre_affaire(uuid, text) from public, anon;
grant execute on function public.cmd_reprendre_affaire(uuid, text) to authenticated;
