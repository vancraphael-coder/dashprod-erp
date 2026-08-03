-- =============================================================================
-- 0066_offre_signee_definitive.sql   ✅ appliquée le 2026-07-29 — LOT 3
--
-- UNE OFFRE SIGNÉE EST DÉFINITIVE.
--
-- Trou constaté : `cmd_instancier_offre` ne vérifiait rien. On pouvait donc
-- regénérer une offre sur un dossier dont l'offre était DÉJÀ SIGNÉE. La
-- nouvelle instance, plus récente, prenait la place de l'ancienne à l'écran :
-- la signature du client disparaissait de l'affichage, alors qu'elle reste en
-- base. Un document signé qui cesse d'apparaître signé est un problème de
-- preuve, pas d'ergonomie.
--
-- Deux verrous, à deux niveaux — parce qu'un seul se contourne :
--   1. la commande refuse d'instancier si une offre signée existe ;
--   2. un trigger interdit de dé-signer ou de modifier le contenu d'une
--      instance signée, quel que soit le chemin emprunté.
--
-- Le second est le vrai garde-fou : il tient même si une commande future
-- oublie le contrôle.
-- =============================================================================

create or replace function public.cmd_instancier_offre(
  p_affaire uuid, p_type text, p_contenu jsonb, p_empreinte text)
returns uuid language plpgsql security definer set search_path to 'public' as $$
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

  -- Une offre signée ne se remplace pas. Pour repartir sur de nouvelles bases,
  -- le dossier doit d'abord être repris explicitement (annulation/reprise) —
  -- un geste conscient, pas un effet de bord d'un clic sur « envoyer ».
  if exists (select 1 from documents_instances di
              where di.affaire_id = p_affaire and di.org_id = v_org
                and di.statut = 'signee') then
    raise exception 'Ce dossier porte déjà une offre signée : elle ne peut pas être remplacée'
      using errcode = '23514';
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
end $$;

-- ── Verrou de dernier recours : une instance signée est immuable ───────────
create or replace function public.bloquer_modif_instance_signee()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if old.statut = 'signee' then
    -- Le contenu et l'empreinte sont la preuve de ce qui a été approuvé.
    if new.contenu is distinct from old.contenu
       or new.empreinte_sha256 is distinct from old.empreinte_sha256 then
      raise exception 'Document signé : son contenu ne peut plus être modifié'
        using errcode = '23514';
    end if;
    -- Et on ne revient pas en arrière sur une signature.
    if new.statut <> 'signee' then
      raise exception 'Document signé : la signature ne peut pas être retirée'
        using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_instance_signee_immuable on public.documents_instances;
create trigger trg_instance_signee_immuable
  before update on public.documents_instances
  for each row execute function bloquer_modif_instance_signee();

-- Vérification (les deux doivent échouer) :
--   update documents_instances set statut='generee' where statut='signee';
--   update documents_instances set contenu='{}'::jsonb where statut='signee';
