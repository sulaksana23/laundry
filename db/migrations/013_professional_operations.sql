-- Shared rate limits, inventory cost snapshots, and manual bank/QRIS reconciliation.
-- statement
CREATE TABLE IF NOT EXISTS laundry_rate_limits (
  key_hash text PRIMARY KEY,
  attempts smallint NOT NULL CHECK (attempts >= 0),
  window_started_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
)
-- statement
CREATE INDEX IF NOT EXISTS laundry_rate_limits_updated_idx ON laundry_rate_limits (updated_at)
-- statement
ALTER TABLE laundry_inventory_items ADD COLUMN IF NOT EXISTS cost_basis_confirmed boolean NOT NULL DEFAULT false
-- statement
UPDATE laundry_inventory_items SET cost_basis_confirmed = true WHERE unit_price > 0 AND cost_basis_confirmed = false
-- statement
ALTER TABLE laundry_inventory_movements ADD COLUMN IF NOT EXISTS cost_amount bigint CHECK (cost_amount IS NULL OR cost_amount >= 0)
-- statement
ALTER TABLE laundry_inventory_movements ADD COLUMN IF NOT EXISTS order_id text
-- statement
CREATE INDEX IF NOT EXISTS laundry_inventory_movements_order_idx ON laundry_inventory_movements (branch_id, order_id) WHERE order_id IS NOT NULL
-- statement
CREATE TABLE IF NOT EXISTS laundry_reconciliation_imports (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id) ON DELETE CASCADE,
  file_hash text NOT NULL,
  file_name text NOT NULL,
  actor_id text NOT NULL,
  row_count integer NOT NULL CHECK (row_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, file_hash)
)
-- statement
CREATE TABLE IF NOT EXISTS laundry_reconciliation_rows (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES laundry_reconciliation_imports(id) ON DELETE CASCADE,
  line_number integer NOT NULL CHECK (line_number > 0),
  transaction_at timestamptz NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('transfer', 'qris')),
  reference text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'ignored')),
  matched_payment_id uuid REFERENCES laundry_payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_id, line_number),
  UNIQUE (matched_payment_id)
)
-- statement
CREATE INDEX IF NOT EXISTS laundry_reconciliation_rows_branch_status_idx ON laundry_reconciliation_rows (branch_id, status, transaction_at DESC)
-- statement
CREATE INDEX IF NOT EXISTS laundry_reconciliation_rows_import_idx ON laundry_reconciliation_rows (import_id, line_number)
-- statement
CREATE INDEX IF NOT EXISTS laundry_payments_reconciliation_idx ON laundry_payments (branch_id, method, amount, received_at DESC)
