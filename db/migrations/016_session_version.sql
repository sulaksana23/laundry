-- Versi sesi per pengguna. Token sesi membawa versi ini; menaikkannya
-- (misalnya saat logout) membatalkan semua sesi lama pengguna tersebut.
-- statement
ALTER TABLE laundry_users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0
