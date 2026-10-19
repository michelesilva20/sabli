CREATE TABLE catalog_categories (
  id UUID PRIMARY KEY,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT catalog_categories_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT catalog_categories_est_slug_unique UNIQUE (establishment_id, slug),
  CONSTRAINT catalog_categories_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT catalog_categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT catalog_categories_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id)
);

CREATE TABLE catalog_products (
  id UUID PRIMARY KEY,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  category_id UUID NOT NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  kind VARCHAR(20) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT catalog_products_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT catalog_products_est_slug_unique UNIQUE (establishment_id, slug),
  CONSTRAINT catalog_products_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT catalog_products_kind_check CHECK (kind IN ('STANDARD', 'PIZZA')),
  CONSTRAINT catalog_products_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT catalog_products_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id),
  CONSTRAINT catalog_products_category_fk
    FOREIGN KEY (category_id, establishment_id)
    REFERENCES catalog_categories (id, establishment_id)
);

CREATE TABLE catalog_product_variants (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  name VARCHAR(80) NOT NULL,
  price_cents INTEGER NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT catalog_variants_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT catalog_variants_product_name_unique UNIQUE (product_id, name),
  CONSTRAINT catalog_variants_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT catalog_variants_price_check CHECK (price_cents >= 0),
  CONSTRAINT catalog_variants_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id),
  CONSTRAINT catalog_variants_product_fk
    FOREIGN KEY (product_id, establishment_id)
    REFERENCES catalog_products (id, establishment_id)
);

CREATE TABLE pizza_settings (
  establishment_id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  strategy VARCHAR(20) NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT pizza_settings_strategy_check CHECK (strategy IN ('HIGHEST', 'AVERAGE')),
  CONSTRAINT pizza_settings_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id)
);

CREATE TABLE pizza_sizes (
  id UUID PRIMARY KEY,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(80) NOT NULL,
  max_flavors INTEGER NOT NULL,
  slices INTEGER NOT NULL,
  price_factor_numerator INTEGER NOT NULL,
  price_factor_denominator INTEGER NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT pizza_sizes_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT pizza_sizes_est_code_unique UNIQUE (establishment_id, code),
  CONSTRAINT pizza_sizes_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pizza_sizes_code_format CHECK (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT pizza_sizes_max_flavors_check CHECK (max_flavors >= 1),
  CONSTRAINT pizza_sizes_slices_check CHECK (slices >= 1),
  CONSTRAINT pizza_sizes_factor_num_check CHECK (price_factor_numerator >= 0),
  CONSTRAINT pizza_sizes_factor_den_check CHECK (price_factor_denominator >= 1),
  CONSTRAINT pizza_sizes_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id)
);

CREATE TABLE pizza_flavors (
  id UUID PRIMARY KEY,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  available BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT pizza_flavors_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT pizza_flavors_est_slug_unique UNIQUE (establishment_id, slug),
  CONSTRAINT pizza_flavors_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pizza_flavors_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT pizza_flavors_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id)
);

CREATE TABLE pizza_flavor_prices (
  flavor_id UUID NOT NULL,
  size_id UUID NOT NULL,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  price_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (flavor_id, size_id),
  CONSTRAINT pizza_flavor_prices_price_check CHECK (price_cents >= 0),
  CONSTRAINT pizza_flavor_prices_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id),
  CONSTRAINT pizza_flavor_prices_flavor_fk
    FOREIGN KEY (flavor_id, establishment_id)
    REFERENCES pizza_flavors (id, establishment_id),
  CONSTRAINT pizza_flavor_prices_size_fk
    FOREIGN KEY (size_id, establishment_id)
    REFERENCES pizza_sizes (id, establishment_id)
);

CREATE TABLE pizza_crusts (
  id UUID PRIMARY KEY,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  price_cents INTEGER NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT pizza_crusts_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT pizza_crusts_est_slug_unique UNIQUE (establishment_id, slug),
  CONSTRAINT pizza_crusts_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pizza_crusts_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT pizza_crusts_price_check CHECK (price_cents >= 0),
  CONSTRAINT pizza_crusts_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id)
);

CREATE TABLE pizza_extras (
  id UUID PRIMARY KEY,
  establishment_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  price_cents INTEGER NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT pizza_extras_id_est_unique UNIQUE (id, establishment_id),
  CONSTRAINT pizza_extras_est_slug_unique UNIQUE (establishment_id, slug),
  CONSTRAINT pizza_extras_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  CONSTRAINT pizza_extras_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT pizza_extras_price_check CHECK (price_cents >= 0),
  CONSTRAINT pizza_extras_est_org_fk
    FOREIGN KEY (establishment_id, organization_id)
    REFERENCES establishments (id, organization_id)
);

CREATE INDEX idx_catalog_categories_est ON catalog_categories (establishment_id, status, sort_order);
CREATE INDEX idx_catalog_products_est ON catalog_products (establishment_id, status, available);
CREATE INDEX idx_catalog_products_category ON catalog_products (establishment_id, category_id);
CREATE INDEX idx_catalog_products_name ON catalog_products (establishment_id, name);
CREATE INDEX idx_catalog_variants_product ON catalog_product_variants (product_id, status);
CREATE INDEX idx_pizza_sizes_est ON pizza_sizes (establishment_id, status, sort_order);
CREATE INDEX idx_pizza_flavors_est ON pizza_flavors (establishment_id, status, sort_order);
CREATE INDEX idx_pizza_flavor_prices_est ON pizza_flavor_prices (establishment_id);
CREATE INDEX idx_pizza_crusts_est ON pizza_crusts (establishment_id, status, sort_order);
CREATE INDEX idx_pizza_extras_est ON pizza_extras (establishment_id, status, sort_order);
