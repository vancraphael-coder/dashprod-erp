-- 0147 — APPLIQUÉE ET VÉRIFIÉE le 27/08/2026.
-- LE POINTAGE DEVIENT INDIVIDUEL (choix A de Raphaël).
--
-- Jusqu'ici `chrono_sessions` portait un seul départ/arrivée par mission : tout
-- le chantier pointait ensemble. Le circuit a besoin des heures DE CHAQUE
-- MEMBRE (retard, panne au retour qui ne concerne qu'une partie de l'équipe).
-- On ajoute `utilisateur_id` : chacun pointe pour soi.
--
-- PRUDENCE : colonne NULLABLE. Les 32 sessions collectives existantes gardent
-- utilisateur_id null — lisibles comme « heures du chantier, non ventilées ».
-- On ne réécrit pas le passé. Vérifié après application : colonne présente,
-- index créé, sessions historiques intactes.

alter table public.chrono_sessions
  add column if not exists utilisateur_id uuid references public.utilisateurs(id);

create index if not exists chrono_sessions_membre_idx
  on public.chrono_sessions (mission_id, utilisateur_id)
  where type = 'travail' or type is null;
