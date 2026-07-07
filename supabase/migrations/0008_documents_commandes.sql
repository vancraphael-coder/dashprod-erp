-- =============================================================================
-- Migration 0008 — Documents : commandes
-- Source : Réf. 2 (S6, cascade S10-2) et Réf. 3 (T4, T5).
-- cmd_instancier_offre : fige une offre en joignant la C.B.D. active (jamais
-- sans — protection juridique). cmd_geler_instance : marque l'envoi (l'instance
-- devient immuable). cmd_signer_instance : constitue le dossier de preuve et
-- permet la transition Affaire.Confirme (garde C-02).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- version_modele_active — sélection déterministe (miroir de versionModeleActive).
-- -----------------------------------------------------------------------------
create or replace function version_modele_active(
  p_org uuid, p_type text, p_langue char(2) default 'fr', p_jur char(2) default 'BE'
) returns uuid
language sql stable security definer set search_path = public as $$
  select id from documents_modele_versions
   where (org_id = p_org or org_id is null)
     and type = p_type and actif and langue = p_langue and juridiction = p_jur
   order by version desc
   limit 1;
$$;

-- -----------------------------------------------------------------------------
-- cmd_instancier_offre — fige une offre. Joint OBLIGATOIREMENT la C.B.D. active
-- pour les types d'offre (S6). Émet Document.Instancie.
-- -----------------------------------------------------------------------------
create or replace function cmd_instancier_offre(
  p_affaire uuid, p_type text, p_contenu jsonb, p_empreinte text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org    uuid := jwt_org();
  v_modele uuid;
  v_cbd    uuid;
  v_id     uuid;
  v_acteur uuid;
begin
  if not acteur_a_capacite('faire_signer') then
    raise exception 'Refusé : capacité faire_signer requise' using errcode = '42501';
  end if;
  if p_type not in ('offre_tarifaire','offre_emballage','offre_forfait') then
    raise exception 'Type % n''est pas une offre', p_type;
  end if;

  v_modele := version_modele_active(v_org, p_type);
  if v_modele is null then
    raise exception 'Aucun modèle actif pour %', p_type;
  end if;

  -- Protection juridique : la C.B.D. active est requise, non désactivable (S6).
  v_cbd := version_modele_active(v_org, 'cbd');
  if v_cbd is null then
    raise exception 'C.B.D. active absente : offre non instanciable (protection juridique)'
      using errcode = '23514';
  end if;

  insert into documents_instances
    (org_id, affaire_id, modele_version_id, cbd_version_id, contenu, empreinte_sha256, statut)
    values (v_org, p_affaire, v_modele, v_cbd, p_contenu, p_empreinte, 'generee')
    returning id into v_id;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Document.Instancie', 'document', v_id, v_acteur,
    jsonb_build_object('type', p_type, 'cbd', v_cbd));
  return v_id;
end; $$;
comment on function cmd_instancier_offre is
  'Fige une offre + C.B.D. active obligatoire (S6). Émet Document.Instancie.';

-- -----------------------------------------------------------------------------
-- cmd_geler_instance — marque l'envoi : l'instance devient immuable (gele=true).
-- Émet Document.Envoye et programme la relance (consommée par le module Noyau).
-- -----------------------------------------------------------------------------
create or replace function cmd_geler_instance(p_instance uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_acteur uuid;
begin
  if not acteur_a_capacite('faire_signer') then
    raise exception 'Refusé : capacité faire_signer requise' using errcode = '42501';
  end if;

  update documents_instances
     set statut = 'envoyee', envoye_le = now(), gele = true
   where id = p_instance and org_id = v_org and gele = false;

  if not found then
    raise exception 'Instance introuvable ou déjà figée';
  end if;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Document.Envoye', 'document', p_instance, v_acteur, '{}'::jsonb);
end; $$;

-- -----------------------------------------------------------------------------
-- cmd_signer_instance — constitue le dossier de preuve (C-26). Émet
-- Signature.Recueillie. La transition Affaire.Confirme se fait ensuite via
-- cmd_transition_affaire avec {instanceSignee:true} (garde C-02).
-- -----------------------------------------------------------------------------
create or replace function cmd_signer_instance(
  p_instance uuid, p_nom text, p_canal text, p_image text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := jwt_org();
  v_empreinte text;
  v_sig uuid;
  v_acteur uuid;
begin
  if not acteur_a_capacite('faire_signer') then
    raise exception 'Refusé : capacité faire_signer requise' using errcode = '42501';
  end if;

  -- L'instance doit exister dans le tenant ; on capture son empreinte à l'instant T.
  select empreinte_sha256 into v_empreinte
    from documents_instances where id = p_instance and org_id = v_org;
  if v_empreinte is null then
    raise exception 'Instance introuvable';
  end if;

  -- Geler l'instance si ce n'est pas déjà fait (une signature scelle le document).
  update documents_instances
     set statut = 'signee', gele = true
   where id = p_instance and org_id = v_org;

  insert into signatures
    (org_id, instance_id, signataire_nom, canal, image_trait, empreinte_doc, recueilli_par)
    values (v_org, p_instance, p_nom, coalesce(p_canal,'ecran'), p_image, v_empreinte,
            (select id from utilisateurs where auth_id = auth.uid() and org_id = v_org))
    returning id into v_sig;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Signature.Recueillie', 'document', p_instance, v_acteur,
    jsonb_build_object('signataire', p_nom, 'empreinte', v_empreinte));
  return v_sig;
end; $$;
comment on function cmd_signer_instance is
  'Dossier de preuve (C-26). Scelle l''instance, émet Signature.Recueillie.';
