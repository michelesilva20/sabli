CREATE TABLE order_counters (
  establishment_id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT order_counters_last_number_check CHECK (last_number >= 0),
  CONSTRAINT order_counters_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id)
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  table_id UUID,
  table_service_id UUID,
  channel VARCHAR(20) NOT NULL,
  number INTEGER NOT NULL,
  placed_by_user_id UUID NOT NULL,
  placed_by_name VARCHAR(160) NOT NULL,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  commercial_status VARCHAR(20) NOT NULL,
  production_status VARCHAR(20) NOT NULL,
  idempotency_key VARCHAR(80) NOT NULL,
  idempotency_hash CHAR(64) NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT orders_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT orders_est_number_unique UNIQUE (establishment_id, number),
  CONSTRAINT orders_idempotency_unique UNIQUE (establishment_id, placed_by_user_id, idempotency_key),
  CONSTRAINT orders_channel_check CHECK (channel IN ('TABLE', 'COUNTER')),
  CONSTRAINT orders_commercial_check CHECK (commercial_status IN ('CONFIRMED')),
  CONSTRAINT orders_production_check
    CHECK (production_status IN ('WAITING', 'PREPARING', 'READY', 'DELIVERED')),
  CONSTRAINT orders_number_check CHECK (number >= 1),
  CONSTRAINT orders_money_check
    CHECK (subtotal_cents >= 0 AND discount_cents >= 0 AND total_cents >= 0 AND total_cents = subtotal_cents - discount_cents),
  CONSTRAINT orders_channel_table_check
    CHECK (
      (channel = 'TABLE' AND table_service_id IS NOT NULL AND table_id IS NOT NULL)
      OR (channel = 'COUNTER' AND table_service_id IS NULL AND table_id IS NULL)
    ),
  CONSTRAINT orders_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id),
  CONSTRAINT orders_table_fk
    FOREIGN KEY (table_id, establishment_id)
    REFERENCES dining_tables (id, establishment_id),
  CONSTRAINT orders_service_fk
    FOREIGN KEY (table_service_id, establishment_id)
    REFERENCES table_services (id, establishment_id),
  CONSTRAINT orders_placed_by_fk
    FOREIGN KEY (placed_by_user_id)
    REFERENCES users (id)
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  sort_order INTEGER NOT NULL,
  kind VARCHAR(20) NOT NULL,
  product_id UUID,
  product_name VARCHAR(160) NOT NULL,
  variant_id UUID,
  variant_name VARCHAR(80) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  pizza_size_id UUID,
  pizza_size_code VARCHAR(80),
  pizza_size_name VARCHAR(80),
  pizza_strategy VARCHAR(20),
  pizza_crust_id UUID,
  pizza_crust_name VARCHAR(80),
  pizza_crust_cents INTEGER,
  CONSTRAINT order_items_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT order_items_kind_check CHECK (kind IN ('STANDARD', 'PIZZA')),
  CONSTRAINT order_items_qty_check CHECK (quantity >= 1),
  CONSTRAINT order_items_money_check
    CHECK (
      unit_price_cents >= 0
      AND line_total_cents >= 0
      AND line_total_cents = unit_price_cents * quantity
    ),
  CONSTRAINT order_items_crust_money_check CHECK (pizza_crust_cents IS NULL OR pizza_crust_cents >= 0),
  CONSTRAINT order_items_strategy_check
    CHECK (pizza_strategy IS NULL OR pizza_strategy IN ('HIGHEST', 'AVERAGE')),
  CONSTRAINT order_items_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id),
  CONSTRAINT order_items_order_fk
    FOREIGN KEY (order_id, establishment_id)
    REFERENCES orders (id, establishment_id)
);

CREATE TABLE order_item_pizza_flavors (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL,
  establishment_id UUID NOT NULL,
  position INTEGER NOT NULL,
  flavor_id UUID,
  flavor_name VARCHAR(120) NOT NULL,
  price_cents INTEGER NOT NULL,
  numerator INTEGER NOT NULL,
  denominator INTEGER NOT NULL,
  CONSTRAINT order_item_flavors_item_pos_unique UNIQUE (item_id, position),
  CONSTRAINT order_item_flavors_money_check CHECK (price_cents >= 0),
  CONSTRAINT order_item_flavors_fraction_check CHECK (numerator >= 1 AND denominator >= 1),
  CONSTRAINT order_item_flavors_item_fk
    FOREIGN KEY (item_id, establishment_id)
    REFERENCES order_items (id, establishment_id)
);

CREATE TABLE order_item_modifiers (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL,
  establishment_id UUID NOT NULL,
  position INTEGER NOT NULL,
  extra_id UUID,
  extra_name VARCHAR(80) NOT NULL,
  price_cents INTEGER NOT NULL,
  CONSTRAINT order_item_modifiers_item_pos_unique UNIQUE (item_id, position),
  CONSTRAINT order_item_modifiers_money_check CHECK (price_cents >= 0),
  CONSTRAINT order_item_modifiers_item_fk
    FOREIGN KEY (item_id, establishment_id)
    REFERENCES order_items (id, establishment_id)
);

CREATE TABLE kitchen_tickets (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  number INTEGER NOT NULL,
  origin VARCHAR(80) NOT NULL,
  production_status VARCHAR(20) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT kitchen_tickets_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT kitchen_tickets_order_unique UNIQUE (order_id),
  CONSTRAINT kitchen_tickets_production_check
    CHECK (production_status IN ('WAITING', 'PREPARING', 'READY', 'DELIVERED')),
  CONSTRAINT kitchen_tickets_priority_check CHECK (priority IN ('NORMAL', 'HIGH')),
  CONSTRAINT kitchen_tickets_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id),
  CONSTRAINT kitchen_tickets_order_fk
    FOREIGN KEY (order_id, establishment_id)
    REFERENCES orders (id, establishment_id)
);

CREATE TABLE kitchen_ticket_items (
  id UUID PRIMARY KEY,
  ticket_id UUID NOT NULL,
  order_item_id UUID NOT NULL,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  production_status VARCHAR(20) NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT kitchen_ticket_items_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT kitchen_ticket_items_order_item_unique UNIQUE (order_item_id),
  CONSTRAINT kitchen_ticket_items_ticket_item_unique UNIQUE (ticket_id, order_item_id),
  CONSTRAINT kitchen_ticket_items_production_check
    CHECK (production_status IN ('WAITING', 'PREPARING', 'READY', 'DELIVERED')),
  CONSTRAINT kitchen_ticket_items_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id),
  CONSTRAINT kitchen_ticket_items_ticket_fk
    FOREIGN KEY (ticket_id, establishment_id)
    REFERENCES kitchen_tickets (id, establishment_id),
  CONSTRAINT kitchen_ticket_items_order_item_fk
    FOREIGN KEY (order_item_id, establishment_id)
    REFERENCES order_items (id, establishment_id)
);

CREATE INDEX idx_orders_est ON orders (establishment_id, placed_at DESC);
CREATE INDEX idx_orders_service ON orders (table_service_id, placed_at DESC);
CREATE INDEX idx_orders_production ON orders (establishment_id, production_status);
CREATE INDEX idx_order_items_order ON order_items (order_id, sort_order);
CREATE INDEX idx_order_item_flavors_item ON order_item_pizza_flavors (item_id, position);
CREATE INDEX idx_order_item_modifiers_item ON order_item_modifiers (item_id, position);
CREATE INDEX idx_kitchen_tickets_est ON kitchen_tickets (establishment_id, created_at DESC);
CREATE INDEX idx_kitchen_ticket_items_ticket ON kitchen_ticket_items (ticket_id);
