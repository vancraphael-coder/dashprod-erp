-- 0196 — Déclarer une mission réalisée, et l'annuler.
--
-- LE CHAÎNON MANQUANT. Un engagement pouvait être proposé, accepté, refusé,
-- facturé — mais rien ne permettait de dire « c'est fait ». L'état `realisee`
-- existait dans la contrainte depuis 0182 et aucune commande n'y menait. Sans
-- lui, le prestataire ne peut pas facturer et le donneur d'ordre ne sait pas
-- si le chantier a eu lieu.
--
-- QUI DÉCLARE. Le PRESTATAIRE, parce que c'est lui qui était sur place. Le
-- donneur d'ordre déclarant à sa place ouvrirait la porte à « je considère que
-- tu n'y étais pas » — un rapport de force que le produit n'a pas à créer.
--
-- QUAND. Pas avant la date. On ne déclare pas réalisé un chantier qui n'a pas
-- eu lieu ; c'est le genre de geste qu'on regrette le lendemain. Le refus est
-- une contrainte de commande, pas un conseil.
--
-- CE QUE ÇA NE FAIT PAS : facturer. Émettre une facture est un acte séparé,
-- avec sa numérotation légale et sa séquence. Enchaîner automatiquement ferait
-- émettre des pièces comptables par un clic destiné à dire « j'ai fini ».
--
-- L'ANNULATION, posée ici aussi parce qu'elle manquait pour les mêmes raisons.
-- Les DEUX parties peuvent annuler — un chantier tombe des deux côtés — mais
-- seulement avant réalisation, et avec un motif. Une annulation muette laisse
-- l'autre sans rien à comprendre.
--
-- L'adresse libérée à l'acceptation est RETIRÉE à l'annulation : elle n'avait
-- de raison d'être que tant que la mission tenait.
--
-- NOTE : la garde d'appartenance de `cmd_annuler_engagement` était fautive
-- dans cette version (`not in` laisse passer un `jwt_org()` nul). Corrigée par
-- 0197 — voir l'explication là-bas, elle vaut la peine d'être lue.

create or replace function public.cmd_marquer_engagement_realise(p_engagement uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid := jwt_org(); v_e engagements%rowtype;
begin
  select * into v_e from engagements where id = p_engagement;
  if not found then
    raise exception 'Engagement introuvable' using errcode = '42501';
  end if;
  -- `is distinct from` : avec un `jwt_org()` nul, la comparaison est vraie et
  -- l'appel est refusé. C'est la forme correcte, celle de 0197.
  if v_e.org_prestataire is distinct from v_org then
    raise exception 'Seul le prestataire declare une mission realisee'
      using errcode = '42501';
  end if;
  if v_e.etat <> 'acceptee' then
    return jsonb_build_object('ok', false,
      'motif', format('etat %s : seule une mission acceptee se declare realisee',
                      v_e.etat));
  end if;
  if v_e.date_prestation > current_date then
    return jsonb_build_object('ok', false,
      'motif', 'la date n''est pas encore passee');
  end if;

  update engagements set etat = 'realisee' where id = p_engagement;
  perform engagement_inscrire(p_engagement, 'realisee', v_org, '{}'::jsonb);

  return jsonb_build_object('ok', true, 'etat', 'realisee');
end $function$;

revoke execute on function public.cmd_marquer_engagement_realise(uuid)
  from public, anon;
grant execute on function public.cmd_marquer_engagement_realise(uuid)
  to authenticated, service_role;
