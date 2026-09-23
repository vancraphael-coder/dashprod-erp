-- =============================================================================
-- AMORCE DE REJEU — les lignes que certaines migrations supposent déjà là.
--
-- POURQUOI CE FICHIER EXISTE. Deux migrations (0015 et 0046) contiennent des
-- données de LOCATAIRE en dur — l'identifiant de l'organisation Roovers,
-- '893d9c67-…'. En production la ligne existe, donc elles sont passées. Sur une
-- base vierge, elles échouent sur une clé étrangère : le dépôt ne sait pas
-- reconstruire une base à partir de rien.
--
-- CE QUE CE FICHIER NE FAIT PAS. Il ne corrige pas le défaut, il le CONTOURNE
-- pour que le rejeu puisse mesurer le reste. Réécrire une migration déjà
-- appliquée en production est plus dangereux que le défaut lui-même. La
-- correction propre — sortir les données de locataire vers `supabase/seed/` —
-- est un lot à part entière ; le garde de migrations empêche entre-temps
-- qu'une NOUVELLE migration reproduise le motif.
--
-- Les valeurs ici sont volontairement fictives : ce n'est pas une copie de
-- production, c'est le minimum pour que les clés étrangères tiennent.
-- =============================================================================

insert into organisations (id, nom)
values ('893d9c67-9d07-4408-a484-13fa31aec500', 'Organisation de rejeu (fictive)')
on conflict (id) do nothing;
