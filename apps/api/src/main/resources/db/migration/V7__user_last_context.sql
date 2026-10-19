ALTER TABLE users
  ADD COLUMN last_organization_id UUID,
  ADD COLUMN last_establishment_id UUID;

CREATE INDEX users_last_establishment_id_idx ON users (last_establishment_id);
