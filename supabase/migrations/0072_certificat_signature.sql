-- =============================================================================
-- 0072_certificat_signature.sql   ✅ appliquée le 2026-08-04
--
-- LA PREUVE EXISTAIT, MAIS RESTAIT INVISIBLE.
--
-- Constat : la base contient tout ce qu'il faut pour une signature opposable —
-- nom du signataire, mention « Lu et approuvé » telle qu'il l'a recopiée,
-- horodatage à la seconde, empreinte SHA-256 du document approuvé, canal. Mais
-- rien ne le RESTITUAIT : le bureau ne voyait qu'un badge. Or un badge dans une
-- application n'est pas une preuve — en cas de litige, il faut un document qui
-- se produit, s'imprime et se relit.
--
-- Cette fonction assemble le certificat. Elle ne crée aucune donnée : elle
-- rassemble ce qui a été enregistré au moment de la signature. C'est important
-- juridiquement — un certificat qui recalculerait quoi que ce soit ne
-- prouverait rien.
--
-- Ce qui fait la valeur du certificat, en droit belge :
--   1. l'IDENTITÉ déclarée (nom et prénom recopiés par le signataire) ;
--   2. le CONSENTEMENT explicite (la mention manuscrite, exigée en base) ;
--   3. la DATE certaine (horodatage serveur, non modifiable par le client) ;
--   4. l'INTÉGRITÉ (empreinte du document : s'il change, elle ne correspond
--      plus — et le document signé est de toute façon verrouillé par 0066).
-- =============================================================================

create or replace function public.cmd_certificat_signature(p_affaire uuid)
returns jsonb language plpgsql stable security definer
set search_path to 'public' as $$
declare v_org uuid := jwt_org(); r jsonb;
begin
  if not exists (select 1 from affaires where id = p_affaire and org_id = v_org) then
    raise exception 'Dossier introuvable' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'signe', true,
    'affaire_id', af.id,
    -- Identité déclarée par le signataire lui-même.
    'signataire', s.signataire_nom,
    -- Consentement : la mention EXACTE telle qu'elle a été recopiée. On ne la
    -- normalise pas — sa forme littérale fait partie de la preuve.
    'mention', ac.mention_saisie,
    -- Date certaine : horodatage serveur, hors de portée du client.
    'horodatage', s.horodatage,
    'canal', s.canal,
    -- Intégrité : empreinte du document approuvé.
    'empreinte', s.empreinte_doc,
    'document_gele', di.gele,
    'document_statut', di.statut,
    'instance_id', di.id,
    -- Le contexte que le certificat doit rappeler pour être lisible seul.
    'entreprise', o.nom,
    'entreprise_tva', o.tva,
    'client', c.nom,
    'client_email', c.email,
    'montant_tvac_centimes', affaire_tvac(af.id),
    'date_souhaitee', af.date_souhaitee,
    'code_indice', ac.indice,
    'essais_avant_signature', ac.essais_rates)
    into r
    from affaires af
    join documents_instances di on di.affaire_id = af.id and di.statut = 'signee'
    join signatures s on s.instance_id = di.id
    left join acces_client ac on ac.affaire_id = af.id and ac.signe_le is not null
    left join organisations o on o.id = af.org_id
    left join clients c on c.id = af.client_id
   where af.id = p_affaire
   order by s.horodatage desc
   limit 1;

  if r is null then
    return jsonb_build_object('signe', false,
      'message', 'Aucune signature enregistrée pour ce dossier.');
  end if;
  return r;
end $$;

revoke all on function public.cmd_certificat_signature(uuid) from public, anon;
grant execute on function public.cmd_certificat_signature(uuid) to authenticated;
