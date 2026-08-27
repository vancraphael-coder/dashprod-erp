-- 0149 — APPLIQUÉE ET VÉRIFIÉE le 27/08/2026.
-- LE POSTE « RESPONSABLE DÉPÔT ».
--
-- Raphaël l'avait oublié : mêmes attributions qu'une secrétaire, plus la
-- gestion du dépôt et du garde-meubles (capacité gerer_depot). Additive et
-- idempotente, même patron que 0145. Vérifié : 5 orgs × 10 capacités.

do $$
declare v_org uuid; v_role uuid;
  caps text[] := array['pointer_chantier','signaler_materiel','demander_conge',
                        'creer_affaire','voir_prix','faire_signer','valider_intake',
                        'gerer_planning','approuver_conge','gerer_depot'];
begin
  for v_org in select id from organisations loop
    insert into roles (org_id, cle, libelle)
      values (v_org, 'responsable_depot', 'Responsable dépôt')
      on conflict (org_id, cle) do nothing;
    select id into v_role from roles where org_id = v_org and cle = 'responsable_depot';
    delete from role_capacites where role_id = v_role and capacite_cle <> all (caps);
    insert into role_capacites (role_id, capacite_cle)
      select v_role, unnest(caps) on conflict do nothing;
  end loop;
end $$;
