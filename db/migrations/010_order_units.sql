-- Pesanan dapat ditagihkan berdasarkan kilogram, buah, atau pasang.
-- Nilai historis (amount) tidak dihitung ulang.
-- statement
ALTER TABLE laundry_orders DROP CONSTRAINT IF EXISTS laundry_orders_weight_kg_check
-- statement
ALTER TABLE laundry_orders ADD COLUMN IF NOT EXISTS quantity numeric(10, 3)
-- statement
ALTER TABLE laundry_orders ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'kg'
-- statement
ALTER TABLE laundry_orders ADD COLUMN IF NOT EXISTS unit_price_snapshot bigint
-- statement
UPDATE laundry_orders SET quantity = weight_kg, unit_price_snapshot = round(amount::numeric / NULLIF(weight_kg, 0))::bigint
-- statement
CREATE OR REPLACE FUNCTION laundry_orders_legacy_unit_defaults() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quantity IS NULL THEN
    NEW.quantity := NEW.weight_kg;
    NEW.unit := 'kg';
    NEW.unit_price_snapshot := CASE WHEN NEW.weight_kg > 0 THEN round(NEW.amount::numeric / NEW.weight_kg)::bigint ELSE 0 END;
  END IF;
  RETURN NEW;
END;
$$
-- statement
DROP TRIGGER IF EXISTS laundry_orders_legacy_unit_defaults_trigger ON laundry_orders
-- statement
CREATE TRIGGER laundry_orders_legacy_unit_defaults_trigger BEFORE INSERT ON laundry_orders
FOR EACH ROW EXECUTE FUNCTION laundry_orders_legacy_unit_defaults()
-- statement
ALTER TABLE laundry_orders ALTER COLUMN quantity SET NOT NULL
-- statement
ALTER TABLE laundry_orders ALTER COLUMN unit_price_snapshot SET NOT NULL
-- statement
ALTER TABLE laundry_orders ADD CONSTRAINT laundry_orders_weight_kg_check CHECK (weight_kg >= 0)
-- statement
ALTER TABLE laundry_orders ADD CONSTRAINT laundry_orders_unit_check CHECK (unit IN ('kg', 'pcs', 'pasang'))
-- statement
ALTER TABLE laundry_orders ADD CONSTRAINT laundry_orders_quantity_check CHECK (quantity > 0 AND (unit = 'kg' OR quantity = trunc(quantity)))
-- statement
ALTER TABLE laundry_orders ADD CONSTRAINT laundry_orders_weight_unit_check CHECK ((unit = 'kg' AND weight_kg = quantity) OR (unit <> 'kg' AND weight_kg = 0))
-- statement
CREATE INDEX IF NOT EXISTS laundry_orders_branch_unit_received_idx ON laundry_orders (branch_id, unit, received_at DESC)
