-- 0160 — APPLIQUÉE ET VÉRIFIÉE le 29/08/2026.
-- L'ÉCHÉANCE DE PAIEMENT, POSÉE ET FIGÉE À L'ÉMISSION (vague 1, lot A).
--
-- Défaut réel : 16 factures émises, 16 sans échéance. Le réglage
-- parametres_facturation.echeance_jours était saisi mais jamais appliqué.
-- On le lit à l'émission ; echeance = date_emission + echeance_jours.
--
-- Figée comme le numéro : posée dans la même transaction où emise passe à true
-- (old.emise encore false → trigger d'immuabilité l'autorise), immuable ensuite.
-- On ne réécrit PAS les 16 factures passées (décision Raphaël) : futur seulement.
-- Défaut prudent 30 j si le réglage manque. Vérifié : Roovers(singulier)→30j.

create or replace function cmd_emettre_facture(p_facture uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_org uuid := jwt_org();
  v_annee integer := extract(year from current_date);
  v_num integer; v_numero text; v_acteur uuid; v_affaire uuid; v_etat etat_affaire;
  v_jours integer; v_echeance date;
begin
  if not acteur_a_capacite('emettre_facture') then
    raise exception 'Refusé : capacité emettre_facture requise' using errcode = '42501';
  end if;
  if not exists (select 1 from factures
                  where id = p_facture and org_id = v_org and emise = false) then
    raise exception 'Facture introuvable ou déjà émise';
  end if;

  select af.id, af.etat into v_affaire, v_etat
    from factures f join affaires af on af.id = f.affaire_id
   where f.id = p_facture;
  if v_affaire is not null and v_etat not in
     ('confirme','planifie','en_cours','effectue','clos') then
    raise exception 'Ce dossier n''est pas confirmé : il ne peut pas être facturé (état : %)', v_etat
      using errcode = '22023';
  end if;

  select greatest(0, coalesce((parametres_facturation->>'echeance_jours')::int, 30))
    into v_jours from organisations where id = v_org;
  v_jours := coalesce(v_jours, 30);
  v_echeance := current_date + (v_jours || ' days')::interval;

  v_num := sequence_suivante(v_org, 'facture', v_annee);
  v_numero := v_annee || '-' || lpad(v_num::text, 6, '0');
  update factures
     set numero = v_numero, annee = v_annee, emise = true,
         date_emission = current_date, echeance = v_echeance
   where id = p_facture and org_id = v_org;

  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Facture.Emise', 'facture', p_facture, v_acteur,
    jsonb_build_object('numero', v_numero, 'echeance', v_echeance));
  return v_numero;
end $$;
