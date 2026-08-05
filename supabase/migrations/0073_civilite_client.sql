-- =============================================================================
-- 0073_civilite_client.sql   ✅ appliquée le 2026-08-04
--
-- CIVILITÉ DU CLIENT : Monsieur, Madame, ou les deux.
--
-- Un déménagement se traite le plus souvent avec un COUPLE. Écrire « Monsieur »
-- sur une offre que madame va lire — et souvent signer — est une maladresse
-- commerciale gratuite. « Les deux » n'est donc pas une case de complaisance :
-- c'est le cas le plus fréquent du métier.
--
-- Trois valeurs seulement, plus l'absence :
--   monsieur | madame | les_deux | NULL (inconnu)
--
-- NULL est un état légitime : au premier appel on ne sait pas toujours. Les
-- documents utilisent alors une formule neutre plutôt que de deviner — déduire
-- le genre d'un client de son prénom serait à la fois techniquement fragile et
-- déplacé.
-- =============================================================================

alter table public.clients
  add column if not exists civilite text;

alter table public.clients drop constraint if exists clients_civilite_valide;
alter table public.clients
  add constraint clients_civilite_valide
  check (civilite is null or civilite in ('monsieur', 'madame', 'les_deux'));

comment on column public.clients.civilite is
  'monsieur | madame | les_deux | NULL. NULL = pas encore su : les documents '
  'emploient alors une formule neutre, jamais une supposition.';
