-- One-time marker and canonical demo dataset seeder.
-- statement
CREATE TABLE IF NOT EXISTS laundry_demo_seed_runs (
  branch_id text PRIMARY KEY REFERENCES laundry_branches(id) ON DELETE CASCADE,
  seeded_at timestamptz NOT NULL DEFAULT now()
)
-- statement
CREATE OR REPLACE FUNCTION laundry_seed_demo_data(p_branch_id text, p_actor_id text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix text := 'DEMO-' || upper(left(p_branch_id, 8)) || '-';
  v_customer_1 uuid := gen_random_uuid();
  v_customer_2 uuid := gen_random_uuid();
  v_customer_3 uuid := gen_random_uuid();
  v_customer_4 uuid := gen_random_uuid();
  v_service_wash text;
  v_service_dry text;
  v_service_iron text;
  v_service_express text;
BEGIN
  INSERT INTO laundry_demo_seed_runs (branch_id)
  VALUES (p_branch_id)
  ON CONFLICT (branch_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM laundry_customers WHERE branch_id = p_branch_id)
     OR EXISTS (SELECT 1 FROM laundry_orders WHERE branch_id = p_branch_id)
     OR EXISTS (SELECT 1 FROM laundry_inventory_items WHERE branch_id = p_branch_id)
     OR EXISTS (SELECT 1 FROM laundry_expenses WHERE branch_id = p_branch_id) THEN
    DELETE FROM laundry_demo_seed_runs WHERE branch_id = p_branch_id;
    RETURN false;
  END IF;

  SELECT id INTO v_service_wash FROM laundry_services
    WHERE branch_id = p_branch_id AND name = 'Cuci + Setrika' AND is_active LIMIT 1;
  SELECT id INTO v_service_dry FROM laundry_services
    WHERE branch_id = p_branch_id AND name = 'Cuci Kering' AND is_active LIMIT 1;
  SELECT id INTO v_service_iron FROM laundry_services
    WHERE branch_id = p_branch_id AND name = 'Setrika Saja' AND is_active LIMIT 1;
  SELECT id INTO v_service_express FROM laundry_services
    WHERE branch_id = p_branch_id AND name = 'Express 6 Jam' AND is_active LIMIT 1;

  IF v_service_wash IS NULL OR v_service_dry IS NULL OR v_service_iron IS NULL OR v_service_express IS NULL THEN
    RAISE EXCEPTION 'Katalog layanan demo belum tersedia untuk cabang ini.';
  END IF;

  INSERT INTO laundry_customers (id, branch_id, name, phone) VALUES
    (v_customer_1, p_branch_id, 'Made Arya', '0812-0000-0001'),
    (v_customer_2, p_branch_id, 'Putu Dewi', '0812-0000-0002'),
    (v_customer_3, p_branch_id, 'Wayan Sari', '0812-0000-0003'),
    (v_customer_4, p_branch_id, 'Kadek Budi', '0812-0000-0004');

  INSERT INTO laundry_orders
    (id, branch_id, customer_id, service_id, service_name_snapshot, weight_kg, amount, paid_amount, status, due_at, received_at)
  VALUES
    (v_prefix || '001', p_branch_id, v_customer_1, v_service_wash, 'Cuci + Setrika', 4.5, 36000, 36000, 'ready', CURRENT_DATE, now() - interval '5 hours'),
    (v_prefix || '002', p_branch_id, v_customer_2, v_service_dry, 'Cuci Kering', 3, 18000, 10000, 'washing', CURRENT_DATE + 1, now() - interval '4 hours'),
    (v_prefix || '003', p_branch_id, v_customer_3, v_service_iron, 'Setrika Saja', 2.5, 20000, 0, 'ironing', CURRENT_DATE + 2, now() - interval '30 hours'),
    (v_prefix || '004', p_branch_id, v_customer_1, v_service_wash, 'Cuci + Setrika', 6, 48000, 48000, 'completed', CURRENT_DATE - 1, now() - interval '48 hours'),
    (v_prefix || '005', p_branch_id, v_customer_4, v_service_express, 'Express 6 Jam', 2, 24000, 0, 'received', CURRENT_DATE, now() - interval '2 hours'),
    (v_prefix || '006', p_branch_id, v_customer_2, v_service_dry, 'Cuci Kering', 5, 30000, 0, 'received', CURRENT_DATE + 2, now() - interval '20 hours');

  INSERT INTO laundry_order_status_history
    (id, branch_id, order_id, previous_status, next_status, actor_id, changed_at)
  SELECT gen_random_uuid(), p_branch_id, o.id, NULL, o.status, p_actor_id, o.received_at
  FROM laundry_orders o
  WHERE o.branch_id = p_branch_id AND o.id LIKE v_prefix || '%';

  INSERT INTO laundry_payments (id, branch_id, order_id, amount, method, actor_id, received_at)
  SELECT gen_random_uuid(), p_branch_id, o.id, o.paid_amount,
    CASE WHEN o.id = v_prefix || '001' THEN 'cash' ELSE 'transfer' END,
    p_actor_id, o.received_at + interval '1 hour'
  FROM laundry_orders o
  WHERE o.branch_id = p_branch_id AND o.id LIKE v_prefix || '%' AND o.paid_amount > 0;

  INSERT INTO laundry_inventory_items
    (id, branch_id, name, category, unit, quantity, min_quantity, unit_price)
  VALUES
    (gen_random_uuid(), p_branch_id, 'Detergen cair', 'Bahan cuci', 'liter', 8, 10, 42000),
    (gen_random_uuid(), p_branch_id, 'Pewangi laundry', 'Bahan cuci', 'liter', 14, 8, 38000),
    (gen_random_uuid(), p_branch_id, 'Plastik kemasan M', 'Kemasan', 'pak', 6, 5, 27000),
    (gen_random_uuid(), p_branch_id, 'Plastik kemasan L', 'Kemasan', 'pak', 3, 5, 35000),
    (gen_random_uuid(), p_branch_id, 'Pelembut pakaian', 'Bahan cuci', 'liter', 11, 8, 36000);

  INSERT INTO laundry_expenses (id, branch_id, description, category, amount, method, incurred_at)
  VALUES
    (gen_random_uuid(), p_branch_id, 'Pembelian detergen', 'Bahan baku', 210000, 'cash', CURRENT_DATE),
    (gen_random_uuid(), p_branch_id, 'Tagihan listrik', 'Utilitas', 785000, 'transfer', CURRENT_DATE - 1),
    (gen_random_uuid(), p_branch_id, 'Perawatan mesin', 'Perawatan', 325000, 'cash', CURRENT_DATE - 2);

  RETURN true;
END;
$$
