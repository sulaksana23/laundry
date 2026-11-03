-- LaundryOS Pro license activation: one license key per branch.
-- statement
CREATE TABLE IF NOT EXISTS laundry_licenses (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL UNIQUE REFERENCES laundry_branches(id) ON DELETE CASCADE,
  license_key text NOT NULL,
  holder_name text NOT NULL,
  holder_email text,
  plan text NOT NULL DEFAULT 'pro',
  expires_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
