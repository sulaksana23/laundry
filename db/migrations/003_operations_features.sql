-- Payment ledger, branch inventory and expense tracking.
-- statement
CREATE TABLE IF NOT EXISTS laundry_payments (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id) ON DELETE CASCADE,
  order_id text NOT NULL REFERENCES laundry_orders(id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('cash', 'transfer', 'qris', 'other')),
  actor_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
)
-- statement
CREATE INDEX IF NOT EXISTS laundry_payments_branch_received_idx
  ON laundry_payments (branch_id, received_at DESC)
-- statement
CREATE INDEX IF NOT EXISTS laundry_payments_branch_order_idx
  ON laundry_payments (branch_id, order_id, received_at DESC)
-- statement
INSERT INTO laundry_payments (id, branch_id, order_id, amount, method, actor_id, received_at)
SELECT md5(o.id || ':legacy-payment')::uuid, o.branch_id, o.id, o.paid_amount, 'other', 'migration', o.received_at
FROM laundry_orders o
WHERE o.paid_amount > 0
ON CONFLICT (id) DO NOTHING
-- statement
CREATE TABLE IF NOT EXISTS laundry_inventory_items (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  unit text NOT NULL,
  quantity numeric(12, 3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity numeric(12, 3) NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  unit_price bigint NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT laundry_inventory_branch_name_unique UNIQUE (branch_id, name)
)
-- statement
CREATE INDEX IF NOT EXISTS laundry_inventory_branch_name_idx
  ON laundry_inventory_items (branch_id, name)
-- statement
CREATE TABLE IF NOT EXISTS laundry_expenses (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id) ON DELETE CASCADE,
  description text NOT NULL,
  category text NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('cash', 'transfer', 'qris', 'other')),
  incurred_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
)
-- statement
CREATE INDEX IF NOT EXISTS laundry_expenses_branch_date_idx
  ON laundry_expenses (branch_id, incurred_at DESC)
