-- Peran staf, status akun, audit aktivitas, dan ledger perubahan stok.
-- statement
ALTER TABLE laundry_users DROP CONSTRAINT IF EXISTS laundry_users_role_check
-- statement
ALTER TABLE laundry_users ADD CONSTRAINT laundry_users_role_check CHECK (role IN ('owner', 'cashier', 'operator'))
-- statement
ALTER TABLE laundry_users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true
-- statement
CREATE TABLE IF NOT EXISTS laundry_audit_events (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
)
-- statement
CREATE INDEX IF NOT EXISTS laundry_audit_branch_created_idx ON laundry_audit_events (branch_id, created_at DESC)
-- statement
CREATE INDEX IF NOT EXISTS laundry_audit_entity_idx ON laundry_audit_events (branch_id, entity_type, entity_id, created_at DESC)
-- statement
CREATE TABLE IF NOT EXISTS laundry_inventory_movements (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES laundry_inventory_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('opening', 'purchase', 'adjustment', 'usage')),
  quantity_delta numeric(12, 3) NOT NULL CHECK (quantity_delta <> 0),
  note text NOT NULL,
  actor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
)
-- statement
CREATE INDEX IF NOT EXISTS laundry_inventory_movements_branch_created_idx ON laundry_inventory_movements (branch_id, created_at DESC)
-- statement
CREATE INDEX IF NOT EXISTS laundry_inventory_movements_item_created_idx ON laundry_inventory_movements (branch_id, item_id, created_at DESC)
-- statement
INSERT INTO laundry_inventory_movements (id, branch_id, item_id, movement_type, quantity_delta, note, actor_id, created_at)
SELECT md5(item.id::text || ':opening-ledger')::uuid, item.branch_id, item.id, 'opening', item.quantity, 'Saldo awal sebelum riwayat stok diaktifkan', 'migration', item.created_at
FROM laundry_inventory_items item WHERE item.quantity <> 0
ON CONFLICT (id) DO NOTHING
-- statement
CREATE OR REPLACE FUNCTION laundry_record_missing_inventory_baseline() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO laundry_inventory_movements (id, branch_id, item_id, movement_type, quantity_delta, note, actor_id, created_at)
  SELECT md5(item.id::text || ':restore-baseline:' || now()::text)::uuid, item.branch_id, item.id,
    'opening', item.quantity, 'Saldo awal setelah pemulihan backup', 'restore', now()
  FROM laundry_inventory_items item
  WHERE item.branch_id = NEW.id AND item.quantity <> 0
    AND NOT EXISTS (SELECT 1 FROM laundry_inventory_movements movement WHERE movement.item_id = item.id AND movement.branch_id = item.branch_id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$
-- statement
DROP TRIGGER IF EXISTS laundry_branch_inventory_restore_baseline ON laundry_branches
-- statement
CREATE TRIGGER laundry_branch_inventory_restore_baseline AFTER UPDATE OF name, timezone, phone, email, address ON laundry_branches
FOR EACH ROW EXECUTE FUNCTION laundry_record_missing_inventory_baseline()
