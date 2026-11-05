-- Catatan operasional internal saat menerima cucian; kolom ini tidak dipakai pelacakan publik.
-- statement
ALTER TABLE laundry_orders
  ADD COLUMN IF NOT EXISTS internal_note text NOT NULL DEFAULT ''
-- statement
ALTER TABLE laundry_orders
  ADD CONSTRAINT laundry_orders_internal_note_length_check
  CHECK (char_length(internal_note) <= 500)
