-- 0162 — APPLIQUÉE ET VÉRIFIÉE le 29/08/2026.
-- LA COMMUNICATION, POSÉE ET FIGÉE À L'ÉMISSION (vague 1, lot B).
-- Défaut : l'OGM était calculée au PDF, jamais stockée → rapprochement
-- impossible. On la pose à l'émission (figée avec le numéro). Réglage respecté :
-- communication_structuree=true → OGM ; sinon → numéro de facture. Toujours
-- stockée. Les 16 factures passées ne sont pas réécrites. Bénéfice UBL : le
-- PaymentID (qui lit f.communication) devient enfin renseigné.
-- Corps complet : voir 0162 en base (create or replace cmd_emettre_facture).

create or replace function cmd_emettre_facture(p_facture uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_org uuid := jwt_org();
  v_annee integer := extract(year from current_date);
  v_num integer; v_numero text; v_acteur uuid; v_affaire uuid; v_etat etat_affaire;
  v_jours integer; v_echeance date; v_structuree boolean; v_communication text;
begin
  if not acteur_a_capacite('emettre_facture') then
    raise exception 'Refusé : capacité emettre_facture requise' using errcode = '42501';
  end if;
  if not exists (select 1 from factures
                  where id = p_facture and org_id = v_org and emise = false) then
    raise exception 'Facture introuvable ou déjà émise';
  end if;
  select af.id, af.etat into v_affaire, v_etat
    from factures f join affaires af on af.id = f.affaire_id where f.id = p_facture;
  if v_affaire is not null and v_etat not in
     ('confirme','planifie','en_cours','effectue','clos') then
    raise exception 'Ce dossier n''est pas confirmé : il ne peut pas être facturé (état : %)', v_etat
      using errcode = '22023';
  end if;
  select greatest(0, coalesce((parametres_facturation->>'echeance_jours')::int, 30)),
         coalesce((parametres_facturation->>'communication_structuree')::boolean, false)
    into v_jours, v_structuree from organisations where id = v_org;
  v_jours := coalesce(v_jours, 30);
  v_echeance := current_date + (v_jours || ' days')::interval;
  v_num := sequence_suivante(v_org, 'facture', v_annee);
  v_numero := v_annee || '-' || lpad(v_num::text, 6, '0');
  if v_structuree then v_communication := ogm_structuree(v_annee, v_num);
  else v_communication := v_numero; end if;
  update factures
     set numero = v_numero, annee = v_annee, emise = true,
         date_emission = current_date, echeance = v_echeance,
         communication = v_communication
   where id = p_facture and org_id = v_org;
  select id into v_acteur from utilisateurs where auth_id = auth.uid() and org_id = v_org;
  perform emettre_evenement(v_org, 'Facture.Emise', 'facture', p_facture, v_acteur,
    jsonb_build_object('numero', v_numero, 'echeance', v_echeance,
                       'communication', v_communication));
  return v_numero;
end $$;
