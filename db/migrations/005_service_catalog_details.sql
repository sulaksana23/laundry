-- Add editable service descriptions and estimated processing time.
-- statement
ALTER TABLE laundry_services
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT ''
-- statement
ALTER TABLE laundry_services
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 2880
  CHECK (duration_minutes BETWEEN 1 AND 43200)
-- statement
UPDATE laundry_services
SET description = CASE name
      WHEN 'Cuci + Setrika' THEN 'Cuci, keringkan, dan setrika pakaian.'
      WHEN 'Cuci Kering' THEN 'Cuci dan keringkan pakaian.'
      WHEN 'Setrika Saja' THEN 'Setrika pakaian bersih.'
      WHEN 'Express 6 Jam' THEN 'Prioritas selesai maksimal enam jam.'
      WHEN 'Bed cover' THEN 'Cuci khusus perlengkapan tidur.'
      WHEN 'Cuci sepatu' THEN 'Pembersihan sepatu per pasang.'
      ELSE 'Layanan laundry sesuai satuan ' || unit || '.'
    END,
    duration_minutes = CASE name
      WHEN 'Cuci + Setrika' THEN 2880
      WHEN 'Cuci Kering' THEN 1440
      WHEN 'Setrika Saja' THEN 1440
      WHEN 'Express 6 Jam' THEN 360
      WHEN 'Bed cover' THEN 2880
      WHEN 'Cuci sepatu' THEN 4320
      ELSE duration_minutes
    END
WHERE description = ''
