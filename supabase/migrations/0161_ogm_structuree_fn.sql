-- 0161 — APPLIQUÉE ET VÉRIFIÉE le 29/08/2026.
-- LA COMMUNICATION STRUCTURÉE (OGM) EN SQL. Fidèle à facturation/ogm.js :
-- base AAAA+6 chiffres, contrôle mod 97 (0→97), +++XXX/XXXX/XXXXX+++.
-- Équivalence JS↔SQL vérifiée sur 4 cas dont la clé=97.

create or replace function ogm_structuree(p_annee integer, p_sequence integer)
returns text language plpgsql immutable as $$
declare
  v_base text := left(p_annee::text || lpad(p_sequence::text, 6, '0'), 10);
  v_controle integer := (v_base::bigint % 97);
  v_douze text;
begin
  if v_controle = 0 then v_controle := 97; end if;
  v_douze := v_base || lpad(v_controle::text, 2, '0');
  return '+++' || left(v_douze,3) || '/' || substr(v_douze,4,4)
         || '/' || substr(v_douze,8,5) || '+++';
end $$;
