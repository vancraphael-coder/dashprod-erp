-- 0186 — La capacité `voir_tresorerie`.
--
-- POURQUOI UNE CAPACITÉ À PART, et pas un effet de `emettre_facture`. On peut
-- avoir à facturer sans avoir à connaître la santé financière de l'entreprise :
-- une secrétaire émet des factures toute la journée, elle n'a pas à voir la
-- marge ni les impayés globaux. Inversement un gestionnaire de trésorerie doit
-- voir l'ensemble sans nécessairement pouvoir numéroter une facture.
--
-- Séparer les deux est ce qui permettra de confier la trésorerie à quelqu'un
-- sans lui donner le reste de la direction.
--
-- ATTRIBUTION. Accordée aux rôles qui portent DÉJÀ `emettre_facture` ET
-- `voir_paie` — ceux qui voient l'argent des autres, donc la direction et le
-- gérant. Aucun rôle ne gagne un accès qu'il n'avait pas en substance : on
-- nomme une vue qui existait de fait, on ne l'ouvre pas.
--
-- Note : `capacites` est une table de référence globale (clé, libellé,
-- description) à laquelle `role_capacites` fait référence. Une capacité
-- s'inscrit donc en deux temps — au catalogue, puis aux rôles. Le premier
-- essai a buté sur la clé étrangère, ce qui est exactement le comportement
-- voulu : on ne distribue pas une capacité qui n'existe pas.

insert into public.capacites (cle, libelle, description)
values ('voir_tresorerie', 'Voir la trésorerie de l''entreprise',
        'Encaissements, impayés, échéances et marge, chiffrés. Réservé : '
        || 'c''est la vue la plus complète sur la santé financière, et elle '
        || 'n''est utile qu''à qui décide des paiements.')
on conflict (cle) do nothing;

insert into public.role_capacites (role_id, capacite_cle)
select r.id, 'voir_tresorerie'
  from public.roles r
 where exists (select 1 from public.role_capacites c
                where c.role_id = r.id and c.capacite_cle = 'emettre_facture')
   and exists (select 1 from public.role_capacites c
                where c.role_id = r.id and c.capacite_cle = 'voir_paie')
on conflict do nothing;
