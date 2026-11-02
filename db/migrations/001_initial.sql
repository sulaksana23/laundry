-- LaundryOS initial schema: order persistence for protected preview and local development.
-- statement
CREATE TABLE IF NOT EXISTS laundry_schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)
-- statement
CREATE TABLE IF NOT EXISTS laundry_branches (
  id text PRIMARY KEY,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Makassar',
  created_at timestamptz NOT NULL DEFAULT now()
)
-- statement
CREATE TABLE IF NOT EXISTS laundry_customers (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id),
  name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT laundry_customers_branch_phone_unique UNIQUE (branch_id, phone)
)
-- statement
CREATE TABLE IF NOT EXISTS laundry_services (
  id text PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id),
  name text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('kg', 'pcs', 'pasang')),
  price_per_unit bigint NOT NULL CHECK (price_per_unit >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT laundry_services_branch_name_unique UNIQUE (branch_id, name)
)
-- statement
CREATE TABLE IF NOT EXISTS laundry_orders (
  id text PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id),
  customer_id uuid NOT NULL REFERENCES laundry_customers(id),
  service_id text NOT NULL REFERENCES laundry_services(id),
  service_name_snapshot text NOT NULL,
  weight_kg numeric(8, 2) NOT NULL CHECK (weight_kg > 0),
  amount bigint NOT NULL CHECK (amount >= 0),
  paid_amount bigint NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status text NOT NULL CHECK (status IN ('received', 'washing', 'drying', 'ironing', 'ready', 'completed')),
  due_at date NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
-- statement
CREATE TABLE IF NOT EXISTS laundry_order_status_history (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id),
  order_id text NOT NULL REFERENCES laundry_orders(id),
  previous_status text CHECK (previous_status IS NULL OR previous_status IN ('received', 'washing', 'drying', 'ironing', 'ready', 'completed')),
  next_status text NOT NULL CHECK (next_status IN ('received', 'washing', 'drying', 'ironing', 'ready', 'completed')),
  actor_id text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
)
-- statement
CREATE INDEX IF NOT EXISTS laundry_orders_branch_received_idx ON laundry_orders (branch_id, received_at DESC)
-- statement
CREATE INDEX IF NOT EXISTS laundry_orders_branch_status_due_idx ON laundry_orders (branch_id, status, due_at)
-- statement
CREATE INDEX IF NOT EXISTS laundry_orders_branch_customer_idx ON laundry_orders (branch_id, customer_id, received_at DESC)
-- statement
INSERT INTO laundry_branches (id, name, timezone)
VALUES ('main', 'Cabang Utama (Demo)', 'Asia/Makassar')
ON CONFLICT (id) DO NOTHING
-- statement
INSERT INTO laundry_services (id, branch_id, name, unit, price_per_unit)
VALUES
  ('svc-wash-iron', 'main', 'Cuci + Setrika', 'kg', 8000),
  ('svc-dry', 'main', 'Cuci Kering', 'kg', 6000),
  ('svc-iron', 'main', 'Setrika Saja', 'kg', 8000),
  ('svc-express', 'main', 'Express 6 Jam', 'kg', 12000),
  ('svc-bedcover', 'main', 'Bed cover', 'pcs', 25000),
  ('svc-shoes', 'main', 'Cuci sepatu', 'pasang', 35000)
ON CONFLICT (branch_id, name) DO NOTHING