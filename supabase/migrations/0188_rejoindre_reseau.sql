-- 0188 — Rejoindre le réseau, ou le quitter : un geste explicite.
--
-- CE QUI MANQUAIT. `organisations.visible_reseau` commande la lecture du
-- vivier `demandes_reseau` (politique `demandes_reseau_reseau`). La colonne
-- existait, aucune commande ne permettait de la changer : une société ne
-- pouvait donc pas rejoindre le réseau depuis l'application. L'écran affichait
-- « aucune demande pour le moment » alors que la vraie raison était « vous
-- n'êtes pas inscrit » — un vide qui mentait sur sa cause.
--
-- POURQUOI UN OPT-IN EXPLICITE, et pas un défaut à vrai. Être visible dans un
-- réseau, c'est accepter que d'autres sociétés voient qu'on existe et qu'on
-- prend des chantiers. Ça ne s'active pas par surprise. C'est aussi la
-- position la plus saine au regard du RGPD : la visibilité se consent, elle ne
-- se présume pas.
--
-- Réservé à `gerer_referentiels` : c'est une décision d'entreprise, pas un
-- réglage d'écran.

create or replace function public.cmd_rejoindre_reseau(p_visible boolean)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_org uuid := jwt_org();
begin
  if v_org is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;
  if not acteur_a_capacite('gerer_referentiels') then
    raise exception 'Capacité « gerer_referentiels » requise' using errcode = '42501';
  end if;

  update organisations set visible_reseau = coalesce(p_visible, false)
   where id = v_org;

  return jsonb_build_object('ok', true, 'visible_reseau', coalesce(p_visible, false));
end $function$;

revoke execute on function public.cmd_rejoindre_reseau(boolean) from public, anon;
grant execute on function public.cmd_rejoindre_reseau(boolean) to authenticated, service_role;

-- Mon état vis-à-vis du réseau. `stable`, sous RLS : on ne lit que sa société.
create or replace function public.cmd_mon_reseau()
returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'visible_reseau', coalesce((select o.visible_reseau from organisations o
                                 where o.id = jwt_org()), false),
    'vitrine_publiee', exists (select 1 from vitrine_prestataire v
                                where v.org_id = jwt_org()
                                  and v.publie_le is not null
                                  and v.retire_le is null),
    'tarifs_publies', (select count(*) from tarifs_publies t
                        where t.org_id = jwt_org()
                          and t.publie_le is not null and t.retire_le is null));
$function$;

revoke execute on function public.cmd_mon_reseau() from public, anon;
grant execute on function public.cmd_mon_reseau() to authenticated, service_role;
