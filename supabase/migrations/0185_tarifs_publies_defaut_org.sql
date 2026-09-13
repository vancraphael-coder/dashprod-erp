-- 0185 — `tarifs_publies.org_id` reçoit son `default jwt_org()`.
--
-- Trouvé par la garde `ecriture-org` du dépôt, au moment même où 0181 était
-- écrite : toute table à `org_id not null` doit déclarer ce défaut, sinon une
-- écriture depuis l'application échoue sans dire pourquoi. C'est la deuxième
-- fois que cette garde attrape un oubli (la première : `releves_abonnement`,
-- migration 0175). Elle mérite d'être citée comme exemple de test rentable.
--
-- Additif, sans effet sur les lignes existantes.

alter table public.tarifs_publies alter column org_id set default jwt_org();
