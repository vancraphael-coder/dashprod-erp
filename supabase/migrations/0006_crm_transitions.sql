-- =============================================================================
-- Migration 0006 — CRM : transition d'état gardée et RLS
-- Source : Réf. 2 (S4) et Réf. 3 (T3, T4).
-- cmd_transition_affaire est la SEULE porte de changement d'état : elle
-- applique la table de transitions et les gardes du domaine (affaire.js),
-- puis émet l'événement — dans une transaction. L'UPDATE direct de la colonne
-- etat est bloqué par trigger.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Transitions autorisées (miroir de TRANSITIONS dans affaire.js).
-- -----------------------------------------------------------------------------
create or replace function transition_permise(p_source etat_affaire, p_cible etat_affaire)
returns boolean language sql immutable as $$
  select (p_source, p_cible) in (
    ('brouillon','devis'), ('brouillon','annule'),
    ('devis','envoye'), ('devis','annule'),
    ('envoye','confirme'), ('envoye','reporte'), ('envoye','annule'),
    ('confirme','planifie'), ('confirme','reporte'), ('confirme','annule'),
    ('planifie','en_cours'), ('planifie','reporte'), ('planifie','annule'),
    ('en_cours','effectue'), ('en_cours','annule'),
    ('effectue','facture'),
    ('facture','paye'),
    ('paye','clos'),
    ('reporte','planifie'), ('reporte','annule')
  );
$$;

-- -----------------------------------------------------------------------------
-- cmd_transition_affaire — change l'état d'une affaire sous garde.
-- p_contexte : jsonb des faits pour les gardes (instanceSignee, numeroAttribue…).
-- Les invariants absolus de S4 sont vérifiés ici : confirme exige une signature,
-- facture exige un numéro attribué.
-- -----------------------------------------------------------------------------
create or replace function cmd_transition_affaire(
  p_affaire uuid, p_cible etat_affaire, p_contexte jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org    uuid := jwt_org();
  v_source etat_affaire;
  v_acteur uuid;
begin
  select etat into v_source from affaires where id = p_affaire and org_id = v_org;
  if v_source is null then
    raise exception 'Affaire introuvable dans cette organisation';
  end if;

  if not transition_permise(v_source, p_cible) then
    raise exception 'Transition % → % interdite', v_source, p_cible
      using errcode = '23514'; -- check_violation
  end if;

  -- Gardes (invariants S4).
  if p_cible = 'confirme' and coalesce((p_contexte->>'instanceSignee')::boolean, false) is not true then
    raise exception 'Confirmation refusée : instance signée requise (C-02)'
      using errcode = '23514';
  end if;
  if p_cible = 'facture' and coalesce((p_contexte->>'numeroAttribue')::boolean, false) is not true then
    raise exception 'Facturation refusée : numéro de séquence requis'
      using errcode = '23514';
  end if;
  if p_cible = 'planifie' and not (
       coalesce((p_contexte->>'aDate')::boolean,false)
       and coalesce((p_contexte->>'aEquipe')::boolean,false)
       and coalesce((p_contexte->>'aVehicule')::boolean,false)) then
    raise exception 'Planification refusée : date, équipe et véhicule requis'
      using errcode = '23514';
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;

  -- La mutation de l'état passe par une fonction SECURITY DEFINER : le trigger
  -- de blocage (ci-dessous) autorise ce chemin via un drapeau de session.
  perform set_config('app.transition_ok', 'true', true);
  update affaires set etat = p_cible where id = p_affaire;
  perform set_config('app.transition_ok', 'false', true);

  perform emettre_evenement(
    v_org, 'Affaire.' || initcap(p_cible::text), 'affaire', p_affaire, v_acteur,
    jsonb_build_object('de', v_source, 'vers', p_cible)
  );
end; $$;
comment on function cmd_transition_affaire is
  'Seule porte de changement d''état (S4). Vérifie transition + gardes, émet l''événement.';

-- Blocage de l'UPDATE direct de la colonne etat : seule la commande ci-dessus,
-- qui pose le drapeau app.transition_ok, est autorisée à la changer.
create or replace function bloquer_update_etat() returns trigger
language plpgsql as $$
begin
  if new.etat is distinct from old.etat
     and coalesce(current_setting('app.transition_ok', true), 'false') <> 'true' then
    raise exception 'Changement d''état interdit hors cmd_transition_affaire (S4)';
  end if;
  return new;
end; $$;
create trigger affaires_etat_garde
  before update on affaires
  for each row execute function bloquer_update_etat();

-- -----------------------------------------------------------------------------
-- RLS CRM — isolation de tenant (T3, famille 1).
-- -----------------------------------------------------------------------------
alter table clients          enable row level security;
alter table affaires         enable row level security;
alter table affaire_adresses enable row level security;

create policy clients_tenant on clients
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy affaires_tenant on affaires
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
create policy adresses_tenant on affaire_adresses
  for all using (org_id = jwt_org()) with check (org_id = jwt_org());
