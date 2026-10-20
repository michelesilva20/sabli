CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  email_normalized VARCHAR(320) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  name VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT users_email_normalized_unique UNIQUE (email_normalized),
  CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT users_failed_login_attempts_check CHECK (failed_login_attempts >= 0)
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT organizations_slug_unique UNIQUE (slug),
  CONSTRAINT organizations_status_check CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INACTIVE')),
  CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE establishments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations (id),
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT establishments_org_slug_unique UNIQUE (organization_id, slug),
  CONSTRAINT establishments_id_org_unique UNIQUE (id, organization_id),
  CONSTRAINT establishments_status_check CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INACTIVE')),
  CONSTRAINT establishments_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations (id),
  user_id UUID NOT NULL REFERENCES users (id),
  role VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT organization_memberships_unique UNIQUE (organization_id, user_id),
  CONSTRAINT organization_memberships_role_check CHECK (role IN ('ADMIN', 'MANAGER')),
  CONSTRAINT organization_memberships_status_check CHECK (status IN ('ACTIVE', 'REVOKED'))
);

CREATE TABLE establishment_memberships (
  id UUID PRIMARY KEY,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users (id),
  role VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT establishment_memberships_unique UNIQUE (establishment_id, user_id),
  CONSTRAINT establishment_memberships_role_check
    CHECK (role IN ('ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN')),
  CONSTRAINT establishment_memberships_status_check CHECK (status IN ('ACTIVE', 'REVOKED')),
  CONSTRAINT establishment_memberships_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id)
);

CREATE TABLE refresh_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id),
  token_hash VARCHAR(64) NOT NULL,
  family_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by UUID REFERENCES refresh_sessions (id),
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT refresh_sessions_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX idx_org_memberships_user ON organization_memberships (user_id);
CREATE INDEX idx_est_memberships_user ON establishment_memberships (user_id);
CREATE INDEX idx_est_memberships_org ON establishment_memberships (organization_id);
CREATE INDEX idx_refresh_sessions_user ON refresh_sessions (user_id);
CREATE INDEX idx_refresh_sessions_family ON refresh_sessions (family_id);
CREATE INDEX idx_establishments_org ON establishments (organization_id);
