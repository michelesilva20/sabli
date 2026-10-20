ALTER TABLE table_services
  ADD COLUMN billing_started BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE bills (
  id UUID PRIMARY KEY,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  kind VARCHAR(20) NOT NULL,
  table_id UUID,
  table_service_id UUID,
  order_id UUID,
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  paid_cents INTEGER NOT NULL DEFAULT 0,
  remaining_cents INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  settled_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bills_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT bills_kind_check CHECK (kind IN ('TABLE', 'COUNTER')),
  CONSTRAINT bills_status_check CHECK (status IN ('OPEN', 'PARTIALLY_PAID', 'SETTLED')),
  CONSTRAINT bills_channel_check CHECK (
    (kind = 'TABLE' AND table_service_id IS NOT NULL AND table_id IS NOT NULL AND order_id IS NULL)
    OR (kind = 'COUNTER' AND order_id IS NOT NULL AND table_service_id IS NULL AND table_id IS NULL)
  ),
  CONSTRAINT bills_money_check CHECK (
    subtotal_cents >= 0
    AND discount_cents >= 0
    AND paid_cents >= 0
    AND remaining_cents >= 0
    AND total_cents = subtotal_cents - discount_cents
    AND remaining_cents = total_cents - paid_cents
  ),
  CONSTRAINT bills_settled_check CHECK (
    (status = 'SETTLED' AND remaining_cents = 0 AND settled_at IS NOT NULL)
    OR (status <> 'SETTLED' AND settled_at IS NULL)
  ),
  CONSTRAINT bills_service_unique UNIQUE (table_service_id),
  CONSTRAINT bills_order_unique UNIQUE (order_id),
  CONSTRAINT bills_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id),
  CONSTRAINT bills_table_fk
    FOREIGN KEY (table_id, establishment_id)
    REFERENCES dining_tables (id, establishment_id),
  CONSTRAINT bills_service_fk
    FOREIGN KEY (table_service_id, establishment_id)
    REFERENCES table_services (id, establishment_id),
  CONSTRAINT bills_order_fk
    FOREIGN KEY (order_id, establishment_id)
    REFERENCES orders (id, establishment_id)
);

CREATE TABLE cash_sessions (
  id UUID PRIMARY KEY,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  scope VARCHAR(20) NOT NULL DEFAULT 'ESTABLISHMENT',
  opened_by_user_id UUID NOT NULL,
  opened_by_name VARCHAR(160) NOT NULL,
  opening_float_cents INTEGER NOT NULL,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  closed_by_user_id UUID,
  closed_by_name VARCHAR(160),
  expected_cash_cents INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT cash_sessions_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT cash_sessions_scope_check CHECK (scope = 'ESTABLISHMENT'),
  CONSTRAINT cash_sessions_status_check CHECK (status IN ('OPEN', 'CLOSED')),
  CONSTRAINT cash_sessions_float_check CHECK (opening_float_cents >= 0 AND expected_cash_cents >= 0),
  CONSTRAINT cash_sessions_closed_check CHECK (
    (status = 'CLOSED' AND closed_at IS NOT NULL AND closed_by_user_id IS NOT NULL)
    OR (status = 'OPEN' AND closed_at IS NULL AND closed_by_user_id IS NULL)
  ),
  CONSTRAINT cash_sessions_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id),
  CONSTRAINT cash_sessions_opened_by_fk
    FOREIGN KEY (opened_by_user_id)
    REFERENCES users (id),
  CONSTRAINT cash_sessions_closed_by_fk
    FOREIGN KEY (closed_by_user_id)
    REFERENCES users (id)
);

CREATE UNIQUE INDEX cash_sessions_one_open
  ON cash_sessions (establishment_id)
  WHERE status = 'OPEN';

CREATE TABLE bill_payments (
  id UUID PRIMARY KEY,
  bill_id UUID NOT NULL,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  cash_session_id UUID NOT NULL,
  method VARCHAR(20) NOT NULL,
  capture_kind VARCHAR(30) NOT NULL,
  tendered_cents INTEGER NOT NULL,
  applied_cents INTEGER NOT NULL,
  change_cents INTEGER NOT NULL,
  recorded_by_user_id UUID NOT NULL,
  recorded_by_name VARCHAR(160) NOT NULL,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  idempotency_key VARCHAR(80) NOT NULL,
  idempotency_hash CHAR(64) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT bill_payments_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT bill_payments_idempotency_unique UNIQUE (establishment_id, recorded_by_user_id, idempotency_key),
  CONSTRAINT bill_payments_method_check CHECK (method IN ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD')),
  CONSTRAINT bill_payments_capture_check CHECK (capture_kind = 'MANUAL_DECLARED'),
  CONSTRAINT bill_payments_money_check CHECK (
    tendered_cents >= 1
    AND applied_cents >= 1
    AND change_cents >= 0
    AND (
      (method = 'CASH' AND applied_cents + change_cents = tendered_cents)
      OR (method <> 'CASH' AND change_cents = 0 AND applied_cents = tendered_cents)
    )
  ),
  CONSTRAINT bill_payments_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id),
  CONSTRAINT bill_payments_bill_fk
    FOREIGN KEY (bill_id, establishment_id)
    REFERENCES bills (id, establishment_id),
  CONSTRAINT bill_payments_session_fk
    FOREIGN KEY (cash_session_id, establishment_id)
    REFERENCES cash_sessions (id, establishment_id),
  CONSTRAINT bill_payments_recorded_by_fk
    FOREIGN KEY (recorded_by_user_id)
    REFERENCES users (id)
);

CREATE TABLE cash_movements (
  id UUID PRIMARY KEY,
  cash_session_id UUID NOT NULL,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL,
  method VARCHAR(20),
  amount_cents INTEGER NOT NULL,
  payment_id UUID,
  recorded_by_user_id UUID NOT NULL,
  recorded_by_name VARCHAR(160) NOT NULL,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT cash_movements_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT cash_movements_payment_unique UNIQUE (payment_id),
  CONSTRAINT cash_movements_type_check CHECK (type IN ('OPENING', 'SALE', 'SUPPLY', 'BLEED')),
  CONSTRAINT cash_movements_amount_check CHECK (amount_cents >= 0),
  CONSTRAINT cash_movements_shape_check CHECK (
    (type = 'SALE' AND payment_id IS NOT NULL AND method IN ('CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD') AND amount_cents >= 1)
    OR (type = 'OPENING' AND payment_id IS NULL AND method IS NULL)
    OR (type IN ('SUPPLY', 'BLEED') AND payment_id IS NULL AND method IS NULL AND amount_cents >= 1)
  ),
  CONSTRAINT cash_movements_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id),
  CONSTRAINT cash_movements_session_fk
    FOREIGN KEY (cash_session_id, establishment_id)
    REFERENCES cash_sessions (id, establishment_id),
  CONSTRAINT cash_movements_payment_fk
    FOREIGN KEY (payment_id, establishment_id)
    REFERENCES bill_payments (id, establishment_id)
);

CREATE INDEX idx_bills_est ON bills (establishment_id, created_at DESC);
CREATE INDEX idx_bills_service ON bills (table_service_id);
CREATE INDEX idx_bills_order ON bills (order_id);
CREATE INDEX idx_bill_payments_bill ON bill_payments (bill_id, recorded_at);
CREATE INDEX idx_cash_sessions_est ON cash_sessions (establishment_id, opened_at DESC);
CREATE INDEX idx_cash_movements_session ON cash_movements (cash_session_id, recorded_at);
