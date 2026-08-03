-- =============================================================================
-- 0064_separation_cycles_facturation.sql   ✅ appliquée le 2026-07-29 — décision D1
--
-- SÉPARATION DU CYCLE OPÉRATIONNEL ET DU CYCLE DE FACTURATION.
--
-- Le problème : `affaires.etat` mélangeait deux histoires — où en est le
-- déménagement, et où en est l'argent. D'où l'absurdité constatée
-- (« confirmé ET payé »), et une chaîne qui interdisait la facture d'acompte.
--
-- Constat qui a tranché : 15 factures émises en production, et AUCUN dossier
-- n'a jamais atteint l'état « facture ». Les transitions échouaient toutes en
-- silence, parce que transition_interne renvoie false sans lever et que
-- personne ne lisait son verdict. Le cycle de facturation dans l'enum était
-- déjà mort — il ne servait qu'à mentir.
--
-- Après :
--   CYCLE OPÉRATIONNEL (affaires.etat) — où en est le déménagement
--     brouillon > devis > envoye > confirme > planifie > en_cours > effectue > clos
--   CYCLE DE FACTURATION (dérivé, jamais stocké) — où en est l'argent
--     non_facture > facture > partiellement_paye > paye
--
-- Le second se DÉDUIT des factures et des paiements. Rien à synchroniser, donc
-- rien qui puisse se désynchroniser : c'est tout l'intérêt.
--
-- Effet de bord voulu : on peut facturer un acompte dès qu'un dossier est
-- confirmé, sans prétendre que le déménagement a eu lieu.
-- =============================================================================

-- ── 1. Le cycle opérationnel ne va plus vers la facturation ────────────────
create or replace function public.transition_permise(
  p_source etat_affaire, p_cible etat_affaire)
returns boolean language sql immutable set search_path to 'public' as $$
  select (p_source, p_cible) in (
    ('brouillon','devis'), ('brouillon','annule'),
    ('devis','envoye'), ('devis','annule'),
    ('envoye','confirme'), ('envoye','reporte'), ('envoye','annule'),
    ('confirme','planifie'), ('confirme','reporte'), ('confirme','annule'),
    ('planifie','en_cours'), ('planifie','reporte'), ('planifie','annule'),
    ('en_cours','effectue'), ('en_cours','annule'),
    ('effectue','clos'), ('effectue','annule'),
    ('reporte','planifie'), ('reporte','annule'),
    -- Reprise d'une annulation (INC-18) : `annule` n'avait aucune sortie, donc
    -- « annuler une annulation » ne faisait rien.
    ('annule','devis'), ('annule','envoye'), ('annule','confirme'),
    ('annule','planifie')
  );
$$;

-- ── 2. Transition EXIGEANTE, à côté de la tolérante ────────────────────────
-- transition_interne reste tolérante : c'est voulu pour les cascades
-- (terminer un chantier enchaîne planifie > en_cours > effectue et doit
-- pouvoir sauter les étapes déjà franchies). Mais une commande utilisateur ne
-- doit JAMAIS réussir en apparence si la transition n'a pas eu lieu — c'est la
-- cause commune d'INC-17 et INC-18.
create or replace function public.transition_exigee(
  p_affaire uuid, p_cible etat_affaire, p_contexte text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_source etat_affaire;
begin
  select etat into v_source from affaires where id = p_affaire;
  if v_source is null then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;
  if v_source = p_cible then return; end if;
  if not transition_interne(p_affaire, p_cible) then
    raise exception 'Transition impossible : % vers % %',
      v_source, p_cible, coalesce('(' || p_contexte || ')', '')
      using errcode = '22023';
  end if;
end $$;

revoke all on function public.transition_exigee(uuid, etat_affaire, text)
  from public, anon;
grant execute on function public.transition_exigee(uuid, etat_affaire, text)
  to authenticated;

-- ── 3. Le cycle de facturation, DÉRIVÉ ─────────────────────────────────────
-- Aucune colonne : on lit les factures et les paiements. Une donnée dérivable
-- ne se stocke pas, sinon les deux finissent par se contredire — c'est
-- exactement ce qui venait d'arriver.
create or replace function public.etat_facturation(p_affaire uuid)
returns jsonb language plpgsql stable security definer
set search_path to 'public' as $$
declare
  v_du bigint := 0;
  v_paye bigint := 0;
  v_nb integer := 0;
  v_etat text;
begin
  select coalesce(sum(case when f.type = 'avoir' then -f.tvac_centimes
                           else f.tvac_centimes end), 0),
         count(*)
    into v_du, v_nb
    from factures f where f.affaire_id = p_affaire and f.emise = true;

  select coalesce(sum(p.montant_centimes), 0) into v_paye
    from paiements p
    join factures f on f.id = p.facture_id
   where f.affaire_id = p_affaire and f.emise = true;

  v_etat := case
    when v_nb = 0 then 'non_facture'
    when v_paye <= 0 then 'facture'
    when v_paye < v_du then 'partiellement_paye'
    else 'paye'
  end;

  return jsonb_build_object(
    'etat', v_etat,
    'factures', v_nb,
    'du_centimes', v_du,
    'paye_centimes', v_paye,
    'solde_centimes', v_du - v_paye);
end $$;

revoke all on function public.etat_facturation(uuid) from public, anon;
grant execute on function public.etat_facturation(uuid) to authenticated;

-- ── 4. Émettre une facture ne touche plus au cycle opérationnel ────────────
create or replace function public.cmd_emettre_facture(p_facture uuid)
returns text language plpgsql security definer set search_path to 'public' as $$
declare
  v_org uuid := jwt_org();
  v_annee integer := extract(year from current_date);
  v_num integer; v_numero text; v_acteur uuid; v_affaire uuid; v_etat etat_affaire;
begin
  if not acteur_a_capacite('emettre_facture') then
    raise exception 'Refusé : capacité emettre_facture requise' using errcode = '42501';
  end if;
  if not exists (select 1 from factures
                  where id = p_facture and org_id = v_org and emise = false) then
    raise exception 'Facture introuvable ou déjà émise';
  end if;

  -- Contrôle explicite, à la place de la transition muette d'avant : on
  -- facture un dossier engagé, jamais un brouillon ou un devis non accepté.
  select af.id, af.etat into v_affaire, v_etat
    from factures f join affaires af on af.id = f.affaire_id
   where f.id = p_facture;
  if v_affaire is not null and v_etat not in
     ('confirme','planifie','en_cours','effectue','clos') then
    raise exception 'Ce dossier n''est pas confirmé : il ne peut pas être facturé (état : %)', v_etat
      using errcode = '22023';
  end if;

  v_num := sequence_suivante(v_org, 'facture', v_annee);
  v_numero := v_annee || '-' || lpad(v_num::text, 6, '0');
  update factures
     set numero = v_numero, annee = v_annee, emise = true, date_emission = current_date
   where id = p_facture and org_id = v_org;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Facture.Emise', 'facture', p_facture, v_acteur,
    jsonb_build_object('numero', v_numero));

  -- Plus AUCUNE transition ici : l'état de facturation se déduit désormais.
  return v_numero;
end $$;

-- Vérification :
--   select transition_permise('effectue','facture');  -- false attendu
--   select transition_permise('annule','planifie');   -- true attendu
--   select etat_facturation('<uuid dossier>');
