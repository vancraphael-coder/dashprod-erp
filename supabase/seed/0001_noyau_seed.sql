-- Seed du noyau — capacités et rôles de référence (miroir de S3).
-- Idempotent : réexécutable sans doublon. Les barèmes tarifaires NE sont PAS
-- ici : ils attendent les grilles chiffrées du client (dépendance ouverte).

insert into capacites (cle, libelle, description) values
  ('voir_prix',          'Voir prix et marges',        'Accès aux montants et à la rentabilité'),
  ('creer_affaire',      'Créer/chiffrer une affaire', 'Création et chiffrage commercial'),
  ('valider_intake',     'Valider un intake terrain',  'Confirmer un dossier créé au terrain'),
  ('faire_signer',       'Faire signer une offre',     'Recueil de signature client'),
  ('gerer_planning',     'Gérer le planning',          'Affectation équipe et véhicules'),
  ('voir_paie',          'Voir la paie',               'Données salariales (cloisonnées)'),
  ('gerer_referentiels', 'Gérer les référentiels',     'Publier barèmes et paramètres'),
  ('emettre_facture',    'Émettre une facture',        'Création de facture légale'),
  ('signaler_materiel',  'Signaler matériel/véhicule', 'Remontée terrain'),
  ('demander_conge',     'Demander un congé',          'Ouverture d''une demande'),
  ('approuver_conge',    'Approuver un congé',         'Décision sur une demande')
on conflict (cle) do nothing;
