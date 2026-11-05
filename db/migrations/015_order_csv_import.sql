-- Mencegah berkas impor pesanan yang sama membuat transaksi ganda pada cabang.
-- statement
CREATE UNIQUE INDEX IF NOT EXISTS laundry_order_import_branch_hash_uidx
  ON laundry_audit_events (branch_id, entity_id)
  WHERE action = 'orders.imported' AND entity_type = 'order_batch'
