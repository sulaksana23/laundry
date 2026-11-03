-- LaundryOS branch business profile: contact details shown on receipts and used in settings.
-- statement
ALTER TABLE laundry_branches ADD COLUMN IF NOT EXISTS phone text;
-- statement
ALTER TABLE laundry_branches ADD COLUMN IF NOT EXISTS email text;
-- statement
ALTER TABLE laundry_branches ADD COLUMN IF NOT EXISTS address text;
