-- LaundryOS daily cash closing (tutup kasir): expected cash vs physically counted cash per branch and day.
-- statement
CREATE TABLE IF NOT EXISTS laundry_cash_closings (
  id uuid PRIMARY KEY,
  branch_id text NOT NULL REFERENCES laundry_branches(id) ON DELETE CASCADE,
  closing_date date NOT NULL,
  expected_amount bigint NOT NULL,
  counted_amount bigint NOT NULL CHECK (counted_amount >= 0),
  note text,
  closed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, closing_date)
);
-- statement
CREATE INDEX IF NOT EXISTS laundry_cash_closings_branch_date_idx
  ON laundry_cash_closings (branch_id, closing_date DESC);
