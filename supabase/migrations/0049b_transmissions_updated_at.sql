-- Correctif de 0049 : touch_updated_at() écrit new.updated_at. La colonne
-- s'appelait maj_le, donc tout UPDATE sur transmissions aurait échoué avec
-- « record "new" has no field "updated_at" ». On aligne sur la convention
-- du reste du schéma plutôt que d'écrire un second trigger.
alter table public.transmissions rename column maj_le to updated_at;
