-- =============================================================================
-- Migration 0027 — Correctif : permettre la signature d'une instance gelée
--
-- BUG : le trigger bloquer_instance_gelee (0007) interdit TOUT update sur une
-- instance gelée. Or cmd_signer_instance doit passer statut 'envoyee' → 'signee'
-- sur une instance gelée à l'envoi (S6). Résultat : « Instance figée :
-- modification interdite (C-02) » à chaque tentative de signature — la
-- signature était rendue impossible.
--
-- CORRECTIF : le trigger continue d'interdire toute modification du CONTENU,
-- de l'EMPREINTE et du drapeau gele (l'immuabilité juridique est intacte),
-- mais autorise la seule transition légitime envoyee → signee (avec l'ajout
-- de la date de signature). C'est exactement le scellement final : le document
-- ne change pas, seul son statut avance.
-- =============================================================================

create or replace function bloquer_instance_gelee() returns trigger
language plpgsql as $$
begin
  if old.gele = true then
    -- Transition de scellement autorisée : envoyee → signee, sans toucher au
    -- contenu ni à l'empreinte. Tout le reste d'une instance gelée est figé.
    if new.statut = 'signee'
       and old.statut = 'envoyee'
       and new.contenu is not distinct from old.contenu
       and new.empreinte_sha256 is not distinct from old.empreinte_sha256
       and new.gele = old.gele then
      return new;
    end if;

    raise exception 'Instance figée : modification interdite (C-02)';
  end if;
  return new;
end; $$;

comment on function bloquer_instance_gelee is
  'Immuabilité S6 : une instance gelée refuse toute modification, SAUF le scellement final envoyee → signee (contenu et empreinte inchangés).';
