-- Order adjustments, cancellation/refund ledger, and explicit owner branch scope.
-- statement
ALTER TABLE laundry_orders ADD COLUMN IF NOT EXISTS express_fee bigint NOT NULL DEFAULT 0 CHECK (express_fee >= 0)
-- statement
ALTER TABLE laundry_orders ADD COLUMN IF NOT EXISTS delivery_fee bigint NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0)
-- statement
ALTER TABLE laundry_orders ADD COLUMN IF NOT EXISTS discount_amount bigint NOT NULL DEFAULT 0 CHECK (discount_amount >= 0)
-- statement
ALTER TABLE laundry_orders DROP CONSTRAINT IF EXISTS laundry_orders_status_check
-- statement
ALTER TABLE laundry_orders ADD CONSTRAINT laundry_orders_status_check CHECK (status IN ('received', 'washing', 'drying', 'ironing', 'ready', 'completed', 'cancelled'))
-- statement
ALTER TABLE laundry_order_status_history DROP CONSTRAINT IF EXISTS laundry_order_status_history_previous_status_check
-- statement
ALTER TABLE laundry_order_status_history DROP CONSTRAINT IF EXISTS laundry_order_status_history_next_status_check
-- statement
ALTER TABLE laundry_order_status_history ADD CONSTRAINT laundry_order_status_history_previous_status_check CHECK (previous_status IS NULL OR previous_status IN ('received', 'washing', 'drying', 'ironing', 'ready', 'completed', 'cancelled'))
-- statement
ALTER TABLE laundry_order_status_history ADD CONSTRAINT laundry_order_status_history_next_status_check CHECK (next_status IN ('received', 'washing', 'drying', 'ironing', 'ready', 'completed', 'cancelled'))
-- statement
CREATE TABLE IF NOT EXISTS laundry_order_refunds (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id) ON DELETE CASCADE,
  order_id text NOT NULL REFERENCES laundry_orders(id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 300),
  method text NOT NULL CHECK (method IN ('cash', 'transfer', 'qris', 'other')),
  actor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
)
-- statement
CREATE INDEX IF NOT EXISTS laundry_order_refunds_branch_created_idx ON laundry_order_refunds (branch_id, created_at DESC)
-- statement
CREATE TABLE IF NOT EXISTS laundry_user_branch_access (
  user_id uuid NOT NULL REFERENCES laundry_users(id) ON DELETE CASCADE,
  branch_id text NOT NULL REFERENCES laundry_branches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, branch_id)
)
-- statement
INSERT INTO laundry_user_branch_access (user_id, branch_id)
SELECT id, branch_id FROM laundry_users ON CONFLICT DO NOTHING
-- statement
CREATE INDEX IF NOT EXISTS laundry_user_branch_access_branch_idx ON laundry_user_branch_access (branch_id, user_id)
