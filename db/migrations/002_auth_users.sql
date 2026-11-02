-- Authentication tables for owner accounts and branch isolation.
-- statement
CREATE TABLE IF NOT EXISTS laundry_users (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'owner' CHECK (role = 'owner'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
-- statement
CREATE UNIQUE INDEX IF NOT EXISTS laundry_users_email_lower_uidx ON laundry_users (lower(email))
-- statement
CREATE INDEX IF NOT EXISTS laundry_users_branch_idx ON laundry_users (branch_id)
