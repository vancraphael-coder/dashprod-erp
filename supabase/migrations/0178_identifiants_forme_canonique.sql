-- 0178 — Forme canonique des identifiants d'entreprise.
--
-- CE QUI A ÉTÉ MESURÉ. Trois organisations, trois écritures différentes du
-- même type de donnée :
--   · « BE 0478.363.616 » dans `bce` (c'est-à-dire une TVA dans la colonne BCE)
--   · « 1033973082 »      dans `bce` (dix chiffres nus)
--   · `null`              dans `bce` et `tva`
-- Un identifiant qui s'écrit de trois façons ne rapproche plus rien : ni une
-- fiche à la Banque-Carrefour, ni un participant Peppol, ni deux organisations
-- entre elles.
--
-- LA RÈGLE, posée ici une fois pour toutes :
--   `bce` = les dix chiffres, ponctués      → 0478.363.616
--   `tva` = les dix chiffres préfixés BE    → BE0478363616
-- C'est la présentation officielle de chacun des deux numéros. Le domaine
-- (packages/domaine/src/organisation/bce.js) applique la même règle à
-- l'écriture ; cette migration rattrape l'existant.
--
-- CE QU'ELLE NE FAIT PAS. Aucune contrainte n'est posée sur la colonne. La
-- clé modulo 97 se vérifie côté domaine, et une organisation étrangère n'aura
-- pas de numéro belge : verrouiller la colonne aujourd'hui fermerait la porte
-- à l'international avant même de l'avoir instruite. La vérification auprès
-- des sources officielles viendra avec le moteur d'identité complet.

-- Fonction utilitaire : extraire les dix chiffres, quelle que soit l'écriture.
create or replace function public.bce_chiffres(p_valeur text)
returns text language sql immutable
as $function$
  select case
    when p_valeur is null then null
    else (
      select case when n ~ '^[01][0-9]{9}$' then n else null end
      from (select regexp_replace(upper(btrim(p_valeur)), '^BE|[^0-9]', '', 'g') as n) x
    )
  end;
$function$;

comment on function public.bce_chiffres(text) is
  'Les dix chiffres d''un numéro d''entreprise belge, quelle que soit '
  'l''écriture reçue. NULL si la valeur n''est pas un numéro belge — jamais '
  'une chaîne tronquée qui donnerait l''illusion d''avoir compris.';

-- Rattrapage de l'existant. `tva` se déduit de `bce` quand elle manque, et
-- inversement : les deux portent le même numéro, seule la présentation change.
update public.organisations o
   set bce = regexp_replace(coalesce(bce_chiffres(o.bce), bce_chiffres(o.tva)),
                            '^(.{4})(.{3})(.{3})$', '\1.\2.\3'),
       tva = 'BE' || coalesce(bce_chiffres(o.bce), bce_chiffres(o.tva))
 where coalesce(bce_chiffres(o.bce), bce_chiffres(o.tva)) is not null
   and (o.bce is distinct from
          regexp_replace(coalesce(bce_chiffres(o.bce), bce_chiffres(o.tva)),
                         '^(.{4})(.{3})(.{3})$', '\1.\2.\3')
        or o.tva is distinct from
          'BE' || coalesce(bce_chiffres(o.bce), bce_chiffres(o.tva)));
