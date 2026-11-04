-- Resep pemakaian bahan per layanan dan tahap pengerjaan.
-- Nilai konsumsi mengikuti satuan pesanan layanan (kg, pcs, atau pasang).
-- statement
CREATE UNIQUE INDEX IF NOT EXISTS laundry_services_branch_id_id_uidx
  ON laundry_services (branch_id, id)
-- statement
CREATE UNIQUE INDEX IF NOT EXISTS laundry_inventory_items_branch_id_id_uidx
  ON laundry_inventory_items (branch_id, id)
-- statement
CREATE TABLE IF NOT EXISTS laundry_service_inventory_recipes (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  item_id uuid NOT NULL,
  consume_at_status text NOT NULL CHECK (consume_at_status IN ('washing', 'drying', 'ironing', 'ready', 'completed')),
  quantity_per_service_unit numeric(12, 3) NOT NULL CHECK (quantity_per_service_unit > 0),
  actor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, service_id, item_id, consume_at_status),
  CONSTRAINT laundry_service_inventory_recipes_branch_service_fk
    FOREIGN KEY (branch_id, service_id) REFERENCES laundry_services(branch_id, id) ON DELETE CASCADE,
  CONSTRAINT laundry_service_inventory_recipes_branch_item_fk
    FOREIGN KEY (branch_id, item_id) REFERENCES laundry_inventory_items(branch_id, id) ON DELETE CASCADE
)
-- statement
CREATE INDEX IF NOT EXISTS laundry_service_inventory_recipes_branch_service_idx
  ON laundry_service_inventory_recipes (branch_id, service_id, consume_at_status)
