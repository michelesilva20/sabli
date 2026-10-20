CREATE TABLE dining_tables (
  id UUID PRIMARY KEY,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  number INTEGER NOT NULL,
  name VARCHAR(80),
  seats INTEGER NOT NULL,
  area VARCHAR(80),
  layout_x INTEGER,
  layout_y INTEGER,
  availability VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT dining_tables_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT dining_tables_est_number_unique UNIQUE (establishment_id, number),
  CONSTRAINT dining_tables_number_check CHECK (number >= 1),
  CONSTRAINT dining_tables_seats_check CHECK (seats >= 1),
  CONSTRAINT dining_tables_availability_check
    CHECK (availability IN ('AVAILABLE', 'RESERVED', 'UNAVAILABLE')),
  CONSTRAINT dining_tables_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT dining_tables_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id)
);

CREATE TABLE table_services (
  id UUID PRIMARY KEY,
  table_id UUID NOT NULL,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  guest_count INTEGER NOT NULL,
  opened_by_user_id UUID NOT NULL,
  host_name VARCHAR(160) NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  requested_bill_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT table_services_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT table_services_status_check CHECK (status IN ('OPEN', 'AWAITING_BILL', 'CLOSED')),
  CONSTRAINT table_services_guest_check CHECK (guest_count >= 1),
  CONSTRAINT table_services_open_closed_at_check
    CHECK (
      (status = 'CLOSED' AND closed_at IS NOT NULL)
      OR (status IN ('OPEN', 'AWAITING_BILL') AND closed_at IS NULL)
    ),
  CONSTRAINT table_services_awaiting_bill_check
    CHECK (status <> 'AWAITING_BILL' OR requested_bill_at IS NOT NULL),
  CONSTRAINT table_services_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id),
  CONSTRAINT table_services_table_fk
    FOREIGN KEY (table_id, establishment_id)
    REFERENCES dining_tables (id, establishment_id),
  CONSTRAINT table_services_opened_by_fk
    FOREIGN KEY (opened_by_user_id)
    REFERENCES users (id)
);

CREATE UNIQUE INDEX table_services_one_active_per_table
  ON table_services (table_id)
  WHERE status IN ('OPEN', 'AWAITING_BILL');

CREATE INDEX idx_dining_tables_est ON dining_tables (establishment_id, status, number);
CREATE INDEX idx_dining_tables_area ON dining_tables (establishment_id, area);
CREATE INDEX idx_table_services_est ON table_services (establishment_id, opened_at DESC);
CREATE INDEX idx_table_services_table ON table_services (table_id, opened_at DESC);
CREATE INDEX idx_table_services_status ON table_services (establishment_id, status);
