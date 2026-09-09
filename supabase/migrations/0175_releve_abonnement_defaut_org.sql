-- 0175 — `releves_abonnement.org_id` reçoit son `default jwt_org()`.
--
-- Écart trouvé en reconstituant 0173 : le test `ecriture-org` du dépôt exige
-- que toute table à `org_id not null` déclare `default jwt_org()`, faute de
-- quoi une écriture directe depuis l'application échoue en silence. La table
-- a été créée en production sans ce défaut. L'écriture ne passant aujourd'hui
-- que par `cmd_emettre_releve_abonnement` (`security definer`, org_id fourni
-- explicitement), le manque ne s'était jamais manifesté — c'est exactement le
-- genre de trou qui n'apparaît qu'au premier écran d'administration.
--
-- Additif, sans effet sur les lignes existantes.

alter table public.releves_abonnement alter column org_id set default jwt_org();
