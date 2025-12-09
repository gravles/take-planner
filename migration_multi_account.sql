-- Migration: Enable Multiple Integrations per Provider

-- 1. Drop the existing unique constraint that strictly limits to 1 per provider
alter table user_integrations drop constraint user_integrations_user_id_provider_key;

-- 2. Add columns to identify specific accounts
alter table user_integrations 
  add column if not exists account_email text,
  add column if not exists is_primary boolean default false;

-- 3. Add a new unique constraint to prevent duplicate entries for the SAME email
alter table user_integrations 
  add constraint user_integrations_user_id_provider_email_key unique(user_id, provider, account_email);

-- 4. Clean up any existing data (Optional: tag existing rows as primary if needed)
-- In this specific user case, checking existing rows might be good.
update user_integrations set is_primary = true where account_email is null; 
-- (Assuming existing ones are the primary login until verified otherwise) Make sure to fill email later if possible.
