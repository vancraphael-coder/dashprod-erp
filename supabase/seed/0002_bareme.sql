-- =============================================================================
-- Seed 0002 — Barème tarifaire de référence (valeurs validées client, ADR-008)
-- Miroir de packages/domaine/src/chiffrage/bareme.js. Version 1 des
-- référentiels de chiffrage. Toute évolution future = cmd_publier_referentiel
-- (nouvelle version), jamais un UPDATE (C-07).
--
-- NB : ce seed suppose une organisation existante. Remplacer :org_id par
-- l'identifiant de l'organisation Roovers lors de l'application.
-- Pour Roovers, utiliser :org_id = '893d9c67-9d07-4408-a484-13fa31aec500'.
-- Idempotent : n'insère la version 1 que si aucune version active n'existe.
-- =============================================================================

do $$
declare
  v_org uuid := :'org_id';  -- passé au moment de l'application du seed
begin
  -- Barème horaire (€/heure HTVA par nombre de déménageurs).
  if not exists (select 1 from referentiels
                 where org_id = v_org and type = 'bareme_horaire'
                   and cle = 'standard' and actif) then
    insert into referentiels (org_id, type, cle, valeur, version, juridiction)
    values (v_org, 'bareme_horaire', 'standard',
      '{"2": 85, "3": 130, "4": 170, "5": 215, "6": 255}'::jsonb, 1, 'BE');
  end if;

  -- Tarifs et suppléments (HTVA sauf mention).
  if not exists (select 1 from referentiels
                 where org_id = v_org and type = 'tarifs' and cle = 'supplements' and actif) then
    insert into referentiels (org_id, type, cle, valeur, version, juridiction)
    values (v_org, 'tarifs', 'supplements',
      '{"elevateur": 150, "km_facture": 1, "emballage_horaire": 75,
        "emballage_km": 0.75, "heure_sup_forfait": 42.5, "assurance_htva": 50}'::jsonb,
      1, 'BE');
  end if;

  -- Paramètres de calcul (TVA, cible de marge).
  if not exists (select 1 from referentiels
                 where org_id = v_org and type = 'parametres' and cle = 'calcul' and actif) then
    insert into referentiels (org_id, type, cle, valeur, version, juridiction)
    values (v_org, 'parametres', 'calcul',
      '{"tva_pct": 21, "marge_min": 25, "marge_max": 45}'::jsonb, 1, 'BE');
  end if;

  -- Barèmes d'indemnité (% du TVAC selon jours avant la date).
  if not exists (select 1 from referentiels
                 where org_id = v_org and type = 'indemnites' and cle = 'report_annulation' and actif) then
    insert into referentiels (org_id, type, cle, valeur, version, juridiction)
    values (v_org, 'indemnites', 'report_annulation',
      '{"report": [{"seuil_jours": 5, "pct": 25}, {"seuil_jours": 2, "pct": 50}, {"seuil_jours": 0, "pct": 75}],
        "annulation": [{"seuil_jours": 5, "pct": 50}, {"seuil_jours": 2, "pct": 70}, {"seuil_jours": 0, "pct": 100}]}'::jsonb,
      1, 'BE');
  end if;
end $$;
